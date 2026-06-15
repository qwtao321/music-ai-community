import { describe, expect, it } from "vitest";
import { buildLyricsPrompt, generateLyricsWithMiniMax } from "./lyrics";

describe("lyrics generation", () => {
  it("uses Cantonese rhyme guidance when the language is Cantonese", () => {
    const prompt = buildLyricsPrompt({
      theme: "霓虹雨夜",
      language: "粤语",
      tags: ["R&B", "男声"],
    });

    expect(prompt).toContain("粤语");
    expect(prompt).toContain("粤语九声");
    expect(prompt).toContain("广州话口语");
    expect(prompt).toContain("[Verse 1]");
    expect(prompt).toContain("[Chorus]");
  });

  it("uses Mandarin rhyme guidance when the language is Mandarin", () => {
    const prompt = buildLyricsPrompt({
      theme: "海边晚风",
      language: "中文",
      tags: ["流行"],
    });

    expect(prompt).toContain("普通话");
    expect(prompt).toContain("十三辙");
    expect(prompt).toContain("平仄");
  });

  it("calls MiniMax chat completions and extracts lyrics text", async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    const lyrics = await generateLyricsWithMiniMax(
      {
        theme: "凌晨城市",
        language: "中文",
        tags: ["电子"],
      },
      {
        apiKey: "secret",
        fetcher: async (url, init) => {
          calls.push({ url: String(url), init });
          return Response.json({
            choices: [
              {
                message: {
                  content: "[Verse 1]\n灯影落下\n\n[Chorus]\n我仍在唱",
                },
              },
            ],
          });
        },
      },
    );

    expect(calls[0].url).toBe("https://api.minimax.io/v1/chat/completions");
    expect(calls[0].init?.headers).toMatchObject({
      Authorization: "Bearer secret",
      "Content-Type": "application/json",
    });
    expect(JSON.parse(String(calls[0].init?.body))).toMatchObject({
      model: "MiniMax-M3",
    });
    expect(lyrics).toContain("[Verse 1]");
    expect(lyrics).toContain("[Chorus]");
  });
});
