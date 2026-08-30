import { Suspense, type ReactNode } from "react";
import { Route } from "react-router-dom";
import { adminRoutes } from "../config/modules";
import { AdminRouteLoading } from "../components/AdminRouteLoading";

function withRouteLoading(element: ReactNode) {
  return <Suspense fallback={<AdminRouteLoading />}>{element}</Suspense>;
}

/** 把注册表派生的路由渲染为嵌套在 AdminLayout 下的 <Route> */
export function renderModuleRoutes() {
  return adminRoutes.map((route) =>
    route.index ? (
      <Route key="__index" index element={withRouteLoading(route.element)} />
    ) : (
      <Route key={route.path} path={route.path} element={withRouteLoading(route.element)} />
    ),
  );
}
