import type { AdminModule } from "../../config/module-types";
import { UsersPage } from "./UsersPage";
import { UserToolsPage } from "./UserToolsPage";

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
