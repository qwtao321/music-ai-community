import { describe, expect, it } from "vitest";
import type { MusicProvider } from "./provider";
import { createDemoMusicStore } from "./store";
import type { ProviderCreateRequest, ProviderJobResult } from "./types";

class FailedProvider implements MusicProvider {
  readonly name = "failed-provider";

  async createJob(request: ProviderCreateRequest): Promise<ProviderJobResult> {
    return {
      providerJobId: `failed-${request.mode}`,
      status: "failed",
      error: "provider failed",
    };
  }

  async getJob(providerJobId: string): Promise<ProviderJobResult> {
    return {
      providerJobId,
      status: "failed",
      error: "provider failed",
    };
  }

  async cancelJob() {}

  normalizeResult(raw: unknown): ProviderJobResult {
    return raw as ProviderJobResult;
  }
}

class ThrowingProvider extends FailedProvider {
  override async createJob(): Promise<ProviderJobResult> {
    throw new Error("provider unavailable");
  }
}

class TwoSongProvider implements MusicProvider {
  readonly name = "two-song-provider";
  createCalls = 0;

  async createJob(): Promise<ProviderJobResult> {
    this.createCalls += 1;
    return {
      providerJobId: "song-a,song-b",
      status: "succeeded",
      title: "版本 A",
      audioUrl: "https://cdn.example/a.mp3",
      results: [
        {
          providerJobId: "song-a",
          title: "版本 A",
          audioUrl: "https://cdn.example/a.mp3",
        },
        {
          providerJobId: "song-b",
          title: "版本 B",
          audioUrl: "https://cdn.example/b.mp3",
        },
      ],
    };
  }

  async getJob(providerJobId: string): Promise<ProviderJobResult> {
    return {
      providerJobId,
      status: "succeeded",
      title: "版本 A",
      audioUrl: "https://cdn.example/a.mp3",
      results: [
        {
          providerJobId: "song-a",
          title: "版本 A",
          audioUrl: "https://cdn.example/a.mp3",
        },
        {
          providerJobId: "song-b",
          title: "版本 B",
          audioUrl: "https://cdn.example/b.mp3",
        },
      ],
    };
  }

  async cancelJob() {}

  normalizeResult(raw: unknown): ProviderJobResult {
    return raw as ProviderJobResult;
  }
}

describe("demo music store", () => {
  it("keeps a generated track as a draft until the owner publishes it", async () => {
    const store = createDemoMusicStore();
    const profile = store.ensureProfile("user-1", "创作者");

    const job = await store.createGenerationJob(profile.id, {
      mode: "original",
      prompt: "夏夜电子流行",
      tags: ["pop", "electronic"],
      visibility: "draft",
    });
    const completed = await store.refreshJob(job.id);
    const draft = store.getTrack(completed.resultTrackId ?? "");

    expect(store.getProfile(profile.id)?.credits).toBe(90);
    expect(completed.status).toBe("succeeded");
    expect(draft?.visibility).toBe("draft");
    expect(store.getHall({ sort: "latest" }).items.some((track) => track.id === draft?.id)).toBe(false);
    expect(store.getRankings("plays").some((track) => track.id === draft?.id)).toBe(false);

    const published = store.publishTrack(draft!.id, profile.id);

    expect(published.visibility).toBe("public");
    expect(store.getHall({ sort: "latest" }).items[0].id).toBe(published.id);
    expect(store.getRankings("plays").some((track) => track.id === published.id)).toBe(true);
  });

  it("creates draft tracks for both songs returned by one provider call", async () => {
    const provider = new TwoSongProvider();
    const store = createDemoMusicStore(provider);
    const profile = store.ensureProfile("user-1", "创作者");

    const job = await store.createGenerationJob(profile.id, {
      mode: "original",
      prompt: "一次两首",
      tags: ["pop"],
      visibility: "draft",
    });

    const library = store.getMyLibrary(profile.id);

    expect(provider.createCalls).toBe(1);
    expect(job.resultTrackIds).toHaveLength(2);
    expect(job.resultTrackId).toBe(job.resultTrackIds?.[0]);
    expect(library.tracks.map((track) => track.audioUrl).sort()).toEqual([
      "https://cdn.example/a.mp3",
      "https://cdn.example/b.mp3",
    ]);
  });

  it("records likes and favorites once per user", () => {
    const store = createDemoMusicStore();
    const track = store.getHall({ sort: "latest" }).items[0];

    store.toggleLike(track.id, "user-1");
    store.toggleLike(track.id, "user-1");
    store.toggleLike(track.id, "user-1");
    store.toggleFavorite(track.id, "user-1");
    store.toggleFavorite(track.id, "user-1");

    const updated = store.getTrack(track.id);
    expect(updated?.likes).toBe(track.likes + 1);
    expect(updated?.favorites).toBe(track.favorites);
  });

  it("records charge and refund ledger entries against the failed generation job once", async () => {
    const store = createDemoMusicStore(new FailedProvider());
    const profile = store.ensureProfile("user-1", "创作者");

    const job = await store.createGenerationJob(profile.id, {
      mode: "cover_audio",
      prompt: "失败也要返还积分",
      visibility: "draft",
    });
    await store.refreshJob(job.id);

    const library = store.getMyLibrary(profile.id);
    const jobLedger = library.ledger.filter((entry) => entry.jobId === job.id);

    expect(store.getProfile(profile.id)?.credits).toBe(100);
    expect(job.status).toBe("failed");
    expect(jobLedger.map((entry) => entry.reason)).toEqual([
      "generation_charge",
      "generation_refund",
    ]);
  });

  it("refunds credits and keeps a failed job when the provider create request throws", async () => {
    const store = createDemoMusicStore(new ThrowingProvider());
    const profile = store.ensureProfile("user-1", "创作者");

    const job = await store.createGenerationJob(profile.id, {
      mode: "original",
      prompt: "供应商异常时仍然生成失败任务",
      visibility: "draft",
    });

    expect(job.status).toBe("failed");
    expect(job.error).toBe("provider unavailable");
    expect(store.getProfile(profile.id)?.credits).toBe(100);
    expect(store.getMyLibrary(profile.id).ledger.map((entry) => entry.reason)).toEqual([
      "signup_bonus",
      "generation_charge",
      "generation_refund",
    ]);
  });
});
