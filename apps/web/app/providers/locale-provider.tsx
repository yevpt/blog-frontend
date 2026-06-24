"use client";

import { useState, useEffect, useCallback } from "react";
import type { ReactNode } from "react";
import zhMessages from "../../messages/zh.json";
import {
  LocaleContext,
  getNestedValue,
  type Locale,
  type LocaleContextValue,
} from "@repo/hooks/locale";

type Messages = Record<string, unknown>;

/** 动态加载对应语言的 messages JSON */
async function loadMessages(locale: Locale): Promise<Messages> {
  if (locale === "en") {
    const mod = await import("../../messages/en.json");
    return mod.default as Messages;
  }
  const mod = await import("../../messages/zh.json");
  return mod.default as Messages;
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  // SSR 与 hydration 首帧固定为 zh，避免 localStorage 导致文本不匹配（React #418）
  const [locale, setLocaleState] = useState<Locale>("zh");
  const [messages, setMessages] = useState<Messages>(() => zhMessages as Messages);

  // hydration 后从 localStorage 恢复用户语言偏好
  useEffect(() => {
    const stored = localStorage.getItem("locale");
    if (stored === "en") {
      setLocaleState("en");
    }
  }, []);

  // locale 变化时重新加载对应 messages
  useEffect(() => {
    let cancelled = false;
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
