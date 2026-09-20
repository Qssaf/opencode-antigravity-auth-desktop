# AGENTS.md

Guidance for AI agents working with this repository.

## Overview

OpenCode plugin for Google Antigravity OAuth. Intercepts `fetch()` calls to `generativelanguage.googleapis.com`, transforms them to Antigravity format, and handles auth, quota, recovery, and multi-account rotation.

## Build & Test Commands

```bash
npm install                          # Install dependencies
npm run build                        # Compile (tsc -p tsconfig.build.json)
npm run typecheck                    # Type-check only (tsc --noEmit)
npm test                             # Run all tests (vitest run)
npx vitest run src/plugin/auth.test.ts          # Single test file
npx vitest run -t "test name here"              # Single test by name
npx vitest --watch src/plugin/auth.test.ts      # Watch mode, single file
npm run test:coverage                # Coverage report
npm run test:e2e:models              # E2E: model availability check
npm run test:e2e:regression          # E2E: regression suite
```

No linter or formatter is configured. Style is enforced by convention (see below).

`dist/` is committed (source maps are not). This fork is installed straight from
GitHub, and OpenCode resolves an installed plugin through package.json `main`,
so a source-only repo cannot be installed. Run `npm run build` and commit the
bundles with any change that should reach installed users. A plugin loaded from
a local directory path uses `index.ts` instead, so local development does not
need the rebuild.

## TypeScript Configuration

- `strict: true` with extra strictness: `noUncheckedIndexedAccess`, `noImplicitOverride`, `noFallthroughCasesInSwitch`
- `verbatimModuleSyntax: true` — use `import type` for type-only imports
- `target: ESNext`, `module: Preserve`, `moduleResolution: bundler`
- `allowImportingTsExtensions: true` — use `.ts` extensions in imports
- No path aliases — all imports are relative

## Code Style

### Imports
- Use `import type { ... }` for type-only imports (enforced by `verbatimModuleSyntax`)
- Named imports only — no default imports in src/
- Relative paths with `.ts` extensions: `import { foo } from "./bar.ts"`
- Order: node builtins > external packages > local modules

### Exports
- Named exports only in src/ — no default exports
- Barrel files (index.ts) for module surfaces

### Naming
- `camelCase` for functions, variables, parameters
- `PascalCase` for types, interfaces, classes, enums
- `UPPER_SNAKE_CASE` for constants
- `kebab-case` for file names (e.g., `request-helpers.ts`, `thinking-recovery.ts`)
- Test files: `*.test.ts` colocated with source

### Types
- No `I` prefix on interfaces, no `Type` suffix
- Use `z.infer<typeof Schema>` for Zod-derived types
- Extract to `types.ts` when shared, inline when local
- Discriminated unions preferred over boolean flags
- Never use `as any`, `@ts-ignore`, or `@ts-expect-error`

### Functions
- `export function` for public APIs
- Arrow functions for callbacks, factories, and inline closures
- Async functions with targeted try/catch (not blanket)

### Error Handling
- Defensive try/catch with graceful degradation (fallback values, not crashes)
- Custom error classes with metadata when domain-specific
- Catch `unknown`, log, and convert to domain errors — never empty catch blocks
- Rate limit / quota errors trigger account rotation, not failure

### Formatting
- 2-space indentation
- Double quotes for strings
- Trailing commas in multiline constructs
- No semicolons (project convention)

### Logging
- `createLogger("module-name")` for structured logging
- `console.log` only for CLI/user-facing output

## Module Structure

```
src/
├── plugin.ts                # Shared runtime + OpenCode 1.x entry, fetch interceptor
├── constants.ts             # Endpoints, headers, API config, system prompts
├── antigravity/oauth.ts     # OAuth token exchange
├── cli/accounts.ts          # `antigravity-accounts` binary (account pool management)
├── v2/                      # OpenCode 2.x adapter (see below)
└── plugin/
    ├── auth.ts              # Token validation & refresh
    ├── request.ts           # Request transformation (core logic)
    ├── request-helpers.ts   # Schema cleaning, thinking filters
    ├── thinking-recovery.ts # Turn boundary detection
    ├── recovery.ts          # Session recovery (tool_result_missing)
    ├── quota.ts             # Quota checking (API usage stats)
    ├── cache.ts             # Auth & signature caching
    ├── accounts.ts          # Multi-account management & storage
    ├── account-admin.ts     # Pool administration + text rendering (CLI and /antigravity)
    ├── account-login.ts     # Adding an account outside `opencode auth login`
    ├── storage.ts           # Persistent storage schemas (Zod)
    ├── fingerprint.ts       # Device fingerprint generation & headers
    ├── project.ts           # Managed project context resolution
    └── debug.ts             # Debug logging utilities
```

