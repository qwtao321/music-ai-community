import { describe, expect, it } from "vitest";
import { rankTracks } from "./rankings";

describe("rankings", () => {
  const tracks = [
    {
      id: "quiet",
      title: "Quiet Draft",
      visibility: "draft" as const,
      plays: 1000,
      likes: 1000,
      favorites: 1000,
      remixes: 1000,
      createdAt: "2026-06-01T00:00:00.000Z",
    },
    {
      id: "liked",
      title: "Liked Song",
      visibility: "public" as const,
      plays: 20,
      likes: 50,
      favorites: 8,
      remixes: 2,
      createdAt: "2026-06-03T00:00:00.000Z",
    },
    {
      id: "played",
      title: "Played Song",
      visibility: "public" as const,
      plays: 500,
      likes: 3,
      favorites: 1,
      remixes: 0,
      createdAt: "2026-06-02T00:00:00.000Z",
    },
  ];

  it("excludes non-public tracks", () => {
    expect(rankTracks(tracks, "hot").map((track) => track.id)).not.toContain(
      "quiet",
    );
  });

  it("sorts by selected ranking signal", () => {
    expect(rankTracks(tracks, "plays")[0].id).toBe("played");
    expect(rankTracks(tracks, "likes")[0].id).toBe("liked");
    expect(rankTracks(tracks, "favorites")[0].id).toBe("liked");
  });

  it("combines multiple signals for hot ranking", () => {
    expect(rankTracks(tracks, "hot")[0].id).toBe("liked");
  });
});
