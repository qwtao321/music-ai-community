import { describe, expect, it } from "vitest";
import { CloudBaseMusicStore } from "./cloudbase-store";
import type { MusicProvider } from "./provider";
import type { ProviderCreateRequest, ProviderJobResult } from "./types";

class SucceedingProvider implements MusicProvider {
  readonly name = "test-provider";

  async createJob(request: ProviderCreateRequest): Promise<ProviderJobResult> {
    return {
      providerJobId: `provider-${request.prompt}`,
      status: "succeeded",
      title: request.prompt,
      audioUrl: "https://example.com/generated.mp3",
      coverUrl: "https://example.com/cover.jpg",
      durationSeconds: 123,
    };
  }

  async getJob(providerJobId: string): Promise<ProviderJobResult> {
    return {
      providerJobId,
      status: "succeeded",
      audioUrl: "https://example.com/generated.mp3",
    };
  }

  async cancelJob() {}

  normalizeResult(raw: unknown): ProviderJobResult {
    return raw as ProviderJobResult;
  }
}

function createMissingCollectionError(collection: string) {
  return new Error(
    `[ResourceNotFound] Db or Table not exist: ${collection}. DATABASE_COLLECTION_NOT_EXIST`,
  );
}

function createMemoryDb() {
  const collections = new Map<string, Map<string, unknown>>();
  const createdCollections: string[] = [];

  return {
    createdCollections,
    collection(name: string) {
      return {
        limit() {
          return {
            async get() {
              const collection = collections.get(name);

              if (!collection) {
                throw createMissingCollectionError(name);
              }

              return { data: [...collection.values()] };
            },
          };
        },
        doc(id: string) {
          return {
            async get() {
              const collection = collections.get(name);

              if (!collection) {
                throw createMissingCollectionError(name);
              }

              return { data: collection.get(id) };
            },
            async set(data: unknown) {
              const collection = collections.get(name);

              if (!collection) {
                throw createMissingCollectionError(name);
              }

              collection.set(id, { _id: id, ...(data as object) });
              return { updated: 1 };
            },
            async remove() {
              collections.get(name)?.delete(id);
              return { deleted: 1 };
            },
          };
        },
      };
    },
    createCollection(name: string) {
      if (!collections.has(name)) {
        collections.set(name, new Map());
        createdCollections.push(name);
      }

      return { requestId: `create-${name}` };
    },
  };
}

describe("cloudbase music store", () => {
  it("creates missing collections and persists generated tracks", async () => {
    const db = createMemoryDb();
    const store = new CloudBaseMusicStore(new SucceedingProvider(), db as never);

    const job = await store.createGenerationJob("user-1", {
      mode: "original",
      prompt: "真实入库的歌",
      tags: ["流行"],
      visibility: "draft",
    });
    const library = await store.getMyLibrary("user-1");
    const draft = library.tracks.find((track) => track.id === job.resultTrackId);

    expect(db.createdCollections).toEqual(
      expect.arrayContaining([
        "profiles",
        "creditLedger",
        "generationJobs",
        "providerAssets",
        "tracks",
        "favorites",
      ]),
    );
    expect(job.status).toBe("succeeded");
    expect(draft?.audioUrl).toBe("https://example.com/generated.mp3");
    expect(draft?.visibility).toBe("draft");
  });
});
