import type {
  JobStatus,
  ProviderCreateRequest,
  ProviderJobResult,
  ProviderTrackResult,
} from "./types";

export interface MusicProvider {
  readonly name: string;
  createJob(request: ProviderCreateRequest): Promise<ProviderJobResult>;
  getJob(providerJobId: string): Promise<ProviderJobResult>;
  cancelJob(providerJobId: string): Promise<void>;
  normalizeResult(raw: unknown): ProviderJobResult;
}

type Fetcher = typeof fetch;

type SunoLikeProviderOptions = {
  apiBaseUrl: string;
  apiKey: string;
  model?: string;
  fetcher?: Fetcher;
};

const queuedStates = new Set([
  "queued",
  "created",
  "pending",
  "submitted",
  "pending",
  "text_success",
]);
const runningStates = new Set([
  "running",
  "processing",
  "streaming",
  "first_success",
  "generating",
]);
const successStates = new Set([
  "succeeded",
  "success",
  "complete",
  "completed",
  "success",
]);
const failedStates = new Set([
  "failed",
  "failure",
  "error",
  "errored",
  "create_task_failed",
  "generate_audio_failed",
  "callback_exception",
  "sensitive_word_error",
]);

export function normalizeProviderStatus(status?: string): JobStatus {
  const normalized = String(status ?? "").toLowerCase();

  if (runningStates.has(normalized)) {
    return "running";
  }

  if (successStates.has(normalized)) {
    return "succeeded";
  }

  if (failedStates.has(normalized)) {
    return "failed";
  }

  return queuedStates.has(normalized) ? "queued" : "queued";
}

function buildHeaders(apiKey: string) {
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };
}

function stringifyProviderMessage(value: unknown, fallback: string) {
  if (!value) {
    return fallback;
  }

  if (typeof value === "string") {
    return value;
  }

  try {
    return JSON.stringify(value);
  } catch {
    return fallback;
  }
}

function getNestedRecord(value: unknown, key: string) {
  const record =
    value && typeof value === "object" ? (value as Record<string, unknown>) : undefined;
  const nested = record?.[key];
  return nested && typeof nested === "object"
    ? (nested as Record<string, unknown>)
    : undefined;
}

function extractProviderJobId(payload: Record<string, unknown>) {
  const data = getNestedRecord(payload, "data");
  const identifier =
    payload.song_id ??
    payload.id ??
    payload.taskId ??
    payload.job_id ??
    data?.song_id ??
    data?.id ??
    data?.taskId ??
    data?.job_id;

  return identifier ? String(identifier) : "";
}

function extractStatus(payload: Record<string, unknown>) {
  const data = getNestedRecord(payload, "data");
  return String(payload.status ?? payload.state ?? data?.status ?? data?.state ?? "queued");
}

function extractMediaField(payload: Record<string, unknown>, fieldNames: string[]) {
  const data = getNestedRecord(payload, "data");

  for (const fieldName of fieldNames) {
    const direct = payload[fieldName];
    if (direct) {
      return direct;
    }

    const nested = data?.[fieldName];
    if (nested) {
      return nested;
    }
  }

  return undefined;
}

export class SunoLikeProvider implements MusicProvider {
  readonly name = "suno-like";

  private readonly apiBaseUrl: string;
  private readonly apiKey: string;
  private readonly model: string;
  private readonly fetcher: Fetcher;

  constructor(options: SunoLikeProviderOptions) {
    this.apiBaseUrl = options.apiBaseUrl.replace(/\/$/, "");
    this.apiKey = options.apiKey;
    this.model = options.model ?? "suno-v5-5";
    this.fetcher = options.fetcher ?? fetch;
  }

  async createJob(request: ProviderCreateRequest) {
    const endpoint = request.lyrics?.trim()
      ? "/api/music/create/custom"
      : "/api/music/create";
    const response = await this.fetcher(`${this.apiBaseUrl}${endpoint}`, {
      method: "POST",
      headers: buildHeaders(this.apiKey),
      body: JSON.stringify(this.buildGeneratePayload(request)),
    });

    return this.normalizeHttpResult(await response.json(), response.ok);
  }

