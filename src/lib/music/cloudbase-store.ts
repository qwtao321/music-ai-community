import { cloudBaseCollections } from "@/lib/cloudbase/collections";
import { fromCloudBaseDoc, fromCloudBaseDocs, toCloudBaseDoc } from "@/lib/cloudbase/document-mapper";
import { getCloudBaseDb } from "@/lib/cloudbase/server";
import { applyCreditChange, calculateGenerationCost } from "./credits";
import type { HallQuery, MusicStore } from "./music-store";
import { type MusicProvider } from "./provider";
import { rankTracks } from "./rankings";
import { isAdminUserId } from "./roles";
import type {
  CreditLedgerEntry,
  GenerationJob,
  GenerationRequest,
  Profile,
  ProviderAsset,
  PublicTrack,
  RankingKind,
  Track,
} from "./types";

type CloudBaseDb = ReturnType<typeof getCloudBaseDb>;

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function now() {
  return new Date().toISOString();
}

function getDataArray<T>(result: unknown) {
  const data = (result as { data?: unknown }).data;

  if (Array.isArray(data)) {
    return fromCloudBaseDocs<T & { id?: string }>(data) as T[];
  }

  if (data) {
    return [fromCloudBaseDoc<T & { id?: string }>(data) as T];
  }

  return [];
}

function withViewerState(
  track: Track,
  viewerId: string | undefined,
  likeKeys: Set<string>,
  favoriteKeys: Set<string>,
): PublicTrack {
  return {
    ...track,
    likedByViewer: viewerId ? likeKeys.has(`${track.id}:${viewerId}`) : false,
    favoritedByViewer: viewerId
      ? favoriteKeys.has(`${track.id}:${viewerId}`)
      : false,
  };
}

export class CloudBaseMusicStore implements MusicStore {
  private readonly ensuredCollections = new Set<string>();

  constructor(
    private readonly provider: MusicProvider,
    private readonly db: CloudBaseDb = getCloudBaseDb(),
  ) {}

  async ensureProfile(
    id = "anonymous-user",
    displayName?: string,
    avatarUrl?: string,
  ) {
    const existing = await this.getProfile(id);
    const role: Profile["role"] = isAdminUserId(id) ? "admin" : "user";
    const nextDisplayName = displayName?.trim() || existing?.displayName || "匿名创作者";
    const nextAvatarUrl =
      avatarUrl || existing?.avatarUrl || `https://api.dicebear.com/9.x/shapes/svg?seed=${id}`;

    if (existing) {
      if (
        existing.displayName === nextDisplayName &&
        existing.avatarUrl === nextAvatarUrl &&
        existing.role === role
      ) {
        return existing;
      }

      const updated = {
        ...existing,
        displayName: nextDisplayName,
        avatarUrl: nextAvatarUrl,
        role,
      };
      await this.save(cloudBaseCollections.profiles, updated);
      return updated;
    }

    const profile: Profile = {
      id,
      displayName: nextDisplayName,
      avatarUrl: nextAvatarUrl,
      role,
      credits: 100,
      createdAt: now(),
    };

    await this.save(cloudBaseCollections.profiles, profile);
    await this.save<CreditLedgerEntry>(cloudBaseCollections.creditLedger, {
      id: createId("ledger"),
      profileId: profile.id,
      amount: 100,
      reason: "signup_bonus",
      createdAt: now(),
    });

    return profile;
  }

  async getProfile(id = "anonymous-user") {
    return this.getOne<Profile>(cloudBaseCollections.profiles, id);
  }

  async listProfiles() {
    return this.getAll<Profile>(cloudBaseCollections.profiles);
  }

