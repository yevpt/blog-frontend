"use client";

import { useState, useEffect, useCallback } from "react";
import type { ReactNode } from "react";
import {
  LocaleContext,
  getNestedValue,
  type Locale,
  type LocaleContextValue,
} from "@repo/hooks/locale";

type Messages = Record<string, unknown>;

/** 从 localStorage 读取已持久化的 locale，默认 'zh' */
function getInitialLocale(): Locale {
  if (typeof window === "undefined") return "zh";
  const stored = localStorage.getItem("locale");
  if (stored === "zh" || stored === "en") return stored;
  return "zh";
}

/** 动态加载对应语言的 messages JSON */
async function loadMessages(locale: Locale): Promise<Messages> {
  if (locale === "en") {
    const mod = await import("../../messages/en.json");
    return mod.default as Messages;
  }
  // 默认加载中文
  const mod = await import("../../messages/zh.json");
  return mod.default as Messages;
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(getInitialLocale);
  // messages 加载完成前为 null，此时 t() 降级返回 key 本身
  const [messages, setMessages] = useState<Messages | null>(null);

  // locale 变化时重新加载对应 messages JSON
  useEffect(() => {
    let cancelled = false;
    setMessages(null);
    loadMessages(locale).then((msgs) => {
      if (!cancelled) setMessages(msgs);
    });
    return () => {
      cancelled = true;
    };
  }, [locale]);

  const setLocale = useCallback((newLocale: Locale) => {
    localStorage.setItem("locale", newLocale);
    setLocaleState(newLocale);
  }, []);

  // messages 加载完成前返回 key 本身（降级处理）
  const t = useCallback(
    (key: string): string => {
      if (!messages) return key;
      return getNestedValue(messages, key) ?? key;
    },
    [messages],
  );

  const value: LocaleContextValue = { locale, setLocale, t };

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}
