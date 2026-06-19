import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

export type ThemeMode = "system" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";

const THEME_COOKIE_MAX_AGE_SECONDS = 6 * 60 * 60;

interface ThemeContextValue {
  theme: ThemeMode;
  resolvedTheme: ResolvedTheme;
  setTheme: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "system",
  resolvedTheme: "light",
  setTheme: () => undefined,
});

function getSystemTheme(): ResolvedTheme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function resolveThemeMode(mode: ThemeMode): ResolvedTheme {
  if (mode === "dark") return "dark";
  if (mode === "light") return "light";
  return getSystemTheme();
}

function readThemeCookie(): ThemeMode {
  const match = document.cookie.match(/(?:^|;\s*)theme=([^;]*)/);
  const value = match?.[1];
  if (value === "light" || value === "dark") return value;
  return "system";
}

function writeThemeCookie(mode: ThemeMode) {
  const secure = import.meta.env.PROD ? "; Secure" : "";

  if (mode === "system") {
    document.cookie = `theme=; path=/; SameSite=Lax${secure}; Max-Age=0`;
    return;
  }

  document.cookie = `theme=${mode}; path=/; SameSite=Lax${secure}; Max-Age=${THEME_COOKIE_MAX_AGE_SECONDS}`;
}

function applyTheme(mode: ThemeMode) {
  const { classList } = document.documentElement;

  if (mode === "dark") {
    classList.add("dark");
    classList.remove("light");
    return;
  }

  if (mode === "light") {
    classList.add("light");
    classList.remove("dark");
    return;
  }

  classList.remove("dark", "light");
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>("system");
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>("light");
  const isInitialMount = useRef(true);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");

    const handleChange = () => {
      if (theme === "system") {
        setResolvedTheme(media.matches ? "dark" : "light");
      }
    };

    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, [theme]);

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

export function useTheme() {
  return useContext(ThemeContext);
}
