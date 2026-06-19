import type { ReactNode, Ref } from "react";
import type { CheckboxProps as AriaCheckboxProps } from "react-aria-components";

/** 无状态视图层复选框（仅按 props 渲染勾选态），供其它组件复用。 */
export interface CheckboxBaseProps {
  size?: "sm" | "md";
  className?: string;
  isFocusVisible?: boolean;
  isSelected?: boolean;
  isDisabled?: boolean;
  isIndeterminate?: boolean;
}

/** 带 label/hint 的受控复选框。 */
export interface CheckboxProps extends AriaCheckboxProps {
  ref?: Ref<HTMLLabelElement>;
  size?: "sm" | "md";
  label?: ReactNode;
  hint?: ReactNode;
}
