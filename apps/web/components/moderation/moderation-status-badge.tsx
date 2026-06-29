import { Badge, cn } from "@repo/ui";
import type { ModerationView } from "@repo/api";
import { getModerationPresentation } from "./moderation-presentation";

interface ModerationStatusBadgeProps {
  moderation?: ModerationView | null;
  className?: string;
}

/** 紧凑展示内容当前的待审、隐藏或人工审核状态。 */
export function ModerationStatusBadge({ moderation, className }: ModerationStatusBadgeProps) {
  const presentation = getModerationPresentation(moderation);
  if (!presentation) return null;

  return (
    <Badge
      variant={presentation.variant}
      className={cn("shrink-0", className)}
      title={presentation.description}
    >
      {presentation.label}
    </Badge>
  );
}
