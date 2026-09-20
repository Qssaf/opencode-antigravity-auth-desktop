import {
  AntigravityCLIOAuthPlugin,
  GoogleOAuthPlugin,
} from "./src/plugin";
import { OpenCodeV2Plugin } from "./src/v2";

export {
  AntigravityCLIOAuthPlugin,
  GoogleOAuthPlugin,
};

export {
  authorizeAntigravity,
  exchangeAntigravity,
} from "./src/antigravity/oauth";

export type {
  AntigravityAuthorization,
  AntigravityTokenExchangeResult,
} from "./src/antigravity/oauth";

/**
 * One entrypoint for both OpenCode generations:
 *
 * - OpenCode 2.x reads `id` and `setup` and ignores `server`.
 * - OpenCode 1.x (1.18.29 and newer) calls `server` and ignores `id`/`setup`.
 *
 * The named exports above stay for tools that import the 1.x plugin directly.
 */
export default {
  ...OpenCodeV2Plugin,
  server: AntigravityCLIOAuthPlugin,
};
