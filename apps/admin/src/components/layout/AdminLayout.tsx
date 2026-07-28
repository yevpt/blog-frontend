import { Outlet, useLocation } from "react-router-dom";
import { SvgIcon } from "@repo/icons";
import { Button, cn, FadeInUp } from "@repo/ui";
import { Sidebar } from "./Sidebar";
import { useSidebar } from "./useSidebar";

export function AdminLayout() {
  const sidebar = useSidebar();
  const location = useLocation();
  const isMobileSidebarVisible = sidebar.isMobileOpen || sidebar.isMobileVisible;

  return (
    <div className="min-h-dvh bg-background text-foreground">
      {isMobileSidebarVisible && (
        <button
          type="button"
          data-testid="admin-mobile-scrim"
          aria-label="关闭侧栏菜单"
          className={cn(
            "fixed inset-0 z-40 bg-foreground/35 backdrop-blur-[2px] duration-200 ease-out lg:hidden",
            sidebar.isMobileClosing ? "animate-out fade-out" : "animate-in fade-in",
          )}
          onClick={sidebar.closeMobile}
        />
      )}

      <div
        data-testid="admin-sidebar-shell"
        className={cn(
          "fixed left-0 top-0 z-50 h-dvh w-[260px] transition-[width,translate,opacity] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] lg:translate-x-0 lg:opacity-100",
          isMobileSidebarVisible && !sidebar.isMobileClosing
            ? "translate-x-0"
            : "-translate-x-full",
          sidebar.isMobileClosing ? "opacity-0" : "opacity-100",
          sidebar.isCollapsed && "lg:w-[56px]",
        )}
      >
        <Sidebar
          isCollapsed={sidebar.isCollapsed && !isMobileSidebarVisible}
          onToggleCollapsed={sidebar.toggleCollapsed}
          onNavigate={sidebar.closeMobile}
        />
      </div>

      <Button
        type="button"
        variant="ghost"
        aria-label="打开侧栏菜单"
        onPress={sidebar.openMobile}
        className="fixed right-4 top-4 z-40 h-10 w-10 rounded-full border border-border bg-card/90 p-0 text-foreground shadow-card backdrop-blur lg:hidden"
      >
        <SvgIcon name="menu" size={20} />
      </Button>

      <div
        data-testid="admin-content-shell"
        className={cn(
          "min-h-dvh transition-[padding] duration-200 lg:pl-[260px]",
          sidebar.isCollapsed && "lg:pl-[56px]",
        )}
      >
        <main className="mx-auto min-h-dvh w-full max-w-[1500px] px-3 py-5 sm:px-5 sm:py-6 lg:px-8 lg:py-7">
          {/* 以 pathname 为 key 强制重挂载，实现路由级入场过渡 */}
          <FadeInUp key={location.pathname} duration={300}>
            <Outlet />
          </FadeInUp>
        </main>
      </div>
    </div>
  );
}
