import { afterEach, expect, test, vi } from "vitest";

afterEach(() => {
  delete (globalThis as unknown as { musicStore?: unknown }).musicStore;
  vi.unstubAllEnvs();
  vi.resetModules();
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

test("falls back to the demo store when CloudBase store setup fails", async () => {
  vi.stubEnv("CLOUDBASE_ENV_ID", "env-id");
  vi.stubEnv("TENCENTCLOUD_SECRET_ID", "secret-id");
  vi.stubEnv("TENCENTCLOUD_SECRET_KEY", "secret-key");

  vi.doMock("./cloudbase-store", () => ({
    createCloudBaseMusicStore() {
      throw new Error("CloudBase init failed");
    },
  }));

  const { getMusicStore } = await import("./server-store");

  const store = await getMusicStore();

  expect(typeof store.listStyleTemplates).toBe("function");
  await expect(Promise.resolve(store.listStyleTemplates())).resolves.toHaveLength(
    30,
  );
});
