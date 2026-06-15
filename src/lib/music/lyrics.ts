type LyricsRequest = {
  theme: string;
  language: string;
  tags: string[];
};

type MiniMaxOptions = {
  apiKey: string;
  model?: string;
  apiBaseUrl?: string;
  fetcher?: typeof fetch;
};

function getLanguageRule(language: string) {
  if (["粤语", "广东话", "Cantonese"].includes(language)) {
    return [
      "语言必须是粤语，优先使用自然的广州话口语表达，避免普通话直译腔。",
      "押韵按粤语九声和粤语实际读音处理，不按普通话拼音押韵。",
      "副歌每 2 行或 4 行形成稳定韵脚，可用 -aa、-ang、-oi、-ing、-iu 等粤语听感相近韵脚，但不要为押韵牺牲语义。",
      "注意粤语歌词常见入声、阴阳声调听感，句尾字要适合演唱落点。",
    ].join("\n");
  }

  return [
    "语言必须是普通话中文，押韵按普通话读音处理。",
    "可参考十三辙/十八韵等中文歌词押韵习惯，主歌允许近韵，副歌保持更强韵脚。",
    "注意平仄和句尾开口度，让旋律落点自然，避免散文化长句。",
    "不要使用粤语口语和粤语韵脚规则。",
  ].join("\n");
}

export function buildLyricsPrompt(request: LyricsRequest) {
  const theme = request.theme.trim() || "一首未命名的歌";
  const styles = request.tags.length ? request.tags.join("、") : "流行";

  return [
    "你是一位专业华语唱片作词人，请按真实可演唱歌曲歌词规范创作。",
    "",
    `主题/故事：${theme}`,
    `语言：${request.language}`,
    `风格/人声/制作标签：${styles}`,
    "",
    "结构要求：",
    "- 输出完整歌词，不要解释创作思路。",
    "- 使用英文段落标签：[Intro]、[Verse 1]、[Pre-Chorus]、[Chorus]、[Verse 2]、[Bridge]、[Outro]；可按歌曲需要省略 Intro/Bridge/Outro。",
    "- 每段 4-8 行为主，每行适合 4/4 流行歌演唱，避免过长句。",
    "- Chorus 必须有记忆点强的 hook，可重复 1-2 句，但不要堆砌空话。",
    "- 保持画面、情绪、叙事推进，避免陈词滥调、口号化和生硬 AI 味。",
    "",
    "押韵与语言规范：",
    getLanguageRule(request.language),
    "",
    "只输出歌词正文。",
  ].join("\n");
}

function extractText(payload: unknown) {
  const choices = (payload as { choices?: Array<{ message?: { content?: unknown }; text?: unknown }> })
    .choices;
  const first = choices?.[0];
  const content = first?.message?.content ?? first?.text;

  return typeof content === "string" ? content.trim() : "";
}

export async function generateLyricsWithMiniMax(
  request: LyricsRequest,
  options: MiniMaxOptions,
) {
  const fetcher = options.fetcher ?? fetch;
  const apiBaseUrl = (options.apiBaseUrl ?? "https://api.minimax.io").replace(/\/$/, "");
  const model = options.model ?? "MiniMax-M3";
  const response = await fetcher(`${apiBaseUrl}/v1/chat/completions`, {
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
      "MiniMax lyrics request failed";
    throw new Error(message);
  }

  const text = extractText(payload);

  if (!text) {
    throw new Error("MiniMax returned empty lyrics");
  }

  return text;
}
