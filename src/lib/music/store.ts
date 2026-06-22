import { applyCreditChange, calculateGenerationCost } from "./credits";
import { MockProvider, type MusicProvider } from "./provider";
import { rankTracks } from "./rankings";
import { isAdminUserId } from "./roles";
import { createMusicStyleTemplates } from "./style-templates";
import { seedProfiles, seedTracks } from "./seed";
import type { HallQuery, MusicStore } from "./music-store";
import type {
  CreditLedgerEntry,
  GenerationJob,
  GenerationRequest,
  MusicStyleTemplate,
  Profile,
  ProviderAsset,
  PublicTrack,
  RankingKind,
  Track,
} from "./types";

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function now() {
  return new Date().toISOString();
}

function withViewerState(
  track: Track,
  viewerId: string | undefined,
  likes: Set<string>,
  favorites: Set<string>,
): PublicTrack {
  return {
    ...track,
    likedByViewer: viewerId ? likes.has(`${track.id}:${viewerId}`) : false,
    favoritedByViewer: viewerId
      ? favorites.has(`${track.id}:${viewerId}`)
      : false,
  };
}

export class DemoMusicStore implements MusicStore {
  private readonly provider: MusicProvider;
  private readonly profiles = new Map<string, Profile>();
  private readonly tracks = new Map<string, Track>();
  private readonly jobs = new Map<string, GenerationJob>();
  private readonly assets = new Map<string, ProviderAsset>();
  private readonly likes = new Set<string>();
  private readonly favorites = new Set<string>();
  private readonly plays: Array<{ trackId: string; profileId?: string }> = [];
  private readonly ledger: CreditLedgerEntry[] = [];
  private readonly styleTemplates: MusicStyleTemplate[];

  constructor(provider: MusicProvider = new MockProvider()) {
    this.provider = provider;
    seedProfiles.forEach((profile) => this.profiles.set(profile.id, profile));
    seedTracks.forEach((track) => this.tracks.set(track.id, track));
    this.styleTemplates = createMusicStyleTemplates();
  }

  ensureProfile(
    id = "demo-user",
    displayName?: string,
    avatarUrl?: string,
  ) {
    const existing = this.profiles.get(id);
    const role: Profile["role"] = isAdminUserId(id) ? "admin" : "user";
    const nextDisplayName = displayName?.trim() || existing?.displayName || "体验用户";
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
      this.profiles.set(id, updated);
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

    this.profiles.set(profile.id, profile);
    this.ledger.push({
      id: createId("ledger"),
      profileId: profile.id,
      amount: 100,
      reason: "signup_bonus",
      createdAt: now(),
    });

    return profile;
  }

  getProfile(id = "demo-user") {
    return this.profiles.get(id);
  }

  listProfiles() {
    return [...this.profiles.values()];
  }

