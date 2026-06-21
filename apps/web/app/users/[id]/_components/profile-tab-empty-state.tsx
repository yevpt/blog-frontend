import { SvgIcon } from "@repo/icons";
import { cn } from "@repo/ui";
import type { ComponentProps } from "react";

interface ProfileTabEmptyStateProps {
  icon: ComponentProps<typeof SvgIcon>["name"];
  title: string;
  description: string;
  iconClassName?: string;
  iconBgClassName?: string;
}

/** 个人资料 Tab 空态：图标 + 标题 + 说明文案 */
export function ProfileTabEmptyState({
  icon,
  title,
  description,
  iconClassName,
  iconBgClassName,
}: ProfileTabEmptyStateProps) {
  return (
    <div
      data-testid="profile-tab-empty-state"
      className="flex min-h-[180px] flex-col items-center justify-center px-6 py-10 text-center"
    >
      <div
        aria-hidden="true"
        className={cn(
          "mb-4 flex size-14 items-center justify-center rounded-2xl border border-border/60 shadow-sm",
          iconBgClassName ?? "bg-muted text-muted-foreground",
        )}
      >
        <SvgIcon name={icon} size={24} className={iconClassName} />
      </div>
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="mt-1.5 max-w-[260px] text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
    </div>
  );
}
