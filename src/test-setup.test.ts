import { tmpdir } from "node:os";
import { resolve, sep } from "node:path";
import { describe, expect, it } from "vitest";

describe("test setup", () => {
  // A run against the real config dir reads the user's antigravity.json and,
  // with `debug` on there, writes log files that rotate their real logs away.
  it("points the plugin's config directory at a temporary one", () => {
    const configDir = process.env.OPENCODE_CONFIG_DIR;
    expect(configDir).toBeTruthy();
    expect(resolve(configDir ?? "").startsWith(resolve(tmpdir()) + sep)).toBe(true);
  });
});
