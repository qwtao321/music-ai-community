import { getUserIdFromRequest, ok } from "@/lib/api";
import { getMusicStore } from "@/lib/music/server-store";
import type { HallSort } from "@/lib/music/types";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const store = await getMusicStore();
  const hall = await store.getHall({
    q: url.searchParams.get("q") ?? undefined,
    category: url.searchParams.get("category") ?? undefined,
    sort: (url.searchParams.get("sort") ?? "latest") as HallSort,
    viewerId: getUserIdFromRequest(request),
  });

  return ok(hall);
}
