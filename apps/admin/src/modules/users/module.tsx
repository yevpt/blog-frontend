import { lazy } from "react";
import type { AdminModule } from "../../config/module-types";

const UsersPage = lazy(() =>
  import("./UsersPage").then(({ UsersPage }) => ({ default: UsersPage })),
);
const UserToolsPage = lazy(() =>
  import("./UserToolsPage").then(({ UserToolsPage }) => ({ default: UserToolsPage })),
);

export const usersModule: AdminModule = {
  id: "users",
  nav: {
    label: "用户",
    icon: "user",
    path: "/users",
    group: "内容",
    description: "管理注册用户、角色与账号状态",
  },
  routes: [
    { path: "/users", element: <UsersPage /> },
    { path: "/users/tools", element: <UserToolsPage /> },
  ],
};
