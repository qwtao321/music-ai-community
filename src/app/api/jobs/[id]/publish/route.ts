import { fail, ok } from "@/lib/api";
import { getErrorStatus, requireUserProfile } from "@/lib/music/auth";
import { getMusicStore } from "@/lib/music/server-store";

type Context = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: Context) {
  const { id } = await context.params;
  const store = await getMusicStore();

  try {
    const profile = await requireUserProfile(store, request);
    const track = await store.publishJob(id, profile.id);
    return ok({ track });
  } catch (error) {
    return fail(
      error instanceof Error ? error.message : "Publish failed",
      getErrorStatus(error, 404),
    );
  }
}
