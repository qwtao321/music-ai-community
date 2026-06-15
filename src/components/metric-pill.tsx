import { Heart, ListMusic, Play, Repeat2, Star } from "lucide-react";

const icons = {
  plays: Play,
  likes: Heart,
  favorites: Star,
  remixes: Repeat2,
  tracks: ListMusic,
};

export function MetricPill({
  kind,
  value,
}: {
  kind: keyof typeof icons;
  value: number;
}) {
  const Icon = icons[kind];

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-white/70 px-2 py-1 text-xs font-medium text-black/65">
      <Icon className="size-3.5" />
      {Intl.NumberFormat("zh-CN", { notation: "compact" }).format(value)}
    </span>
  );
}
