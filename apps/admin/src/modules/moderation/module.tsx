import { lazy } from "react";
import type { AdminModule } from "../../config/module-types";

const ModerationPage = lazy(() =>
  import("./ModerationPage").then(({ ModerationPage }) => ({ default: ModerationPage })),
);

export const moderationModule: AdminModule = {
  id: "moderation",
  nav: {
    label: "内容审核",
    icon: "shield",
    path: "/moderation",
    description: "审核队列、全站控制与规则管理",
  },
  routes: [{ path: "/moderation", element: <ModerationPage /> }],
};
