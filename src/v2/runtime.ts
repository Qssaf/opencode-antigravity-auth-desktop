/**
 * Process-wide Antigravity runtime for OpenCode 2.x.
 *
 * OpenCode 2.x calls a plugin's `setup` once per location (project), all in one
 * server process. The Antigravity pipeline keeps process-global state (account
 * pool, health scores, rate limit tracking, refresh timers), and re-running its
 * initializers resets that state. So every location shares one runtime, which
 * is created by the first `setup` and disposed by the last cleanup.
 */

import { tool } from "@opencode-ai/plugin/tool";
import { ANTIGRAVITY_PROVIDER_ID } from "../constants";
import { createAntigravityRuntime, liveAccountPool, oauthFlowHelpers, verifyAccountAccess } from "../plugin";
import { formatRefreshParts, isOAuthAuth } from "../plugin/auth";
import type { AntigravityRuntime } from "../plugin";
import { OPENCODE_MODEL_DEFINITIONS } from "../plugin/config/models";
import { createLogger } from "../plugin/logger";
import { loadAccounts } from "../plugin/storage";
import type { AuthDetails, LoaderResult, PluginResult, Provider, ProviderModel } from "../plugin/types";
import { authSignature, credentialToAuth, poolAuthSignature } from "./credentials";
import { createLegacyClient } from "./legacy-client";
import { catalogFromDefinitions, mergeCatalog } from "./models";
import { accountOptions } from "./login-menu";
import { createOAuthMethod } from "./oauth";
import { registerProxyRoute } from "./proxy";
import type { ProxyRoute } from "./proxy";
import type {
  Context,
  FormOption,
  ModelInfo,
  ModelRequestHook,
  OAuthMethodRegistration,
  ProviderEditor,
  ToolEditor,
} from "./types";

const log = createLogger("v2-runtime");

const PROVIDER_ID = ANTIGRAVITY_PROVIDER_ID;
const GEMINI_HOST = "generativelanguage.googleapis.com";

/**
 * How long a resolved auth snapshot is reused.
 *
 * Reading it costs two round-trips to the OpenCode server plus, when the
 * credential store has no OAuth entry, a read and parse of the account pool.
 * A single model request resolves auth twice (routing the request, then
 * dispatching it), milliseconds apart, so a short window collapses that into
 * one lookup while still picking up an account switch almost immediately.
 */
const AUTH_SNAPSHOT_TTL_MS = 250;

/** How the shared runtime is torn down once the last location unloads. */
export interface RuntimeHandle {
  readonly runtime: V2Runtime;
  release(): Promise<void>;
}

interface AuthSnapshot {
  auth: AuthDetails;
  signature: string;
}

interface LoadedInterceptor {
  signature: string;
  loaded: Promise<LoaderResult | Record<string, unknown>>;
}

/** The 1.x `google_search` tool as returned by the legacy hooks. */
interface LegacySearchTool {
  description: string;
  args: Record<string, unknown>;
  execute(args: unknown, context: { abort: AbortSignal }): Promise<string>;
}

function isLoaderResult(value: LoaderResult | Record<string, unknown>): value is LoaderResult {
  return typeof (value as { fetch?: unknown }).fetch === "function";
}

function isLegacySearchTool(value: unknown): value is LegacySearchTool {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<LegacySearchTool>;
  return (
    typeof candidate.description === "string" &&
    typeof candidate.args === "object" &&
    candidate.args !== null &&
    typeof candidate.execute === "function"
  );
}

/**
 * Builds an OAuth auth from the enabled account the pool currently points at,
 * mirroring what the auth loader does when OpenCode has no OAuth credential.
 * The access token is left empty so callers refresh it themselves.
 */
export async function promoteAccountFromPool(): Promise<AuthSnapshot | undefined> {
  let stored: Awaited<ReturnType<typeof loadAccounts>>;
  try {
    stored = await loadAccounts();
  } catch (error) {
    log.debug("Could not read the Antigravity account pool", { error: String(error) });
    return undefined;
  }

  const accounts = stored?.accounts ?? [];
  if (accounts.length === 0) return undefined;

  const activeIndex = stored?.activeIndex;
  const active =
    typeof activeIndex === "number" && activeIndex >= 0 && activeIndex < accounts.length
      ? accounts[activeIndex]
      : undefined;
  const account =
    active?.refreshToken && active.enabled !== false
      ? active
      : accounts.find((candidate) => candidate?.refreshToken && candidate.enabled !== false);
  if (!account?.refreshToken) return undefined;

  const refresh = formatRefreshParts({
    refreshToken: account.refreshToken,
    projectId: account.projectId,
    managedProjectId: account.managedProjectId,
  });
  return {
    auth: { type: "oauth", refresh, access: "", expires: 0 },
    signature: poolAuthSignature(refresh),
  };
}

