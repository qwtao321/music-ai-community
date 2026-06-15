import { z, ZodError } from "zod";
import { fail, ok, parseJson } from "@/lib/api";
import { getErrorStatus, requireAdminProfile } from "@/lib/music/auth";
import { getMusicStore } from "@/lib/music/server-store";

const schema = z.object({
  trackId: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const store = await getMusicStore();
    await requireAdminProfile(store, request);
    const payload = await parseJson(request, schema);

    return ok({ track: await store.hideTrack(payload.trackId) });
  } catch (error) {
    if (error instanceof ZodError) {
      return fail(error.issues[0]?.message ?? "Invalid hide payload", 422);
    }

    return fail(
      error instanceof Error ? error.message : "Unable to hide track",
      getErrorStatus(error),
    );
  }
}
