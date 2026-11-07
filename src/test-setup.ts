import { vi } from "vitest";

// Tests stub `fetch` for Google's endpoints; the HTTP/2 client the plugin
// uses for them is routed through it. google-http.test.ts tests the
// real client.
vi.mock("./antigravity/google-http", async (importOriginal) => {
  const original = await importOriginal<typeof import("./antigravity/google-http")>();
  return {
    ...original,
    googleRequest: (url: string, init: RequestInit) => fetch(url, init),
    googleFetch: (url: string | URL, init?: RequestInit) => fetch(url, init),
  };
});
