"use client";

import {
  Tabs as AriaTabs,
  type TabsProps as AriaTabsProps,
  TabList as AriaTabList,
  type TabListProps,
  Tab as AriaTab,
  type TabProps,
  TabPanel as AriaTabPanel,
  type TabPanelProps,
} from "react-aria-components";

import { cn } from "./lib/utils";

// ─── Tabs（容器） ─────────────────────────────────────────────────────────────

export interface TabsProps extends Omit<AriaTabsProps, "className" | "style"> {
  className?: string;
}

export function Tabs({ className, ...props }: TabsProps) {
  return <AriaTabs className={cn("w-full", className)} {...props} />;
}

// ─── TabsList ─────────────────────────────────────────────────────────────────

const tabListStyles = {
  "button-brand-horizontal": "flex gap-1 flex-wrap",
  underline: "flex gap-4 border-b border-border",
} as const;

export type TabsVariant = keyof typeof tabListStyles;

export interface TabsListProps extends Omit<TabListProps<object>, "className" | "style"> {
  variant?: TabsVariant;
  className?: string;
}

export function TabsList({
  variant = "button-brand-horizontal",
  className,
  ...props
}: TabsListProps) {
  return <AriaTabList className={cn(tabListStyles[variant], className)} {...props} />;
}

// ─── TabsItem ─────────────────────────────────────────────────────────────────

const tabItemStyles: Record<TabsVariant, { base: string; selected: string; unselected: string }> = {
  "button-brand-horizontal": {
    base: [
      "px-4 py-2 rounded-full text-sm font-medium transition-colors",
      "cursor-pointer select-none outline-none",
      "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
    ].join(" "),
    selected: "bg-primary text-primary-foreground",
    unselected: "text-muted-foreground hover:text-foreground hover:bg-accent",
  },
  underline: {
    base: [
      "pb-3 text-sm font-medium transition-colors cursor-pointer select-none",
      "border-b-2 -mb-px outline-none",
      "focus-visible:ring-2 focus-visible:ring-ring",
    ].join(" "),
    selected: "border-primary text-foreground",
    unselected: "border-transparent text-muted-foreground hover:text-foreground",
  },
};

export interface TabsItemProps extends Omit<TabProps, "className" | "style"> {
  variant?: TabsVariant;
  className?: string;
}

export function TabsItem({
  variant = "button-brand-horizontal",
  className,
  ...props
}: TabsItemProps) {
  const s = tabItemStyles[variant];
  return (
    <AriaTab
      className={({ isSelected }) => cn(s.base, isSelected ? s.selected : s.unselected, className)}
      {...props}
    />
  );
}

// ─── TabsPanel ────────────────────────────────────────────────────────────────

export interface TabsPanelProps extends Omit<TabPanelProps, "className" | "style"> {
  className?: string;
}

export function TabsPanel({ className, ...props }: TabsPanelProps) {
  return <AriaTabPanel className={cn("outline-none", className)} {...props} />;
}
