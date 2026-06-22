import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Coins, Headphones, Radio } from "lucide-react";
import { GenerationForm } from "@/components/generation-form";
import { MetricPill } from "@/components/metric-pill";
import { TrackCard } from "@/components/track-card";
import { Button } from "@/components/ui/button";
import { canReadTrack } from "@/lib/music/auth";
import { getMusicStore } from "@/lib/music/server-store";
import { getRequestUserId } from "@/lib/music/user";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ remix?: string }>;
};

export default async function MusicPage({ searchParams }: PageProps) {
  const store = await getMusicStore();
  const userId = await getRequestUserId();

  if (!userId) {
    redirect("/login?from=/music");
  }

  const params = await searchParams;
  const profile = await store.ensureProfile(userId);
  const remixTrack = params.remix ? await store.getTrack(params.remix) : null;
  const visibleRemixTrack =
    remixTrack &&
    canReadTrack(remixTrack, profile.id, profile.role === "admin")
      ? remixTrack
      : null;
  const hall = await store.getHall({ sort: "hot", viewerId: profile.id });
  const styleTemplates = await store.listStyleTemplates();
  const initialPrompt = visibleRemixTrack
    ? `${visibleRemixTrack.prompt}，参考《${visibleRemixTrack.title}》做同款但旋律重新生成`
    : "";

  return (
    <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <section className="space-y-5">
        <div className="rounded border border-black/10 bg-[#191713] p-5 text-white">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-white/60">AI Music Studio</p>
              <h1 className="mt-2 text-3xl font-semibold">创作一首可以发布的歌</h1>
            </div>
            <div className="flex gap-2">
              <span className="inline-flex items-center gap-1 rounded bg-white/10 px-3 py-2 text-sm">
                <Coins className="size-4" />
                {profile.credits} 积分
              </span>
              <Button asChild variant="secondary">
                <Link href="/music/hall">
                  <Radio className="size-4" />
                  <span>广场</span>
                </Link>
              </Button>
            </div>
          </div>
        </div>
        <GenerationForm
          initialPrompt={initialPrompt}
          styleTemplates={styleTemplates}
        />
      </section>

      <aside className="space-y-4">
        <div className="rounded border border-black/10 bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">热门灵感</h2>
            <Button asChild size="sm" variant="ghost">
              <Link href="/music/rankings" title="查看榜单">
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
          <div className="space-y-3">
            {hall.items.slice(0, 3).map((track) => (
              <Link
                key={track.id}
                href={`/music/${track.id}`}
                className="grid grid-cols-[3.5rem_1fr] gap-3 rounded p-1 transition hover:bg-black/5"
              >
                <img
                  src={track.coverUrl}
                  alt={track.title}
                  className="aspect-square rounded object-cover"
                />
                <div className="min-w-0">
                  <p className="line-clamp-1 font-semibold">{track.title}</p>
                  <p className="line-clamp-1 text-sm text-black/55">
                    {track.prompt}
                  </p>
                  <div className="mt-2 flex gap-1">
                    <MetricPill kind="plays" value={track.plays} />
                    <MetricPill kind="likes" value={track.likes} />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
        <div className="rounded border border-black/10 bg-[#d64b2a] p-4 text-white">
          <Headphones className="mb-3 size-6" />
          <h2 className="font-semibold">原创 + 翻唱双入口</h2>
          <p className="mt-2 text-sm text-white/78">
            上传参考音频、输入主题歌词或选择风格标签，都会进入同一套生成任务和发布流程。
          </p>
        </div>
        {hall.items[0] && <TrackCard track={hall.items[0]} />}
      </aside>
    </div>
  );
}
