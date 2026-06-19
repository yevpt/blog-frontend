"use client";

import {
  Tabs as RACTabs,
  TabList as RACTabList,
  Tab as RACTab,
  TabPanels as RACTabPanels,
  type TabPanelsProps as AriaTabPanelsProps,
  TabPanel as RACTabPanel,
  SelectionIndicator,
  composeRenderProps,
} from "react-aria-components";

import { cn } from "../lib/utils";
import type {
  TabsItemProps,
  TabsListProps,
  TabsPanelProps,
  TabsPanelsProps,
  TabsProps,
} from "./types";
import {
  tabIndicatorClasses,
  tabItemBaseClasses,
  tabItemTextClasses,
  tabListVariantClasses,
} from "./variants";

// ─── Tabs（容器） ─────────────────────────────────────────────────────────────

export function Tabs({ className, ...props }: TabsProps) {
  return <RACTabs className={cn("w-full", className)} {...props} />;
}

// ─── TabsList ─────────────────────────────────────────────────────────────────

export function TabsList({
  variant = "button-brand-horizontal",
  className,
  ...props
}: TabsListProps) {
  return <RACTabList className={cn(tabListVariantClasses[variant], className)} {...props} />;
}

// ─── TabsItem ─────────────────────────────────────────────────────────────────

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

export function TabsPanels<T extends object>({ className, ...props }: TabsPanelsProps) {
  return (
    <RACTabPanels
      className={cn(
        "relative h-(--tab-panel-height) overflow-clip motion-safe:transition-[height]",
        className,
      )}
      {...(props as AriaTabPanelsProps<T>)}
    />
  );
}

// ─── TabsPanel ────────────────────────────────────────────────────────────────

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
