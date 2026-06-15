import { fail, ok } from "@/lib/api";
import { canReadJob, canReadTrack, getErrorStatus, requireUserProfile } from "@/lib/music/auth";
import { getMusicStore } from "@/lib/music/server-store";

type Context = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, context: Context) {
  try {
    const { id } = await context.params;
    const store = await getMusicStore();
    const viewer = await requireUserProfile(store, request);
    const job = await store.getJob(id);

    if (!job) {
      return fail("Job not found", 404);
    }

    if (!canReadJob(job, viewer.id, viewer.role === "admin")) {
      return fail("Job not found", 404);
    }

    const refreshed = await store.refreshJob(id);
    const resultTrackIds = refreshed.resultTrackIds ??
      (refreshed.resultTrackId ? [refreshed.resultTrackId] : []);
    const resultTracks = await Promise.all(
      resultTrackIds.map((trackId) => store.getTrack(trackId)),
    );
    const resultTrack = resultTracks[0] ?? null;
    const track =
      resultTrack &&
      canReadTrack(
        resultTrack,
        viewer.id,
        viewer.role === "admin",
      )
        ? resultTrack
        : null;
    const tracks = resultTracks
      .filter((item): item is NonNullable<typeof item> => Boolean(item))
      .filter((item) =>
        canReadTrack(
          item,
          viewer.id,
          viewer.role === "admin",
        ),
      );

    return ok({ job: refreshed, track, tracks });
  } catch (error) {
    return fail(
      error instanceof Error ? error.message : "Unable to load job",
      getErrorStatus(error),
    );
  }
}
