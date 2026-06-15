import { getUserIdFromRequest } from "../api";
import type { MusicStore } from "./music-store";
import type { GenerationJob, Track } from "./types";

export class PermissionError extends Error {
  readonly status: number;

  constructor(message: string, status = 403) {
    super(message);
    this.name = "PermissionError";
    this.status = status;
  }
}

export async function requireUserProfile(store: MusicStore, request: Request) {
  const userId = getUserIdFromRequest(request);

  if (!userId) {
    throw new PermissionError("Login required", 401);
  }

  return store.ensureProfile(userId);
}

export async function requireAdminProfile(store: MusicStore, request: Request) {
  const profile = await requireUserProfile(store, request);

  if (profile.role !== "admin") {
    throw new PermissionError("Admin permission required");
  }

  return profile;
}

export function canReadTrack(
  track: Pick<Track, "ownerId" | "visibility">,
  viewerId?: string,
  viewerIsAdmin = false,
) {
  return (
    track.visibility === "public" ||
    viewerIsAdmin ||
    (Boolean(viewerId) && track.ownerId === viewerId)
  );
}

export function canReadJob(
  job: Pick<GenerationJob, "ownerId">,
  viewerId?: string,
  viewerIsAdmin = false,
) {
  return viewerIsAdmin || (Boolean(viewerId) && job.ownerId === viewerId);
}

export function getErrorStatus(error: unknown, fallback = 400) {
  return error instanceof PermissionError ? error.status : fallback;
}
