#!/usr/bin/env node
/**
 * Entry point for the `antigravity-accounts` binary.
 *
 * The account pool lives in a file, not in OpenCode, so managing it does not
 * need a running OpenCode — which is what makes this usable on OpenCode 2.x and
 * the desktop app, where the plugin cannot prompt.
 */
import { main } from "./src/cli/accounts";

void main();
