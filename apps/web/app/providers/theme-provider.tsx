"use client";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

type ThemeMode = "system" | "light" | "dark";
type ResolvedTheme = "light" | "dark";
const THEME_COOKIE_MAX_AGE_SECONDS = 6 * 60 * 60;

interface ThemeContextValue {
  /** 用户选择的主题模式（system / light / dark） */
  theme: ThemeMode;
  /** 实际应用的主题（light 或 dark），system 模式下根据系统偏好解析 */
  resolvedTheme: ResolvedTheme;
  setTheme: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "system",
  resolvedTheme: "light",
  setTheme: () => undefined,
});

/** 根据系统媒体查询判断当前系统偏好主题 */
function getSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/** 将 theme 模式解析为实际可见的 light / dark（供 UI 组件读取） */
function resolveThemeMode(mode: ThemeMode): ResolvedTheme {
  if (mode === "dark") return "dark";
  if (mode === "light") return "light";
  return getSystemTheme();
}

/**
 * 同步主题 Cookie。
 *
 * 这套主题策略把 system 视为“没有用户覆盖”，而不是一个需要长期保存的选择：
 * - 无 theme cookie：服务端首屏不加 .dark/.light，由 CSS 媒体查询跟随系统主题；
 * - theme=light/dark：用户短期显式覆盖系统主题，服务端首屏直接渲染对应 class；
 * - 6 小时后 cookie 自然过期：恢复到“无用户覆盖”，重新跟随系统主题。
 *
 * 因此只有 light/dark 会写入 cookie；显式 setTheme("system") 会清除 cookie，
 * 方便未来如果有“回到系统”入口时，行为与 cookie 过期后的状态完全一致。
 *
 * 开发环境不加 Secure 标志（本地 HTTP），生产环境加 Secure（仅 HTTPS）。
 */
function writeThemeCookie(value: ThemeMode) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";

  if (value === "system") {
    document.cookie = `theme=; path=/; SameSite=Lax${secure}; Max-Age=0`;
    return;
  }

  document.cookie = `theme=${value}; path=/; SameSite=Lax${secure}; Max-Age=${THEME_COOKIE_MAX_AGE_SECONDS}`;
}

/** 从 document.cookie 读取主题偏好；除 light/dark 外都回落为 system（无用户覆盖）。 */
function readThemeCookie(): ThemeMode {
  if (typeof document === "undefined") return "system";
  const match = document.cookie.match(/(?:^|;\s*)theme=([^;]*)/);
  const value = match?.[1];
  if (value === "light" || value === "dark") return value;
  return "system";
}

/**
 * 将选择的 ThemeMode 应用到 documentElement class。
 *   "dark"   → 添加 dark，移除 light
 *   "light"  → 添加 light，移除 dark
 *   "system" → 移除 dark 和 light，由 CSS 媒体查询自动处理
 */
function applyTheme(mode: ThemeMode) {
  if (typeof document === "undefined") return;
  const { classList } = document.documentElement;
  if (mode === "dark") {
    classList.add("dark");
    classList.remove("light");
  } else if (mode === "light") {
    classList.add("light");
    classList.remove("dark");
  } else {
    classList.remove("dark");
    classList.remove("light");
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>("system");
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>("light");
  const isInitialMount = useRef(true);

  // 监听系统主题变化（仅在 system 模式下更新 resolvedTheme，不操作 class）
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");

    const handleChange = () => {
      if (theme === "system") {
        setResolvedTheme(media.matches ? "dark" : "light");
        // system 模式下 CSS 媒体查询已处理样式，无需操作 class
      }
    };

    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, [theme]);

  // 首帧读 Cookie 并应用，后续由 setTheme 驱动
  useEffect(() => {
    const mode = isInitialMount.current ? readThemeCookie() : theme;
    if (isInitialMount.current) {
      isInitialMount.current = false;
      if (mode !== theme) {
        setThemeState(mode);
      }
    }
    applyTheme(mode);
    setResolvedTheme(resolveThemeMode(mode));
  }, [theme]);

  const setTheme = (mode: ThemeMode) => {
    writeThemeCookie(mode);
    setThemeState(mode);
  };

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

/** 在 Client Component 中获取当前主题状态及切换方法 */
export function useTheme() {
  return useContext(ThemeContext);
}
