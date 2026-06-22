type SongTitleRequest = {
  prompt: string;
  language: string;
  tags: string[];
};

type SongTitleProviderOptions = {
  apiKey: string;
  model?: string;
  apiBaseUrl?: string;
  fetcher?: typeof fetch;
};

function extractText(payload: unknown) {
  const choices = (payload as { choices?: Array<{ message?: { content?: unknown }; text?: unknown }> })
    .choices;
  const first = choices?.[0];
  const content = first?.message?.content ?? first?.text;

  return typeof content === "string" ? content.trim() : "";
}

function normalizeSongTitle(title: string) {
  return title
    .replace(/^[\s"'“”‘’《【\[]+/, "")
    .replace(/[\s"'“”‘’》】\]]+$/, "")
    .replace(/[。！？!?.,，、:：;；]+$/g, "")
    .trim();
}

export function buildSongTitlePrompt(request: SongTitleRequest) {
  const prompt = request.prompt.trim() || "一首未命名的歌";
  const tags = request.tags.length ? request.tags.join("、") : "流行";

  return [
    "你是一名专业音乐标题文案与唱片 A&R 顾问，请根据歌曲创作提示词生成一个适合发行和传播的歌名。",
    "",
    `音乐生成提示词：${prompt}`,
    `语言：${request.language}`,
    `风格标签：${tags}`,
    "",
    "标题要求：",
    "- 只输出一个歌名，不要解释，不要编号，不要加引号。",
    "- 标题要简洁、有记忆点、适合主流音乐发行。",
    "- 中文标题优先 2-8 个汉字，英文标题优先 2-6 个单词。",
    "- 不要输出副标题、备注、括号说明或多版本标题。",
    "- 标题应尽量贴合歌曲主题、情绪和风格，而不是直译提示词。",
    "- 如果歌曲偏粤语、都市、R&B、夜景或情绪感，标题可以更含蓄；如果偏流行、励志、青春感，标题可以更明亮直接。",
    "",
    "只输出歌名。",
  ].join("\n");
}

export async function generateSongTitleWithDeepSeek(
  request: SongTitleRequest,
  options: SongTitleProviderOptions,
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
          content: "你只输出一个可直接用于发布的歌名，不能有解释。",
        },
        {
          role: "user",
          content: buildSongTitlePrompt(request),
        },
      ],
      temperature: 0.7,
      max_tokens: 64,
    }),
  });
  const payload = await response.json();

  if (!response.ok) {
    const message =
      (payload as { error?: { message?: string }; message?: string }).error?.message ??
      (payload as { message?: string }).message ??
      "DeepSeek song title request failed";
    throw new Error(message);
  }

  const title = normalizeSongTitle(extractText(payload));

  if (!title) {
    throw new Error("DeepSeek returned empty title");
  }

  return title;
}
