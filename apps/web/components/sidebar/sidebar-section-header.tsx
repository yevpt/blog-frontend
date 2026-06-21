import type { ReactNode } from "react";

interface SidebarSectionHeaderProps {
  title: string;
  action?: ReactNode;
}

export function SidebarSectionHeader({ title, action }: SidebarSectionHeaderProps) {
  return (
    <header className="flex items-center justify-between px-4 pt-4 pb-3">
      <h3 className="text-sm font-bold tracking-[-0.01em] text-foreground">{title}</h3>
      {action}
    </header>
  );
}
