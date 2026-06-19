import type { FC } from "react";
import type {
  MenuItemProps as AriaMenuItemProps,
  MenuProps as AriaMenuProps,
  PopoverProps as AriaPopoverProps,
  SeparatorProps as AriaSeparatorProps,
} from "react-aria-components";

/** 菜单项选中态指示器的呈现方式。 */
export type DropdownSelectionIndicator = "checkmark" | "checkbox" | "radio" | "toggle" | "none";

/** `Dropdown.Item` 的 props。 */
export interface DropdownItemProps extends AriaMenuItemProps {
  /** 主文案；省略时回退到 children。 */
  label?: string;
  /** 行尾辅助文案（如快捷键）。 */
  addon?: string;
  /** 跳过内置样式，仅渲染原生 MenuItem。 */
  unstyled?: boolean;
  /** 行首图标组件。 */
  icon?: FC<{ className?: string }>;
  /** 行首头像地址，与 icon 互斥。 */
  avatarUrl?: string;
  /** 选中态指示器形态，默认 checkmark。 */
  selectionIndicator?: DropdownSelectionIndicator;
}

/** `Dropdown.Menu` 的 props。 */
export type DropdownMenuProps<T extends object> = AriaMenuProps<T>;

/** `Dropdown.Popover` 的 props。 */
export type DropdownPopoverProps = AriaPopoverProps;

/** `Dropdown.Separator` 的 props。 */
export type DropdownSeparatorProps = AriaSeparatorProps;
