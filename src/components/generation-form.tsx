"use client";

import { FormEvent, useMemo, useState } from "react";
import {
  AudioLines,
  Bot,
  FileAudio,
  Loader2,
  Mic2,
  Music,
  Send,
  Sparkles,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { GenerationMode, GenerationJob, Track } from "@/lib/music/types";
import { PublishTrackButton } from "./publish-track-button";

type GenerateResponse = {
  job: GenerationJob;
};

type JobResponse = {
  job: GenerationJob;
  track?: Track;
  tracks?: Track[];
  error?: string;
};

async function readJsonResponse<T>(response: Response): Promise<T & { error?: string }> {
  const text = await response.text();

  if (!text) {
    return {
      error: response.ok ? undefined : `请求失败：HTTP ${response.status}`,
    } as T & { error?: string };
  }

  try {
    return JSON.parse(text) as T & { error?: string };
  } catch {
    return {
      error: response.ok ? "响应格式异常" : `请求失败：HTTP ${response.status}`,
    } as T & { error?: string };
  }
}

const styleTags = ["流行", "电子", "R&B", "民谣", "摇滚", "国风", "短视频", "女声", "男声"];

export function GenerationForm({
  initialPrompt = "",
}: {
  initialPrompt?: string;
}) {
  const [mode, setMode] = useState<GenerationMode>("original");
  const [prompt, setPrompt] = useState(initialPrompt);
  const [lyrics, setLyrics] = useState("");
  const [language, setLanguage] = useState("中文");
  const [tags, setTags] = useState<string[]>(["流行", "电子"]);
  const [referenceAudioUrl, setReferenceAudioUrl] = useState("");
  const [isAdvanced, setIsAdvanced] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isWritingLyrics, setIsWritingLyrics] = useState(false);
  const [message, setMessage] = useState("");
  const [tracks, setTracks] = useState<Track[]>([]);
  const [job, setJob] = useState<GenerationJob | null>(null);

  const cost = useMemo(() => {
    if (mode === "cover_audio") {
      return 18;
    }

    return mode === "cover_text_style" ? 12 : 10;
  }, [mode]);

  function toggleTag(tag: string) {
    setTags((current) =>
      current.includes(tag)
        ? current.filter((item) => item !== tag)
        : [...current, tag],
    );
  }

  async function writeLyrics() {
    setIsWritingLyrics(true);
    setMessage("");

    const response = await fetch("/api/lyrics", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        theme: prompt || "一首尚未命名的歌",
        language,
        tags,
      }),
    });
    const payload = await readJsonResponse<{ lyrics?: string }>(response);

    if (!response.ok || !payload.lyrics) {
      setMessage(payload.error ?? "AI 写歌词失败");
      setIsWritingLyrics(false);
      return;
    }

    setLyrics(payload.lyrics);
    setMessage("歌词已生成，可继续微调后生成歌曲。");
    setIsWritingLyrics(false);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage("");
    setTracks([]);
    setJob(null);

    const response = await fetch("/api/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        mode,
        prompt,
        lyrics,
        tags,
        language,
        referenceAudioUrl:
          mode === "cover_audio" ? referenceAudioUrl || undefined : undefined,
      }),
    });
    const payload = await readJsonResponse<GenerateResponse>(response);

    if (response.status === 401) {
      const from = `${window.location.pathname}${window.location.search}`;
      window.location.assign(`/login?from=${encodeURIComponent(from)}`);
      return;
    }

    if (!response.ok) {
      setMessage(payload.error ?? "生成失败");
      setIsSubmitting(false);
      return;
    }

    setJob(payload.job);
    setMessage("任务已提交，正在等待 Suno 生成音频。");

    const refreshedPayload = await waitForTrack(payload.job.id);

    const generatedTracks = refreshedPayload.tracks?.length
      ? refreshedPayload.tracks
      : refreshedPayload.track
        ? [refreshedPayload.track]
        : [];

    if (generatedTracks.length) {
      setTracks(generatedTracks);
      setMessage(`生成完成，已保存 ${generatedTracks.length} 首到我的作品。发布后会进入音乐广场。`);
    } else if (refreshedPayload.job.status === "failed") {
      setMessage(refreshedPayload.job.error ?? "生成失败，积分会自动返还。");
    } else {
      setMessage("任务仍在生成中，稍后可在我的空间查看。");
    }

    setIsSubmitting(false);
  }

  async function waitForTrack(jobId: string): Promise<JobResponse> {
    let latest: JobResponse | null = null;

    for (let attempt = 0; attempt < 24; attempt += 1) {
      if (attempt > 0) {
        await new Promise((resolve) => window.setTimeout(resolve, 5000));
      }

      const response = await fetch(`/api/jobs/${jobId}`, {
      });
      latest = await readJsonResponse<JobResponse>(response);

      if (response.status === 401) {
        const from = `${window.location.pathname}${window.location.search}`;
        window.location.assign(`/login?from=${encodeURIComponent(from)}`);
        return {
          job: {
            id: jobId,
            ownerId: "",
            mode,
            prompt,
            tags,
            language,
            status: "failed",
            cost,
            provider: "suno-like",
            providerJobId: "",
            error: "登录已过期，请重新登录。",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        };
      }

      if (!response.ok || !latest.job) {
        return {
          job: {
            id: jobId,
            ownerId: "",
            mode,
            prompt,
            tags,
            language,
            status: "failed",
            cost,
            provider: "suno-like",
            providerJobId: "",
            error: latest.error ?? `任务查询失败：HTTP ${response.status}`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          error: latest.error,
        };
      }

      if (latest.job) {
        setJob(latest.job);
        setMessage(
          latest.job.status === "running"
            ? "Suno 正在生成音频，通常需要 30-90 秒。"
            : latest.job.status === "queued"
              ? "任务已排队，正在等待模型处理。"
              : latest.job.status === "succeeded"
                ? "音频已生成，正在保存作品。"
                : latest.job.error ?? "生成失败。",
        );
      }

      if (latest.tracks?.length || latest.track || latest.job?.status === "failed") {
        return latest;
      }
    }

    return latest ?? {
      job: {
        id: jobId,
        ownerId: "",
        mode,
        prompt,
        tags,
        language,
        status: "running",
        cost,
        provider: "suno-like",
        providerJobId: "",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        },
      };
    }

  return (
    <form onSubmit={submit} className="space-y-4 rounded border border-black/10 bg-white p-4 shadow-sm">
      <div className="grid grid-cols-3 gap-2">
        {[
          { id: "original", label: "原创", icon: Music },
          { id: "cover_audio", label: "音频翻唱", icon: FileAudio },
          { id: "cover_text_style", label: "风格重制", icon: AudioLines },
        ].map((item) => {
          const Icon = item.icon;
          const active = mode === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setMode(item.id as GenerationMode)}
              className={`flex h-12 items-center justify-center gap-2 rounded border text-sm font-semibold transition ${
                active
                  ? "border-[#191713] bg-[#191713] text-white"
                  : "border-black/10 bg-[#eef2f1] text-black/70 hover:border-black/25"
              }`}
            >
              <Icon className="size-4" />
              {item.label}
            </button>
          );
        })}
      </div>

      <label className="block space-y-2">
        <span className="text-sm font-semibold">主题 / 提示词</span>
        <textarea
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          required
          rows={4}
          className="w-full resize-none rounded border border-black/15 bg-[#fffdf8] p-3 text-sm outline-none transition focus:border-[#191713]"
          placeholder="例：赛博雨夜、女声、电子流行、强副歌"
        />
      </label>

      {mode === "cover_audio" && (
        <div className="grid gap-3 rounded border border-dashed border-black/20 bg-[#eef2f1] p-3 sm:grid-cols-[1fr_auto]">
          <label className="flex cursor-pointer items-center gap-3 rounded bg-white px-3 py-2 text-sm font-medium">
            <Upload className="size-4" />
            <span>上传参考音频</span>
            <input
              type="file"
              accept="audio/*"
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                  setReferenceAudioUrl(
                    `https://storage.local/reference/${encodeURIComponent(file.name)}`,
                  );
                }
              }}
            />
          </label>
          <input
            value={referenceAudioUrl}
            onChange={(event) => setReferenceAudioUrl(event.target.value)}
            className="min-w-0 rounded border border-black/15 bg-white px-3 py-2 text-sm outline-none"
            placeholder="或粘贴参考音频 URL"
          />
        </div>
      )}

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-semibold">歌词</span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={writeLyrics}
            disabled={isWritingLyrics}
          >
            {isWritingLyrics ? <Loader2 className="size-4 animate-spin" /> : <Bot className="size-4" />}
            <span>AI 写歌词</span>
          </Button>
        </div>
        <textarea
          value={lyrics}
          onChange={(event) => setLyrics(event.target.value)}
          rows={isAdvanced ? 7 : 4}
          className="w-full resize-none rounded border border-black/15 bg-[#fffdf8] p-3 text-sm outline-none transition focus:border-[#191713]"
          placeholder="可留空，由模型补全歌词结构"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {styleTags.map((tag) => (
          <button
            key={tag}
            type="button"
            onClick={() => toggleTag(tag)}
            className={`rounded-full border px-3 py-1 text-sm font-medium ${
              tags.includes(tag)
                ? "border-[#d64b2a] bg-[#d64b2a] text-white"
                : "border-black/15 bg-white text-black/60"
            }`}
          >
            {tag}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-black/10 pt-3">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setIsAdvanced((value) => !value)}
          >
            <Sparkles className="size-4" />
            <span>{isAdvanced ? "收起专业模式" : "专业模式"}</span>
          </Button>
          {isAdvanced && (
            <select
              value={language}
              onChange={(event) => setLanguage(event.target.value)}
              className="h-8 rounded border border-black/15 bg-white px-2 text-sm"
            >
              <option>中文</option>
              <option>English</option>
              <option>日本語</option>
              <option>粤语</option>
            </select>
          )}
        </div>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          <span>{cost} 积分生成</span>
        </Button>
      </div>

      {(message || job || tracks.length > 0) && (
        <div className="rounded border border-black/10 bg-[#e9f4ef] p-3 text-sm">
          <p className="font-medium">{message || `任务状态：${job?.status}`}</p>
          {tracks.length > 0 && (
            <div className="mt-3 space-y-2">
              {tracks.map((track) => (
                <div
                  key={track.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded bg-white/70 px-3 py-2"
                >
                  <span className="font-semibold">《{track.title}》</span>
                  <div className="flex flex-wrap items-center gap-2">
                    {track.visibility === "public" && (
                      <a href={`/music/${track.id}`} className="inline-flex items-center gap-1 font-semibold underline">
                        <Mic2 className="size-4" />
                        打开
                      </a>
                    )}
                    {track.visibility !== "public" && (
                      <PublishTrackButton
                        trackId={track.id}
                        onPublished={(published) => {
                          setTracks((current) =>
                            current.map((item) =>
                              item.id === published.id ? published : item,
                            ),
                          );
                          setMessage("已发布到音乐广场。");
                        }}
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </form>
  );
}
