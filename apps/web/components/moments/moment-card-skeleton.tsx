import { Card } from "@repo/ui";
import type { MomentCardLayout } from "./moment-card";

interface MomentCardSkeletonProps {
  /** 用于生成不同高度的骨架卡片 */
  variant?: number;
  /** standalone：独立卡片；embedded：首页区块内嵌条目 */
  layout?: MomentCardLayout;
}

const HEIGHTS = [180, 220, 260, 200, 240, 190, 280, 210];

function SkeletonBody({ variant, compact }: { variant: number; compact?: boolean }) {
  const h = HEIGHTS[variant % HEIGHTS.length];
  const hasImage = variant % 3 === 0;
  const lineCount = h > 220 ? 3 : 2;

  return (
    <>
      <div className={`flex items-start gap-2.5 ${compact ? "mb-2.5" : "mb-3"}`}>
        <div className="h-9 w-9 shrink-0 rounded-full moment-shimmer-bar" />
        <div className="flex-1 space-y-1.5">
          <div className="moment-shimmer-bar h-3.5 w-24" />
          <div className="moment-shimmer-bar h-2.5 w-12 rounded-full" />
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="moment-shimmer-bar h-3 w-full" />
        <div className="moment-shimmer-bar h-3 w-4/5" />
        {lineCount > 2 && <div className="moment-shimmer-bar h-3 w-3/5" />}
      </div>

      {hasImage && <div className="moment-shimmer-bar mt-3 aspect-video w-full rounded-xl" />}

      <div className="mt-3 flex justify-end gap-2">
        <div className="moment-shimmer-bar h-4 w-10" />
        <div className="moment-shimmer-bar h-4 w-10" />
      </div>
    </>
  );
}

export function MomentCardSkeleton({
  variant = 0,
  layout = "standalone",
}: MomentCardSkeletonProps) {
  const h = HEIGHTS[variant % HEIGHTS.length];

  if (layout === "embedded") {
    return (
      <div
        className="border-b border-border/40 px-1 py-3 last:border-b-0"
        style={{ minHeight: Math.min(h, 160) }}
        aria-hidden="true"
      >
        <SkeletonBody variant={variant} compact />
      </div>
    );
  }

  return (
    <Card className="p-4" style={{ minHeight: h }} aria-hidden="true">
      <SkeletonBody variant={variant} />
    </Card>
  );
}
