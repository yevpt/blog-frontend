import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// 组件库统一用 cn 合并 className：clsx 负责条件类名，twMerge 负责处理 Tailwind 冲突。
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * no-op：供 Tailwind IntelliSense 对样式对象排序，不影响运行时。
 */
export function sortCx<T>(classes: T): T {
  return classes;
}
