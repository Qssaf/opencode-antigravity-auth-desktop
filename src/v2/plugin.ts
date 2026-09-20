/**
 * OpenCode 2.x plugin entrypoint.
 *
 * `setup` runs once per location. It attaches the location to the shared
 * runtime and registers, for that location:
 *
 * - an OAuth login method on the `google` integration, whose form carries the
 *   account menu (see login-menu.ts),
 * - the Antigravity models on the `google` provider,
 * - a `model.request` hook that routes Gemini requests through the Antigravity
 *   pipeline (see proxy.ts),
 * - the `google_search` tool.
 *
 * Not carried over from OpenCode 1.x: toasts (2.x server plugins cannot show
 * them), the arrow-key account menu — 2.x owns the login prompt, so the menu is
 * declared as the login method's form instead (see login-menu.ts) — session
 * recovery (OpenCode 2.x supplies a result for tool calls that never completed)
 * and the auto-update checker (use `opencode plugin update`).
 */

import { ANTIGRAVITY_PROVIDER_ID } from "../constants";
import { createLogger } from "../plugin/logger";
import { acquireRuntime } from "./runtime";
import type { Cleanup, Context, Plugin, Registration } from "./types";

const log = createLogger("v2-plugin");

/** Stable identifier for `plugins` disable patterns such as `-opencode-antigravity-auth`. */
export const PLUGIN_ID = "opencode-antigravity-auth";

async function disposeAll(registrations: readonly Registration[]): Promise<void> {
  for (const registration of registrations) {
    try {
      await registration.dispose();
    } catch (error) {
      log.debug("Failed to dispose a registration", { error: String(error) });
    }
  }
}

export async function setup(ctx: Context): Promise<Cleanup> {
  const handle = await acquireRuntime(ctx);
  const { runtime } = handle;
  const registrations: Registration[] = [];

  try {
    // The login menu lists the stored accounts, so they are read before the
    // method is registered with its form.
    await runtime.refreshLoginAccounts();
    registrations.push(
      await ctx.integration.transform((editor) => {
        editor.method.update(runtime.oauthMethod());
      }),
    );
    registrations.push(
      await ctx.provider.transform((editor) => {
        runtime.applyModels(editor);
      }),
    );
    registrations.push(
      await ctx.session.hook("model.request", (event) => runtime.routeModelRequest(event), {
        providerID: ANTIGRAVITY_PROVIDER_ID,
      }),
    );
    registrations.push(
      await ctx.tool.transform((editor) => {
        runtime.addTools(editor);
      }),
    );
  } catch (error) {
    await disposeAll(registrations);
    await handle.release();
    throw error;
  }

  // Model discovery talks to the network, so it must not delay setup. Once it
  // finishes, ask this location to rebuild the provider's model list.
  const stopListening = runtime.onCatalogChange(() => {
    ctx.provider.reload().catch((error) => {
      log.debug("Provider reload after model discovery failed", { error: String(error) });
    });
  });
  void runtime.refreshCatalog();

  return async () => {
    stopListening();
    await disposeAll(registrations);
    await handle.release();
  };
}

export const OpenCodeV2Plugin: Plugin = {
  id: PLUGIN_ID,
  setup,
};
