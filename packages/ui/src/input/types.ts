import type { ComponentType, ReactNode, Ref } from "react";
import type {
  LabelProps as AriaLabelProps,
  TextFieldProps as AriaTextFieldProps,
  TextProps as AriaTextProps,
} from "react-aria-components";

/** `Input` 的 props。 */
export interface InputProps extends Omit<AriaTextFieldProps, "children"> {
  label?: string;
  hint?: string;
  tooltip?: string;
  tooltipDescription?: string;
  placeholder?: string;
  size?: "sm" | "md";
  inputClassName?: string;
  leadingIcon?: ComponentType<{ className?: string }> | ReactNode;
  trailingIcon?: ComponentType<{ className?: string }> | ReactNode;
  ref?: Ref<HTMLDivElement>;
}

/** `Label` 的 props。 */
export interface LabelProps extends AriaLabelProps {
  children: ReactNode;
  isInvalid?: boolean;
  isRequired?: boolean;
  tooltip?: string;
  tooltipDescription?: string;
  ref?: Ref<HTMLLabelElement>;
}

/** `HintText` 的 props。 */
export interface HintTextProps extends AriaTextProps {
  isInvalid?: boolean;
  ref?: Ref<HTMLElement>;
  size?: "sm" | "md";
  children: ReactNode;
}
