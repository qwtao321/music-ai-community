import { afterEach, expect, test, vi } from "vitest";

afterEach(() => {
  delete (globalThis as unknown as { musicStore?: unknown }).musicStore;
  vi.unstubAllEnvs();
});

test("rebuilds a cached store left over from a previous dev-server version", async () => {
  vi.stubEnv("CLOUDBASE_FORCE_DEMO", "true");
  (globalThis as unknown as { musicStore?: unknown }).musicStore = {};

  const { getMusicStore } = await import("./server-store");

  const store = await getMusicStore();

  expect(typeof store.listStyleTemplates).toBe("function");
  await expect(Promise.resolve(store.listStyleTemplates())).resolves.toHaveLength(
    30,
  );
});