  async createGenerationJob(ownerId: string, request: GenerationRequest) {
    const profile = await this.ensureProfile(ownerId);
    const mode = request.mode;
    const cost = calculateGenerationCost(mode);
    const duplicate = (await this.listJobs(ownerId)).find(
      (job) =>
        job.mode === mode &&
        job.prompt === request.prompt &&
        ["queued", "running"].includes(job.status),
    );

    if (duplicate) {
      return duplicate;
    }

    const jobId = createId("job");
    const ledger = await this.getLedger(profile.id);
    const charged = applyCreditChange(
      {
        id: profile.id,
        credits: profile.credits,
        balance: profile.credits,
        ledger,
      },
      {
        amount: -cost,
        reason: "generation_charge",
        jobId,
      },
    );

    await this.save(cloudBaseCollections.profiles, {
      ...profile,
      credits: charged.credits,
    });

    const chargeEntry = charged.ledger.at(-1)!;
    await this.save(cloudBaseCollections.creditLedger, chargeEntry);

    const providerResult = await this.createProviderJobSafely({
      mode,
      prompt: request.prompt,
      lyrics: request.lyrics,
      tags: request.tags ?? [],
      language: request.language ?? "中文",
      referenceAudioUrl: request.referenceAudioUrl,
    });
    const job: GenerationJob = {
      id: jobId,
      ownerId,
      mode,
      prompt: request.prompt,
      lyrics: request.lyrics,
      tags: request.tags ?? [],
      language: request.language ?? "中文",
      status: providerResult.status,
      cost,
      provider: this.provider.name,
      providerJobId: providerResult.providerJobId,
      referenceAudioUrl: request.referenceAudioUrl,
      error: providerResult.error,
      createdAt: now(),
      updatedAt: now(),
    };

    await this.save(cloudBaseCollections.generationJobs, job);

    if (providerResult.status === "failed") {
      await this.refundJob(job);
    }

    if (providerResult.status === "succeeded") {
      await this.createDraftTrackFromJob(job, providerResult);
    }

    return (await this.getJob(job.id))!;
  }

  async refreshJob(jobId: string) {
    const job = await this.getJob(jobId);

    if (!job) {
      throw new Error("Job not found");
    }

    const providerResult = await this.provider.getJob(job.providerJobId);
    const updated: GenerationJob = {
      ...job,
      status: providerResult.status,
      error: providerResult.error,
      updatedAt: now(),
    };

    await this.save(cloudBaseCollections.generationJobs, updated);

    if (providerResult.status === "failed") {
      await this.refundJob(updated);
    }

    if (providerResult.status === "succeeded" && !updated.resultTrackId) {
      await this.createDraftTrackFromJob(updated, providerResult);
    }

    return (await this.getJob(job.id))!;
  }

  async publishJob(jobId: string, ownerId: string) {
    const job = await this.getJob(jobId);

    if (!job || job.ownerId !== ownerId) {
      throw new Error("Job not found");
    }

    if (!job.resultTrackId) {
      throw new Error("Job has no track to publish");
    }

    return this.publishTrack(job.resultTrackId, ownerId);
  }

  async publishTrack(trackId: string, ownerId: string) {
    const track = await this.getTrack(trackId);

    if (!track || track.ownerId !== ownerId) {
      throw new Error("Track not found");
    }

    const published = {
      ...track,
      visibility: "public" as const,
      updatedAt: now(),
    };
    await this.save(cloudBaseCollections.tracks, published);
    return published;
  }

  async getJob(jobId: string) {
    return this.getOne<GenerationJob>(cloudBaseCollections.generationJobs, jobId);
  }

  async listJobs(ownerId?: string) {
    return (await this.getAll<GenerationJob>(cloudBaseCollections.generationJobs))
      .filter((job) => !ownerId || job.ownerId === ownerId)
      .sort(
        (left, right) =>
          new Date(right.createdAt).getTime() -
          new Date(left.createdAt).getTime(),
      );
  }

  async getTrack(trackId: string) {
    return this.getOne<Track>(cloudBaseCollections.tracks, trackId);
  }

