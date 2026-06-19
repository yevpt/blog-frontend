import type {
  SearchFieldProps as AriaSearchFieldProps,
  ValidationResult,
} from "react-aria-components";

/** `SearchField` 的 props。 */
export interface SearchFieldProps extends Omit<AriaSearchFieldProps, "className" | "style"> {
  /** 字段标签；传空字符串或省略则不渲染 label */
  label?: string;
  /** placeholder 文字 */
  placeholder?: string;
  /** 底部提示文字（isInvalid 时隐藏，改由 FieldError 显示） */
  hint?: string;
  /** 校验错误文案 */
  errorMessage?: string | ((validation: ValidationResult) => string);
  size?: "sm" | "md";
  className?: string;
  /** input 元素自身的额外 className */
  inputClassName?: string;
  /** 清除按钮的无障碍标签 */
  clearLabel?: string;
}
