import { ZodError } from "zod";
import { fail, generationSchema, ok, parseJson } from "@/lib/api";
import { getErrorStatus, requireUserProfile } from "@/lib/music/auth";
import { getMusicStore } from "@/lib/music/server-store";

export async function POST(request: Request) {
  try {
    const store = await getMusicStore();
    const profile = await requireUserProfile(store, request);
    const payload = await parseJson(request, generationSchema);
    const job = await store.createGenerationJob(profile.id, {
      ...payload,
      referenceAudioUrl: payload.referenceAudioUrl || undefined,
    });

    return ok({ job });
  } catch (error) {
    if (error instanceof ZodError) {
      return fail(error.issues[0]?.message ?? "Invalid generation payload", 422);
    }

    return fail(
      error instanceof Error ? error.message : "Generation failed",
      getErrorStatus(error),
    );
  }
}
