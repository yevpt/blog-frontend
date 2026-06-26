import type { AdminModule, AdminNavItem, AdminRoute } from "./module-types";
import { dashboardModule } from "../modules/dashboard/module";
import { articlesModule } from "../modules/articles/module";
import { commentsModule } from "../modules/comments/module";
import { guestbookModule } from "../modules/guestbook/module";
import { momentsModule } from "../modules/moments/module";
import { categoriesModule } from "../modules/categories/module";
import { tagsModule } from "../modules/tags/module";
import { musicModule } from "../modules/music/module";
import { linksModule } from "../modules/links/module";
import { analyticsModule } from "../modules/analytics/module";

/** 所有后台模块的唯一注册表；新增模块在此追加一项 */
export const adminModules: AdminModule[] = [
  dashboardModule,
  articlesModule,
  commentsModule,
  guestbookModule,
  momentsModule,
  categoriesModule,
  tagsModule,
  musicModule,
  linksModule,
  analyticsModule,
];

/** 侧边栏导航项：从模块注册表派生（单一事实来源） */
export const adminNavItems: AdminNavItem[] = adminModules.flatMap((m) => (m.nav ? [m.nav] : []));

/** 路由列表：从模块注册表派生 */
export const adminRoutes: AdminRoute[] = adminModules.flatMap((m) => m.routes);

export function getNavItemByPath(pathname: string) {
  return adminNavItems.find((item) => item.path === pathname) ?? adminNavItems[0];
}

export type { AdminModule, AdminNavItem, AdminRoute } from "./module-types";
