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
  /** 紧凑模式：h-7 视觉尺寸；内部 16px 防 iOS 缩放，外层 scale 缩小至 text-xs 视觉 */
  compact?: boolean;
  className?: string;
  /** 输入框外壳 Group 的额外 className（用于干净覆盖边框 / focus 环等样式） */
  groupClassName?: string;
  /** input 元素自身的额外 className */
  inputClassName?: string;
  /** 清除按钮的无障碍标签 */
  clearLabel?: string;
  /** 清除按钮的额外 className */
  clearButtonClassName?: string;
}
