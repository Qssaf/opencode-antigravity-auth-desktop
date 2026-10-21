# Model Variants

OpenCode's variant system lets you configure the thinking budget dynamically without defining separate models for each thinking level.

---

## How Variants Work

When you define a model with `variants`, OpenCode shows variant options in the model picker. Selecting a variant passes the `providerOptions` to the plugin, which extracts the thinking configuration.

```bash
opencode run "Hello" --model=google/antigravity-gemini-4-argon --variant=medium
```

---

## Variant Configuration

Define variants in your model configuration:

```json
{
  "antigravity-gemini-4-argon": {
    "name": "Gemini 4 Argon (Antigravity, Ultra)",
    "limit": { "context": 262144, "output": 65536 },
    "modalities": { "input": ["text", "image", "pdf"], "output": ["text"] },
    "variants": {
      "low": { "thinkingLevel": "low" },
      "medium": { "thinkingLevel": "medium" },
      "high": { "thinkingLevel": "high" }
    }
  }
}
```

---

## Supported Variant Formats

The plugin accepts different variant formats depending on the model family:

| Model Family | Variant Format | Example |
|--------------|----------------|---------|
| **Claude** | `thinkingConfig.thinkingBudget` | `{ "thinkingConfig": { "thinkingBudget": 8192 } }` |
| **Gemini 3 and 4** | `thinkingLevel` | `{ "thinkingLevel": "high" }` |

---

## Gemini 3 Thinking Levels

Gemini 3 and Gemini 4 models use string-based thinking levels. Available levels differ by model:

| Level | 3.8 Flash | 4 Argon | Description |
|-------|-----------|---------|-------------|
| `minimal` | sent as `low` | sent as `low` | Minimal thinking, lowest latency |
| `low` | ✅ | ✅ | Light thinking |
| `medium` | ✅ | ✅ | Balanced thinking |
| `high` | ✅ | ✅ | Maximum thinking |

> **Note:** Antigravity serves only Gemini 3.8 Flash and Gemini 4 Argon, and rejects `"minimal"` on both, so the plugin sends `low`. Both default to `high`.
> Gemini 4 Argon needs a Google AI Ultra subscription; see the README.
> Any other Gemini model (3 Pro, 3.1 Pro, 3 Flash, 3.1 Flash-Lite, 2.5, the dropped 3.5-3.7 Flash, and the former Gemini CLI models) is served as Gemini 3.8 Flash at the same tier.

### Gemini 3.8 Flash Example

```json
{
  "antigravity-gemini-3.8-flash": {
    "name": "Gemini 3.8 Flash (Antigravity)",
    "limit": { "context": 262144, "output": 65536 },
    "modalities": { "input": ["text", "image", "pdf"], "output": ["text"] },
    "variants": {
      "low": { "thinkingLevel": "low" },
      "medium": { "thinkingLevel": "medium" },
      "high": { "thinkingLevel": "high" }
    }
  }
}
```

---

## Claude Thinking Budget

Claude models use token-based thinking budgets (in tokens). Google dropped Claude Sonnet 4.6 and Opus 4.6 from Antigravity, so the plugin no longer lists a Claude model; the budget handling below still applies to any Claude model you configure yourself.

| Variant | Budget | Description |
|---------|--------|-------------|
| `low` | 8192 | Light thinking |
| `max` | 32768 | Maximum thinking |

### Claude Example

```json
{
  "antigravity-claude-opus-4-6-thinking": {
    "name": "Claude Opus 4.6 Thinking (Antigravity)",
    "limit": { "context": 200000, "output": 64000 },
    "modalities": { "input": ["text", "image", "pdf"], "output": ["text"] },
    "variants": {
      "low": { "thinkingConfig": { "thinkingBudget": 8192 } },
      "max": { "thinkingConfig": { "thinkingBudget": 32768 } }
    }
  }
}
```

You can define custom budgets:

```json
{
  "variants": {
    "minimal": { "thinkingConfig": { "thinkingBudget": 4096 } },
    "low": { "thinkingConfig": { "thinkingBudget": 8192 } },
    "medium": { "thinkingConfig": { "thinkingBudget": 16384 } },
    "high": { "thinkingConfig": { "thinkingBudget": 24576 } },
    "max": { "thinkingConfig": { "thinkingBudget": 32768 } }
  }
}
```

---

## Legacy Budget Format (Deprecated)

For Gemini 3 models, the old `thinkingBudget` format is still supported but deprecated:

| Budget Range | Maps to Level |
|--------------|---------------|
| ≤ 8192 | low |
| ≤ 16384 | medium |
| > 16384 | high |

**Recommended:** Use `thinkingLevel` directly for Gemini 3 models.

---

## Tier-Suffixed Names

Tier-suffixed model names are still accepted:

- `antigravity-gemini-4-argon-low`
- `antigravity-gemini-4-argon-high`
- `antigravity-gemini-3.8-flash-low`
- `antigravity-gemini-3.8-flash-high`
- `gemini-3.1-pro-low`
- `gemini-3-flash-medium`

However, **we recommend using simplified model names with variants** for:

- **Cleaner model picker** — 7 models instead of 12+
- **Simpler config** — No need to configure both `antigravity-` and `-preview` versions
- **Automatic quota routing** — Plugin handles model name transformation
- **Flexible budgets** — Define any budget, not just preset tiers
- **Future-proof** — Works with OpenCode's native variant system

---

## Benefits of Variants

| Before (tier-suffixed) | After (variants) |
|------------------------|------------------|
| 12+ separate models | 4 models with variants |
| Fixed thinking budgets | Customizable budgets |
| Cluttered model picker | Clean model picker |
| Hard to add new tiers | Easy to add new variants |