  async getHall(query: HallQuery = {}) {
    const q = query.q?.trim().toLowerCase();
    const category = query.category?.trim();
    let tracks = (await this.getAll<Track>(cloudBaseCollections.tracks)).filter(
      (track) => track.visibility === "public",
    );

    if (q) {
      tracks = tracks.filter((track) =>
        [track.title, track.prompt, track.ownerName, ...track.tags]
          .join(" ")
          .toLowerCase()
          .includes(q),
      );
    }

    if (category && category !== "全部") {
      tracks = tracks.filter((track) => track.tags.includes(category));
    }

    if (query.sort && query.sort !== "latest") {
      tracks = rankTracks(tracks, query.sort);
    } else {
      tracks = tracks.sort(
        (left, right) =>
          new Date(right.createdAt).getTime() -
          new Date(left.createdAt).getTime(),
      );
    }

    const { likeKeys, favoriteKeys } = await this.getInteractionKeys();

    return {
      items: tracks.map((track) =>
        withViewerState(track, query.viewerId, likeKeys, favoriteKeys),
      ),
      categories: this.getCategories(await this.getAll<Track>(cloudBaseCollections.tracks)),
    };
  }

  async getRankings(kind: RankingKind, viewerId?: string) {
    const tracks = rankTracks(
      (await this.getAll<Track>(cloudBaseCollections.tracks)).filter(
        (track) => track.visibility === "public",
      ),
      kind,
    );
    const { likeKeys, favoriteKeys } = await this.getInteractionKeys();

    return tracks.map((track) =>
      withViewerState(track, viewerId, likeKeys, favoriteKeys),
    );
  }

  async recordPlay(trackId: string, profileId?: string) {
    const track = await this.getTrack(trackId);

    if (!track || track.visibility !== "public") {
      throw new Error("Track not playable");
    }

    const updated = { ...track, plays: track.plays + 1, updatedAt: now() };
    await this.save(cloudBaseCollections.tracks, updated);
    await this.save(cloudBaseCollections.plays, {
      id: createId("play"),
      trackId,
      profileId,
      createdAt: now(),
    });

    return updated;
  }

  async toggleLike(trackId: string, profileId: string) {
    return this.toggleMetric(trackId, profileId, "likes", cloudBaseCollections.likes);
  }

  async toggleFavorite(trackId: string, profileId: string) {
    return this.toggleMetric(
      trackId,
      profileId,
      "favorites",
      cloudBaseCollections.favorites,
    );
  }

  async getMyLibrary(profileId: string) {
    const favoriteDocs = await this.getAll<{ id: string; trackId: string; profileId: string }>(
      cloudBaseCollections.favorites,
    );

    return {
      profile: await this.ensureProfile(profileId),
      tracks: (await this.getAll<Track>(cloudBaseCollections.tracks)).filter(
        (track) => track.ownerId === profileId,
      ),
      favorites: await Promise.all(
        favoriteDocs
          .filter((favorite) => favorite.profileId === profileId)
          .map((favorite) => this.getTrack(favorite.trackId)),
      ),
      jobs: await this.listJobs(profileId),
      ledger: await this.getLedger(profileId),
    };
  }

  async getAdminSnapshot() {
    const [profiles, jobs, tracks, plays, assets, ledger] = await Promise.all([
      this.listProfiles(),
      this.listJobs(),
      this.getAll<Track>(cloudBaseCollections.tracks),
      this.getAll<{ id: string }>(cloudBaseCollections.plays),
      this.getAll<ProviderAsset>(cloudBaseCollections.providerAssets),
      this.getAll<CreditLedgerEntry>(cloudBaseCollections.creditLedger),
    ]);

    return {
      profiles,
      failedJobs: jobs.filter((job) => job.status === "failed"),
      hiddenTracks: tracks.filter((track) => track.visibility === "hidden"),
      ledger: ledger.sort(
        (left, right) =>
          new Date(right.createdAt).getTime() -
          new Date(left.createdAt).getTime(),
      ),
      totals: {
        tracks: tracks.length,
        jobs: jobs.length,
        plays: plays.length,
        assets: assets.length,
      },
    };
  }

  async grantCredits(profileId: string, amount: number) {
    const profile = await this.ensureProfile(profileId);
    const credited = applyCreditChange(
      {
        id: profile.id,
        credits: profile.credits,
        balance: profile.credits,
        ledger: await this.getLedger(profile.id),
      },
      {
        amount,
        reason: "admin_grant",
      },
    );

    const updated = { ...profile, credits: credited.credits };
    await this.save(cloudBaseCollections.profiles, updated);
    await this.save(cloudBaseCollections.creditLedger, credited.ledger.at(-1)!);
    return updated;
  }

