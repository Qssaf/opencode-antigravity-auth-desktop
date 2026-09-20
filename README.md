# Antigravity + Gemini CLI OAuth Plugin for Opencode

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Fork of pieliesdie/opencode-antigravity-auth](https://img.shields.io/badge/fork%20of-pieliesdie%2Fopencode--antigravity--auth-blue)](https://github.com/pieliesdie/opencode-antigravity-auth)

Enable Opencode to authenticate against **Antigravity** (Google's IDE) via OAuth so you can use Antigravity rate limits and access models like `gemini-3.1-pro` and `claude-opus-4-6-thinking` with your Google credentials.

> **This is [Qssaf](https://github.com/Qssaf)'s fork** of
> [pieliesdie/opencode-antigravity-auth](https://github.com/pieliesdie/opencode-antigravity-auth),
> focused on making multi-account work on the OpenCode desktop app / OpenCode 2.x.
> It is installed from this repository, not from npm — see [Installation](#installation).
>
> On top of upstream it adds:
> - Google's **account chooser on every login**, so a second account can actually be added
> - **`/antigravity`** — manage accounts from inside OpenCode 2.x, where the 1.x menu cannot run
> - the **`antigravity-accounts` CLI** for the same operations outside OpenCode
> - fixes for accounts being dropped on a transient `invalid_grant`, and for requests
>   falling through to Google's misleading `API key not valid` error

## What You Get

- **Claude Opus 4.6, Sonnet 4.6** and **Gemini 3.1 Pro/Flash** via Google OAuth
- **Multi-account support** — add multiple Google accounts, auto-rotates when rate-limited
- **Modern Gemini API support** — use Antigravity SDK-style API keys / Cloud Projects as Gemini backups or opt-in primary routing
- **Legacy Gemini CLI quota support** — still available for compatibility and quota fallback
- **Thinking models** — extended thinking for Claude and Gemini 3 with configurable budgets
- **Google Search grounding** — enable web search for Gemini models (auto or always-on)
- **Auto-recovery** — handles session errors and tool failures automatically
- **Plugin compatible** — works alongside other OpenCode plugins (oh-my-opencode, dcp, etc.)

---

<details open>
<summary><b>⚠️ Terms of Service Warning — Read Before Installing</b></summary>

> [!CAUTION]
> Using this plugin (and any proxy for Antigravity) violates Google's Terms of Service. A number of users have reported their Google accounts being **banned** or **shadow-banned** (restricted access without explicit notification).
>
> **By using this plugin, you acknowledge:**
> - This is an unofficial tool not endorsed by Google
> - Your account may be suspended or permanently banned
> - You assume all risks associated with using this plugin
>

</details>

---

## Installation

<details open>
<summary><b>For Humans</b></summary>

This fork is not published to npm; it is installed from this repository.

1. **Add the plugin** to `~/.config/opencode/opencode.json`.

   On OpenCode 2.x the key is `plugins` (plural):

   ```json
   {
     "plugins": ["github:Qssaf/opencode-antigravity-auth-desktop"]
   }
   ```

   On OpenCode 1.x it is `plugin` (singular):

   ```json
   {
     "plugin": ["github:Qssaf/opencode-antigravity-auth-desktop"]
   }
   ```

   Check with `opencode --version`. One package supports both; only the config key differs. See [OpenCode 2.x](#opencode-2x) for what changes on 2.x.

   Verify it loaded with `opencode plugin list`, which prints the resolved path.

   **From a local clone** (what to use while changing the plugin, and the fallback
   if your OpenCode build does not resolve `github:` specifiers):

   ```bash
   git clone https://github.com/Qssaf/opencode-antigravity-auth-desktop.git
   cd opencode-antigravity-auth-desktop
   npm install && npm run build
   ```

   ```json
   {
     "plugins": ["/absolute/path/to/opencode-antigravity-auth-desktop"]
   }
   ```

2. **Login** with your Google account:

   ```bash
   opencode auth login
   ```

3. **Models** — current OpenCode versions can load plugin models dynamically at runtime. If your OpenCode version still requires static provider config, choose one:
   - Run `opencode auth login` → Google → OAuth with Google (Antigravity) → select **"Configure models in opencode.json"** (auto-configures all models)
   - Or manually copy the [full configuration](#models) below

4. **Use it:**

   ```bash
   opencode run "Hello" --model=google/antigravity-claude-opus-4-6-thinking --variant=max
   ```

</details>

<details>
<summary><b>For LLM Agents</b></summary>

### Step-by-Step Instructions

1. Edit the OpenCode configuration file at `~/.config/opencode/opencode.json`
   
   > **Note**: This path works on all platforms. On Windows, `~` resolves to your user home directory (e.g., `C:\Users\YourName`).

2. Add `"github:Qssaf/opencode-antigravity-auth-desktop"` to the `plugins` array (OpenCode 2.x) or the `plugin` array (OpenCode 1.x)

3. Add the model definitions from the [Full models configuration](#models) section

4. Set `provider` to `"google"` and choose a model

### Verification

```bash
opencode run "Hello" --model=google/antigravity-claude-opus-4-6-thinking --variant=max
```

</details>

---

## Models

### Model Reference

**Antigravity quota** (default routing for Claude and Gemini):

| Model | Variants | Notes |
|-------|----------|-------|
| `antigravity-gemini-3-pro` | low, high | Gemini 3 Pro with thinking |
| `antigravity-gemini-3.1-pro` | low, high | Gemini 3.1 Pro with thinking (rollout-dependent) |
| `antigravity-gemini-3-flash` | minimal, low, medium, high | Gemini 3 Flash with thinking |
| `antigravity-gemini-3.5-flash` | minimal, low, medium, high | Gemini 3.5 Flash with thinking (rollout-dependent) |
| `antigravity-gemini-3.6-flash` | low, medium, high | Gemini 3.6 Flash with thinking (medium default) |
| `antigravity-gemini-3.7-flash` | low, medium, high | Gemini 3.7 Flash with thinking (medium default) |
| `antigravity-gemini-3.8-flash` | low, medium, high | **Newest.** Gemini 3.8 Flash with thinking (medium default) |
| `antigravity-claude-sonnet-4-6` | — | Claude Sonnet 4.6 |
| `antigravity-claude-opus-4-6-thinking` | low, max | Claude Opus 4.6 with extended thinking |

**Antigravity SDK / Gemini API projects** (API-key backed; used by API-key auth, or as OAuth fallback when configured):

The official Antigravity SDK uses `GEMINI_API_KEY` for local Gemini access. This plugin now supports that path directly for Gemini models while keeping OAuth accounts for Antigravity and Claude.

**Legacy Gemini CLI quota** (separate from Antigravity; used when `cli_first` is true or as fallback):

| Model | Notes |
|-------|-------|
| `gemini-2.5-flash` | Gemini 2.5 Flash |
| `gemini-2.5-pro` | Gemini 2.5 Pro |
| `gemini-3-flash-preview` | Gemini 3 Flash (preview) |
| `gemini-3.5-flash` | Gemini 3.5 Flash (rollout-dependent) |
| `gemini-3.5-flash-lite` | Gemini 3.5 Flash-Lite (minimal default) |
| `gemini-3.6-flash` | Gemini 3.6 Flash (medium default) |
| `gemini-3.7-flash` | Gemini 3.7 Flash (medium default) |
| `gemini-3.8-flash` | **Newest.** Gemini 3.8 Flash (medium default) |
| `gemini-3-pro-preview` | Gemini 3 Pro (preview) |
| `gemini-3.1-pro` | Gemini 3.1 Pro |
| `gemini-3.1-pro-preview-customtools` | Gemini 3.1 Pro Preview Custom Tools |

> **Routing Behavior:**
> - **OAuth Antigravity-first (default):** Gemini models use Antigravity quota across OAuth accounts.
>   Gemini 3.5 Flash-Lite is public-only and uses the Gemini CLI/public path directly.
> - **Antigravity SDK / Gemini API:** API-key auth, `GEMINI_API_KEY`, or configured `agy_sdk.cloud_projects` route Gemini requests through the public Gemini API.
> - **Legacy CLI-first (`cli_first: true`):** Gemini models use the legacy Gemini CLI quota first.
> - When OAuth quota pools are exhausted, configured `agy_sdk.cloud_projects` are used as backup capacity before failing if `agy_sdk.enabled: true`, `agy_sdk.api_key_fallback: true`, and usable API-key credentials are present.
> - Claude and image models always use Antigravity.
> Model names are automatically transformed for the target API (e.g., `antigravity-gemini-3-flash` → `gemini-3-flash-preview` for CLI).

**Using variants:**
```bash
opencode run "Hello" --model=google/antigravity-claude-opus-4-6-thinking --variant=max
```

For details on variant configuration and thinking levels, see [docs/MODEL-VARIANTS.md](docs/MODEL-VARIANTS.md).

<details>
<summary><b>Full models configuration (copy-paste ready)</b></summary>

Add this to your `~/.config/opencode/opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["github:Qssaf/opencode-antigravity-auth-desktop"],
  "provider": {
    "google": {
      "models": {
        "antigravity-gemini-3-pro": {
          "name": "Gemini 3 Pro (Antigravity)",
          "limit": { "context": 1048576, "output": 65535 },
          "modalities": { "input": ["text", "image", "pdf"], "output": ["text"] },
          "variants": {
            "low": { "thinkingLevel": "low" },
            "high": { "thinkingLevel": "high" }
          }
        },
        "antigravity-gemini-3.1-pro": {
          "name": "Gemini 3.1 Pro (Antigravity)",
          "limit": { "context": 1048576, "output": 65535 },
          "modalities": { "input": ["text", "image", "pdf"], "output": ["text"] },
          "variants": {
            "low": { "thinkingLevel": "low" },
            "high": { "thinkingLevel": "high" }
          }
        },
        "antigravity-gemini-3-flash": {
          "name": "Gemini 3 Flash (Antigravity)",
          "limit": { "context": 1048576, "output": 65536 },
          "modalities": { "input": ["text", "image", "pdf"], "output": ["text"] },
          "variants": {
            "minimal": { "thinkingLevel": "minimal" },
            "low": { "thinkingLevel": "low" },
            "medium": { "thinkingLevel": "medium" },
            "high": { "thinkingLevel": "high" }
          }
        },
        "antigravity-gemini-3.5-flash": {
          "name": "Gemini 3.5 Flash (Antigravity)",
          "limit": { "context": 1048576, "output": 65536 },
          "modalities": { "input": ["text", "image", "pdf"], "output": ["text"] },
          "variants": {
            "minimal": { "thinkingLevel": "minimal" },
            "low": { "thinkingLevel": "low" },
            "medium": { "thinkingLevel": "medium" },
            "high": { "thinkingLevel": "high" }
          }
        },
        "antigravity-gemini-3.6-flash": {
          "name": "Gemini 3.6 Flash (Antigravity)",
          "limit": { "context": 1048576, "output": 65536 },
          "modalities": { "input": ["text", "image", "pdf"], "output": ["text"] },
          "variants": {
            "low": { "thinkingLevel": "low" },
            "medium": { "thinkingLevel": "medium" },
            "high": { "thinkingLevel": "high" }
          }
        },
        "antigravity-gemini-3.7-flash": {
          "name": "Gemini 3.7 Flash (Antigravity)",
          "limit": { "context": 1048576, "output": 65536 },
          "modalities": { "input": ["text", "image", "pdf"], "output": ["text"] },
          "variants": {
            "minimal": { "thinkingLevel": "minimal" },
            "low": { "thinkingLevel": "low" },
            "medium": { "thinkingLevel": "medium" },
            "high": { "thinkingLevel": "high" }
          }
        },
        "antigravity-gemini-3.8-flash": {
          "name": "Gemini 3.8 Flash (Antigravity)",
          "limit": { "context": 1048576, "output": 65536 },
          "modalities": { "input": ["text", "image", "pdf"], "output": ["text"] },
          "variants": {
            "low": { "thinkingLevel": "low" },
            "medium": { "thinkingLevel": "medium" },
            "high": { "thinkingLevel": "high" }
          }
        },
        "antigravity-claude-sonnet-4-6": {
          "name": "Claude Sonnet 4.6 (Antigravity)",
          "limit": { "context": 200000, "output": 64000 },
          "modalities": { "input": ["text", "image", "pdf"], "output": ["text"] }
        },
        "antigravity-claude-opus-4-6-thinking": {
          "name": "Claude Opus 4.6 Thinking (Antigravity)",
          "limit": { "context": 200000, "output": 64000 },
          "modalities": { "input": ["text", "image", "pdf"], "output": ["text"] },
          "variants": {
            "low": { "thinkingConfig": { "thinkingBudget": 8192 } },
            "max": { "thinkingConfig": { "thinkingBudget": 32768 } }
          }
        },
        "gemini-2.5-flash": {
          "name": "Gemini 2.5 Flash (Gemini CLI)",
          "limit": { "context": 1048576, "output": 65536 },
          "modalities": { "input": ["text", "image", "pdf"], "output": ["text"] }
        },
        "gemini-2.5-pro": {
          "name": "Gemini 2.5 Pro (Gemini CLI)",
          "limit": { "context": 1048576, "output": 65536 },
          "modalities": { "input": ["text", "image", "pdf"], "output": ["text"] }
        },
        "gemini-3-flash-preview": {
          "name": "Gemini 3 Flash Preview (Gemini CLI)",
          "limit": { "context": 1048576, "output": 65536 },
          "modalities": { "input": ["text", "image", "pdf"], "output": ["text"] }
        },
        "gemini-3.5-flash": {
          "name": "Gemini 3.5 Flash (Gemini CLI)",
          "limit": { "context": 1048576, "output": 65536 },
          "modalities": { "input": ["text", "image", "pdf"], "output": ["text"] }
        },
        "gemini-3.5-flash-lite": {
          "name": "Gemini 3.5 Flash-Lite (Gemini CLI)",
          "limit": { "context": 1048576, "output": 65536 },
          "modalities": { "input": ["text", "image", "pdf"], "output": ["text"] },
          "variants": {
            "minimal": { "thinkingLevel": "minimal" },
            "low": { "thinkingLevel": "low" },
            "medium": { "thinkingLevel": "medium" },
            "high": { "thinkingLevel": "high" }
          }
        },
        "gemini-3.6-flash": {
          "name": "Gemini 3.6 Flash (Gemini CLI)",
          "limit": { "context": 1048576, "output": 65536 },
          "modalities": { "input": ["text", "image", "pdf"], "output": ["text"] },
          "variants": {
            "medium": { "thinkingLevel": "medium" },
            "high": { "thinkingLevel": "high" }
          }
        },
        "gemini-3.7-flash": {
          "name": "Gemini 3.7 Flash (Gemini CLI)",
          "limit": { "context": 1048576, "output": 65536 },
          "modalities": { "input": ["text", "image", "pdf"], "output": ["text"] },
          "variants": {
            "minimal": { "thinkingLevel": "minimal" },
            "low": { "thinkingLevel": "low" },
            "medium": { "thinkingLevel": "medium" },
            "high": { "thinkingLevel": "high" }
          }
        },
        "gemini-3.8-flash": {
          "name": "Gemini 3.8 Flash (Gemini CLI)",
          "limit": { "context": 1048576, "output": 65536 },
          "modalities": { "input": ["text", "image", "pdf"], "output": ["text"] },
          "variants": {
            "low": { "thinkingLevel": "low" },
            "medium": { "thinkingLevel": "medium" },
            "high": { "thinkingLevel": "high" }
          }
        },
        "gemini-3-pro-preview": {
          "name": "Gemini 3 Pro Preview (Gemini CLI)",
          "limit": { "context": 1048576, "output": 65535 },
          "modalities": { "input": ["text", "image", "pdf"], "output": ["text"] }
        },
        "gemini-3.1-pro": {
          "name": "Gemini 3.1 Pro (Gemini CLI)",
          "limit": { "context": 1048576, "output": 65535 },
          "modalities": { "input": ["text", "image", "pdf"], "output": ["text"] }
        },
        "gemini-3.1-pro-preview-customtools": {
          "name": "Gemini 3.1 Pro Preview Custom Tools (Gemini CLI)",
          "limit": { "context": 1048576, "output": 65535 },
          "modalities": { "input": ["text", "image", "pdf"], "output": ["text"] }
        }
      }
    }
  }
}
```

> **Backward Compatibility:** Legacy model names with `antigravity-` prefix (e.g., `antigravity-gemini-3-flash`) still work. The plugin automatically handles model name transformation for both Antigravity and Gemini CLI APIs.

</details>

---

## Multi-Account Setup

Add multiple Google accounts for a higher combined quota. The plugin automatically rotates between accounts when one is rate-limited.

```bash
opencode auth login  # Run again to add more accounts
```

Google shows its account chooser on every login, so pick the *other* account when
adding one — choosing the account that is already stored just refreshes its token.

### Managing accounts

**OpenCode 2.x and the desktop app — the login menu.** Run `opencode auth login`,
pick Google → **OAuth with Google (Antigravity)**, and the plugin's own menu is
prompted by OpenCode:

```
? Antigravity accounts
  > Add a Google account      Sign in and add it to the rotation pool
    List accounts             Show every stored account and its state
    Enable an account         Put an account back into rotation
    Disable an account        Keep an account stored but out of rotation
    Remove an account         Delete an account from the pool
    Check quotas              Remaining Antigravity and Gemini CLI quota
    Verify access             Check accounts against the Antigravity backend

? Which account?
  > 1. you@gmail.com          current
    2. other@gmail.com        disabled
    All accounts
```

Only **Add** continues into a Google sign-in; the others run immediately and show
the result. The menu appears once you have an account stored — a first login (and
any scripted one) is still a plain sign-in.

Everything is scriptable too, which is also how to check it quickly:

```bash
opencode auth login google --method antigravity --answer action=list
opencode auth login google --method antigravity --answer action=disable --answer account=2
```

> **After installing or updating the plugin, restart the background server** —
> OpenCode 2.x keeps plugins loaded in a server that outlives the CLI, so a new
> version is not picked up until you run `opencode service stop` (or
> `opencode service restart`). `opencode plugin list` shows which copy is loaded.

**Also on 2.x — the `/antigravity` command,** if you would rather not leave the
session. It answers in place without spending a model call:

```
/antigravity                 list stored accounts
/antigravity add             sign in and add another Google account
/antigravity enable 2        put account 2 back into rotation
/antigravity disable 2       take account 2 out of rotation
/antigravity remove 2        delete account 2
/antigravity quota           remaining quota per account
/antigravity verify all      check accounts against Antigravity
```

Changes apply to the requests already running — the in-memory pool is updated and
the next request re-reads the account file. No restart.

**OpenCode 1.x — the menu inside `opencode auth login`:**
- **Configure models** — Auto-configure all plugin models in opencode.json
- **Check quotas** — View remaining API quota for each account
- **Manage accounts** — Enable/disable specific accounts for rotation

**Outside OpenCode — the `antigravity-accounts` CLI.** Same operations for when
OpenCode is not running (recovering a broken pool, scripting, CI):

```bash
antigravity-accounts          # interactive menu
antigravity-accounts list
antigravity-accounts add
antigravity-accounts disable 2
antigravity-accounts remove 2   # or --all
antigravity-accounts quota
antigravity-accounts verify --all
```

From a clone, without installing the package:

```bash
npm install
npm run accounts            # interactive menu
npm run accounts -- list    # any subcommand, after `--`
```

The CLI edits `antigravity-accounts.json` directly, so quit OpenCode first: a
running instance holds the pool in memory and can write its own copy back over a
change made behind its back. `/antigravity` has no such caveat.

For details on load balancing, dual quota pools, and account storage, see [docs/MULTI-ACCOUNT.md](docs/MULTI-ACCOUNT.md).

---

## OpenCode 2.x

One package supports both OpenCode generations. On 2.x the plugin registers its OAuth method, models, `google_search` tool and the `/antigravity` account command through the 2.x plugin API, while requests still run through the same Antigravity pipeline (account rotation, quota handling, model routing, thinking-block handling).

**Config key:** `plugins` (plural) on 2.x, `plugin` (singular) on 1.x.

**Upgrading from 1.x:** your accounts carry over. `antigravity-accounts.json` is still the account pool, so signed-in accounts keep working without logging in again.

### What differs on 2.x

| | OpenCode 1.x | OpenCode 2.x |
|---|---|---|
| Account management | Interactive menu inside `opencode auth login` (add, check quota, enable/disable, verify) | `opencode auth login` / `logout` / `switch` for credentials, and the `/antigravity` command for the pool (list, add, enable/disable, remove, quota, verify). The `antigravity-accounts` CLI does the same from a shell |
| Status toasts | Shown in the TUI | Not shown — 2.x server plugins cannot raise toasts. Enable `"debug": true` in `antigravity.json` to get the same detail in the log |
| Session recovery | Plugin re-injects missing `tool_result` blocks | Handled by OpenCode itself |
| Update checks | Plugin checks on startup | `opencode plugin update` |
| Model config | Static model definitions may be needed | Registered automatically |

### How requests are routed on 2.x

OpenCode 1.x let a plugin supply a custom `fetch` for a provider. OpenCode 2.x has no such hook: its `http.request` / `http.response` hooks can only swap an actual HTTP exchange, so they cannot produce the synthetic responses (quota-blocked, model-unavailable) or the cross-account retries this plugin relies on.

Instead the plugin starts a loopback listener on `127.0.0.1` (random port, random per-route path token, never reachable off-host) and points the provider's `baseURL` at it. Requests go through the unchanged Antigravity pipeline and responses stream straight back, so behavior matches 1.x. A `baseURL` you configured yourself is left alone.

---

## Troubleshooting

> **Quick Reset**: Most issues can be resolved by deleting `~/.config/opencode/antigravity-accounts.json` and running `opencode auth login` again.

### Configuration Path (All Platforms)

OpenCode uses `~/.config/opencode/` on **all platforms** including Windows.

| File | Path |
|------|------|
| Main config | `~/.config/opencode/opencode.json` |
| Accounts | `~/.config/opencode/antigravity-accounts.json` |
| Plugin config | `~/.config/opencode/antigravity.json` |
| Debug logs | `~/.config/opencode/antigravity-logs/` |

> **Windows users**: `~` resolves to your user home directory (e.g., `C:\Users\YourName`). Do NOT use `%APPDATA%`.

> **Custom path**: Set `OPENCODE_CONFIG_DIR` environment variable to use a custom location.

> **Windows migration**: If upgrading from plugin v1.3.x or earlier, the plugin will automatically find your existing config in `%APPDATA%\opencode\` and use it. New installations use `~/.config/opencode/`.

---

### Multi-Account Auth Issues

If you encounter authentication issues with multiple accounts:

1. Delete the accounts file:
   ```bash
   rm ~/.config/opencode/antigravity-accounts.json
   ```
2. Re-authenticate:
   ```bash
   opencode auth login
   ```

---

### 403 Permission Denied (`rising-fact-p41fc`)

**Error:**
```
Permission 'cloudaicompanion.companions.generateChat' denied on resource 
'//cloudaicompanion.googleapis.com/projects/rising-fact-p41fc/locations/global'
```

**Cause:** Plugin falls back to a default project ID when no valid project is found. This works for Antigravity but fails for Gemini CLI models.

**Solution:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create or select a project
3. Enable the **Gemini for Google Cloud API** (`cloudaicompanion.googleapis.com`)
4. Add `projectId` to your accounts file:
   ```json
   {
     "accounts": [
       {
         "email": "your@email.com",
         "refreshToken": "...",
         "projectId": "your-project-id"
       }
     ]
   }
   ```

> **Note**: Do this for each account in a multi-account setup.

---

### Gemini Model Not Found

Add this to your `google` provider config:

```json
{
  "provider": {
    "google": {
      "npm": "@ai-sdk/google",
      "models": { ... }
    }
  }
}
```

---

### Gemini 3 Models 400 Error ("Unknown name 'parameters'")

**Error:**
```
Invalid JSON payload received. Unknown name "parameters" at 'request.tools[0]'
```

**Causes:**
- Tool schema incompatibility with Gemini's strict protobuf validation
- MCP servers with malformed schemas
- Plugin version regression

**Solutions:**
1. **Reinstall the plugin from this fork** (picks up the latest commit):
   ```json
   { "plugin": ["github:Qssaf/opencode-antigravity-auth-desktop"] }
   ```

2. **Disable MCP servers** one-by-one to find the problematic one

3. **Add npm override:**
   ```json
   { "provider": { "google": { "npm": "@ai-sdk/google" } } }
   ```

---

### MCP Servers Causing Errors

Some MCP servers have schemas incompatible with Antigravity's strict JSON format.

**Common symptom:**
```bash
Invalid function name must start with a letter or underscore
```

Sometimes it shows up as:
```bash
GenerateContentRequest.tools[0].function_declarations[12].name: Invalid function name must start with a letter or underscore
```

This usually means an MCP tool name starts with a number (for example, a 1mcp key like `1mcp_*`). Rename the MCP key to start with a letter (e.g., `gw`) or disable that MCP entry for Antigravity models.

**Diagnosis:**
1. Disable all MCP servers in your config
2. Enable one-by-one until error reappears
3. Report the specific MCP in a [GitHub issue](https://github.com/Qssaf/opencode-antigravity-auth-desktop/issues)

---

### "All Accounts Rate-Limited" (But Quota Available)

**Cause:** Cascade bug in `clearExpiredRateLimits()` in hybrid mode (fixed in recent beta).

**Solutions:**
1. Update to latest beta version
2. If persists, delete accounts file and re-authenticate
3. Try switching `account_selection_strategy` to `"sticky"` in `antigravity.json`

---

### Session Recovery

If you encounter errors during a session:
1. Type `continue` to trigger the recovery mechanism
2. If blocked, use `/undo` to revert to pre-error state
3. Retry the operation

---

### Using with Oh-My-OpenCode

**Important:** Disable the built-in Google auth to prevent conflicts:

```json
// ~/.config/opencode/oh-my-opencode.json
{
  "google_auth": false,
  "agents": {
    "frontend-ui-ux-engineer": { "model": "google/antigravity-gemini-3-pro" },
    "document-writer": { "model": "google/antigravity-gemini-3-flash" }
  }
}
```

---

### Infinite `.tmp` Files Created

**Cause:** When account is rate-limited and plugin retries infinitely, it creates many temp files.

**Workaround:**
1. Stop OpenCode
2. Clean up: `rm ~/.config/opencode/*.tmp`
3. Add more accounts or wait for rate limit to expire

---

### OAuth Callback Issues

<details>
<summary><b>Safari OAuth Callback Fails (macOS)</b></summary>

**Symptoms:**
- "fail to authorize" after successful Google login
- Safari shows "Safari can't open the page"

**Cause:** Safari's "HTTPS-Only Mode" blocks `http://localhost` callback.

**Solutions:**

1. **Use Chrome or Firefox** (easiest):
   Copy the OAuth URL and paste into a different browser.

2. **Disable HTTPS-Only Mode temporarily:**
   - Safari > Settings (⌘,) > Privacy
   - Uncheck "Enable HTTPS-Only Mode"
   - Run `opencode auth login`
   - Re-enable after authentication

</details>

<details>
<summary><b>Port Conflict (Address Already in Use)</b></summary>

**macOS / Linux:**
```bash
# Find process using the port
lsof -i :51121

# Kill if stale
kill -9 <PID>

# Retry
opencode auth login
```

**Windows (PowerShell):**
```powershell
netstat -ano | findstr :51121
taskkill /PID <PID> /F
opencode auth login
```

</details>

<details>
<summary><b>Docker / WSL2 / Remote Development</b></summary>

OAuth callback requires browser to reach `localhost` on the machine running OpenCode.

**WSL2:**
- Use VS Code's port forwarding, or
- Configure Windows → WSL port forwarding

**SSH / Remote:**
```bash
ssh -L 51121:localhost:51121 user@remote
```

**Docker / Containers:**
- OAuth with localhost redirect doesn't work in containers
- Wait 30s for manual URL flow, or use SSH port forwarding

</details>

---

### "Unrecognized key" for `plugin` / `plugins`

The key depends on your OpenCode version — check with `opencode --version`.

OpenCode 2.x uses `plugins` (plural):

```json
{
  "plugins": ["github:Qssaf/opencode-antigravity-auth-desktop"]
}
```

OpenCode 1.x uses `plugin` (singular):

```json
{
  "plugin": ["github:Qssaf/opencode-antigravity-auth-desktop"]
}
```

Using the wrong one for your version causes an "Unrecognized key" error, and the plugin is not loaded.

---

### Migrating Accounts Between Machines

When copying `antigravity-accounts.json` to a new machine:
1. Ensure the plugin is installed: `"plugins": ["github:Qssaf/opencode-antigravity-auth-desktop"]` (`plugin`, singular, on OpenCode 1.x)
2. Copy `~/.config/opencode/antigravity-accounts.json`
3. If you get "API key missing" error, the refresh token may be invalid — re-authenticate

## Known Plugin Interactions
For details on load balancing, dual quota pools, and account storage, see [docs/MULTI-ACCOUNT.md](docs/MULTI-ACCOUNT.md).

---

## Plugin Compatibility

### @tarquinen/opencode-dcp

DCP creates synthetic assistant messages that lack thinking blocks. **List this plugin BEFORE DCP:**

```json
{
  "plugin": [
    "github:Qssaf/opencode-antigravity-auth-desktop",
    "@tarquinen/opencode-dcp@latest"
  ]
}
```

### oh-my-opencode

Disable built-in auth and override agent models in `oh-my-opencode.json`:

```json
{
  "google_auth": false,
  "agents": {
    "frontend-ui-ux-engineer": { "model": "google/antigravity-gemini-3-pro" },
    "document-writer": { "model": "google/antigravity-gemini-3-flash" },
    "multimodal-looker": { "model": "google/antigravity-gemini-3-flash" }
  }
}
```

> **Tip:** When spawning parallel subagents, enable `pid_offset_enabled: true` in `antigravity.json` to distribute sessions across accounts.

### Plugins you don't need

- **gemini-auth plugins** — Not needed. This plugin handles all Google OAuth.

---

## Configuration

Create `~/.config/opencode/antigravity.json` for optional settings:

```json
{
  "$schema": "https://raw.githubusercontent.com/Qssaf/opencode-antigravity-auth-desktop/main/assets/antigravity.schema.json"
}
```

Most users don't need to configure anything — defaults work well.

### Model Behavior

| Option | Default | What it does |
|--------|---------|--------------
| `keep_thinking` | `false` | Preserve Claude's thinking across turns. **Warning:** enabling may degrade model stability. |
| `session_recovery` | `true` | Auto-recover from tool errors |
| `cli_first` | `false` | Route Gemini models to the legacy Gemini CLI path first (Claude and image models stay on Antigravity). |
| `agy_sdk.enabled` | `true` | Enables the Antigravity SDK / Gemini API key route for Gemini requests. |
| `agy_sdk.prefer_for_gemini` | `false` | When API keys are configured, use the Gemini API route before OAuth-backed Antigravity for Gemini models. |
| `agy_sdk.api_key_fallback` | `true` | Use configured API keys / Cloud Projects when OAuth Antigravity and legacy Gemini CLI quotas are unavailable. |
| `model_discovery.enabled` | `true` | Load provider models dynamically from Gemini API / Antigravity model APIs, with bundled static definitions as fallback. |

### Antigravity SDK / Gemini API keys

The official Antigravity SDK quickstart uses `GEMINI_API_KEY`. You can provide one key via environment variable:

```bash
GEMINI_API_KEY=your-key opencode run "Hello" --model=google/gemini-3-pro
```

For multiple Cloud Projects / API keys, add them to `~/.config/opencode/antigravity.json`:

```json
{
  "agy_sdk": {
    "api_key_fallback": true,
    "prefer_for_gemini": false,
    "cloud_projects": [
      { "label": "primary", "project_id": "my-project", "api_key": "..." },
      { "label": "backup", "project_id": "my-backup-project", "api_key": "..." }
    ]
  }
}
```

Keep this file private: API keys are stored in your local OpenCode config and are sent to Gemini with the `x-goog-api-key` header, never in the request URL. Do not commit `antigravity.json` with real keys.

Set `prefer_for_gemini: true` if you want Gemini models to use the newer Gemini API path before OAuth-backed Antigravity. OAuth multi-account rotation remains active for Antigravity/Claude and as fallback when `prefer_for_gemini` keys are unavailable. `cli_first` remains the legacy Gemini CLI compatibility mode.

### Account Rotation

| Your Setup | Recommended Config |
|------------|-------------------|
| **1 account** | `"account_selection_strategy": "sticky"` |
| **2-5 accounts** | Default (`"hybrid"`) works great |
| **5+ accounts** | `"account_selection_strategy": "round-robin"` |
| **Parallel agents** | Add `"pid_offset_enabled": true` |

### Quota Protection

| Option | Default | What it does |
|--------|---------|--------------|
| `soft_quota_threshold_percent` | `90` | Skip account when quota usage exceeds this percentage. Prevents Google from penalizing accounts that fully exhaust quota. Set to `100` to disable. |
| `quota_refresh_interval_minutes` | `15` | Background quota refresh interval. After successful API requests, refreshes quota cache if older than this interval. Set to `0` to disable. |
| `soft_quota_cache_ttl_minutes` | `"auto"` | How long quota cache is considered fresh. `"auto"` = max(2 × refresh interval, 10 minutes). Set a number (1-120) for fixed TTL. |

> **How it works**: Quota cache is refreshed automatically after API requests (when older than `quota_refresh_interval_minutes`) and manually via "Check quotas" in `opencode auth login`. The threshold check uses `soft_quota_cache_ttl_minutes` to determine cache freshness - if cache is older, the account is considered "unknown" and allowed (fail-open). When ALL accounts exceed the threshold, the plugin waits for the earliest quota reset time (like rate limit behavior). If wait time exceeds `max_rate_limit_wait_seconds`, it errors immediately.

### Rate Limit Scheduling

Control how the plugin handles rate limits:

| Option | Default | What it does |
|--------|---------|--------------|
| `scheduling_mode` | `"cache_first"` | `"cache_first"` = wait for same account (preserves prompt cache), `"balance"` = switch immediately, `"performance_first"` = round-robin |
| `max_cache_first_wait_seconds` | `60` | Max seconds to wait in cache_first mode before switching accounts |
| `failure_ttl_seconds` | `3600` | Reset failure count after this many seconds (prevents old failures from permanently penalizing accounts) |

**When to use each mode:**
- **cache_first** (default): Best for long conversations. Waits for the same account to recover, preserving your prompt cache.
- **balance**: Best for quick tasks. Switches accounts immediately when rate-limited for maximum availability.
- **performance_first**: Best for many short requests. Distributes load evenly across all accounts.

### App Behavior

| Option | Default | What it does |
|--------|---------|--------------|
| `quiet_mode` | `false` | Hide toast notifications |
| `debug` | `false` | Enable debug file logging (`~/.config/opencode/antigravity-logs/`) |
| `debug_tui` | `false` | Show debug logs in the TUI log panel (independent from `debug`) |
| `auto_update` | `true` | Auto-update plugin |

For all options, see [docs/CONFIGURATION.md](docs/CONFIGURATION.md).

**Environment variables:**
```bash
OPENCODE_CONFIG_DIR=/path/to/config opencode  # Custom config directory
OPENCODE_ANTIGRAVITY_DEBUG=1 opencode         # Enable debug file logging
OPENCODE_ANTIGRAVITY_DEBUG=2 opencode         # Verbose debug file logging
OPENCODE_ANTIGRAVITY_DEBUG_TUI=1 opencode     # Enable TUI log panel debug output
```

---

## Troubleshooting

See the full [Troubleshooting Guide](docs/TROUBLESHOOTING.md) for solutions to common issues including:

- Auth problems and token refresh
- "Model not found" errors
- Session recovery
- Gemini CLI permission errors
- Safari OAuth issues
- Plugin compatibility
- Migration guides

---

## Documentation

- [Configuration](docs/CONFIGURATION.md) — All configuration options
- [Multi-Account](docs/MULTI-ACCOUNT.md) — Load balancing, dual quota pools, account storage
- [Model Variants](docs/MODEL-VARIANTS.md) — Thinking budgets and variant system
- [Troubleshooting](docs/TROUBLESHOOTING.md) — Common issues and fixes
- [Architecture](docs/ARCHITECTURE.md) — How the plugin works
- [API Spec](docs/ANTIGRAVITY_API_SPEC.md) — Antigravity API reference

---

## Credits

- [opencode-gemini-auth](https://github.com/jenslys/opencode-gemini-auth) by [@jenslys](https://github.com/jenslys)
- [CLIProxyAPI](https://github.com/router-for-me/CLIProxyAPI)

## License

MIT License. See [LICENSE](LICENSE) for details.

<details>
<summary><b>Legal</b></summary>

### Intended Use

- Personal / internal development only
- Respect internal quotas and data handling policies
- Not for production services or bypassing intended limits

### Warning

By using this plugin, you acknowledge:

- **Terms of Service risk** — This approach may violate ToS of AI model providers
- **Account risk** — Providers may suspend or ban accounts
- **No guarantees** — APIs may change without notice
- **Assumption of risk** — You assume all legal, financial, and technical risks

### Disclaimer

- Not affiliated with Google. This is an independent open-source project.
- "Antigravity", "Gemini", "Google Cloud", and "Google" are trademarks of Google LLC.

</details>
