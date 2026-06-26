import type { ReactNode } from "react";
import type { FloatDockColumnLayout } from "@/lib/float-dock-position";

export type FloatDockPosition =
  | { variant: "viewport" }
  | { variant: "page-column"; layout: FloatDockColumnLayout; hasSidebar?: boolean };

export interface FloatDockItem {
  id: string;
  order?: number;
  render: () => ReactNode;
}

export interface FloatDockConfig {
  enabled?: boolean;
  position?: FloatDockPosition;
  items?: FloatDockItem[];
}

export const DEFAULT_FLOAT_DOCK_CONFIG: Required<FloatDockConfig> = {
  enabled: true,
  position: { variant: "viewport" },
  items: [],
};
