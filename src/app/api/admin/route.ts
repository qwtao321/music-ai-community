import { fail, ok } from "@/lib/api";
import { getErrorStatus, requireAdminProfile } from "@/lib/music/auth";
import { getMusicStore } from "@/lib/music/server-store";

export async function GET(request: Request) {
  try {
    const store = await getMusicStore();
    await requireAdminProfile(store, request);
    return ok(await store.getAdminSnapshot());
  } catch (error) {
    return fail(
      error instanceof Error ? error.message : "Unable to load admin snapshot",
      getErrorStatus(error),
    );
  }
}