/**
 * Only requests that would have gone to the public Gemini API are rerouted. A
 * user-configured custom base URL is left alone, as it was on OpenCode 1.x.
 */
export function isDefaultGeminiBaseURL(baseURL: string | undefined): boolean {
  if (!baseURL) return true;
  try {
    return new URL(baseURL).hostname === GEMINI_HOST;
  } catch {
    return false;
  }
}

export class V2Runtime {
  private readonly attached = new Set<Context>();
  private readonly catalogListeners = new Set<() => void>();
  private catalog: Map<string, ModelInfo>;
  private interceptor: LoadedInterceptor | undefined;
  private authSnapshot: { value: Promise<AuthSnapshot>; at: number } | undefined;
  private route: Promise<ProxyRoute> | undefined;
  private catalogRefresh: Promise<void> | undefined;
  private loginAccounts: readonly FormOption[] = [];
  private disposed = false;

  private constructor(private readonly legacy: AntigravityRuntime) {
    this.catalog = catalogFromDefinitions(PROVIDER_ID, OPENCODE_MODEL_DEFINITIONS);
  }

  static async create(ctx: Context): Promise<V2Runtime> {
    const legacy = await createAntigravityRuntime(PROVIDER_ID)({
      client: createLegacyClient(),
      directory: ctx.location.directory,
    });
    return new V2Runtime(legacy);
  }

  attach(ctx: Context): void {
    this.attached.add(ctx);
  }

  detach(ctx: Context): void {
    this.attached.delete(ctx);
  }

  /**
   * Resolves the auth the pipeline should use: the active `google` connection
   * if OpenCode has one, otherwise an account promoted from the on-disk pool.
   *
   * The promotion matters for users upgrading from OpenCode 1.x, who have
   * accounts in `antigravity-accounts.json` but no 2.x credential. The auth
   * loader promotes them too, but callers that read `getAuth()` directly (the
   * `google_search` tool, model discovery) would otherwise see no account.
   */
  private readAuth(): Promise<AuthSnapshot> {
    const now = Date.now();
    const cached = this.authSnapshot;
    if (cached && now - cached.at < AUTH_SNAPSHOT_TTL_MS) return cached.value;

    const value = this.resolveAuth();
    const entry = { value, at: now };
    this.authSnapshot = entry;
    // A failed lookup must not be cached: the next request retries.
    value.catch(() => {
      if (this.authSnapshot === entry) this.authSnapshot = undefined;
    });
    return value;
  }

  private async resolveAuth(): Promise<AuthSnapshot> {
    for (const ctx of this.attached) {
      try {
        const connection = await ctx.integration.connection.active(PROVIDER_ID);
        const credential = connection ? await ctx.integration.connection.resolve(connection) : undefined;
        const auth = credentialToAuth(credential);
        if (isOAuthAuth(auth)) {
          return { auth, signature: authSignature(connection, credential) };
        }
        const promoted = await promoteAccountFromPool();
        if (promoted) return promoted;
        // An API key is still usable; only fall back to it when the pool is empty.
        if (credential) {
          return { auth, signature: authSignature(connection, credential) };
        }
        break;
      } catch (error) {
        log.debug("Could not read the active credential from this location", { error: String(error) });
      }
    }

    return (await promoteAccountFromPool()) ?? { auth: { type: "none" }, signature: "none" };
  }

  /**
   * Runs the legacy auth loader for the current login. The loader builds the
   * account manager and the request pipeline, so it only runs again when the
   * login changes (a different account or key), not on every request.
   */
  private async loaderResult(): Promise<LoaderResult | undefined> {
    const { signature } = await this.readAuth();

    if (!this.interceptor || this.interceptor.signature !== signature) {
      const loader = this.legacy.hooks.auth.loader;
      const stub: Provider = { id: PROVIDER_ID, models: {} };
      const loaded = loader(async () => (await this.readAuth()).auth, stub);
      const entry: LoadedInterceptor = { signature, loaded };
      this.interceptor = entry;
      // A failed load must not stick: the next request tries again.
      loaded.catch(() => {
        if (this.interceptor === entry) this.interceptor = undefined;
      });
    }

    const result = await this.interceptor.loaded;
    return isLoaderResult(result) ? result : undefined;
  }

