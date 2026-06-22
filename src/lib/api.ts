import { NextResponse } from "next/server";
import { z } from "zod";
import { getUserIdFromCookieHeader } from "@/lib/music/user-id";

export const generationSchema = z.object({
  mode: z.enum(["original", "cover_audio", "cover_text_style"]),
  prompt: z.string().min(2).max(5000),
  songTitle: z.string().trim().min(1).max(120).optional(),
  lyrics: z.string().max(4000).optional(),
  tags: z.array(z.string()).default([]),
  language: z.string().default("中文"),
  visibility: z.enum(["draft", "public", "hidden"]).default("draft"),
  referenceAudioUrl: z.string().url().optional().or(z.literal("")),
});

export function getUserIdFromRequest(request: Request) {
  return (
    request.headers.get("x-demo-user-id") ??
    getUserIdFromCookieHeader(request.headers.get("cookie"))
  );
}

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function fail(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function parseJson<T>(
  request: Request,
  schema: z.ZodType<T>,
): Promise<T> {
  const body = await request.json().catch(() => ({}));
  return schema.parse(body);
}
