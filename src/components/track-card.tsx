import Link from "next/link";
import { ArrowUpRight, Repeat2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PublicTrack, Track } from "@/lib/music/types";
import { MetricPill } from "./metric-pill";
import { PublishTrackButton } from "./publish-track-button";
import { TrackActions } from "./track-actions";

export function TrackCard({
  track,
  showPublish = false,
}: {
  track: PublicTrack | Track;
  showPublish?: boolean;
}) {
  const isPublic = track.visibility === "public";
  const canOpenDetails = isPublic || showPublish;
  const cover = (
    <div className="relative aspect-square bg-[#1d2930]">
      <img
        src={track.coverUrl}
        alt={track.title}
        className="h-full w-full object-cover"
      />
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3">
        <div className="flex flex-wrap gap-1">
          {track.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-white/88 px-2 py-1 text-xs font-medium text-black"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <article className="overflow-hidden rounded border border-black/10 bg-white shadow-sm">
      {canOpenDetails ? (
        <Link href={`/music/${track.id}`} className="block">
          {cover}
        </Link>
      ) : (
        cover
      )}
      <div className="space-y-3 p-3">
        <div>
          {canOpenDetails ? (
            <Link
              href={`/music/${track.id}`}
              className="line-clamp-1 font-semibold hover:underline"
            >
              {track.title}
            </Link>
          ) : (
            <p className="line-clamp-1 font-semibold">{track.title}</p>
          )}
          <p className="mt-1 line-clamp-1 text-sm text-black/55">
            {track.ownerName} · {track.mode === "cover_audio" ? "音频翻唱" : "AI原创"}
          </p>
        </div>
        {isPublic && (
          <div className="flex flex-wrap gap-1.5">
            <MetricPill kind="plays" value={track.plays} />
            <MetricPill kind="likes" value={track.likes} />
            <MetricPill kind="favorites" value={track.favorites} />
          </div>
        )}
        <div className="flex items-center justify-between gap-2">
          <TrackActions
            trackId={track.id}
            audioUrl={track.audioUrl}
            compact
            allowReactions={isPublic}
            initial={{
              plays: track.plays,
              likes: track.likes,
              favorites: track.favorites,
              likedByViewer: "likedByViewer" in track ? track.likedByViewer : false,
              favoritedByViewer:
                "favoritedByViewer" in track ? track.favoritedByViewer : false,
            }}
          />
          {showPublish && !isPublic ? (
            <PublishTrackButton trackId={track.id} compact />
          ) : (
            <Button asChild size="sm" variant="outline">
              <Link href={`/music?remix=${track.id}`} title="做同款">
                <Repeat2 className="size-4" />
                <span>做同款</span>
              </Link>
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}

export function TrackListItem({
  track,
  rank,
}: {
  track: PublicTrack | Track;
  rank: number;
}) {
  return (
    <article className="grid grid-cols-[2.5rem_4.5rem_1fr_auto] items-center gap-3 border-b border-black/10 py-3 last:border-b-0">
      <div className="text-center text-lg font-semibold text-black/45">
        {rank}
      </div>
      <Link href={`/music/${track.id}`} className="block">
        <img
          src={track.coverUrl}
          alt={track.title}
          className="aspect-square rounded object-cover"
        />
      </Link>
      <div className="min-w-0">
        <Link
          href={`/music/${track.id}`}
          className="line-clamp-1 font-semibold hover:underline"
        >
          {track.title}
        </Link>
        <p className="line-clamp-1 text-sm text-black/55">{track.prompt}</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <MetricPill kind="plays" value={track.plays} />
          <MetricPill kind="likes" value={track.likes} />
          <MetricPill kind="remixes" value={track.remixes} />
        </div>
      </div>
      <Button asChild variant="ghost" size="icon-sm">
        <Link href={`/music/${track.id}`} title="打开作品">
          <ArrowUpRight className="size-4" />
        </Link>
      </Button>
    </article>
  );
}
