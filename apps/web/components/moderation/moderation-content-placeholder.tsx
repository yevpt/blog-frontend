import { cn } from "@repo/ui";
import type { ModerationView } from "@repo/api";
import { getModerationPresentation } from "./moderation-presentation";

interface ModerationContentPlaceholderProps {
  moderation?: ModerationView | null;
  className?: string;
}

/** 为不可公开正文提供安全占位；组件永不读取或渲染 pending_content。 */
export function ModerationContentPlaceholder({
  moderation,
  className,
}: ModerationContentPlaceholderProps) {
  if (!moderation || moderation.public_state === "visible") return null;

  const presentation = getModerationPresentation(moderation);
  if (!presentation) return null;

  return (
    <div
      role="status"
      className={cn(
        "rounded-lg border border-border bg-secondary/40 px-4 py-3 text-sm text-muted-foreground",
        className,
      )}
    >
      <p className="font-medium text-foreground">{presentation.label}</p>
      <p className="mt-1">{presentation.description}</p>
    </div>
  );
}
