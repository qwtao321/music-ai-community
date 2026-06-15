import Link from "next/link";
import { notFound } from "next/navigation";
import { Repeat2 } from "lucide-react";
import { MetricPill } from "@/components/metric-pill";
import { TrackActions } from "@/components/track-actions";
import { Button } from "@/components/ui/button";
import { canReadTrack } from "@/lib/music/auth";
import { getMusicStore } from "@/lib/music/server-store";
import { getRequestUserId } from "@/lib/music/user";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function TrackPage({ params }: PageProps) {
  const { id } = await params;
  const store = await getMusicStore();
  const track = await store.getTrack(id);
  const viewerId = await getRequestUserId();
  const viewerProfile = viewerId ? await store.ensureProfile(viewerId) : null;

  if (
    !track ||
    !canReadTrack(track, viewerProfile?.id, viewerProfile?.role === "admin")
  ) {
    notFound();
  }

  return (
    <div className="mx-auto grid max-w-6xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[24rem_1fr]">
      <section className="space-y-4">
        <img
          src={track.coverUrl}
          alt={track.title}
          className="aspect-square w-full rounded border border-black/10 object-cover shadow-sm"
        />
        <audio controls className="w-full" src={track.audioUrl} />
        <TrackActions
          trackId={track.id}
          audioUrl={track.audioUrl}
          allowReactions={track.visibility === "public"}
          initial={{
            plays: track.plays,
            likes: track.likes,
            favorites: track.favorites,
          }}
        />
      </section>
      <section className="space-y-5 rounded border border-black/10 bg-white p-5">
        <div>
          <p className="text-sm font-medium text-black/55">{track.ownerName}</p>
          <h1 className="mt-2 text-4xl font-semibold">{track.title}</h1>
          <div className="mt-4 flex flex-wrap gap-2">
            <MetricPill kind="plays" value={track.plays} />
            <MetricPill kind="likes" value={track.likes} />
            <MetricPill kind="favorites" value={track.favorites} />
            <MetricPill kind="remixes" value={track.remixes} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {track.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-[#eef2f1] px-3 py-1 text-sm font-medium"
            >
              {tag}
            </span>
          ))}
        </div>
        <div>
          <h2 className="font-semibold">提示词</h2>
          <p className="mt-2 rounded bg-[#eef2f1] p-3 text-sm leading-6 text-black/70">
            {track.prompt}
          </p>
        </div>
        <div>
          <h2 className="font-semibold">歌词</h2>
          <pre className="mt-2 whitespace-pre-wrap rounded bg-[#191713] p-4 text-sm leading-6 text-white/85">
            {track.lyrics}
          </pre>
        </div>
        <Button asChild>
          <Link href={`/music?remix=${track.id}`}>
            <Repeat2 className="size-4" />
            <span>做同款</span>
          </Link>
        </Button>
      </section>
    </div>
  );
}