  async createGenerationJob(ownerId: string, request: GenerationRequest) {
    const profile = this.ensureProfile(ownerId);
    const mode = request.mode;
    const cost = calculateGenerationCost(mode);
    const duplicate = [...this.jobs.values()].find(
      (job) =>
        job.ownerId === ownerId &&
        job.mode === mode &&
        job.prompt === request.prompt &&
        ["queued", "running"].includes(job.status),
    );

    if (duplicate) {
      return duplicate;
    }

    const jobId = createId("job");
    const charged = applyCreditChange(
      {
        id: profile.id,
        credits: profile.credits,
        balance: profile.credits,
        ledger: this.ledger.filter((entry) => entry.profileId === profile.id),
      },
      {
        amount: -cost,
        reason: "generation_charge",
        jobId,
      },
    );

    this.profiles.set(profile.id, { ...profile, credits: charged.credits });
    this.ledger.push(charged.ledger.at(-1)!);

    const providerResult = await this.createProviderJobSafely({
      mode,
      prompt: request.prompt,
      songTitle: request.songTitle,
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
      songTitle: request.songTitle,
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

    this.jobs.set(job.id, job);

    if (providerResult.status === "failed") {
      this.refundJob(job);
    }

    if (providerResult.status === "succeeded") {
      this.createDraftTrackFromJob(job, providerResult);
    }

    return this.jobs.get(job.id)!;
  }

  async refreshJob(jobId: string) {
    const job = this.getJob(jobId);

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

    this.jobs.set(job.id, updated);

    if (providerResult.status === "failed") {
      this.refundJob(updated);
    }

    if (providerResult.status === "succeeded" && !updated.resultTrackId) {
      this.createDraftTrackFromJob(updated, providerResult);
    }

    return this.getJob(job.id)!;
  }

  publishJob(jobId: string, ownerId: string) {
    const job = this.getJob(jobId);

    if (!job || job.ownerId !== ownerId) {
      throw new Error("Job not found");
    }

    if (!job.resultTrackId) {
      throw new Error("Job has no track to publish");
    }

    return this.publishTrack(job.resultTrackId, ownerId);
  }

  publishTrack(trackId: string, ownerId: string) {
    const track = this.getTrack(trackId);

    if (!track || track.ownerId !== ownerId) {
      throw new Error("Track not found");
    }

    const published = { ...track, visibility: "public" as const, updatedAt: now() };
    this.tracks.set(track.id, published);
    return published;
  }

  getJob(jobId: string) {
    return this.jobs.get(jobId);
  }

  listJobs(ownerId?: string) {
    return [...this.jobs.values()]
      .filter((job) => !ownerId || job.ownerId === ownerId)
      .sort(
        (left, right) =>
          new Date(right.createdAt).getTime() -
          new Date(left.createdAt).getTime(),
      );
  }

  getTrack(trackId: string) {
    return this.tracks.get(trackId);
  }

  getHall(query: HallQuery = {}) {
    const viewerId = query.viewerId;
    const q = query.q?.trim().toLowerCase();
    const category = query.category?.trim();
    let tracks = [...this.tracks.values()].filter(
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

    return {
      items: tracks.map((track) =>
        withViewerState(track, viewerId, this.likes, this.favorites),
      ),
      categories: this.getCategories(),
    };
  }

  getRankings(kind: RankingKind, viewerId?: string) {
    return rankTracks(
      [...this.tracks.values()].filter((track) => track.visibility === "public"),
      kind,
    ).map((track) =>
      withViewerState(track, viewerId, this.likes, this.favorites),
    );
  }

  listStyleTemplates() {
    return [...this.styleTemplates];
  }

  recordPlay(trackId: string, profileId?: string) {
    const track = this.getTrack(trackId);

    if (!track || track.visibility !== "public") {
      throw new Error("Track not playable");
    }

    const updated = { ...track, plays: track.plays + 1, updatedAt: now() };
    this.tracks.set(trackId, updated);
    this.plays.push({ trackId, profileId });
    return updated;
  }

  toggleLike(trackId: string, profileId: string) {
    return this.toggleMetric(trackId, profileId, "likes", this.likes);
  }

  toggleFavorite(trackId: string, profileId: string) {
    return this.toggleMetric(trackId, profileId, "favorites", this.favorites);
  }

  getMyLibrary(profileId: string) {
    return {
      profile: this.ensureProfile(profileId),
      tracks: [...this.tracks.values()].filter(
        (track) => track.ownerId === profileId,
      ),
      favorites: [...this.favorites]
        .filter((key) => key.endsWith(`:${profileId}`))
        .map((key) => this.getTrack(key.split(":")[0]))
        .filter(Boolean),
      jobs: this.listJobs(profileId),
      ledger: this.ledger.filter((entry) => entry.profileId === profileId),
    };
  }

  getAdminSnapshot() {
    return {
      profiles: this.listProfiles(),
      failedJobs: this.listJobs().filter((job) => job.status === "failed"),
      hiddenTracks: [...this.tracks.values()].filter(
        (track) => track.visibility === "hidden",
      ),
      ledger: [...this.ledger].sort(
        (left, right) =>
          new Date(right.createdAt).getTime() -
          new Date(left.createdAt).getTime(),
      ),
      totals: {
        tracks: this.tracks.size,
        jobs: this.jobs.size,
        plays: this.plays.length,
        assets: this.assets.size,
      },
    };
  }

  grantCredits(profileId: string, amount: number) {
    const profile = this.ensureProfile(profileId);
    const credited = applyCreditChange(
      {
        id: profile.id,
        credits: profile.credits,
        balance: profile.credits,
        ledger: this.ledger.filter((entry) => entry.profileId === profile.id),
      },
      {
        amount,
        reason: "admin_grant",
      },
    );

    this.profiles.set(profile.id, { ...profile, credits: credited.credits });
    this.ledger.push(credited.ledger.at(-1)!);
    return this.getProfile(profile.id)!;
  }

  hideTrack(trackId: string) {
    const track = this.getTrack(trackId);

    if (!track) {
      throw new Error("Track not found");
    }

    const hidden = { ...track, visibility: "hidden" as const, updatedAt: now() };
    this.tracks.set(track.id, hidden);
    return hidden;
  }

  private createDraftTrackFromJob(
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
    const existing = existingIds
      .map((trackId) => this.getTrack(trackId))
      .filter(Boolean);

    if (existing.length) {
      return existing[0];
    }

    const owner = this.ensureProfile(job.ownerId);
    const results = result.results?.length ? result.results : [result];
    const tracks = results.map((item, index) => {
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
          job.songTitle ??
          `AI ${job.prompt.slice(0, 16)}${results.length > 1 ? ` ${index + 1}` : ""}`,
        prompt: job.prompt,
        lyrics: item.lyrics ?? result.lyrics ?? job.lyrics ?? "",
        tags: job.tags.length ? job.tags : ["AI音乐"],
        language: job.language,
        mode: job.mode,
        visibility: "draft",
        audioUrl:
          item.audioUrl ??
          result.audioUrl ??
          "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3",
        coverUrl:
          item.coverUrl ??
          result.coverUrl ??
          "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?auto=format&fit=crop&w=1200&q=80",
        durationSeconds: item.durationSeconds ?? result.durationSeconds ?? 196,
        providerAssetId: asset.id,
        plays: 0,
        likes: 0,
        favorites: 0,
        remixes: 0,
        createdAt: now(),
        updatedAt: now(),
      };

      this.assets.set(asset.id, asset);
      this.tracks.set(track.id, track);
      return track;
    });
    const trackIds = tracks.map((track) => track.id);
    this.jobs.set(job.id, {
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

  private refundJob(job: GenerationJob) {
    const profile = this.getProfile(job.ownerId);

    if (!profile) {
      return;
    }

    const alreadyRefunded = this.ledger.some(
      (entry) =>
        entry.profileId === profile.id &&
        entry.jobId === job.id &&
        entry.reason === "generation_refund",
    );

    if (alreadyRefunded) {
      return;
    }

    const refunded = applyCreditChange(
      {
        id: profile.id,
        credits: profile.credits,
        balance: profile.credits,
        ledger: this.ledger.filter((entry) => entry.profileId === profile.id),
      },
      {
        amount: job.cost,
        reason: "generation_refund",
        jobId: job.id,
      },
    );

    this.profiles.set(profile.id, { ...profile, credits: refunded.credits });
    this.ledger.push(refunded.ledger.at(-1)!);
  }

  private toggleMetric(
    trackId: string,
    profileId: string,
    metric: "likes" | "favorites",
    set: Set<string>,
  ) {
    const track = this.getTrack(trackId);

    if (!track || track.visibility !== "public") {
      throw new Error("Track not found");
    }

    const key = `${trackId}:${profileId}`;
    const active = !set.has(key);
    const nextValue = Math.max(0, track[metric] + (active ? 1 : -1));

    if (active) {
      set.add(key);
    } else {
      set.delete(key);
    }

    const updated = { ...track, [metric]: nextValue, updatedAt: now() };
    this.tracks.set(track.id, updated);
    return { track: updated, active };
  }

  private getCategories() {
    return [
      "全部",
      ...Array.from(
        new Set([...this.tracks.values()].flatMap((track) => track.tags)),
      ).slice(0, 12),
    ];
  }
}

export function createDemoMusicStore(provider?: MusicProvider) {
  return new DemoMusicStore(provider);
}
