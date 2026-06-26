import type { AdminModule } from "../../config/module-types";
import { AnalyticsPage } from "./AnalyticsPage";

export const analyticsModule: AdminModule = {
  id: "analytics",
  nav: {
    label: "数据统计",
    icon: "monitor",
    path: "/analytics",
    description: "站点流量、受众与来源、页面、友链、实时与路径分析",
  },
  routes: [{ path: "analytics", element: <AnalyticsPage /> }],
};
