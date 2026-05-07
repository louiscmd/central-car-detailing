import { cn, platformColor, platformLabel } from "@/lib/utils";
import type { Platform } from "@/types";

const platformIcons: Record<Platform, string> = {
  INSTAGRAM: "IG",
  TIKTOK: "TT",
  FACEBOOK: "FB",
  YOUTUBE: "YT",
};

interface PlatformBadgeProps {
  platform: Platform;
  className?: string;
}

export function PlatformBadge({ platform, className }: PlatformBadgeProps) {
  const color = platformColor(platform);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border",
        className
      )}
      style={{
        color,
        borderColor: `${color}40`,
        backgroundColor: `${color}15`,
      }}
    >
      <span className="font-bold">{platformIcons[platform]}</span>
      {platformLabel(platform)}
    </span>
  );
}
