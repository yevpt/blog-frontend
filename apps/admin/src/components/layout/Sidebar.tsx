import { SvgIcon } from "@repo/icons";
import { Button, cn } from "@repo/ui";
import { BrandMark } from "./BrandMark";
import { SidebarNav } from "./SidebarNav";
import { SidebarUser } from "./SidebarUser";

interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapsed: () => void;
  onNavigate?: () => void;
  className?: string;
}

export function Sidebar({ isCollapsed, onToggleCollapsed, onNavigate, className }: SidebarProps) {
  return (
    <aside
      className={cn(
        "flex h-full flex-col border-r border-border bg-card text-card-foreground",
        className,
      )}
    >
      <div className="flex h-16 items-center gap-3 border-b border-border px-4">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <BrandMark />
        </span>
        <div className={cn("min-w-0", isCollapsed && "sr-only")}>
          <p className="text-sm font-bold tracking-[0.08em] text-foreground">YEVPT</p>
          <p className="text-xs text-muted-foreground">管理后台</p>
        </div>
      </div>

      <SidebarNav isCollapsed={isCollapsed} onNavigate={onNavigate} />

      <div className="hidden border-t border-border p-3 lg:block">
        <Button
          type="button"
          variant="ghost"
          aria-label={isCollapsed ? "展开侧栏" : "折叠侧栏"}
          onPress={onToggleCollapsed}
          className={cn(
            "h-9 w-full justify-start rounded-lg px-2 text-muted-foreground",
            isCollapsed && "justify-center px-0",
          )}
        >
          <SvgIcon name={isCollapsed ? "chevron-right" : "chevron-left"} size={18} />
          <span className={cn("text-sm", isCollapsed && "sr-only")}>
            {isCollapsed ? "展开侧栏" : "折叠侧栏"}
          </span>
        </Button>
      </div>

      <SidebarUser isCollapsed={isCollapsed} />
    </aside>
  );
}
