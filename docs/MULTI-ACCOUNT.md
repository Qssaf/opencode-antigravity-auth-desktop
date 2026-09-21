# Multi-Account Setup

Add multiple Google accounts to increase your combined quota and improve availability. The plugin automatically rotates between accounts when one is rate-limited.

```bash
opencode auth login  # Run again to add more accounts
```

Google shows its account chooser on every login (the authorization URL asks for
`select_account`), so pick the *other* account when adding one — picking the same
account again just refreshes the token of the account already in the pool.

> **OpenCode 2.x and the desktop app:** the menu is prompted by OpenCode itself.
> Run `opencode auth login`, pick Google → "OAuth with Google (Antigravity)", and
> choose what to do (add / list / enable / disable / remove / quota / verify) and
> which account. It appears once an account is stored.


---

## Load Balancing Behavior

- **Sticky account selection** — Sticks to the same account until rate-limited (preserves Anthropic's prompt cache)
- **Per-model-family limits** — Rate limits tracked separately for Claude and Gemini models
- **Antigravity-first for Gemini** — Gemini requests use Antigravity quota first, then automatically fall back to Gemini CLI when exhausted across all accounts. Public-only models such as Gemini 3.5 Flash-Lite use the Gemini CLI path directly.
- **Smart retry threshold** — Short rate limits (≤5s) are retried on same account
- **Exponential backoff** — Increasing delays for consecutive rate limits

---

## Dual Quota Pools

For Gemini models, the plugin accesses **two independent quota pools** per account:

| Quota Pool | When Used |
|------------|-----------|
| **Antigravity** | Default for all requests |
| **Gemini CLI** | Automatic fallback between Antigravity and Gemini CLI in both directions |

This effectively **doubles your Gemini quota** through automatic fallback between Antigravity and Gemini CLI pools.

### How Quota Fallback Works

1. Request uses Antigravity quota on current account
2. If rate-limited, plugin checks if ANY other account has Antigravity available
3. If yes → switch to that account (stay on Antigravity)
4. If no (all accounts exhausted) → fall back to Gemini CLI quota on current account
5. Model names are automatically transformed (e.g., `gemini-3-flash` → `gemini-3-flash-preview`)

Automatic fallback between pools is always enabled for Gemini requests.

---

## Checking Quotas

Check your current API usage across all accounts:

```bash
opencode auth login
# Select "Check quotas" from the menu
```

This shows the rate-limit buckets Google reports for each account — the weekly
pool that follows your plan tier, and the rolling 5-hour pool that smooths
global demand. Whichever empties first is what blocks a request:

```
┌─────────────────────────────┬────────┬───────────────────┬───────────────┬───────────────────┬───────────────────┐
│ Account                     │ Status │ Gemini weekly     │ Gemini 5-hour │ Claude/GPT weekly │ Claude/GPT 5-hour │
├─────────────────────────────┼────────┼───────────────────┼───────────────┼───────────────────┼───────────────────┤
│ you@gmail.com               │ ACTIVE │  57% (2d 13h 40m) │ 100% (4h 58m) │  99% (6d 5h 6m)   │ 100% (4h 58m)     │
│ other@gmail.com             │ OK     │  63% (2d 13h 35m) │ 100% (4h 58m) │ 100% (6d 23h 58m) │ 100% (4h 58m)     │
└─────────────────────────────┴────────┴───────────────────┴───────────────┴───────────────────┴───────────────────┘
```

From a shell, `antigravity-accounts quota --detailed` adds every bucket and the
per-model 5-hour pools (Claude, Gemini 3 Pro/Flash, Gemini CLI), and
`--json` prints the raw data.

### From a shell

For checking quotas outside of OpenCode (for debugging, CI, etc.):

```bash
antigravity-accounts quota      # or, from a clone: npm run accounts -- quota
```

---

## Managing Accounts

Enable or disable specific accounts to control which ones are used for requests.

On OpenCode 1.x:

```bash
opencode auth login
# Select "Manage accounts (enable/disable)"
```

Or select an account from the list and choose "Enable/Disable account".

On OpenCode 2.x, use the login menu (see above) — it updates the running pool as
well as the file.

Outside OpenCode, on any version, use the standalone CLI, which edits the same
account file (quit OpenCode first, or a running instance may write its in-memory
copy back over the change):

```bash
antigravity-accounts          # interactive menu
antigravity-accounts list
antigravity-accounts add [--no-browser]
antigravity-accounts enable 2
antigravity-accounts disable 2
antigravity-accounts remove 2   # or --all
antigravity-accounts quota
antigravity-accounts verify --all
```

From a clone of this repo (before the package is published with the CLI):

```bash
npm install
npm run accounts            # interactive menu
npm run accounts -- list    # any subcommand, after `--`
```

**Disabled accounts:**
- Are excluded from automatic rotation
- Still appear in quota checks (marked `[disabled]`)
- Can be re-enabled at any time

Useful when:
- An account is temporarily banned or rate-limited for an extended period
- You want to reserve certain accounts for specific use cases
- Testing with a subset of accounts

---

## Adding Accounts

When running `opencode auth login` with existing accounts:

```
2 account(s) saved:
  1. user1@gmail.com
  2. user2@gmail.com

(a)dd new account(s) or (f)resh start? [a/f]:
```

Choose `a` to add more accounts while keeping existing ones.

---

## Account Storage

Accounts are stored in `~/.config/opencode/antigravity-accounts.json`:

```json
{
  "version": 3,
  "accounts": [
    {
      "email": "user1@gmail.com",
      "refreshToken": "1//0abc...",
      "projectId": "my-gcp-project",
      "enabled": true
    },
    {
      "email": "user2@gmail.com",
      "refreshToken": "1//0xyz...",
      "enabled": false
    }
  ],
  "activeIndex": 0,
  "activeIndexByFamily": {
    "claude": 0,
    "gemini": 0
  }
}
```

> ⚠️ **Security:** This file contains OAuth refresh tokens. Treat it like a password file.

### Fields

| Field | Description |
|-------|-------------|
| `email` | Google account email |
| `refreshToken` | OAuth refresh token (auto-managed) |
| `projectId` | Optional. Required for Gemini CLI models. See [Troubleshooting](TROUBLESHOOTING.md#gemini-cli-permission-error). |
| `enabled` | Optional. Set to `false` to disable account rotation. Defaults to `true`. |
| `activeIndex` | Currently active account index |
| `activeIndexByFamily` | Per-model-family active account (claude/gemini tracked separately) |

---

## Token Revocation

If Google revokes a token (e.g., password change, security event), you'll see `invalid_grant` errors. The plugin removes an account only after a *second* refresh also comes back `invalid_grant`: Google returns it for transient reasons too (notably several refreshes of the same token at once), and a single one used to empty the pool during long runs. The first one only puts the account on a short cooldown.

To manually reset:

```bash
rm ~/.config/opencode/antigravity-accounts.json
opencode auth login
```

---

## Parallel Sessions (oh-my-opencode)

When using oh-my-opencode with parallel subagents, multiple processes may select the same account, causing rate limit errors.

**Solution:** Enable PID-based offset in `antigravity.json`:

```json
{
  "pid_offset_enabled": true
}
```

This distributes sessions across accounts based on process ID.

Alternatively, add more accounts via `opencode auth login`.

---

## Account Selection Strategies

Configure in `antigravity.json`:

```json
{
  "account_selection_strategy": "hybrid"
}
```

| Strategy | Behavior | Best For |
|----------|----------|----------|
| `sticky` | Same account until rate-limited | Prompt cache preservation |
| `round-robin` | Rotate to next account on every request | Maximum throughput |
| `hybrid` | Deterministic selection based on health score + token bucket + LRU | Best overall distribution |

See [Configuration](CONFIGURATION.md#account-selection) for more details.
