import { SvgIcon } from "@repo/icons";
import { Button, cn } from "@repo/ui";
import { BrandMark } from "./BrandMark";
import { SidebarNav } from "./SidebarNav";
import { SidebarUser } from "./SidebarUser";
import { ThemeToggle } from "./ThemeToggle";

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
        "relative flex h-full flex-col border-r border-border bg-card/95 text-card-foreground shadow-card backdrop-blur",
        className,
      )}
    >
      <div
        data-testid="sidebar-brand-bar"
        className={cn(
          "flex h-16 items-center gap-3 border-b border-border px-4",
          isCollapsed && "justify-center gap-0 px-2",
        )}
      >
        <span
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 transition-[opacity,scale] duration-200",
            isCollapsed && "opacity-0 scale-95",
          )}
        >
          <BrandMark />
        </span>
        <div
          className={cn(
            "min-w-0 overflow-hidden transition-[width,opacity,transform] duration-200 ease-out",
            isCollapsed ? "w-0 translate-x-1 opacity-0" : "w-[132px] translate-x-0 opacity-100",
          )}
          aria-hidden={isCollapsed}
        >
          <p className="whitespace-nowrap text-sm font-bold tracking-normal text-foreground">
            YEVPT
          </p>
          <p className="whitespace-nowrap text-xs text-muted-foreground">管理后台</p>
        </div>
        <Button
          type="button"
          variant="ghost"
          aria-label={isCollapsed ? "展开侧栏" : "折叠侧栏"}
          onPress={onToggleCollapsed}
          className={cn(
            "hidden h-9 w-9 rounded-lg p-0 transition-[background-color,color,opacity] lg:inline-flex",
            isCollapsed
              ? "absolute left-1/2 -translate-x-1/2 bg-primary/10 text-foreground hover:bg-primary/15"
              : "ml-auto text-muted-foreground hover:bg-accent hover:text-foreground",
          )}
        >
          {isCollapsed ? (
            <>
              <BrandMark />
              <span className="absolute -bottom-1 -right-1 flex size-4 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-sm">
                <SvgIcon name="chevron-right" size={10} />
              </span>
            </>
          ) : (
            <SvgIcon name="chevron-left" size={16} />
          )}
        </Button>
      </div>

      <SidebarNav isCollapsed={isCollapsed} onNavigate={onNavigate} />

      <div className={cn("grid gap-1 border-t border-border p-3", isCollapsed && "p-2")}>
        <ThemeToggle
          showLabel={!isCollapsed}
          collapsed={isCollapsed}
          className={cn(
            "h-10 w-full justify-start rounded-lg px-2 text-muted-foreground hover:bg-accent hover:text-foreground",
            isCollapsed && "justify-center px-0",
          )}
        />
      </div>

      <SidebarUser isCollapsed={isCollapsed} />
    </aside>
  );
}
