import { describe, expect, it } from "vitest";
import {
  MockProvider,
  normalizeProviderStatus,
  SunoLikeProvider,
} from "./provider";

describe("music provider adapters", () => {
  it("normalizes vendor states into stable job statuses", () => {
    expect(normalizeProviderStatus("submitted")).toBe("queued");
    expect(normalizeProviderStatus("processing")).toBe("running");
    expect(normalizeProviderStatus("complete")).toBe("succeeded");
    expect(normalizeProviderStatus("error")).toBe("failed");
    expect(normalizeProviderStatus("mystery")).toBe("queued");
  });

  it("returns a playable result from the mock provider", async () => {
    const provider = new MockProvider();
    const job = await provider.createJob({
      mode: "original",
      prompt: "雨夜赛博民谣",
      tags: ["folk", "synth"],
      lyrics: "雨落在霓虹上",
    });

    const result = await provider.getJob(job.providerJobId);

    expect(result.status).toBe("succeeded");
    expect(result.audioUrl).toContain(".mp3");
    expect(result.coverUrl).toContain("images.unsplash.com");
    expect(result.title).toContain("雨夜赛博民谣");
  });

  it("builds Suno-like requests with configured model and auth", async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    const provider = new SunoLikeProvider({
      apiBaseUrl: "https://example.test",
      apiKey: "secret",
      model: "suno-v5-5",
      fetcher: async (url, init) => {
        calls.push({ url: String(url), init });
        return Response.json([
          {
            song_id: "song-1",
            song_title: "复古城市流行",
            status: "pending",
          },
          {
            song_id: "song-2",
            song_title: "复古城市流行",
            status: "pending",
          },
        ]);
      },
    });

    const job = await provider.createJob({
      mode: "cover_text_style",
      prompt: "复古城市流行",
      tags: ["pop"],
    });

    expect(job.providerJobId).toBe("song-1,song-2");
    expect(job.status).toBe("queued");
    expect(calls[0].url).toBe("https://example.test/api/music/create");
    expect(calls[0].init?.headers).toMatchObject({
      Authorization: "Bearer secret",
      "Content-Type": "application/json",
    });
    expect(JSON.parse(String(calls[0].init?.body))).toMatchObject({
      model: "suno-v5-5",
      description: "复古城市流行 pop",
      wait_completion: false,
      instrumental: false,
    });
  });

  it("builds custom Suno requests when lyrics are provided", async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    const provider = new SunoLikeProvider({
      apiBaseUrl: "https://example.test",
      apiKey: "secret",
      fetcher: async (url, init) => {
        calls.push({ url: String(url), init });
        return Response.json([
          {
            song_id: "song-1",
            status: "pending",
          },
        ]);
      },
    });

    await provider.createJob({
      mode: "cover_text_style",
      prompt: "海边的晚风",
      tags: ["Mandopop", "acoustic"],
      lyrics: "[Verse]\n晚风经过窗",
    });

    expect(calls[0].url).toBe("https://example.test/api/music/create/custom");
    expect(JSON.parse(String(calls[0].init?.body))).toMatchObject({
      model: "suno-v5-5",
      lyrics: "[Verse]\n晚风经过窗",
      style_tags: "Mandopop, acoustic",
      song_title: "海边的晚风",
      instrumental: false,
      wait_completion: false,
    });
  });

  it("normalizes Suno task details with generated audio data", () => {
    const provider = new SunoLikeProvider({
      apiBaseUrl: "https://example.test",
      apiKey: "secret",
    });

    const result = provider.normalizeResult({
      song_id: "song-1",
      status: "completed",
      song_title: "真实生成歌曲",
      audio_url: "https://cdn.example/song.mp3",
      cover_url: "https://cdn.example/cover.jpeg",
      lyrics: "[Verse] 真实歌词",
      duration: 198.44,
    });

    expect(result).toMatchObject({
      providerJobId: "song-1",
      status: "succeeded",
      title: "真实生成歌曲",
      audioUrl: "https://cdn.example/song.mp3",
      coverUrl: "https://cdn.example/cover.jpeg",
      lyrics: "[Verse] 真实歌词",
      durationSeconds: 198,
    });
  });

  it("keeps both Suno songs from one provider response", () => {
    const provider = new SunoLikeProvider({
      apiBaseUrl: "https://example.test",
      apiKey: "secret",
    });

    const result = provider.normalizeResult([
      {
        song_id: "song-1",
        status: "completed",
        song_title: "版本 A",
        audio_url: "https://cdn.example/a.mp3",
      },
      {
        song_id: "song-2",
        status: "completed",
        song_title: "版本 B",
        audio_url: "https://cdn.example/b.mp3",
      },
    ]);

    expect(result.providerJobId).toBe("song-1,song-2");
    expect(result.status).toBe("succeeded");
    expect(result.audioUrl).toBe("https://cdn.example/a.mp3");
    expect(result.results).toEqual([
      expect.objectContaining({
        providerJobId: "song-1",
        title: "版本 A",
        audioUrl: "https://cdn.example/a.mp3",
      }),
      expect.objectContaining({
        providerJobId: "song-2",
        title: "版本 B",
        audioUrl: "https://cdn.example/b.mp3",
      }),
    ]);
  });

  it("keeps structured Suno error payloads readable", async () => {
    const provider = new SunoLikeProvider({
      apiBaseUrl: "https://example.test",
      apiKey: "secret",
      fetcher: async () =>
        Response.json(
          {
            code: 401,
            msg: {
              error: "Unauthorized",
              detail: "API key is invalid",
            },
          },
          { status: 401 },
        ),
    });

    const result = await provider.createJob({
      mode: "original",
      prompt: "test",
      tags: [],
    });

    expect(result.status).toBe("failed");
    expect(result.error).toContain("Unauthorized");
    expect(result.error).toContain("API key is invalid");
  });
});