  async getJob(providerJobId: string): Promise<ProviderJobResult> {
    if (!providerJobId.trim()) {
      return {
        providerJobId: "",
        status: "failed",
        error: "Missing provider job id from Suno create response",
      };
    }

    const response = await this.fetcher(
      `${this.apiBaseUrl}/api/music/query`,
      {
        method: "POST",
        headers: buildHeaders(this.apiKey),
        body: JSON.stringify({
          model: this.model,
          song_ids: providerJobId,
        }),
      },
    );

    return this.normalizeHttpResult(await response.json(), response.ok);
  }

  async cancelJob(providerJobId: string) {
    void providerJobId;
  }

  normalizeResult(raw: unknown): ProviderJobResult {
    if (Array.isArray(raw)) {
      return this.normalizeSongs(raw);
    }

    const payload = raw as Record<string, unknown>;
    const data = getNestedRecord(payload, "data");
    const id = extractProviderJobId(payload);
    const status = normalizeProviderStatus(extractStatus(payload));
    const audioUrl = extractMediaField(payload, [
      "audio_url",
      "audioUrl",
      "url",
    ]);
    const coverUrl = extractMediaField(payload, [
      "cover_url",
      "coverUrl",
      "image_url",
      "imageUrl",
    ]);
    const duration = payload.duration;
    const finalStatus = audioUrl && status === "running" ? "succeeded" : status;

    return {
      providerJobId: id,
      status: finalStatus,
      title: payload.song_title
        ? String(payload.song_title)
        : payload.title
          ? String(payload.title)
          : data?.song_title
            ? String(data.song_title)
            : data?.title
              ? String(data.title)
          : undefined,
      audioUrl: audioUrl ? String(audioUrl) : undefined,
      coverUrl: coverUrl ? String(coverUrl) : undefined,
      lyrics: payload.lyrics
        ? String(payload.lyrics)
        : data?.lyrics
          ? String(data.lyrics)
        : undefined,
      durationSeconds:
        typeof duration === "number"
          ? Math.round(duration)
          : typeof data?.duration === "number"
            ? Math.round(data.duration)
            : undefined,
      error:
        payload.error || finalStatus === "failed"
          ? stringifyProviderMessage(
              payload.error ?? payload.msg,
              "Suno generation failed",
            )
          : undefined,
      raw,
    };
  }

  private buildGeneratePayload(request: ProviderCreateRequest) {
    const tags = request.tags.join(", ");
    const title = request.songTitle?.trim() || request.prompt.slice(0, 80);

    if (request.lyrics?.trim()) {
      return {
        model: this.model,
        lyrics: request.lyrics,
        style_tags: tags || request.prompt,
        song_title: title,
        instrumental: false,
        wait_completion: false,
      };
    }

    return {
      model: this.model,
      description: [request.prompt, request.tags.join(" ")].filter(Boolean).join(" "),
      instrumental: false,
      wait_completion: false,
    };
  }

  private normalizeSongs(rawSongs: unknown[]): ProviderJobResult {
    const songs = rawSongs as Array<Record<string, unknown>>;
    const completed = songs.find((song) =>
      ["completed", "complete", "success", "succeeded"].includes(
        String(song.status ?? "").toLowerCase(),
      ),
    );
    const failed = songs.find((song) =>
      ["failed", "error"].includes(String(song.status ?? "").toLowerCase()),
    );
    const first = completed ?? failed ?? songs[0];

    if (!first) {
      return {
        providerJobId: "",
        status: "failed",
        error: "Suno API returned an empty song list",
        raw: rawSongs,
      };
    }

    const songIds = songs
      .map((song) => song.song_id ?? song.id)
      .filter(Boolean)
      .map(String)
      .join(",");
    const normalized = this.normalizeResult(first);
    const results = songs
      .map((song): ProviderTrackResult => {
        const item = this.normalizeResult(song);

        return {
          providerJobId: item.providerJobId,
          title: item.title,
          audioUrl: item.audioUrl,
          coverUrl: item.coverUrl,
          lyrics: item.lyrics,
          durationSeconds: item.durationSeconds,
          raw: song,
        };
      })
      .filter((item) => item.audioUrl || item.title || item.providerJobId);

    return {
      ...normalized,
      providerJobId: songIds || normalized.providerJobId,
      status:
        completed || normalized.audioUrl
          ? "succeeded"
          : failed
            ? "failed"
            : "queued",
      raw: rawSongs,
      results,
    };
  }

