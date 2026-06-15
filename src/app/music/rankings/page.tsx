import Link from "next/link";
import { TrackListItem } from "@/components/track-card";
import { getMusicStore } from "@/lib/music/server-store";
import type { RankingKind } from "@/lib/music/types";
import { getRequestUserId } from "@/lib/music/user";

export const dynamic = "force-dynamic";

const tabs: Array<{ id: RankingKind; label: string }> = [
  { id: "hot", label: "热度榜" },
  { id: "plays", label: "播放榜" },
  { id: "likes", label: "点赞榜" },
  { id: "favorites", label: "收藏榜" },
  { id: "remixes", label: "同款榜" },
];

type PageProps = {
  searchParams: Promise<{ kind?: string }>;
};

export default async function RankingsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const kind = (params.kind ?? "hot") as RankingKind;
  const store = await getMusicStore();
  const items = await store.getRankings(kind, await getRequestUserId());

  return (
    <div className="mx-auto max-w-5xl space-y-5 px-4 py-6 sm:px-6">
      <div className="rounded border border-black/10 bg-white p-4">
        <p className="text-sm font-medium text-black/55">Rankings</p>
        <h1 className="mt-1 text-3xl font-semibold">音乐排名</h1>
        <div className="mt-4 flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <Link
              key={tab.id}
              href={`/music/rankings?kind=${tab.id}`}
              className={`rounded px-3 py-1.5 text-sm font-semibold ${
                kind === tab.id ? "bg-[#191713] text-white" : "bg-black/5"
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </div>
      </div>
      <section className="rounded border border-black/10 bg-white px-4">
        {items.map((track, index) => (
          <TrackListItem key={track.id} track={track} rank={index + 1} />
        ))}
      </section>
    </div>
  );
}
