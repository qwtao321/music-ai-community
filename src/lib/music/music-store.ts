import type {
  CreditLedgerEntry,
  GenerationJob,
  GenerationRequest,
  HallSort,
  MusicStyleTemplate,
  Profile,
  PublicTrack,
  RankingKind,
  Track,
} from "./types";

export type MaybePromise<T> = T | Promise<T>;

export type HallQuery = {
  q?: string;
  category?: string;
  sort?: HallSort;
  viewerId?: string;
};

export type HallResult = {
  items: PublicTrack[];
  categories: string[];
};

export type MyLibrary = {
  profile: Profile;
  tracks: Track[];
  favorites: Array<Track | undefined>;
  jobs: GenerationJob[];
  ledger: CreditLedgerEntry[];
};

export type AdminSnapshot = {
  profiles: Profile[];
  failedJobs: GenerationJob[];
  hiddenTracks: Track[];
  ledger: CreditLedgerEntry[];
  totals: {
    tracks: number;
    jobs: number;
    plays: number;
    assets: number;
  };
};

export interface MusicStore {
  ensureProfile(
    id?: string,
    displayName?: string,
    avatarUrl?: string,
  ): MaybePromise<Profile>;
  getProfile(id?: string): MaybePromise<Profile | undefined>;
  listProfiles(): MaybePromise<Profile[]>;
  createGenerationJob(
    ownerId: string,
    request: GenerationRequest,
  ): Promise<GenerationJob>;
  refreshJob(jobId: string): Promise<GenerationJob>;
  publishJob(jobId: string, ownerId: string): MaybePromise<Track>;
  publishTrack(trackId: string, ownerId: string): MaybePromise<Track>;
  getJob(jobId: string): MaybePromise<GenerationJob | undefined>;
  listJobs(ownerId?: string): MaybePromise<GenerationJob[]>;
  getTrack(trackId: string): MaybePromise<Track | undefined>;
  getHall(query?: HallQuery): MaybePromise<HallResult>;
  getRankings(kind: RankingKind, viewerId?: string): MaybePromise<PublicTrack[]>;
  listStyleTemplates(): MaybePromise<MusicStyleTemplate[]>;
  recordPlay(trackId: string, profileId?: string): MaybePromise<Track>;
  toggleLike(
    trackId: string,
    profileId: string,
  ): MaybePromise<{ track: Track; active: boolean }>;
  toggleFavorite(
    trackId: string,
    profileId: string,
  ): MaybePromise<{ track: Track; active: boolean }>;
  getMyLibrary(profileId: string): MaybePromise<MyLibrary>;
  getAdminSnapshot(): MaybePromise<AdminSnapshot>;
  grantCredits(profileId: string, amount: number): MaybePromise<Profile>;
  hideTrack(trackId: string): MaybePromise<Track>;
}
