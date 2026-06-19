import type { IconName } from "@repo/icons";

export interface AdminNavItem {
  label: string;
  icon: IconName;
  path: string;
  group?: string;
  description: string;
}

export const adminNavItems: AdminNavItem[] = [
  { label: "概览", icon: "home", path: "/", description: "后台关键数据与快捷入口" },
  {
    label: "文章",
    icon: "pen",
    path: "/articles",
    group: "内容",
    description: "管理文章列表、发布状态与编辑入口",
  },
  {
    label: "分类",
    icon: "folder",
    path: "/categories",
    group: "内容",
    description: "维护文章分类与内容结构",
  },
  { label: "标签", icon: "tag", path: "/tags", group: "内容", description: "整理标签与内容关联" },
  {
    label: "音乐",
    icon: "music",
    path: "/music",
    group: "站点",
    description: "维护站点音乐收藏与播放信息",
  },
  {
    label: "友链",
    icon: "link",
    path: "/links",
    group: "站点",
    description: "管理友情链接与展示状态",
  },
];

export function getNavItemByPath(pathname: string) {
  return adminNavItems.find((item) => item.path === pathname) ?? adminNavItems[0];
}
