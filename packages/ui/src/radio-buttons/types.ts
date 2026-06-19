import type { ReactNode, Ref } from "react";
import type {
  RadioGroupProps as AriaRadioGroupProps,
  RadioProps as AriaRadioProps,
} from "react-aria-components";

/** 单选组通过 context 透传的配置。 */
export interface RadioGroupContextType {
  size?: "sm" | "md";
}

/** 无状态视图层单选按钮，供其它组件复用。 */
export interface RadioButtonBaseProps {
  size?: "sm" | "md";
  className?: string;
  isFocusVisible?: boolean;
  isSelected?: boolean;
  isDisabled?: boolean;
}

/** 带 label/hint 的单选按钮。 */
export interface RadioButtonProps extends AriaRadioProps {
  size?: "sm" | "md";
  label?: ReactNode;
  hint?: ReactNode;
  ref?: Ref<HTMLLabelElement>;
}

/** 单选组容器。 */
export interface RadioGroupProps extends RadioGroupContextType, AriaRadioGroupProps {
  children: ReactNode;
  className?: string;
}
