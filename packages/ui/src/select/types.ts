import type { FC, ReactNode, RefAttributes } from "react";
import type {
  ComboBoxProps as AriaComboBoxProps,
  ListBoxItemProps as AriaListBoxItemProps,
  ListBoxProps as AriaListBoxProps,
  SelectProps as AriaSelectProps,
} from "react-aria-components";

/** 组件尺寸档位。 */
export type SelectSize = "sm" | "md" | "lg";

/** 视觉风格：紧凑精致（默认）、轻柔填充、无框极简（编辑器代码块）。 */
export type SelectVariant = "compact" | "soft" | "minimal";

/** 选项数据结构。 */
export type SelectItemType = {
  id: string | number;
  label?: string;
  avatarUrl?: string;
  isDisabled?: boolean;
  supportingText?: string;
  icon?: FC | ReactNode;
};

/** Select / ComboBox 共享的字段级 props。 */
export interface CommonProps {
  hint?: string;
  label?: string;
  tooltip?: string;
  size?: SelectSize;
  /** 视觉风格，默认 `compact`。 */
  variant?: SelectVariant;
  placeholder?: string;
  hideRequiredIndicator?: boolean;
}

/** `Select` 的 props。 */
export interface SelectProps
  extends
    Omit<AriaSelectProps<SelectItemType>, "children" | "items">,
    RefAttributes<HTMLDivElement>,
    CommonProps {
  items?: SelectItemType[];
  popoverClassName?: string;
  icon?: FC | ReactNode;
  children: ReactNode | ((item: SelectItemType) => ReactNode);
}

/** `Select.ComboBox` 的 props。 */
export interface ComboBoxProps
  extends
    Omit<AriaComboBoxProps<SelectItemType>, "children" | "items">,
    RefAttributes<HTMLDivElement>,
    CommonProps {
  shortcut?: boolean;
  items?: SelectItemType[];
  popoverClassName?: string;
  shortcutClassName?: string;
  icon?: FC | ReactNode;
  children: AriaListBoxProps<SelectItemType>["children"];
}

/** 选项选中态指示器形态。 */
export type SelectSelectionIndicator = "checkmark" | "checkbox" | "none";

/** `Select.Item` 的 props。 */
export interface SelectItemProps
  extends Omit<AriaListBoxItemProps<SelectItemType>, "id">, SelectItemType {
  selectionIndicator?: SelectSelectionIndicator;
  selectionIndicatorAlign?: "left" | "right";
}