### OpenCode 2.x adapter (`src/v2/`)

```
src/v2/
├── plugin.ts         # Plugin.define entry: registers OAuth, models, model.request hook, tools, /antigravity per location
├── command.ts        # `/antigravity` account command (session.synthetic output)
├── login-menu.ts     # Account menu carried by the OAuth method's form
├── runtime.ts        # Process-wide shared runtime (ref-counted across locations)
├── proxy.ts          # Loopback listener that runs the pipeline's fetch
├── oauth.ts          # OAuth method for the `google` integration
├── credentials.ts    # 2.x credential <-> 1.x auth conversions
├── models.ts         # 1.x model definitions -> 2.x Model.Info, variant translation
├── legacy-client.ts  # Stand-in for the 1.x plugin client
└── types.ts          # Local structural subset of @opencode/plugin
```

Things to know before changing this:

- `createAntigravityRuntime` in `plugin.ts` is shared by both generations and returns `{ hooks, dispose }`. `createAntigravityPlugin` is the 1.x wrapper that returns just `hooks`.
- `@opencode/plugin` is **not** a dependency. `Plugin.define()` is an identity function, so `src/v2/types.ts` declares the structural subset instead. Keep it matching the installed `@opencode/plugin` when touching hook shapes.
- OpenCode 2.x calls `setup` once per location in one process, but the pipeline keeps process-global state, so the runtime is created once and ref-counted (`acquireRuntime`).
- The auth loader is re-run only when the login changes, keyed by `authSignature` (stable across access-token rotation).
- 2.x server plugins have no toasts, and `src/v2/legacy-client.ts` makes unsupported `session.*` calls throw rather than silently no-op.
- The 1.x account menu cannot prompt on stdin on 2.x. Two surfaces replace it. The login method's `form` (`login-menu.ts`) is prompted by OpenCode during `opencode auth login` — a `string` field with `options` renders as a select, `when` (AND-only) gates the account picker, and a non-`add` action returns an authorization carrying the result text plus the already-active account's credential. The account options are fixed at registration, so a change calls `ctx.integration.reload()` to rebuild the form.
- The second surface is the `/antigravity` command: `ctx.command.transform` registers it, `ctx.session.synthetic({ resume: false })` prints the answer without a model turn, and a change mirrors into the live pool (`liveAccountPool`) before `V2Runtime.invalidateAuth()` forces the next request to re-read the account file.

## Key Design Patterns

### 1. Request Interception
Plugin intercepts `fetch()` for `generativelanguage.googleapis.com`, transforms to Antigravity format. Two header styles: `antigravity` (Electron-style UA + fingerprint) and `gemini-cli` (nodejs-client UA).

### 2. Claude Thinking Blocks
ALL thinking blocks are stripped from outgoing requests for Claude models. Claude generates fresh thinking each turn. This eliminates signature validation errors.

### 3. Session Recovery
When tool execution is interrupted (ESC/timeout), the plugin injects synthetic `tool_result` blocks to recover the session without starting over.

### 4. Schema Sanitization
Tool schemas are cleaned via allowlist. Unsupported fields (`const`, `$ref`, `$defs`) are removed or converted to Antigravity-compatible format.

### 5. Multi-Account Load Balancing
Accounts rotate on rate limits. Gemini has dual quota pools (Antigravity headers + Gemini CLI headers). Fingerprints are per-account and regenerated on capacity exhaustion.

### 6. Fingerprint System
Per-account device fingerprints stored in `antigravity-accounts.json`. Each fingerprint includes deviceId, sessionToken, userAgent, and a reduced clientMetadata (ideType, platform, pluginType — no osVersion, arch, or sqmId). The only header composed is `User-Agent`, built by `buildFingerprintHeaders()` in `fingerprint.ts` and applied on the antigravity request path in `request.ts`. History tracked (max 5), restorable.

## Dependencies

- `zod ^4` — schema validation (NOT zod v3)
- `@opencode-ai/plugin` — OpenCode plugin interface
- `@openauthjs/openauth` — OAuth client
- `proper-lockfile` — file locking for concurrent access
- `xdg-basedir` — XDG directory resolution

## Testing

- Framework: **Vitest 3** with native ESM
- Config: `vitest.config.ts`
- Tests colocated: `src/plugin/foo.test.ts` next to `src/plugin/foo.ts`
- Use `describe`/`it`/`expect` — standard Vitest API
- Mock with `vi.fn()`, `vi.spyOn()`, `vi.mock()`

## Documentation

- [README.md](README.md) — Installation & usage
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — Detailed architecture guide
- [docs/ANTIGRAVITY_API_SPEC.md](docs/ANTIGRAVITY_API_SPEC.md) — API reference
- [CHANGELOG.md](CHANGELOG.md) — Version history
