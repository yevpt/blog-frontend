import type { Key } from "react";
import { useNavigate } from "react-router-dom";
import { SvgIcon, type IconName } from "@repo/icons";
import { Avatar, Button, Dropdown, cn } from "@repo/ui";
import { useAuthStore } from "../../store/auth";

interface SidebarUserProps {
  isCollapsed: boolean;
}

function getDisplayName(user: ReturnType<typeof useAuthStore.getState>["user"]) {
  return user?.nickname || user?.username || "管理员";
}

function getInitials(name: string) {
  return name.trim().slice(0, 1).toUpperCase() || "A";
}

function DropdownIcon({ name }: { name: IconName }) {
  return function Icon({ className }: { className?: string }) {
    return <SvgIcon name={name} size={16} className={className} />;
  };
}

const userIcon = DropdownIcon({ name: "user" });
const logoutIcon = DropdownIcon({ name: "log-out" });

export function SidebarUser({ isCollapsed }: SidebarUserProps) {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const displayName = getDisplayName(user);
  const email = user?.email ?? "未设置邮箱";

  function handleAction(key: Key) {
    if (key !== "logout") {
      return;
    }

    logout();
    localStorage.removeItem("refresh_token");
    navigate("/login");
  }

  return (
    <div className="border-t border-border p-3">
      <Dropdown.Root>
        <Button
          type="button"
          variant="ghost"
          aria-label="打开用户菜单"
          className={cn(
            "h-auto w-full justify-start rounded-lg px-2 py-2 text-left hover:bg-accent",
            isCollapsed && "justify-center px-0",
          )}
        >
          <Avatar size="sm" initials={getInitials(displayName)} alt={displayName} />
          <span className={cn("min-w-0 flex-1", isCollapsed && "sr-only")}>
            <span className="block truncate text-sm font-medium text-foreground">
              {displayName}
            </span>
            <span className="block truncate text-xs text-muted-foreground">{email}</span>
          </span>
          <SvgIcon
            name="dots-vertical"
            size={18}
            className={cn("shrink-0 text-muted-foreground", isCollapsed && "sr-only")}
          />
        </Button>
        <Dropdown.Popover
          placement="top left"
          className="w-56 rounded-lg border border-border bg-card text-card-foreground shadow-xl"
        >
          <Dropdown.Menu aria-label="用户菜单" onAction={handleAction}>
            <Dropdown.Item id="profile" label="个人设置" icon={userIcon} />
            <Dropdown.Separator />
            <Dropdown.Item id="logout" label="退出登录" icon={logoutIcon} />
          </Dropdown.Menu>
        </Dropdown.Popover>
      </Dropdown.Root>
    </div>
  );
}
