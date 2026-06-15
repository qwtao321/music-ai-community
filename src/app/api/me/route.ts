import { fail, ok } from "@/lib/api";
import { getErrorStatus, requireUserProfile } from "@/lib/music/auth";
import { getMusicStore } from "@/lib/music/server-store";

export async function GET(request: Request) {
  try {
    const store = await getMusicStore();
    const profile = await requireUserProfile(store, request);
    return ok(await store.getMyLibrary(profile.id));
  } catch (error) {
    return fail(
      error instanceof Error ? error.message : "Unable to load library",
      getErrorStatus(error),
    );
  }
}
