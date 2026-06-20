import type { ReactElement } from "react";
import type { IconName } from "@repo/icons";

/** 侧边栏导航项（原 config/nav.ts 中的定义迁移至此） */
export interface AdminNavItem {
  label: string;
  icon: IconName;
  path: string;
  group?: string;
  description: string;
}

/** 模块贡献的单条路由 */
export interface AdminRoute {
  /** index 路由省略 path 并置 index:true */
  path?: string;
  index?: boolean;
  element: ReactElement;
}

/** 一个后台业务模块的定义 */
export interface AdminModule {
  id: string;
  /** 进入侧边栏的模块给出 nav；子路由（new/edit/pinned 等）不给 */
  nav?: AdminNavItem;
  /** 本模块贡献的全部路由（含子路由） */
  routes: AdminRoute[];
}
