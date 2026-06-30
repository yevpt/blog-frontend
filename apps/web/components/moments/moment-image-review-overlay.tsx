import { cn } from "@repo/ui";

interface MomentImageReviewOverlayProps {
  /** 九宫格小格略缩字号与内边距 */
  compact?: boolean;
  className?: string;
}

/** 访客待审图片：深色遮罩 + 不透明徽标，避免受底图亮度影响。 */
export function MomentImageReviewOverlay({
  compact = false,
  className,
}: MomentImageReviewOverlayProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-[6px]",
        "bg-black/45",
        className,
      )}
    >
      <span
        className={cn(
          "rounded-full bg-black/80 font-medium text-white shadow-sm",
          "ring-1 ring-inset ring-white/20",
          compact ? "px-2 py-0.5 text-[10px]" : "px-3.5 py-1 text-xs tracking-wide",
        )}
      >
        审核中
      </span>
    </div>
  );
}
