import type { ReactNode } from "react";
import type { TagGroupProps, TagListProps, TagProps } from "react-aria-components";

/** `TagGroup` 容器 props（react-aria v1 中 TagGroupProps 非泛型）。 */
export interface TagGroupWrapperProps extends Omit<TagGroupProps, "className" | "style"> {
  label?: string;
  hint?: string;
  className?: string;
}

/** `TagList` props。 */
export interface TagListWrapperProps<T extends object> extends Omit<
  TagListProps<T>,
  "className" | "style"
> {
  className?: string;
}

/** `TagItem` props；显式将 children 收窄为 ReactNode 以避开 render-prop 冲突。 */
export interface TagItemProps extends Omit<TagProps, "className" | "style" | "children"> {
  count?: number;
  className?: string;
  children?: ReactNode;
  /** 无障碍朗读文本；含 count 等非纯文本子节点时自动推导 */
  textValue?: string;
}
