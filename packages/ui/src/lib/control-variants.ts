/** 表单控件表面视觉风格（与 Select variant 对齐）。 */
export type ControlSurfaceVariant = "compact" | "soft";

/** 触发器在不同 variant 下的基础与激活态样式。 */
export const triggerVariantClasses: Record<
  ControlSurfaceVariant,
  { base: string; active: string }
> = {
  compact: {
    base: "rounded-md border border-input bg-card shadow-none transition-[border-color,box-shadow] duration-150 ease-out",
    active: "border-ring shadow-[0_0_0_2px] shadow-ring/20",
  },
  soft: {
    base: "rounded-lg border border-transparent bg-muted/50 transition-[background-color,border-color] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]",
    active: "border-border bg-muted",
  },
};

/** 输入类控件聚焦态（SearchField 等用 focus-within 挂载）。 */
export const compactControlFocusWithin =
  "focus-within:border-ring focus-within:shadow-[0_0_0_2px] focus-within:shadow-ring/20";

/** 下拉浮层进出场动效。 */
export const popoverVariantClasses: Record<
  ControlSurfaceVariant,
  { entering: string; exiting: string }
> = {
  compact: {
    entering:
      "duration-180 ease-out animate-in fade-in zoom-in-95 placement-bottom:slide-in-from-top-1",
    exiting:
      "duration-150 ease-in animate-out fade-out zoom-out-95 placement-bottom:slide-out-to-top-1",
  },
  soft: {
    entering:
      "duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] animate-in fade-in zoom-in-95 placement-bottom:slide-in-from-top-1",
    exiting:
      "duration-150 ease-in animate-out fade-out zoom-out-95 placement-bottom:slide-out-to-top-1",
  },
};

/** Chevron 展开旋转。 */
export const chevronClasses =
  "transition-transform duration-200 ease-out data-[open=true]:rotate-180";

/** 菜单项内层样式，与 Select.Item 紧凑风格对齐。 */
export const menuItemInnerClasses = {
  base: "relative flex items-center rounded-md px-2 py-1.5 text-sm font-medium text-foreground outline-none transition-colors duration-150 ease-out",
  hover: "group-hover:bg-accent",
  focused: "bg-accent",
  focusedDanger: "bg-destructive/10",
  hoverDanger: "group-hover:bg-destructive/10",
};
