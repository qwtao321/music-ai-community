"use client";

import { useMemo, useState } from "react";
import { ChevronRight } from "lucide-react";
import type { MusicStyleTemplate } from "@/lib/music/types";
import { groupStyleTemplatesByCategory } from "@/lib/music/style-templates";

type StyleTemplateLibraryProps = {
  templates: MusicStyleTemplate[];
  onAppendTemplate: (template: MusicStyleTemplate) => void;
};

export function StyleTemplateLibrary({
  templates,
  onAppendTemplate,
}: StyleTemplateLibraryProps) {
  const groups = useMemo(
    () => groupStyleTemplatesByCategory(templates),
    [templates],
  );
  const [activeCategoryId, setActiveCategoryId] = useState(
    groups[0]?.categoryId ?? "",
  );

  const activeGroup =
    groups.find((group) => group.categoryId === activeCategoryId) ?? groups[0];

  if (!groups.length || !activeGroup) {
    return null;
  }

  return (
    <section className="space-y-4 rounded border border-black/10 bg-[#f7f4ec] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="mt-1 text-base font-semibold text-black/80">
            音乐灵感库
          </h3>
          <p className="mt-1 text-sm text-black/55">
            一键使用同款专业音乐家都在用的创作提示词
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {groups.map((group) => {
          const active = group.categoryId === activeGroup.categoryId;

          return (
            <button
              key={group.categoryId}
              type="button"
              onClick={() => setActiveCategoryId(group.categoryId)}
              className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                active
                  ? "border-[#191713] bg-[#191713] text-white"
                  : "border-black/10 bg-white text-black/60 hover:border-black/20 hover:text-black/75"
              }`}
            >
              {group.categoryName}
            </button>
          );
        })}
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {activeGroup.templates.map((template) => (
          <button
            key={template.id}
            type="button"
            onClick={() => onAppendTemplate(template)}
            className="group rounded border border-black/10 bg-white p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-black/20 hover:shadow"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold leading-5 text-black/80">
                  {template.styleLabel}
                </p>
                <p className="mt-0.5 text-xs text-black/40">
                  {template.styleName}
                </p>
              </div>
            </div>

            <p className="mt-2 line-clamp-2 text-sm leading-6 text-black/55">
              {template.summary}
            </p>

            <div className="mt-3 flex items-center justify-between text-xs text-black/40">
              <span>点击追加到提示词</span>
              <ChevronRight className="size-4 transition group-hover:translate-x-0.5" />
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
