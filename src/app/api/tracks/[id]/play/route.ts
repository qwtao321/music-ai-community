import { fail, getUserIdFromRequest, ok } from "@/lib/api";
import { getMusicStore } from "@/lib/music/server-store";

type Context = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: Context) {
  const { id } = await context.params;
  const store = await getMusicStore();

  try {
    return ok({ track: await store.recordPlay(id, getUserIdFromRequest(request)) });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Unable to play", 404);
  }
}
