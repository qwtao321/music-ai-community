import { describe, expect, it } from "vitest";
import {
  appendStyleTemplatePrompt,
  createMusicStyleTemplates,
  groupStyleTemplatesByCategory,
} from "./style-templates";

describe("music style templates", () => {
  it("appends a template prompt after the current prompt without replacing it", () => {
    const templates = createMusicStyleTemplates();
    const next = appendStyleTemplatePrompt("先写一句主题", templates[0].prompt);

    expect(next).toContain("先写一句主题");
    expect(next).toContain(templates[0].prompt);
    expect(next.indexOf("先写一句主题")).toBeLessThan(
      next.indexOf(templates[0].prompt),
    );
  });

  it("groups the template library into six top-level categories", () => {
    const grouped = groupStyleTemplatesByCategory(createMusicStyleTemplates());

    expect(grouped).toHaveLength(6);
    expect(grouped.map((group) => group.categoryName)).toEqual([
      "泛 Pop 流行",
      "粤语流行 Cantopop",
      "国语流行 Mandopop",
      "Hip-Hop / R&B",
      "Rock / Alternative",
      "Folk / Cinematic / World",
    ]);
    expect(grouped.every((group) => group.templates.length === 5)).toBe(true);
  });
});
