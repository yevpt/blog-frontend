import { Route } from "react-router-dom";
import { adminRoutes } from "../config/modules";

/** 把注册表派生的路由渲染为嵌套在 AdminLayout 下的 <Route> */
export function renderModuleRoutes() {
  return adminRoutes.map((route) =>
    route.index ? (
      <Route key="__index" index element={route.element} />
    ) : (
      <Route key={route.path} path={route.path} element={route.element} />
    ),
  );
}
