"use client";
import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";

type ThemeMode = "system" | "light" | "dark";
type ResolvedTheme = "light" | "dark";

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

/** 将 resolved theme 应用到 documentElement（添加/移除 dark class） */
function applyTheme(resolved: ResolvedTheme) {
  if (typeof document === "undefined") return;
  if (resolved === "dark") {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  // 固定初始值为 system/light，挂载后再读 localStorage，避免 SSR 与 hydration 不一致
  const [theme, setThemeState] = useState<ThemeMode>("system");
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>("light");

  useEffect(() => {
    const stored = localStorage.getItem("theme");
    if (stored === "light" || stored === "dark" || stored === "system") {
      setThemeState(stored);
    }
  }, []);

  // 监听系统主题变化（仅在 system 模式下响应）
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");

    const handleChange = () => {
      if (theme === "system") {
        const resolved = media.matches ? "dark" : "light";
        setResolvedTheme(resolved);
        applyTheme(resolved);
      }
    };

    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, [theme]);

  // theme 变化时同步 resolvedTheme 并应用到 DOM
  useEffect(() => {
    const resolved: ResolvedTheme = theme === "system" ? getSystemTheme() : theme;
    setResolvedTheme(resolved);
    applyTheme(resolved);
  }, [theme]);

  const setTheme = (mode: ThemeMode) => {
    localStorage.setItem("theme", mode);
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
