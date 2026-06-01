"use client";

import {
  Tabs as RACTabs,
  type TabsProps as AriaTabsProps,
  TabList as RACTabList,
  type TabListProps,
  Tab as RACTab,
  type TabProps,
  TabPanels as RACTabPanels,
  type TabPanelsProps,
  TabPanel as RACTabPanel,
  type TabPanelProps,
  SelectionIndicator,
  composeRenderProps,
} from "react-aria-components";

import { cn } from "./lib/utils";

// ─── Tabs（容器） ─────────────────────────────────────────────────────────────

export interface TabsProps extends Omit<AriaTabsProps, "className" | "style"> {
  className?: string;
}

export function Tabs({ className, ...props }: TabsProps) {
  return <RACTabs className={cn("w-full", className)} {...props} />;
}

// ─── TabsList ─────────────────────────────────────────────────────────────────

const tabListVariantClasses = {
  "button-brand-horizontal": "inline-flex flex-wrap gap-1 p-1 bg-muted rounded-full",
  underline: "flex gap-4 border-b border-border",
} as const;

export type TabsVariant = keyof typeof tabListVariantClasses;

export interface TabsListProps extends Omit<TabListProps<object>, "className" | "style"> {
  variant?: TabsVariant;
  className?: string;
}

export function TabsList({
  variant = "button-brand-horizontal",
  className,
  ...props
}: TabsListProps) {
  return <RACTabList className={cn(tabListVariantClasses[variant], className)} {...props} />;
}

// ─── TabsItem ─────────────────────────────────────────────────────────────────

const tabItemBaseClasses: Record<TabsVariant, string> = {
  "button-brand-horizontal": [
    "group relative flex items-center cursor-default rounded-full px-4 py-1.5",
    "text-sm font-medium outline-none [-webkit-tap-highlight-color:transparent]",
    "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
    "data-[disabled]:opacity-50",
  ].join(" "),
  underline: [
    "group relative pb-3 cursor-default",
    "text-sm font-medium outline-none [-webkit-tap-highlight-color:transparent]",
    "focus-visible:ring-2 focus-visible:ring-ring",
    "data-[disabled]:opacity-50",
  ].join(" "),
};

const tabItemTextClasses: Record<TabsVariant, string> = {
  "button-brand-horizontal":
    "relative z-10 transition-colors text-muted-foreground group-hover:text-foreground group-data-[selected]:text-primary-foreground",
  underline:
    "transition-colors text-muted-foreground group-hover:text-foreground group-data-[selected]:text-foreground",
};

const tabIndicatorClasses: Record<TabsVariant, string> = {
  "button-brand-horizontal":
    "absolute inset-0 z-0 rounded-full bg-primary motion-safe:transition-[translate,width,height] duration-200",
  underline:
    "absolute bottom-0 left-0 h-0.5 w-full bg-primary motion-safe:transition-[translate,width] duration-200",
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
  return (
    <RACTab className={cn(tabItemBaseClasses[variant], className)} {...props}>
      {composeRenderProps(props.children, (children) => (
        <>
          <span className={tabItemTextClasses[variant]}>{children}</span>
          <SelectionIndicator className={tabIndicatorClasses[variant]} />
        </>
      ))}
    </RACTab>
  );
}

// ─── TabsPanels（动画面板容器）────────────────────────────────────────────────

export interface TabsPanelsProps extends Omit<TabPanelsProps<object>, "className" | "style"> {
  className?: string;
}

export function TabsPanels<T extends object>({ className, ...props }: TabsPanelsProps) {
  return (
    <RACTabPanels
      className={cn(
        "relative h-(--tab-panel-height) overflow-clip motion-safe:transition-[height]",
        className,
      )}
      {...(props as TabPanelsProps<T>)}
    />
  );
}

// ─── TabsPanel ────────────────────────────────────────────────────────────────

export interface TabsPanelProps extends Omit<TabPanelProps, "className" | "style"> {
  className?: string;
}

export function TabsPanel({ className, ...props }: TabsPanelProps) {
  return (
    <RACTabPanel
      className={cn(
        "outline-none transition-opacity",
        "data-[entering]:opacity-0",
        "data-[exiting]:opacity-0 data-[exiting]:absolute data-[exiting]:top-0 data-[exiting]:left-0 data-[exiting]:w-full",
        className,
      )}
      {...props}
    />
  );
}
