import type { AdminModule } from "../../config/module-types";
import { ModerationPage } from "./ModerationPage";

export const moderationModule: AdminModule = {
  id: "moderation",
  nav: {
    label: "内容审核",
    icon: "shield",
    path: "/moderation",
    group: "审核",
    description: "审核队列、全站控制与用户治理",
  },
  routes: [{ path: "/moderation", element: <ModerationPage /> }],
};
