import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "../store/auth";

/**
 * 路由守卫：读取 Zustand 中的 accessToken，未登录则跳转 /login。
 * 用法：将受保护的路由包在 <Route element={<AuthGuard />}> 内。
 */
export function AuthGuard() {
  const accessToken = useAuthStore((state) => state.accessToken);
  if (!accessToken) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
}
