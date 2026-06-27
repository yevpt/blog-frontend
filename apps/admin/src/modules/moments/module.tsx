import type { AdminModule } from "../../config/module-types";
import { MomentsPage } from "./MomentsPage";

export const momentsModule: AdminModule = {
  id: "moments",
  nav: {
    label: "碎语",
    icon: "feather",
    path: "/moments",
    group: "内容",
    description: "管理碎语内容与置顶状态",
  },
  routes: [{ path: "/moments", element: <MomentsPage /> }],
};
