"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Track } from "@/lib/music/types";

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

export function PublishTrackButton({
  trackId,
  onPublished,
  compact = false,
}: {
  trackId: string;
  onPublished?: (track: Track) => void;
  compact?: boolean;
}) {
  const router = useRouter();
  const [isPublishing, setIsPublishing] = useState(false);

  async function publish() {
    setIsPublishing(true);
    const response = await fetch(`/api/tracks/${trackId}/publish`, {
      method: "POST",
    });
    const payload = await readJsonResponse<{ track?: Track }>(response);

    setIsPublishing(false);

    if (response.status === 401) {
      const from = `${window.location.pathname}${window.location.search}`;
      window.location.assign(`/login?from=${encodeURIComponent(from)}`);
      return;
    }

    if (!response.ok || !payload.track) {
      window.alert(payload.error ?? "发布失败");
      return;
    }

    onPublished?.(payload.track);
    router.refresh();
  }

  return (
    <Button
      type="button"
      size={compact ? "sm" : "default"}
      variant="default"
      onClick={publish}
      disabled={isPublishing}
      title="发布到广场"
    >
      <Send className="size-4" />
      <span>{isPublishing ? "发布中" : "发布"}</span>
    </Button>
  );
}
