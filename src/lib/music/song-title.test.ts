import { describe, expect, it } from "vitest";
import { buildSongTitlePrompt, generateSongTitleWithDeepSeek } from "./song-title";

describe("song title generation", () => {
  it("builds a title prompt from the music prompt and language", () => {
    const prompt = buildSongTitlePrompt({
      prompt: "霓虹雨夜，女声电子流行，强副歌",
      language: "中文",
      tags: ["流行", "电子"],
    });

    expect(prompt).toContain("霓虹雨夜");
    expect(prompt).toContain("中文");
    expect(prompt).toContain("流行、电子");
    expect(prompt).toContain("只输出歌名");
  });

  it("calls DeepSeek and returns a trimmed title", async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    const title = await generateSongTitleWithDeepSeek(
      {
        prompt: "深夜港风情歌",
        language: "粤语",
        tags: ["R&B", "男声"],
      },
      {
        apiKey: "secret",
        fetcher: async (url, init) => {
          calls.push({ url: String(url), init });
          return Response.json({
            choices: [
              {
                message: {
                  content: "霓虹未眠",
                },
              },
            ],
          });
        },
      },
    );

    expect(calls[0].url).toBe("https://api.deepseek.com/chat/completions");
    expect(JSON.parse(String(calls[0].init?.body))).toMatchObject({
      model: "deepseek-v4-flash",
    });
    expect(title).toBe("霓虹未眠");
  });
});
