import { NavLink } from "react-router-dom";
import { SvgIcon } from "@repo/icons";
import { Tooltip, cn } from "@repo/ui";
import { adminNavItems } from "../../config/modules";

interface SidebarNavProps {
  isCollapsed: boolean;
  onNavigate?: () => void;
}

const navGroups = adminNavItems.reduce<Array<{ group?: string; items: typeof adminNavItems }>>(
  (groups, item) => {
    const group = groups.find((entry) => entry.group === item.group);
    if (group) {
      group.items.push(item);
      return groups;
    }
    return [...groups, { group: item.group, items: [item] }];
  },
  [],
);

export function SidebarNav({ isCollapsed, onNavigate }: SidebarNavProps) {
  return (
    <nav
      aria-label="后台导航"
      className={cn(
        "flex flex-1 min-h-0 flex-col gap-4 overflow-y-auto px-3 py-4",
        isCollapsed && "px-2",
      )}
    >
      {navGroups.map((group) => (
        <div key={group.group ?? "overview"} className="grid gap-1.5">
          {group.group && (
            <p
              className={cn(
                "px-3 text-xs font-medium text-muted-foreground",
                isCollapsed && "sr-only",
              )}
            >
              {group.group}
            </p>
          )}

          {group.items.map((item) => {
            const link = (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === "/"}
                aria-label={isCollapsed ? item.label : undefined}
                onClick={onNavigate}
                className={({ isActive }) =>
                  cn(
                    "group relative flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring",
                    isActive &&
                      "bg-foreground text-background shadow-sm hover:bg-foreground hover:text-background",
                    isCollapsed && "justify-center px-0",
                  )
                }
              >
                <SvgIcon name={item.icon} size={20} className="shrink-0" />
                <span className={cn("truncate", isCollapsed && "sr-only")}>{item.label}</span>
              </NavLink>
            );

            if (!isCollapsed) {
              return link;
            }

            return (
              <Tooltip key={item.path} title={item.label} placement="right">
                {link}
              </Tooltip>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
