import { z, ZodError } from "zod";
import { fail, ok, parseJson } from "@/lib/api";
import { generateLyricsWithMiniMax } from "@/lib/music/lyrics";

const schema = z.object({
  theme: z.string().trim().min(1).max(5000),
  language: z.string().trim().min(1).default("中文"),
  tags: z.array(z.string()).default([]),
});

export async function POST(request: Request) {
  try {
    const apiKey = process.env.MINIMAX_API_KEY;

    if (!apiKey) {
      return fail("未配置 MINIMAX_API_KEY", 500);
    }

    const payload = await parseJson(request, schema);
    const lyrics = await generateLyricsWithMiniMax(payload, {
      apiKey,
      model: process.env.MINIMAX_MODEL,
      apiBaseUrl: process.env.MINIMAX_API_BASE_URL,
    });

    return ok({ lyrics });
  } catch (error) {
    if (error instanceof ZodError) {
      return fail(error.issues[0]?.message ?? "Invalid lyrics payload", 422);
    }

    return fail(error instanceof Error ? error.message : "Lyrics generation failed");
  }
}
