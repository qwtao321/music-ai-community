import { z, ZodError } from "zod";
import { fail, ok, parseJson } from "@/lib/api";
import { getErrorStatus, requireAdminProfile } from "@/lib/music/auth";
import { getMusicStore } from "@/lib/music/server-store";

const schema = z.object({
  profileId: z.string().min(1),
  amount: z.number().int().positive().max(10000),
});

export async function POST(request: Request) {
  try {
    const store = await getMusicStore();
    await requireAdminProfile(store, request);
    const payload = await parseJson(request, schema);

    return ok({
      profile: await store.grantCredits(payload.profileId, payload.amount),
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return fail(error.issues[0]?.message ?? "Invalid credit payload", 422);
    }

    return fail(
      error instanceof Error ? error.message : "Unable to grant credits",
      getErrorStatus(error),
    );
  }
}