  async hideTrack(trackId: string) {
    const track = await this.getTrack(trackId);

    if (!track) {
      throw new Error("Track not found");
    }

    const hidden = { ...track, visibility: "hidden" as const, updatedAt: now() };
    await this.save(cloudBaseCollections.tracks, hidden);
    return hidden;
  }

  private async getAll<T>(collection: string) {
    try {
      const result = await this.db.collection(collection).limit(1000).get();
      return getDataArray<T>(result);
    } catch (error) {
      if (!this.isMissingCollectionError(error)) {
        throw error;
      }

      await this.ensureCollection(collection);
      return [];
    }
  }

  private async getOne<T>(collection: string, id: string) {
    try {
      const result = await this.db.collection(collection).doc(id).get();
      return getDataArray<T>(result)[0];
    } catch (error) {
      if (!this.isMissingCollectionError(error)) {
        throw error;
      }

      await this.ensureCollection(collection);
      return undefined;
    }
  }

  private async save<T extends { id: string }>(collection: string, doc: T) {
    try {
      await this.db.collection(collection).doc(doc.id).set(toCloudBaseDoc(doc));
    } catch (error) {
      if (!this.isMissingCollectionError(error)) {
        throw error;
      }

      await this.ensureCollection(collection);
      await this.db.collection(collection).doc(doc.id).set(toCloudBaseDoc(doc));
    }
  }

  private async ensureCollection(collection: string) {
    if (this.ensuredCollections.has(collection)) {
      return;
    }

    try {
      await this.db.createCollection(collection);
    } catch (error) {
      if (!this.isExistingCollectionError(error)) {
        throw error;
      }
    }

    this.ensuredCollections.add(collection);
  }

  private isMissingCollectionError(error: unknown) {
    const message = error instanceof Error ? error.message : String(error);

    return (
      message.includes("DATABASE_COLLECTION_NOT_EXIST") ||
      message.includes("Db or Table not exist")
    );
  }

  private isExistingCollectionError(error: unknown) {
    const message = error instanceof Error ? error.message : String(error);

    return (
      message.includes("DATABASE_COLLECTION_ALREADY_EXISTS") ||
      message.includes("already exists") ||
      message.includes("already exist")
    );
  }

  private async getLedger(profileId: string) {
    return (await this.getAll<CreditLedgerEntry>(cloudBaseCollections.creditLedger))
      .filter((entry) => entry.profileId === profileId)
      .sort(
        (left, right) =>
          new Date(left.createdAt).getTime() -
          new Date(right.createdAt).getTime(),
      );
  }

  private async createDraftTrackFromJob(
    job: GenerationJob,
    result: {
      providerJobId?: string;
      title?: string;
      audioUrl?: string;
      coverUrl?: string;
      lyrics?: string;
      durationSeconds?: number;
      raw?: unknown;
      results?: Array<{
        providerJobId?: string;
        title?: string;
        audioUrl?: string;
        coverUrl?: string;
        lyrics?: string;
        durationSeconds?: number;
        raw?: unknown;
      }>;
    },
  ) {
    const existingIds = job.resultTrackIds ?? (job.resultTrackId ? [job.resultTrackId] : []);
    if (existingIds.length) {
      const existing = await this.getTrack(existingIds[0]);

      if (existing) {
        return existing;
      }
    }

    const owner = await this.ensureProfile(job.ownerId);
    const results = result.results?.length ? result.results : [result];
    const tracks = [];

    for (const [index, item] of results.entries()) {
      const asset: ProviderAsset = {
        id: createId("asset"),
        provider: job.provider,
        providerJobId: item.providerJobId ?? job.providerJobId,
        audioUrl: item.audioUrl,
        coverUrl: item.coverUrl,
        lyrics: item.lyrics,
        metadata: { raw: item.raw ?? result.raw },
        createdAt: now(),
      };
      const track: Track = {
        id: createId("track"),
        ownerId: job.ownerId,
        ownerName: owner.displayName,
        title:
          item.title ??
          result.title ??
          `AI ${job.prompt.slice(0, 16)}${results.length > 1 ? ` ${index + 1}` : ""}`,
        prompt: job.prompt,
        lyrics: item.lyrics ?? result.lyrics ?? job.lyrics ?? "",
        tags: job.tags.length ? job.tags : ["AI音乐"],
        language: job.language,
        mode: job.mode,
        visibility: "draft",
        audioUrl: item.audioUrl ?? result.audioUrl ?? "",
        coverUrl:
          item.coverUrl ??
          result.coverUrl ??
          "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?auto=format&fit=crop&w=1200&q=80",
        durationSeconds: item.durationSeconds ?? result.durationSeconds ?? 0,
        providerAssetId: asset.id,
        plays: 0,
        likes: 0,
        favorites: 0,
        remixes: 0,
        createdAt: now(),
        updatedAt: now(),
      };

      await this.save(cloudBaseCollections.providerAssets, asset);
      await this.save(cloudBaseCollections.tracks, track);
      tracks.push(track);
    }

    const trackIds = tracks.map((track) => track.id);
    await this.save(cloudBaseCollections.generationJobs, {
      ...job,
      status: "succeeded",
      resultTrackId: trackIds[0],
      resultTrackIds: trackIds,
      updatedAt: now(),
    });

    return tracks[0];
  }

