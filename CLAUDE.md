# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Code style, module layout and TypeScript conventions live in @AGENTS.MD — read it before writing code. This file covers what that one does not: how to work the build, and the architecture you would otherwise have to reconstruct from a dozen files.

## Commands

```bash
npm install
npm test                                    # vitest run (~1340 tests, ~7s)
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

`liveAccountPool` identifies accounts by **refresh token, never by index**. The live pool can number accounts differently from the file (another process added or removed one since it loaded), so an index can land on the wrong account, and that account is then saved back to disk. The batch operations in `account-admin.ts` return the refresh tokens they changed for this reason.

Every request uses the **Antigravity quota**: Google deprecated the Gemini CLI quota the plugin used to fall back to, so a rate-limited account means rotating accounts (or the API-key fallback). `"gemini-cli"` survives only as a legacy key in stored rate-limit state. The backend's answers depend on the `User-Agent` it sees; every Antigravity request sends agy's (`ANTIGRAVITY_CLI_USER_AGENT`), quota endpoints included (verified live 2026-11-07).

### Account management surfaces

All three call the same operations in `src/plugin/account-admin.ts` (which renders plain text, no ANSI, so it reads the same in a terminal and in OpenCode's UI) and `src/plugin/account-login.ts`:

| Surface | File | Notes |
|---|---|---|
| Menu inside `opencode auth login` | `src/v2/login-menu.ts` | The login method's `form`: a select of actions plus a multiselect of accounts. **One action per login** — OpenCode prompts the form once and ends the flow with a credential. A management action returns the already-active account's credential so the flow ends cleanly. |
| `antigravity-accounts` CLI | `src/cli/accounts.ts` | The looping menu. Entry point `cli.ts` → `dist/accounts.js` (`bin`). |
| 1.x in-login menu | `src/plugin/cli.ts` + `ui/` | Prompts stdin directly; only reachable on 1.x. |

### Hard-won constraints (verified against OpenCode 2.0.11)

Do not spend time rediscovering these:

- OpenCode 2.x **imports the plugin module once per location** (verified on 2.2.0: three chats gave three module instances sharing one `globalThis`). OpenChamber opens a location per chat, so module-level state is per chat; anything meant to be process-wide, like the shared runtime in `src/v2/runtime.ts`, must live on `globalThis`.
- The 2.x plugin runs in `opencode serve` with **no TTY** (`stdin.isTTY` undefined, no `setRawMode`) in both background-service and `--standalone` modes. A stdin-driven menu cannot work there; that is why the 1.x looping menu could not be ported.
- `ctx.session.synthetic` output **does not render in the desktop app**, which is why the `/antigravity` command was removed even though it registered correctly.
- `ctx.ui.dialog` (a looping menu) exists only in the **TUI plugin** context (`@opencode/plugin/tui`), which the desktop app does not run.
- OAuth: the authorization URL must ask for `prompt=select_account consent`. With `consent` alone Google silently reuses the browser session and a second login returns the account already stored.
- Sign-in and token traffic mirror agy 1.5.3, captured from agy itself (2026-11-07): redirect `https://antigravity.google/oauth-callback` (its page shows a code to paste; no localhost listener), alphabetical query and form fields, 16-byte random `state`, 32-byte PKCE verifier kept in-process (`pendingAuthorizations` on globalThis), and token exchange / refresh / userinfo over `node:http2` as `Go-http-client/2.0`. Every request to Google goes through `googleFetch` (`src/antigravity/google-http.ts`): HTTP/2, one pooled connection per origin and `Authorization` (accounts never share one), no request gzip, `Content-Length` on everything except `:streamGenerateContent` (agy streams that body). `fetch` cannot send that (HTTP/1.1, adds `Accept` and `Connection`); `src/test-setup.ts` routes the helpers through `fetch` so tests can stub it. Model-call identifiers (`requestId`, `labels`, per-account numeric `sessionId`, capitalised `thinkingLevel`, field order) and the tool-call layout (one function per `tools` entry, UUID call ids, camelCase `thoughtSignature` only, Gemini tool results as a `model` turn of `{ output }`) come from agy's captured requests: `src/plugin/agy-wire.ts`. To capture what real OpenCode sends, run it under `unshare -rnm` with `HOME`/`XDG_*`/`OPENCODE_CONFIG_DIR` in a scratch dir, `OPENCODE_MODELS_PATH` pointing at a saved models.dev `api.json`, a dummy `GOOGLE_GENERATIVE_AI_API_KEY` (or the google provider is missing) and `< /dev/null` (`opencode run` otherwise waits on stdin). agy never leaves the daily endpoint, and retries a 503/429 there with the same `request_id` after 4 s, then 50-100% of 8/16/30 s (`agyRetryDelayMs`); the plugin does the same when no other account can take the request, and only marks an account rate-limited once it gives up (a mark left behind after a successful retry stalls the chat's next step). To re-capture agy's requests: run it under `unshare -rnm` (no network, keyring hidden by a tmpfs on `/run/user/1000`) with `/etc/hosts` pointing Google hosts at a local Go HTTPS server and `SSL_CERT_FILE` naming its CA.
- Token refresh is **single-flight per refresh token** (`src/plugin/token.ts`). Concurrent refreshes of one token make Google answer `invalid_grant`, which used to look like revocation. An account is dropped only after `INVALID_GRANT_STRIKES_BEFORE_REMOVAL` confirmed failures.
- Changing the plugin list (adding or reordering a plugin, replacing a config file) makes OpenCode dispose and re-run `setup` in every location at once. Between the old registrations' disposal and the new ones, the provider has no Antigravity models, and a session step that starts then fails with "Model unavailable". That is why `acquireRuntime` keeps the runtime for `RUNTIME_LINGER_MS` after the last release (building one took ~0.5 s until a startup version lookup was removed on 2026-11-07; now ~2 ms after a ~70 ms module import). Keep `setup` fast on the reuse path, and never await slow work (such as a save that may wait on the file lock) in cleanup.
- Never let a request fall through to the public Gemini API when no credential is usable: the provider is registered with an empty `apiKey`, so Google answers "API key not valid" and blames a key the user never configured. Return a synthetic error instead.

