# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Code style, module layout and TypeScript conventions live in @AGENTS.MD — read it before writing code. This file covers what that one does not: how to work the build, and the architecture you would otherwise have to reconstruct from a dozen files.

## Commands

```bash
npm install
npm test                                    # vitest run (~1330 tests, ~7s)
npx vitest run src/plugin/auth.test.ts      # one file
npx vitest run -t "test name"               # one test by name
npm run typecheck                           # tsc --noEmit
npm run build                               # plugin + CLI bundles into dist/
npm run build:schema                        # regenerate assets/antigravity.schema.json after editing config/schema.ts
npm run accounts -- list                    # run the account CLI from the clone
```

`dist/` is **committed**. This fork installs straight from GitHub, and OpenCode resolves an installed plugin through package.json `main`, so a source-only tree cannot be installed. Run `npm run build` and commit the bundles with any change that should reach users — CI fails on `git diff --exit-code -- dist`. A plugin loaded from a local directory path uses `index.ts` instead, so local development does not need the rebuild.

## Verifying against a real OpenCode

Unit tests do not cover the plugin-host contract. To check a change end to end:

```bash
npm i @opencode/cli@2.0.11                  # in a scratch dir
# opencode.json: { "plugins": ["/abs/path/to/this/repo"] }
OPENCODE_CONFIG_DIR=<scratch> opencode auth login google --method antigravity --answer action=list
```

- **`opencode service stop` after every change.** Plugins live in a background server that outlives the CLI; without this you are testing the previous build. `opencode plugin list` prints the resolved path of what is actually loaded.
- `--answer` takes `key=value`, but a multiselect needs JSON: `--answer 'account=["2","3"]'`.
- `OPENCODE_CONFIG_DIR` relocates both OpenCode's config and this plugin's account pool, so a scratch dir keeps tests off your real accounts.

## Architecture

### One runtime, two plugin generations

`index.ts` default-exports `{ ...OpenCodeV2Plugin, server: AntigravityCLIOAuthPlugin }`. OpenCode 2.x reads `id`/`setup`; 1.x calls `server`. Both wrap the same `createAntigravityRuntime(providerId)` in `src/plugin.ts`, which returns `{ hooks, dispose }` — that function is the core, and it is large.

Requests are intercepted, not proxied by config: the pipeline rewrites calls to `generativelanguage.googleapis.com` into Antigravity's `cloudcode-pa` backend. How it hooks in differs:

- **1.x** — `hooks.auth.loader` returns a custom `fetch`, which OpenCode uses for the provider.
- **2.x** — that hook is gone, so `src/v2/proxy.ts` starts a loopback listener on a random port under a random path token, and the `model.request` hook points `baseURL` at it. The proxy then calls the same 1.x `fetch`. Synthetic responses (quota-blocked, model-unavailable) and cross-account retries are why a proxy is needed rather than `http.request`.

`src/v2/types.ts` is a **structural subset** of `@opencode/plugin`, which is deliberately not a dependency. When touching hook shapes, check the real types (`npm pack @opencode/plugin@<version>`) and update the comment naming the version they were checked against.

### The account pool is the center of gravity

`~/.config/opencode/antigravity-accounts.json` holds every signed-in Google account. Two layers:

- `src/plugin/storage.ts` — the file: lock-protected, atomic writes, merge-on-save, version migrations, and tombstones (`deletedRefreshTokenHashes`) so a deleted account cannot be resurrected by a concurrent writer's stale snapshot.
- `src/plugin/accounts.ts` — `AccountManager`, the in-memory pool the request path holds: rotation, per-family (`claude` / `gemini`) and per-quota-pool rate-limit state, health scores, cooldowns, fingerprints.

Both exist because OpenCode may run several processes against one file. A change made outside the request path (the login menu, the CLI) must therefore: mirror into the live pool via `liveAccountPool` (exported from `plugin.ts`), *then* invalidate the cached auth loader (`V2Runtime.invalidateAuth`) so the next request re-reads disk. Skipping the mirror lets a later flush of the live manager write the old value back.

Gemini has **two quota pools per account** (Antigravity headers vs Gemini CLI headers) and the pipeline falls back between them before rotating accounts. The backend's answers depend on the `User-Agent` it sees — `getRandomizedHeaders("antigravity")` vs `getAntigravityHeaders()` are not interchangeable; the quota endpoints need the former.

### Account management surfaces

All three call the same operations in `src/plugin/account-admin.ts` (which renders plain text, no ANSI, so it reads the same in a terminal and in OpenCode's UI) and `src/plugin/account-login.ts`:

| Surface | File | Notes |
|---|---|---|
| Menu inside `opencode auth login` | `src/v2/login-menu.ts` | The login method's `form`: a select of actions plus a multiselect of accounts. **One action per login** — OpenCode prompts the form once and ends the flow with a credential. A management action returns the already-active account's credential so the flow ends cleanly. |
| `antigravity-accounts` CLI | `src/cli/accounts.ts` | The looping menu. Entry point `cli.ts` → `dist/accounts.js` (`bin`). |
| 1.x in-login menu | `src/plugin/cli.ts` + `ui/` | Prompts stdin directly; only reachable on 1.x. |

### Hard-won constraints (verified against OpenCode 2.0.11)

Do not spend time rediscovering these:

- The 2.x plugin runs in `opencode serve` with **no TTY** (`stdin.isTTY` undefined, no `setRawMode`) in both background-service and `--standalone` modes. A stdin-driven menu cannot work there; that is why the 1.x looping menu could not be ported.
- `ctx.session.synthetic` output **does not render in the desktop app**, which is why the `/antigravity` command was removed even though it registered correctly.
- `ctx.ui.dialog` (a looping menu) exists only in the **TUI plugin** context (`@opencode/plugin/tui`), which the desktop app does not run.
- OAuth: the authorization URL must ask for `prompt=select_account consent`. With `consent` alone Google silently reuses the browser session and a second login returns the account already stored.
- Token refresh is **single-flight per refresh token** (`src/plugin/token.ts`). Concurrent refreshes of one token make Google answer `invalid_grant`, which used to look like revocation. An account is dropped only after `INVALID_GRANT_STRIKES_BEFORE_REMOVAL` confirmed failures.
- Never let a request fall through to the public Gemini API when no credential is usable: the provider is registered with an empty `apiKey`, so Google answers "API key not valid" and blames a key the user never configured. Return a synthetic error instead.

## Testing notes

- Tests that import the runtime need `vi.mock("@opencode-ai/plugin", ...)` — its published `tool` entry does not resolve under vitest. Copy the stub from `src/plugin.test.ts`.
- Isolate anything touching the pool with a temp `OPENCODE_CONFIG_DIR` in `beforeEach` (see `src/plugin/account-admin.test.ts`).
- `npm run test:e2e:models` / `test:e2e:regression` and the shell scripts in `script/` hit the live backend with real accounts; they are not part of `npm test`.

## This is a fork

Of [pieliesdie/opencode-antigravity-auth](https://github.com/pieliesdie/opencode-antigravity-auth), maintained at `Qssaf/opencode-antigravity-auth-desktop` and installed from GitHub, not npm. The package name is still `@pieliesdie/opencode-antigravity-auth`, so it stays drop-in compatible with upstream config. Keep upstream credited in README.