  /** Runs one Gemini request through the Antigravity pipeline. */
  private async dispatch(url: string, init: RequestInit): Promise<Response> {
    const loaded = await this.loaderResult();
    if (!loaded) {
      // The login changed to something the pipeline does not handle while the
      // request was on its way. Behave as OpenCode 1.x did without a loader.
      return fetch(url, init);
    }
    return loaded.fetch(url, init);
  }

  private ensureRoute(): Promise<ProxyRoute> {
    this.route ??= registerProxyRoute((url, init) => this.dispatch(url, init)).catch((error) => {
      this.route = undefined;
      throw error;
    });
    return this.route;
  }

  /**
   * `model.request` hook: sends this request through the Antigravity pipeline
   * by pointing the provider at the loopback proxy.
   */
  async routeModelRequest(event: ModelRequestHook): Promise<void> {
    if (this.disposed || !isDefaultGeminiBaseURL(event.baseURL)) return;

    // Throws (and so fails the request) if the pipeline cannot be set up. That
    // is deliberate: the alternative is sending the prompt to the public Gemini
    // API with a placeholder key.
    const loaded = await this.loaderResult();
    if (!loaded) {
      // No OAuth account and no API key the pipeline can use. The request is
      // left on OpenCode's own Google provider, which is what serves a plain
      // `GEMINI_API_KEY` setup; with no key at all Google answers "API key not
      // valid", so say here what actually happened.
      log.warn(
        "No Antigravity credential for this request; leaving it on OpenCode's Google provider. " +
          "Run `opencode auth login` if you expected the plugin to serve it.",
      );
      return;
    }

    const route = await this.ensureRoute();
    event.baseURL = route.baseURL;
  }

  /** Adds the plugin's models to the `google` provider. */
  applyModels(editor: ProviderEditor): void {
    const record = editor.get(PROVIDER_ID);
    if (!record) return;
    // With accounts signed in, every Gemini request goes through the pool,
    // which is not billed per token, so OpenCode's prices would be wrong.
    const merged = mergeCatalog(record.models, this.catalog, { free: this.hasAccounts() });
    if (merged) editor.models.set(PROVIDER_ID, merged);
  }

  private hasAccounts(): boolean {
    return this.loginAccounts.length > 0;
  }

  private notifyCatalogChange(): void {
    for (const listener of this.catalogListeners) listener();
  }

  onCatalogChange(listener: () => void): () => void {
    this.catalogListeners.add(listener);
    return () => this.catalogListeners.delete(listener);
  }

  /**
   * Discovers models available to the signed-in accounts (Antigravity and
   * Gemini API listings) and folds them into the catalog. Runs in the
   * background; locations re-read the catalog when it changes.
   */
  refreshCatalog(): Promise<void> {
    this.catalogRefresh ??= this.discoverModels().finally(() => {
      this.catalogRefresh = undefined;
    });
    return this.catalogRefresh;
  }

  private async discoverModels(): Promise<void> {
    const models = this.legacy.hooks.provider?.models;
    if (!models) return;
    try {
      // Discovery reads the account pool the loader builds.
      await this.loaderResult();
      const { auth } = await this.readAuth();
      const stub: Provider = { id: PROVIDER_ID, models: {} };
      const discovered: Record<string, ProviderModel> = await models(stub, { auth });
      if (this.disposed) return;

      const next = catalogFromDefinitions(PROVIDER_ID, discovered);
      for (const [id, model] of this.catalog) {
        if (!next.has(id)) next.set(id, model);
      }
      const changed = next.size !== this.catalog.size || [...next.keys()].some((id) => !this.catalog.has(id));
      this.catalog = next;
      if (changed) this.notifyCatalogChange();
    } catch (error) {
      log.debug("Model discovery failed; keeping the built-in model list", { error: String(error) });
    }
  }

  /**
   * Re-reads the accounts the login menu offers. The form is fixed once the
   * method is registered, so this runs before registering and again after the
   * pool changes (followed by `reloadLoginMenu`).
   */
  async refreshLoginAccounts(): Promise<void> {
    try {
      this.loginAccounts = await accountOptions();
    } catch (error) {
      log.debug("Could not read the account pool for the login menu", { error: String(error) });
      this.loginAccounts = [];
    }
  }

