import { lazy } from "react";
import type { AdminModule } from "../../config/module-types";

const DashboardPage = lazy(() =>
  import("./DashboardPage").then(({ DashboardPage }) => ({ default: DashboardPage })),
);

export const dashboardModule: AdminModule = {
  id: "dashboard",
  nav: { label: "概览", icon: "home", path: "/", description: "后台关键数据与快捷入口" },
  routes: [{ index: true, element: <DashboardPage /> }],
};
