import { cookies } from "next/headers";
import { z, ZodError } from "zod";
import { fail, ok, parseJson } from "@/lib/api";
import { getMusicStore } from "@/lib/music/server-store";
import {
  cloudBaseSessionCookieName,
  cloudBaseUserCookieName,
} from "@/lib/music/user-id";

const schema = z.object({
  userId: z.string().min(1),
  displayName: z.string().trim().min(1).optional(),
  avatarUrl: z.string().url().optional().or(z.literal("")),
  phone: z.string().optional(),
  accessToken: z.string().min(1),
});

function getCookieOptions(maxAge = 60 * 60 * 24 * 30) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}

export async function POST(request: Request) {
  try {
    const payload = await parseJson(request, schema);
    const cookieStore = await cookies();
    const previousUserId = cookieStore.get(cloudBaseUserCookieName)?.value;
    const previousAccessToken =
      cookieStore.get(cloudBaseSessionCookieName)?.value;
    const store = await getMusicStore();
    const existing = await store.getProfile(payload.userId);
    const fallbackDisplayName = payload.phone
      ? `手机用户 ${payload.phone.slice(-4)}`
      : "手机号用户";
    const profile = await store.ensureProfile(
      payload.userId,
      payload.displayName ?? fallbackDisplayName,
      payload.avatarUrl || undefined,
    );

    cookieStore.set(
      cloudBaseUserCookieName,
      payload.userId,
      getCookieOptions(),
    );
    cookieStore.set(
      cloudBaseSessionCookieName,
      payload.accessToken,
      getCookieOptions(),
    );

    return ok({
      profile,
      changed:
        previousUserId !== payload.userId ||
        previousAccessToken !== payload.accessToken ||
        !existing,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return fail(error.issues[0]?.message ?? "Invalid auth payload", 422);
    }

    return fail(error instanceof Error ? error.message : "Unable to sync login");
  }
}

export async function DELETE() {
  const cookieStore = await cookies();

  cookieStore.delete(cloudBaseUserCookieName);
  cookieStore.delete(cloudBaseSessionCookieName);

  return ok({ cleared: true });
}