  /**
   * Rebuilds the login menu in every attached location, so the account list it
   * offers matches the pool after a change.
   */
  async reloadLoginMenu(): Promise<void> {
    const hadAccounts = this.hasAccounts();
    await this.refreshLoginAccounts();
    for (const ctx of this.attached) {
      try {
        await ctx.integration.reload();
      } catch (error) {
        log.debug("Could not reload the login menu for this location", { error: String(error) });
      }
    }
    // Model prices depend on whether the pool serves requests (see applyModels).
    if (this.hasAccounts() !== hadAccounts) this.notifyCatalogChange();
  }

  /** The OAuth method registered on the `google` integration. */
  oauthMethod(): OAuthMethodRegistration {
    return createOAuthMethod({
      integrationID: PROVIDER_ID,
      client: createLegacyClient(),
      helpers: oauthFlowHelpers,
      accounts: this.loginAccounts,
      management: {
        verify: verifyAccountAccess,
        live: liveAccountPool,
        invalidate: () => this.onPoolChanged(),
      },
    });
  }

  /**
   * A pool change made outside the request path: drop the cached login so the
   * next request rebuilds the pool from disk, and refresh the login menu.
   */
  private onPoolChanged(): void {
    this.invalidateAuth();
    void this.reloadLoginMenu();
  }

  /**
   * Drops the cached login so the next request resolves auth and rebuilds the
   * account pool from disk. Used after the login menu edits the pool, so the
   * change applies without restarting OpenCode.
   */
  invalidateAuth(): void {
    this.authSnapshot = undefined;
    this.interceptor = undefined;
  }

  /** Registers the `google_search` tool. */
  addTools(editor: ToolEditor): void {
    const legacyTool = this.legacy.hooks.tool?.google_search;
    if (!isLegacySearchTool(legacyTool)) return;

    const schema = tool.schema;
    const shape = schema.object(legacyTool.args as unknown as Parameters<typeof schema.object>[0]);
    const { $schema: _dialect, ...input } = schema.toJSONSchema(shape, { io: "input" }) as Record<string, unknown>;

    editor.add({
      name: "google_search",
      description: legacyTool.description,
      input,
      execute: async (rawInput) => {
        const parsed = shape.safeParse(rawInput);
        if (!parsed.success) {
          return { content: `Error: invalid google_search arguments: ${parsed.error.message}` };
        }
        // The pipeline reads the account pool the loader builds.
        await this.loaderResult().catch(() => undefined);
        // 2.x tool calls carry no abort signal, so the search runs to its own timeout.
        const content = await legacyTool.execute(parsed.data, { abort: new AbortController().signal });
        return { content };
      },
    });
  }

  async dispose(): Promise<void> {
    if (this.disposed) return;
    this.disposed = true;
    this.catalogListeners.clear();
    this.interceptor = undefined;
    this.authSnapshot = undefined;
    const route = this.route;
    this.route = undefined;
    if (route) {
      await route.then((r) => r.dispose()).catch(() => {});
    }
    await this.legacy.dispose();
  }
}

// -- shared instance ---------------------------------------------------------

let shared: { runtime: Promise<V2Runtime>; refs: number } | undefined;
let disposing: Promise<void> | undefined;

/**
 * Attaches a location to the shared runtime, creating it if this is the first.
 * `release` detaches the location and disposes the runtime with the last one.
 */
export async function acquireRuntime(ctx: Context): Promise<RuntimeHandle> {
  // A previous generation may still be shutting down.
  await disposing;

  const entry = (shared ??= { runtime: V2Runtime.create(ctx), refs: 0 });
  entry.refs += 1;

  let runtime: V2Runtime;
  try {
    runtime = await entry.runtime;
  } catch (error) {
    entry.refs -= 1;
    if (shared === entry && entry.refs === 0) shared = undefined;
    throw error;
  }
  runtime.attach(ctx);

  let released = false;
  return {
    runtime,
    async release() {
      if (released) return;
      released = true;
      runtime.detach(ctx);
      entry.refs -= 1;
      if (entry.refs === 0 && shared === entry) {
        shared = undefined;
        const shutdown = runtime.dispose().finally(() => {
          if (disposing === shutdown) disposing = undefined;
        });
        disposing = shutdown;
        await shutdown;
      }
    },
  };
}
