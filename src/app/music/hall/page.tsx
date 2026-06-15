import Link from "next/link";
import { Search } from "lucide-react";
import { TrackCard } from "@/components/track-card";
import { getMusicStore } from "@/lib/music/server-store";
import type { HallSort } from "@/lib/music/types";
import { getRequestUserId } from "@/lib/music/user";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ q?: string; category?: string; sort?: string }>;
};

const sorts: Array<{ id: HallSort; label: string }> = [
  { id: "latest", label: "最新" },
  { id: "hot", label: "热门" },
  { id: "likes", label: "高赞" },
  { id: "favorites", label: "收藏" },
  { id: "remixes", label: "同款" },
];

export default async function HallPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const store = await getMusicStore();
  const viewerId = await getRequestUserId();
  const hall = await store.getHall({
    q: params.q,
    category: params.category,
    sort: (params.sort ?? "latest") as HallSort,
    viewerId: viewerId ?? undefined,
  });

  return (
    <div className="mx-auto max-w-7xl space-y-5 px-4 py-6 sm:px-6">
      <div className="flex flex-col gap-4 rounded border border-black/10 bg-white p-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-black/55">Music Hall</p>
            <h1 className="text-3xl font-semibold">音乐广场</h1>
          </div>
          <form className="flex min-w-0 gap-2">
            <div className="relative min-w-0">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-black/45" />
              <input
                name="q"
                defaultValue={params.q}
                className="h-10 w-64 max-w-full rounded border border-black/15 pl-9 pr-3 text-sm outline-none"
                placeholder="搜索歌曲、作者、风格"
              />
            </div>
            <button className="h-10 rounded bg-[#191713] px-4 text-sm font-semibold text-white">
              搜索
            </button>
          </form>
        </div>
        <div className="flex flex-wrap gap-2">
          {hall.categories.map((category) => (
            <Link
              key={category}
              href={`/music/hall?category=${encodeURIComponent(category)}&sort=${params.sort ?? "latest"}`}
              className={`rounded-full border px-3 py-1 text-sm font-medium ${
                (params.category ?? "全部") === category
                  ? "border-[#191713] bg-[#191713] text-white"
                  : "border-black/15 bg-[#eef2f1] text-black/65"
              }`}
            >
              {category}
            </Link>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {sorts.map((sort) => (
            <Link
              key={sort.id}
              href={`/music/hall?sort=${sort.id}${params.category ? `&category=${encodeURIComponent(params.category)}` : ""}`}
              className={`rounded px-3 py-1.5 text-sm font-semibold ${
                (params.sort ?? "latest") === sort.id
                  ? "bg-[#d64b2a] text-white"
                  : "bg-black/5 text-black/60"
              }`}
            >
              {sort.label}
            </Link>
          ))}
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {hall.items.map((track) => (
          <TrackCard key={track.id} track={track} />
        ))}
      </div>
    </div>
  );
}