  private async createProviderJobSafely(
    request: Parameters<MusicProvider["createJob"]>[0],
  ) {
    try {
      return await this.provider.createJob(request);
    } catch (error) {
      return {
        providerJobId: "",
        status: "failed" as const,
        error:
          error instanceof Error
            ? error.message
            : "Provider create request failed",
      };
    }
  }

  private async refundJob(job: GenerationJob) {
    const profile = await this.getProfile(job.ownerId);

    if (!profile) {
      return;
    }

    const ledger = await this.getLedger(profile.id);
    const alreadyRefunded = ledger.some(
      (entry) => entry.jobId === job.id && entry.reason === "generation_refund",
    );

    if (alreadyRefunded) {
      return;
    }

    const refunded = applyCreditChange(
      {
        id: profile.id,
        credits: profile.credits,
        balance: profile.credits,
        ledger,
      },
      {
        amount: job.cost,
        reason: "generation_refund",
        jobId: job.id,
      },
    );

    await this.save(cloudBaseCollections.profiles, {
      ...profile,
      credits: refunded.credits,
    });
    await this.save(cloudBaseCollections.creditLedger, refunded.ledger.at(-1)!);
  }

  private async toggleMetric(
    trackId: string,
    profileId: string,
    metric: "likes" | "favorites",
    collection: string,
  ) {
    const track = await this.getTrack(trackId);

    if (!track || track.visibility !== "public") {
      throw new Error("Track not found");
    }

    const id = `${trackId}:${profileId}`;
    const existing = await this.getOne<{ id: string }>(collection, id);
    const active = !existing;
    const nextValue = Math.max(0, track[metric] + (active ? 1 : -1));

    if (active) {
      await this.save(collection, {
        id,
        trackId,
        profileId,
        createdAt: now(),
      });
    } else {
      await this.db.collection(collection).doc(id).remove();
    }

    const updated = { ...track, [metric]: nextValue, updatedAt: now() };
    await this.save(cloudBaseCollections.tracks, updated);
    return { track: updated, active };
  }

  private async getInteractionKeys() {
    const [likes, favorites] = await Promise.all([
      this.getAll<{ id: string }>(cloudBaseCollections.likes),
      this.getAll<{ id: string }>(cloudBaseCollections.favorites),
    ]);

    return {
      likeKeys: new Set(likes.map((like) => like.id)),
      favoriteKeys: new Set(favorites.map((favorite) => favorite.id)),
    };
  }

  private getCategories(tracks: Track[]) {
    return [
      "全部",
      ...Array.from(new Set(tracks.flatMap((track) => track.tags))).slice(0, 12),
    ];
  }
}

export function createCloudBaseMusicStore(provider: MusicProvider) {
  return new CloudBaseMusicStore(provider);
}
