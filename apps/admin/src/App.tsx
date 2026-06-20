import { useEffect, useState, type ReactNode } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { SvgSprite } from "@repo/icons";
import { ToastRegion } from "@repo/ui";
import { AuthGuard } from "./components/AuthGuard";
import { AdminLayout } from "./components/layout/AdminLayout";
import { LoginPage } from "./pages/LoginPage";
import { renderModuleRoutes } from "./app/routes";
import { ThemeProvider } from "./providers/theme-provider";
import { initSessionFromRefreshToken } from "./lib/session-init";
import { toastQueue } from "./lib/toast";

/**
 * App 挂载时的静默续期逻辑：检查 localStorage 的 refresh_token，
 * 若存在则尝试换发新 access_token，避免用户每次刷新页面都要重新登录。
 */
function AuthInit({ children }: { children: ReactNode }) {
  const [isCheckingSession, setIsCheckingSession] = useState(
    () => localStorage.getItem("refresh_token") !== null,
  );

  useEffect(() => {
    let isMounted = true;

    void initSessionFromRefreshToken().finally(() => {
      if (isMounted) {
        setIsCheckingSession(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  if (isCheckingSession) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-background px-6 text-foreground">
        <p role="status" className="text-sm text-muted-foreground">
          正在恢复登录状态...
        </p>
      </main>
    );
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <>
      <SvgSprite />
      <ThemeProvider>
        <BrowserRouter>
          <AuthInit>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route element={<AuthGuard />}>
                <Route element={<AdminLayout />}>{renderModuleRoutes()}</Route>
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </AuthInit>
        </BrowserRouter>
        <ToastRegion queue={toastQueue} />
      </ThemeProvider>
    </>
  );
}
