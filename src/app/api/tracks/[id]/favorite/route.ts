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
    return ok(await store.toggleFavorite(id, profile.id));
  } catch (error) {
    return fail(
      error instanceof Error ? error.message : "Unable to favorite",
      getErrorStatus(error, 404),
    );
  }
}
