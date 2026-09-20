/**
 * Structural subset of the OpenCode 2.x plugin API (`@opencode/plugin`) that
 * this package uses.
 *
 * The 2.x `Plugin.define()` helper is an identity function, so the package has
 * no runtime dependency on `@opencode/plugin`. Declaring the surface locally
 * keeps the build free of that package's large type graph. The shapes mirror
 * https://opencode.ai/v2/docs/build/plugins and were checked against
 * `@opencode/plugin` 2.0.10.
 *
 * Interface members use method syntax on purpose: the host types carry branded
 * string IDs, and method parameters are bivariant, so the host context stays
 * assignable to these interfaces.
 */

export type Cleanup = () => Promise<void> | void;

export interface Registration {
  dispose(): Promise<void>;
}

export type FormAnswer = Readonly<Record<string, string | number | boolean | ReadonlyArray<string>>>;

export interface OAuthCredential {
  readonly type: "oauth";
  readonly methodID: string;
  readonly refresh: string;
  readonly access: string;
  readonly expires: number;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface KeyCredential {
  readonly type: "key";
  readonly key: string;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export type Credential = OAuthCredential | KeyCredential;

export type ConnectionInfo =
  | { readonly type: "credential"; readonly id: string; readonly label: string }
  | { readonly type: "env"; readonly name: string };

export type OAuthAuthorization = {
  readonly url: string;
  readonly instructions: string;
  readonly expiresAt?: number;
} & (
  | { readonly mode: "auto"; readonly callback: Promise<OAuthCredential> }
  | { readonly mode: "code"; readonly callback: (code: string) => Promise<OAuthCredential> }
);

export interface BooleanFormField {
  readonly key: string;
  readonly type: "boolean";
  readonly title?: string;
  readonly description?: string;
  readonly default?: boolean;
  /** Skips the interactive prompt and uses `default` unless an answer is supplied. */
  readonly hidden?: boolean;
}

export interface StringFormField {
  readonly key: string;
  readonly type: "string";
  readonly title?: string;
  readonly description?: string;
  readonly placeholder?: string;
  readonly default?: string;
  readonly hidden?: boolean;
}

export type FormField = BooleanFormField | StringFormField;

export interface OAuthMethod {
  readonly id: string;
  readonly type: "oauth";
  readonly label: string;
  readonly form?: readonly [FormField, ...FormField[]];
}

export interface OAuthMethodRegistration {
  readonly integrationID: string;
  readonly method: OAuthMethod;
  readonly authorize: (answer: FormAnswer) => Promise<OAuthAuthorization>;
  readonly refresh?: (credential: OAuthCredential) => Promise<OAuthCredential>;
  readonly label?: (credential: OAuthCredential) => string | undefined;
}

export interface IntegrationEditor {
  readonly method: {
    update(registration: OAuthMethodRegistration): void;
  };
}

export interface ModelVariant {
  readonly id: string;
  readonly settings?: Readonly<Record<string, unknown>>;
  readonly headers?: Readonly<Record<string, string>>;
  readonly body?: Readonly<Record<string, unknown>>;
}

export interface ModelCost {
  readonly input: number;
  readonly output: number;
  readonly cache: { readonly read: number; readonly write: number };
}

export interface ModelInfo {
  readonly id: string;
  readonly modelID: string;
  readonly providerID: string;
  readonly name: string;
  readonly capabilities: {
    readonly tools: boolean;
    readonly input: readonly string[];
    readonly output: readonly string[];
  };
  readonly variants: readonly ModelVariant[];
  readonly time: { readonly released: number };
  readonly cost: readonly ModelCost[];
  readonly status: "alpha" | "beta" | "deprecated" | "active";
  readonly enabled: boolean;
  readonly limit: { readonly context: number; readonly input?: number; readonly output: number };
  readonly settings?: Readonly<Record<string, unknown>>;
  readonly headers?: Readonly<Record<string, string>>;
  readonly body?: Readonly<Record<string, unknown>>;
}

export interface ProviderRecord {
  readonly provider: { readonly id: string; readonly package: string };
  readonly models: ReadonlyMap<string, ModelInfo>;
}

export interface ProviderEditor {
  get(providerID: string): ProviderRecord | undefined;
  readonly models: {
    set(providerID: string, models: readonly ModelInfo[]): void;
  };
}

export interface ModelRequestHook {
  readonly sessionID: string;
  readonly model: { readonly id: string; readonly providerID: string; readonly variant?: string };
  readonly kind: "primary" | "compaction" | "title" | "generate";
  baseURL?: string;
  headers: Record<string, string>;
}

export interface ToolDefinition {
  readonly name: string;
  readonly description: string;
  readonly input: Readonly<Record<string, unknown>>;
  readonly execute: (input: unknown, context: unknown) => Promise<{ readonly content: string }>;
}

export interface ToolEditor {
  add(tool: ToolDefinition): void;
}

export interface Context {
  readonly app: { readonly name: string; readonly version: string; readonly channel: string };
  readonly location: { readonly directory: string };
  readonly options: Readonly<Record<string, unknown>>;
  readonly integration: {
    transform(callback: (editor: IntegrationEditor) => void): Promise<Registration>;
    readonly connection: {
      active(integrationID: string): Promise<ConnectionInfo | undefined>;
      resolve(connection: ConnectionInfo): Promise<Credential | undefined>;
    };
  };
  readonly provider: {
    transform(callback: (editor: ProviderEditor) => void): Promise<Registration>;
    reload(): Promise<void>;
  };
  readonly session: {
    hook(
      name: "model.request",
      callback: (event: ModelRequestHook) => Promise<void> | void,
      options?: { readonly providerID?: string },
    ): Promise<Registration>;
  };
  readonly tool: {
    transform(callback: (editor: ToolEditor) => void): Promise<Registration>;
  };
}

export interface Plugin {
  readonly id: string;
  readonly setup: (context: Context) => Promise<Cleanup | void> | Cleanup | void;
}
