import { readFileSync } from "node:fs";
import { join } from "node:path";

type LyricsRequest = {
  theme: string;
  language: string;
  tags: string[];
  songTitle?: string;
};

type LyricsProviderOptions = {
  apiKey: string;
  model?: string;
  apiBaseUrl?: string;
  fetcher?: typeof fetch;
};

const lyricsPromptTemplate = readFileSync(
  join(process.cwd(), "src/lib/music/lyrics-prompt.md"),
  "utf8",
);

function replaceAll(template: string, replacements: Record<string, string>) {
  return Object.entries(replacements).reduce(
    (result, [key, value]) => result.replaceAll(`{{${key}}}`, value),
    template,
  );
}

export function buildLyricsPrompt(request: LyricsRequest) {
  const theme = request.theme.trim() || "一首未命名的歌";
  const styles = request.tags.length ? request.tags.join("、") : "流行";
  const title = request.songTitle?.trim() || theme.slice(0, 18) || "未命名歌曲";

  return replaceAll(lyricsPromptTemplate, {
    song_theme: theme,
    lyrics_language: request.language,
    music_style: styles,
    mood: request.tags.length ? request.tags.join("、") : "根据主题自然延展",
    perspective: "第一人称",
    keywords: request.tags.length ? request.tags.join("、") : "由主题自然延展",
    target_scene: "AI 音乐生成",
    lyrics_length: "中等",
    rhyme_required: "自然押韵",
    colloquial_level: "自然口语化",
    include_title: "true",
    song_title: title,
  });
}

function extractText(payload: unknown) {
  const choices = (payload as { choices?: Array<{ message?: { content?: unknown }; text?: unknown }> })
    .choices;
  const first = choices?.[0];
  const content = first?.message?.content ?? first?.text;

  return typeof content === "string" ? content.trim() : "";
}

export async function generateLyricsWithDeepSeek(
  request: LyricsRequest,
  options: LyricsProviderOptions,
) {
  const fetcher = options.fetcher ?? fetch;
  const apiBaseUrl = (options.apiBaseUrl ?? "https://api.deepseek.com").replace(/\/$/, "");
  const model = options.model ?? "deepseek-v4-flash";
  const response = await fetcher(`${apiBaseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${options.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "system",
          content: "你只写可直接用于音乐生成的歌词，严格遵守用户给定语言与押韵规则。",
        },
        {
          role: "user",
          content: buildLyricsPrompt(request),
        },
      ],
      temperature: 0.82,
      max_tokens: 1800,
    }),
  });
  const payload = await response.json();

  if (!response.ok) {
    const message =
      (payload as { error?: { message?: string }; message?: string }).error?.message ??
      (payload as { message?: string }).message ??
      "DeepSeek lyrics request failed";
    throw new Error(message);
  }

  const text = extractText(payload);

  if (!text) {
    throw new Error("DeepSeek returned empty lyrics");
  }

  return text;
}
