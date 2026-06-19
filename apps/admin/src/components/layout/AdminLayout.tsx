import { Outlet, useLocation } from "react-router-dom";
import { cn } from "@repo/ui";
import { getNavItemByPath } from "../../config/nav";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { useSidebar } from "./useSidebar";

export function AdminLayout() {
  const location = useLocation();
  const sidebar = useSidebar();
  const currentItem = getNavItemByPath(location.pathname);

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
        <Topbar title={currentItem.label} onOpenMobile={sidebar.openMobile} />
        <main className="mx-auto w-full max-w-7xl px-4 py-6 md:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
