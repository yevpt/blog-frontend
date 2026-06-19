import type { ReactNode } from "react";
import type { SwitchProps as AriaSwitchProps } from "react-aria-components";

/** 无状态视图层开关，供其它组件复用。 */
export interface ToggleBaseProps {
  size?: "sm" | "md";
  slim?: boolean;
  className?: string;
  isHovered?: boolean;
  isFocusVisible?: boolean;
  isSelected?: boolean;
  isDisabled?: boolean;
}

/** 带 label/hint 的开关。 */
export interface ToggleProps extends AriaSwitchProps {
  size?: "sm" | "md";
  label?: string;
  hint?: ReactNode;
  slim?: boolean;
}
