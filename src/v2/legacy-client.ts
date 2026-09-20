/**
 * Stand-in for the OpenCode 1.x plugin `client` that the shared Antigravity
 * runtime was written against.
 *
 * Only the parts that make sense on OpenCode 2.x are backed by anything:
 *
 * - `tui.showToast`: 2.x server plugins cannot show toasts (only TUI plugins
 *   can), so toasts are dropped. They are informational.
 * - `auth.set`: credentials are refreshed through the OAuth method's `refresh`
 *   callback, which OpenCode 2.x stores itself.
 * - `app.log`: forwarded nowhere; the plugin's own file logger keeps working.
 * - `session.*`: used only by the 1.x session recovery, which reads 1.x
 *   message storage. It is not wired up on 2.x, where OpenCode itself supplies
 *   a result for tool calls that never completed. Calls fail loudly so a
 *   future caller does not silently do nothing.
 */

import type { PluginClient } from "../plugin/types";

const ok = async () => ({ data: true });

function unsupported(name: string): () => Promise<never> {
  return async () => {
    throw new Error(`client.${name} is not available when running on OpenCode 2.x`);
  };
}

export function createLegacyClient(): PluginClient {
  const client = {
    app: { log: ok },
    tui: { showToast: ok },
    auth: { set: ok },
    session: {
      prompt: unsupported("session.prompt"),
      messages: unsupported("session.messages"),
      abort: unsupported("session.abort"),
    },
  };
  // The 1.x client type is the full generated SDK; only the members above are
  // reachable from the code paths this adapter enables.
  return client as unknown as PluginClient;
}
