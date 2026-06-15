"use client";

import { useRef, useState } from "react";
import { Heart, Pause, Play, Star } from "lucide-react";
import { Button } from "@/components/ui/button";

type TrackActionState = {
  plays: number;
  likes: number;
  favorites: number;
  likedByViewer?: boolean;
  favoritedByViewer?: boolean;
};

export function TrackActions({
  trackId,
  audioUrl,
  initial,
  compact = false,
  allowReactions = true,
}: {
  trackId: string;
  audioUrl?: string;
  initial: TrackActionState;
  compact?: boolean;
  allowReactions?: boolean;
}) {
  const [state, setState] = useState(initial);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  async function post(path: string) {
    const response = await fetch(path, {
      method: "POST",
    });

    if (response.status === 401) {
      const from = `${window.location.pathname}${window.location.search}`;
      window.location.assign(`/login?from=${encodeURIComponent(from)}`);
      return null;
    }

    if (!response.ok) {
      return null;
    }

    return response.json();
  }

  async function play() {
    if (!audioUrl) {
      return;
    }

    if (!audioRef.current) {
      audioRef.current = new Audio(audioUrl);
      audioRef.current.addEventListener("ended", () => setIsPlaying(false));
      audioRef.current.addEventListener("pause", () => setIsPlaying(false));
      audioRef.current.addEventListener("play", () => setIsPlaying(true));
    }

    if (isPlaying) {
      audioRef.current.pause();
      return;
    }

    try {
      await audioRef.current.play();
    } catch {
      setIsPlaying(false);
      return;
    }

    const payload = await post(`/api/tracks/${trackId}/play`);

    if (payload?.track) {
      setState((current) => ({ ...current, plays: payload.track.plays }));
    }
  }

  async function like() {
    const payload = await post(`/api/tracks/${trackId}/like`);

    if (payload?.track) {
      setState((current) => ({
        ...current,
        likes: payload.track.likes,
        likedByViewer: payload.active,
      }));
    }
  }

  async function favorite() {
    const payload = await post(`/api/tracks/${trackId}/favorite`);

    if (payload?.track) {
      setState((current) => ({
        ...current,
        favorites: payload.track.favorites,
        favoritedByViewer: payload.active,
      }));
    }
  }

  const buttonSize = compact ? "icon-sm" : "sm";

  return (
    <div className="flex items-center gap-1.5">
      <Button
        type="button"
        size={buttonSize}
        variant="secondary"
        onClick={play}
        disabled={!audioUrl}
        title={audioUrl ? (isPlaying ? "暂停" : "播放") : "暂无音频"}
      >
        {isPlaying ? <Pause className="size-4" /> : <Play className="size-4" />}
        {!compact && <span>{state.plays}</span>}
      </Button>
      {allowReactions !== false && (
        <>
          <Button
            type="button"
            size={buttonSize}
            variant={state.likedByViewer ? "default" : "secondary"}
            onClick={like}
            title="点赞"
          >
            <Heart className="size-4" />
            {!compact && <span>{state.likes}</span>}
          </Button>
          <Button
            type="button"
            size={buttonSize}
            variant={state.favoritedByViewer ? "default" : "secondary"}
            onClick={favorite}
            title="收藏"
          >
            <Star className="size-4" />
            {!compact && <span>{state.favorites}</span>}
          </Button>
        </>
      )}
    </div>
  );
}
