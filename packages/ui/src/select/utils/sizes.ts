import type { SelectSize } from "../types";

/** 触发器 / ComboBox 输入框的尺寸样式。 */
export const triggerSizes: Record<
  SelectSize,
  { root: string; text: string; textContainer: string }
> = {
  sm: { root: "py-2 pl-3 pr-2.5 gap-2", text: "text-sm", textContainer: "gap-x-1.5" },
  md: { root: "py-2 px-3 gap-2", text: "text-base", textContainer: "gap-x-1.5" },
  lg: { root: "py-2.5 px-3.5 gap-2", text: "text-base", textContainer: "gap-x-1.5" },
};

/** 列表项的尺寸样式。 */
export const itemSizes: Record<
  SelectSize,
  {
    root: string;
    text: string;
    textContainer: string;
    checkSize: 16 | 20;
    checkboxSize: "sm" | "md";
  }
> = {
  sm: {
    root: "p-2 pr-2.5 gap-2",
    text: "text-sm",
    textContainer: "gap-x-1.5",
    checkSize: 16,
    checkboxSize: "sm",
  },
  md: {
    root: "p-2 pr-2.5 gap-2",
    text: "text-base",
    textContainer: "gap-x-2",
    checkSize: 20,
    checkboxSize: "sm",
  },
  lg: {
    root: "p-2.5 pl-2 gap-2",
    text: "text-base",
    textContainer: "gap-x-2",
    checkSize: 20,
    checkboxSize: "md",
  },
};