## Testing notes

- Tests that import the runtime need `vi.mock("@opencode-ai/plugin", ...)` — its published `tool` entry does not resolve under vitest. Copy the stub from `src/plugin.test.ts`.
- Isolate anything touching the pool with a temp `OPENCODE_CONFIG_DIR` in `beforeEach` (see `src/plugin/account-admin.test.ts`).
- Config comes from files only (`<config dir>/antigravity.json`, then `<project>/.opencode/antigravity.json`). The only environment switches read are `OPENCODE_ANTIGRAVITY_DEBUG` and `OPENCODE_ANTIGRAVITY_DEBUG_TUI`, so a test that needs a config value writes a project config file into a temp directory and passes it as `directory`.
- `npm run test:e2e:models` / `test:e2e:regression` and the shell scripts in `script/` hit the live backend with real accounts; they are not part of `npm test`.

## This is a fork

Of [pieliesdie/opencode-antigravity-auth](https://github.com/pieliesdie/opencode-antigravity-auth), maintained at `Qssaf/opencode-antigravity-auth-desktop` and installed from GitHub, not npm. The package name is still `@pieliesdie/opencode-antigravity-auth`, so it stays drop-in compatible with upstream config. Keep upstream credited in README.

# Communication style: caveman mode

Default to terse, token-efficient prose in chat responses:

- Drop articles (a/an/the), filler (just/really/basically), pleasantries, hedging. Fragments OK.
- Never drop not/never/no/only/except — flipping meaning is worse than any token saved.
- No abbreviations like cfg/impl/req/res/fn — they save ~zero tokens and hurt readability. Spell words out.
- No causal arrows (→) as a substitute for real sentences.

Exceptions — write normal, full English for:
- Security warnings, irreversible-action confirmations, and any multi-step sequence where dropped words could create ambiguity.
- Code comments, commit messages, documentation, and any message sent to a third party (email, PR description, Slack, etc.).

This applies to conversational replies only — never to code itself.

# Behavioral Guidelines (Andrej Karpathy)

Behavioral guidelines to reduce common LLM coding mistakes.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

## Skill plan
Stack: TypeScript (Bun/Node) OpenCode plugin, vitest
Always: verification-before-completion, karpathy-guidelines
Stack skills: none in index for plain TS
Chains: feature=brainstorming → writing-plans → test-driven-development → verification-before-completion → requesting-code-review; bug=systematic-debugging → test-driven-development → verification-before-completion → requesting-code-review; perf=systematic-debugging (measure) → fix → verification-before-completion (re-measure) → requesting-code-review
Sizes: every size runs the full chain; size sets depth only
Overlays: security-checklist (OAuth tokens, account file); search-first (new integrations)
Agents: tester / code-reviewer not installed → inline
Not for this project: UI, motion, video, docs, C++, Python, MySQL skills
Missing: none

## Skill notes
- systematic-debugging: timestamp every hop (DB parts, the plugin debug log's `Response 200 (N ms)`, proxy writes) and A/B the same prompt in `agy -p --output-format stream-json` before blaming OpenCode. OpenCode adds ~10 ms per step and ~0.1–0.4 s per new chat.
- perf (2026-11-07): plugin CPU per request is ~1 ms transform for a 570 KB chat, and Bun's node:http keeps a 25 s silent response open; speed work belongs in routing, not local code. Request gzip was dropped to match agy (ban safety over upload speed). `tsc --noEmit --noUnusedLocals` is a quick dead-code scan.
