import type { AdminModule } from "../../config/module-types";
import { UsersPage } from "./UsersPage";

export const usersModule: AdminModule = {
  id: "users",
  nav: {
    label: "用户",
    icon: "user",
    path: "/users",
    group: "内容",
    description: "管理注册用户与 VIP 权限",
  },
  routes: [{ path: "/users", element: <UsersPage /> }],
};
