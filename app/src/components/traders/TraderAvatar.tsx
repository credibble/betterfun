import { useState } from "react";
import { cn } from "@/lib/utils";

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function TraderAvatar({
  name,
  hue = 24,
  avatarUrl,
  size = 44,
  live = false,
  className,
}: {
  name: string;
  hue?: number;
  avatarUrl?: string;
  size?: number;
  live?: boolean;
  className?: string;
}) {
  const [imgFailed, setImgFailed] = useState(false);
  const showImage = avatarUrl && !imgFailed;

  return (
    <span
      className={cn(
        "relative inline-grid shrink-0 place-items-center overflow-hidden rounded-full",
        !showImage && "font-bold text-white",
        live && "ring-2 ring-down ring-offset-2 ring-offset-background",
        className,
      )}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.38,
        ...(!showImage
          ? {
              background: `linear-gradient(135deg, hsl(${hue} 80% 55%), hsl(${(hue + 40) % 360} 80% 45%))`,
            }
          : undefined),
      }}
      aria-label={name}
    >
      {showImage ? (
        <img
          src={avatarUrl}
          alt=""
          width={size}
          height={size}
          loading="lazy"
          decoding="async"
          onError={() => setImgFailed(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        initials(name)
      )}
      {live && (
        <span className="absolute -bottom-1.5 left-1/2 z-10 -translate-x-1/2 rounded-sm bg-down px-1 text-[8px] font-bold uppercase tracking-wide text-down-foreground">
          Live
        </span>
      )}
    </span>
  );
}
