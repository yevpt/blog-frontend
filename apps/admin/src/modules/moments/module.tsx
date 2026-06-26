import type { AdminModule } from "../../config/module-types";
import { MomentsPage } from "./MomentsPage";

export const momentsModule: AdminModule = {
  id: "moments",
  nav: {
    label: "动态",
    icon: "message-circle",
    path: "/moments",
    group: "内容",
    description: "管理动态内容与置顶状态",
  },
  routes: [{ path: "/moments", element: <MomentsPage /> }],
};