  private normalizeHttpResult(raw: unknown, ok: boolean): ProviderJobResult {
    const payload = raw as Record<string, unknown>;
    const code = Number(payload.code ?? (ok ? 200 : 500));

    if (!ok || (Number.isFinite(code) && code >= 400)) {
      return {
        providerJobId: extractProviderJobId(payload),
        status: "failed",
        error: stringifyProviderMessage(
          payload.msg ?? payload.error,
          "Suno API request failed",
        ),
        raw,
      };
    }

    return this.normalizeResult(raw);
  }
}

export class MockProvider implements MusicProvider {
  readonly name = "mock-suno";

  private readonly jobs = new Map<string, ProviderJobResult>();

  async createJob(request: ProviderCreateRequest) {
    const providerJobId = `mock-${Date.now()}-${Math.random()
      .toString(16)
      .slice(2)}`;
    const title = request.songTitle?.trim() || request.prompt.slice(0, 18) || "未命名旋律";
    const result: ProviderJobResult = {
      providerJobId,
      status: "succeeded",
      title: request.songTitle?.trim() ? title : `AI ${title}`,
      audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
      coverUrl:
        "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=1200&q=80",
      lyrics:
        request.lyrics ??
        `Verse\n${request.prompt}\n\nChorus\n让旋律穿过人群，留下闪光的回声。`,
      durationSeconds: 196,
      raw: request,
    };

    this.jobs.set(providerJobId, result);
    return result;
  }

  async getJob(providerJobId: string): Promise<ProviderJobResult> {
    const result = this.jobs.get(providerJobId);

    if (!result) {
      return {
        providerJobId,
        status: "failed",
        error: "Mock job not found",
      };
    }

    return result;
  }

  async cancelJob(providerJobId: string) {
    this.jobs.delete(providerJobId);
  }

  normalizeResult(raw: unknown): ProviderJobResult {
    return raw as ProviderJobResult;
  }
}

export class UnconfiguredProvider implements MusicProvider {
  readonly name = "unconfigured-suno";

  async createJob(): Promise<ProviderJobResult> {
    return {
      providerJobId: "",
      status: "failed",
      error:
        "未配置 SUNO_API_KEY。请在 .env.local 中配置真实 Suno API 后重启服务，或设置 SUNO_FORCE_MOCK=true 使用演示模式。",
    };
  }

  async getJob(providerJobId: string): Promise<ProviderJobResult> {
    return {
      providerJobId,
      status: "failed",
      error:
        "未配置 SUNO_API_KEY。请在 .env.local 中配置真实 Suno API 后重启服务。",
    };
  }

  async cancelJob() {}

  normalizeResult(raw: unknown): ProviderJobResult {
    return raw as ProviderJobResult;
  }
}

export function createMusicProvider(): MusicProvider {
  const apiBaseUrl = process.env.SUNO_API_BASE_URL;
  const apiKey = process.env.SUNO_API_KEY;

  if (process.env.SUNO_FORCE_MOCK === "true") {
    return new MockProvider();
  }

  if (apiBaseUrl && apiKey) {
    return new SunoLikeProvider({
      apiBaseUrl,
      apiKey,
      model: process.env.SUNO_MODEL,
    });
  }

  return new UnconfiguredProvider();
}
