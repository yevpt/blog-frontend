"use client";

import { createContext, useContext } from "react";

/** 支持的语言类型 */
export type Locale = "zh" | "en";

/** 翻译消息 JSON 的类型（嵌套字符串对象） */
type Messages = Record<string, unknown>;

/** Context 提供的内容 */
export interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  /** 点分路径翻译函数，如 t('nav.home')；找不到 key 时返回 key 本身 */
  t: (key: string) => string;
}

/**
 * 根据点分路径从嵌套对象中取值。
 * 例：getNestedValue({ nav: { home: '首页' } }, 'nav.home') → '首页'
 * 找不到路径时返回 undefined。
 */
export function getNestedValue(obj: Messages, path: string): string | undefined {
  const parts = path.split(".");
  let current: unknown = obj;

  for (const part of parts) {
    if (current === null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[part];
  }

  return typeof current === "string" ? current : undefined;
}

/** 默认的空实现，避免未包裹 Provider 时报错 */
const defaultContextValue: LocaleContextValue = {
  locale: "zh",
  setLocale: () => undefined,
  t: (key: string) => key,
};

/** 导出 LocaleContext（供 LocaleProvider 使用） */
export const LocaleContext = createContext<LocaleContextValue>(defaultContextValue);

/** 在 Client Component 中获取当前语言和翻译函数 */
export function useLocale(): LocaleContextValue {
  return useContext(LocaleContext);
}
