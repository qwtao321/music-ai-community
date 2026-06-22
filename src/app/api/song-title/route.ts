import { ZodError, z } from "zod";
import { fail, ok, parseJson } from "@/lib/api";
import { generateSongTitleWithDeepSeek } from "@/lib/music/song-title";

const schema = z.object({
  prompt: z.string().trim().min(1).max(5000),
  language: z.string().trim().min(1).default("中文"),
  tags: z.array(z.string()).default([]),
});

export async function POST(request: Request) {
  try {
    const apiKey = process.env.DEEPSEEK_API_KEY;

    if (!apiKey) {
      return fail("未配置 DEEPSEEK_API_KEY", 500);
    }

    const payload = await parseJson(request, schema);
    const songTitle = await generateSongTitleWithDeepSeek(payload, {
      apiKey,
      model: process.env.DEEPSEEK_MODEL,
      apiBaseUrl: process.env.DEEPSEEK_API_BASE_URL,
    });

    return ok({ songTitle });
  } catch (error) {
    if (error instanceof ZodError) {
      return fail(error.issues[0]?.message ?? "Invalid song title payload", 422);
    }

    return fail(error instanceof Error ? error.message : "Song title generation failed");
  }
}
