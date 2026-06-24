import type { SelectSize } from "../types";

/** 触发器 / ComboBox 输入框的尺寸样式（紧凑默认值）。 */
export const triggerSizes: Record<
  SelectSize,
  { root: string; text: string; textContainer: string }
> = {
  sm: { root: "h-8 gap-1.5 py-1.5 pl-2.5 pr-2", text: "text-sm", textContainer: "gap-x-1.5" },
  md: { root: "h-9 gap-1.5 py-1.5 px-2.5", text: "text-sm", textContainer: "gap-x-1.5" },
  lg: { root: "h-10 gap-2 py-2 px-3", text: "text-sm", textContainer: "gap-x-2" },
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
    root: "gap-1.5 p-1.5 pr-2",
    text: "text-sm",
    textContainer: "gap-x-1.5",
    checkSize: 16,
    checkboxSize: "sm",
  },
  md: {
    root: "gap-2 py-1.5 px-2",
    text: "text-sm",
    textContainer: "gap-x-1.5",
    checkSize: 16,
    checkboxSize: "sm",
  },
  lg: {
    root: "gap-2 p-2 pl-2.5",
    text: "text-sm",
    textContainer: "gap-x-2",
    checkSize: 20,
    checkboxSize: "md",
  },
};

/** minimal 触发器尺寸：嵌入代码块右上角等极窄场景。 */
export const minimalTriggerSizes: Record<
  SelectSize,
  { root: string; text: string; textContainer: string }
> = {
  sm: {
    root: "gap-0.5 py-px px-0.5",
    text: "text-[10px] leading-tight tracking-wide",
    textContainer: "gap-x-1",
  },
  md: {
    root: "gap-1 py-0.5 px-1",
    text: "text-[10px] leading-tight tracking-wide",
    textContainer: "gap-x-1",
  },
  lg: {
    root: "gap-1 py-0.5 px-1",
    text: "text-xs leading-tight tracking-wide",
    textContainer: "gap-x-1.5",
  },
};

/** ComboBox 触发器：搜索图标 + 输入 + chevron，与 SearchField / Select 对齐。 */
export const comboboxTriggerSizes: Record<SelectSize, { root: string; input: string }> = {
  sm: { root: "h-8 pr-1", input: "text-sm" },
  md: { root: "h-9 pr-1.5", input: "text-sm" },
  lg: { root: "h-10 pr-2", input: "text-sm" },
};
