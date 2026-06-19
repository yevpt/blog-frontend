import type {
  TabListProps,
  TabPanelProps,
  TabPanelsProps,
  TabProps,
  TabsProps as AriaTabsProps,
} from "react-aria-components";
import type { TabsVariant } from "./variants";

export type { TabsVariant };

/** `Tabs` 容器 props。 */
export interface TabsProps extends Omit<AriaTabsProps, "className" | "style"> {
  className?: string;
}

/** `TabsList` props。 */
export interface TabsListProps extends Omit<TabListProps<object>, "className" | "style"> {
  variant?: TabsVariant;
  className?: string;
}

/** `TabsItem` props。 */
export interface TabsItemProps extends Omit<TabProps, "className" | "style"> {
  variant?: TabsVariant;
  className?: string;
}

/** `TabsPanels` props。 */
export interface TabsPanelsProps extends Omit<TabPanelsProps<object>, "className" | "style"> {
  className?: string;
}

/** `TabsPanel` props。 */
export interface TabsPanelProps extends Omit<TabPanelProps, "className" | "style"> {
  className?: string;
}
