import type { SelectVariant } from "../types";
import {
  chevronClasses,
  compactControlFocusWithin,
  menuItemInnerClasses,
  popoverVariantClasses as sharedPopoverMotion,
  triggerVariantClasses as sharedTriggerVariantClasses,
} from "../../lib/control-variants";

/** Select 触发器样式（含编辑器 minimal）。 */
export const triggerVariantClasses: Record<SelectVariant, { base: string; active: string }> = {
  ...sharedTriggerVariantClasses,
  minimal: {
    base: "w-auto min-w-0 rounded-sm border-0 bg-transparent shadow-none transition-colors duration-150 ease-out",
    active: "",
  },
};

export { chevronClasses, compactControlFocusWithin, menuItemInnerClasses };

/** 下拉浮层动效；minimal 与 compact 共用。 */
export function getSelectPopoverMotion(variant: SelectVariant) {
  return sharedPopoverMotion[variant === "minimal" ? "compact" : variant];
}
