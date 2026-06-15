import type { RankingKind, Track } from "./types";

const scores: Record<RankingKind, (track: Track) => number> = {
  plays: (track) => track.plays,
  likes: (track) => track.likes,
  favorites: (track) => track.favorites,
  remixes: (track) => track.remixes,
  hot: (track) =>
    track.likes * 10 + track.favorites * 12 + track.remixes * 15 + track.plays,
};

export function rankTracks<T extends Pick<Track, keyof Track>>(
  tracks: T[],
  kind: RankingKind,
  limit = 20,
) {
  return [...tracks]
    .filter((track) => track.visibility === "public")
    .sort((left, right) => {
      const scoreDelta = scores[kind](right as Track) - scores[kind](left as Track);

      if (scoreDelta !== 0) {
        return scoreDelta;
      }

      return (
        new Date(right.createdAt).getTime() -
        new Date(left.createdAt).getTime()
      );
    })
    .slice(0, limit);
}
