import { getUserIdFromRequest, ok } from "@/lib/api";
import { getMusicStore } from "@/lib/music/server-store";
import type { RankingKind } from "@/lib/music/types";

const allowed = new Set(["hot", "plays", "likes", "favorites", "remixes"]);

export async function GET(request: Request) {
  const url = new URL(request.url);
  const kind = url.searchParams.get("kind") ?? "hot";
  const rankingKind = allowed.has(kind) ? (kind as RankingKind) : "hot";
  const store = await getMusicStore();

  return ok({
    kind: rankingKind,
    items: await store.getRankings(rankingKind, getUserIdFromRequest(request)),
  });
}
