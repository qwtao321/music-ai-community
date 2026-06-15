export type GenerationMode = "original" | "cover_audio" | "cover_text_style";

export type JobStatus = "queued" | "running" | "succeeded" | "failed";

export type TrackVisibility = "draft" | "public" | "hidden";

export type RankingKind = "hot" | "plays" | "likes" | "favorites" | "remixes";

export type HallSort = "latest" | RankingKind;

export type Profile = {
  id: string;
  displayName: string;
  avatarUrl: string;
  role: "user" | "admin";
  credits: number;
  createdAt: string;
};

export type CreditLedgerEntry = {
  id: string;
  profileId: string;
  amount: number;
  reason:
    | "signup_bonus"
    | "generation_charge"
    | "generation_refund"
    | "admin_grant";
  jobId?: string;
  createdAt: string;
};

export type ProviderAsset = {
  id: string;
  provider: string;
  providerJobId: string;
  audioUrl?: string;
  coverUrl?: string;
  lyrics?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type Track = {
  id: string;
  ownerId: string;
  ownerName: string;
  title: string;
  prompt: string;
  lyrics: string;
  tags: string[];
  language: string;
  mode: GenerationMode;
  visibility: TrackVisibility;
  audioUrl: string;
  coverUrl: string;
  durationSeconds: number;
  providerAssetId?: string;
  plays: number;
  likes: number;
  favorites: number;
  remixes: number;
  createdAt: string;
  updatedAt: string;
};

export type GenerationJob = {
  id: string;
  ownerId: string;
  mode: GenerationMode;
  prompt: string;
  lyrics?: string;
  tags: string[];
  language: string;
  status: JobStatus;
  cost: number;
  provider: string;
  providerJobId: string;
  referenceAudioUrl?: string;
  error?: string;
  resultTrackId?: string;
  resultTrackIds?: string[];
  createdAt: string;
  updatedAt: string;
};

export type GenerationRequest = {
  mode: GenerationMode;
  prompt: string;
  lyrics?: string;
  tags?: string[];
  language?: string;
  visibility?: TrackVisibility;
  referenceAudioUrl?: string;
};

export type ProviderCreateRequest = {
  mode: GenerationMode;
  prompt: string;
  lyrics?: string;
  tags: string[];
  language?: string;
  referenceAudioUrl?: string;
};

export type ProviderJobResult = {
  providerJobId: string;
  status: JobStatus;
  title?: string;
  audioUrl?: string;
  coverUrl?: string;
  lyrics?: string;
  durationSeconds?: number;
  error?: string;
  raw?: unknown;
  results?: ProviderTrackResult[];
};

export type ProviderTrackResult = {
  providerJobId?: string;
  title?: string;
  audioUrl?: string;
  coverUrl?: string;
  lyrics?: string;
  durationSeconds?: number;
  raw?: unknown;
};

export type PublicTrack = Track & {
  likedByViewer?: boolean;
  favoritedByViewer?: boolean;
};
