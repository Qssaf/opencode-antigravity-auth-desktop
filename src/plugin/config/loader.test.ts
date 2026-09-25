import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { loadConfig } from "./loader";
import { DEFAULT_CONFIG } from "./schema";

describe("loadConfig", () => {
  let configDir: string;
  let projectDir: string;
  const previousConfigDir = process.env.OPENCODE_CONFIG_DIR;

  beforeEach(() => {
    configDir = mkdtempSync(join(tmpdir(), "ag-config-"));
    projectDir = mkdtempSync(join(tmpdir(), "ag-project-"));
    process.env.OPENCODE_CONFIG_DIR = configDir;
  });

  afterEach(() => {
    if (previousConfigDir === undefined) delete process.env.OPENCODE_CONFIG_DIR;
    else process.env.OPENCODE_CONFIG_DIR = previousConfigDir;
    rmSync(configDir, { recursive: true, force: true });
    rmSync(projectDir, { recursive: true, force: true });
  });

  it("keeps valid fields when another field is out of range", () => {
    writeFileSync(
      join(configDir, "antigravity.json"),
      JSON.stringify({
        scheduling_mode: "performance_first",
        empty_response_max_attempts: 2,
        empty_response_retry_delay_ms: 300,
      }),
    );

    const config = loadConfig(projectDir);

    expect(config.scheduling_mode).toBe("performance_first");
    expect(config.empty_response_max_attempts).toBe(2);
    expect(config.empty_response_retry_delay_ms).toBe(DEFAULT_CONFIG.empty_response_retry_delay_ms);
  });

  it("applies a partly invalid project config over the user config", () => {
    writeFileSync(join(configDir, "antigravity.json"), JSON.stringify({ quiet_mode: false }));
    mkdirSync(join(projectDir, ".opencode"));
    writeFileSync(
      join(projectDir, ".opencode", "antigravity.json"),
      JSON.stringify({ quiet_mode: true, scheduling_mode: "not-a-mode" }),
    );

    const config = loadConfig(projectDir);

    expect(config.quiet_mode).toBe(true);
    expect(config.scheduling_mode).toBe(DEFAULT_CONFIG.scheduling_mode);
  });
});
