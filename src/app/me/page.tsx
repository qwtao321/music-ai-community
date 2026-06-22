import Link from "next/link";
import { Coins, FileClock, Heart, Music2 } from "lucide-react";
import { MetricPill } from "@/components/metric-pill";
import { TrackCard } from "@/components/track-card";
import { getMusicStore } from "@/lib/music/server-store";
import { getRequestUserId } from "@/lib/music/user";

export const dynamic = "force-dynamic";

const reasonLabels = {
  signup_bonus: "注册赠送",
  generation_charge: "生成扣费",
  generation_refund: "失败返还",
  admin_grant: "管理员发放",
};

export default async function MePage() {
  const store = await getMusicStore();
  const userId = (await getRequestUserId()) ?? "anonymous-user";

  const library = await store.getMyLibrary(userId);

  return (
    <div className="mx-auto max-w-7xl space-y-5 px-4 py-6 sm:px-6">
      <section className="grid gap-4 md:grid-cols-[1fr_18rem]">
        <div className="rounded border border-black/10 bg-white p-5">
          <p className="text-sm font-medium text-black/55">Creator Center</p>
          <h1 className="mt-1 text-3xl font-semibold">
            {library.profile.displayName}
          </h1>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1 rounded bg-[#eef2f1] px-3 py-2 text-sm font-semibold">
              <Coins className="size-4" />
              {library.profile.credits} 积分
            </span>
            <MetricPill kind="tracks" value={library.tracks.length} />
          </div>
        </div>
        <Link
          href="/music"
          className="flex items-center justify-center gap-2 rounded border border-black/10 bg-[#191713] p-5 font-semibold text-white"
        >
          <Music2 className="size-5" />
          新建作品
        </Link>
      </section>

      <section>
        <div className="mb-3 flex items-center gap-2 font-semibold">
          <Music2 className="size-4" />
          我的作品
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {library.tracks.map((track) => (
            <TrackCard key={track.id} track={track} showPublish />
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded border border-black/10 bg-white p-4">
          <div className="mb-3 flex items-center gap-2 font-semibold">
            <Heart className="size-4" />
            收藏
          </div>
          <div className="space-y-2">
            {library.favorites.map((track) => (
              <Link
                key={track?.id}
                href={`/music/${track?.id}`}
                className="block rounded bg-[#eef2f1] px-3 py-2 text-sm font-medium"
              >
                {track?.title}
              </Link>
            ))}
            {!library.favorites.length && (
              <p className="text-sm text-black/55">暂无收藏</p>
            )}
          </div>
        </div>
        <div className="rounded border border-black/10 bg-white p-4">
          <div className="mb-3 flex items-center gap-2 font-semibold">
            <FileClock className="size-4" />
            生成任务
          </div>
          <div className="space-y-2">
            {library.jobs.map((job) => (
              <div key={job.id} className="rounded bg-[#eef2f1] px-3 py-2 text-sm">
                <span className="font-medium">{job.prompt}</span>
                <span className="ml-2 text-black/50">{job.status}</span>
              </div>
            ))}
            {!library.jobs.length && (
              <p className="text-sm text-black/55">暂无任务</p>
            )}
          </div>
        </div>
        <div className="rounded border border-black/10 bg-white p-4">
          <div className="mb-3 flex items-center gap-2 font-semibold">
            <Coins className="size-4" />
            积分明细
          </div>
          <div className="space-y-2">
            {library.ledger
              .slice()
              .reverse()
              .slice(0, 8)
              .map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between rounded bg-[#eef2f1] px-3 py-2 text-sm"
                >
                  <span className="font-medium">{reasonLabels[entry.reason]}</span>
                  <span
                    className={
                      entry.amount > 0
                        ? "font-semibold text-[#1f7a4d]"
                        : "font-semibold text-[#b43b22]"
                    }
                  >
                    {entry.amount > 0 ? "+" : ""}
                    {entry.amount}
                  </span>
                </div>
              ))}
            {!library.ledger.length && (
              <p className="text-sm text-black/55">暂无积分流水</p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
