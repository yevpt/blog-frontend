import { Outlet } from "react-router-dom";
import { SvgIcon } from "@repo/icons";
import { Button, cn } from "@repo/ui";
import { Sidebar } from "./Sidebar";
import { useSidebar } from "./useSidebar";

export function AdminLayout() {
  const sidebar = useSidebar();

  return (
    <div className="min-h-dvh bg-background text-foreground">
      {sidebar.isMobileOpen && (
        <button
          type="button"
          aria-label="关闭侧栏菜单"
          className="fixed inset-0 z-40 bg-foreground/45 lg:hidden"
          onClick={sidebar.closeMobile}
        />
      )}

      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-[248px] transition-transform duration-200 lg:translate-x-0",
          sidebar.isMobileOpen ? "translate-x-0" : "-translate-x-full",
          sidebar.isCollapsed && "lg:w-[72px]",
        )}
      >
        <Sidebar
          isCollapsed={sidebar.isCollapsed && !sidebar.isMobileOpen}
          onToggleCollapsed={sidebar.toggleCollapsed}
          onNavigate={sidebar.closeMobile}
        />
      </div>

      <div className={cn("min-h-dvh lg:pl-[248px]", sidebar.isCollapsed && "lg:pl-[72px]")}>
        {/* 移动端无常驻侧栏，保留精简的菜单触发条；桌面端不再有重复标题栏 */}
        <div className="sticky top-0 z-20 flex h-14 items-center border-b border-border bg-card/95 px-4 backdrop-blur lg:hidden">
          <Button
            type="button"
            variant="ghost"
            aria-label="打开侧栏菜单"
            onPress={sidebar.openMobile}
            className="h-9 w-9 shrink-0 rounded-lg p-0 text-foreground"
          >
            <SvgIcon name="menu" size={20} />
          </Button>
        </div>
        <main className="w-full px-4 py-6 md:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
