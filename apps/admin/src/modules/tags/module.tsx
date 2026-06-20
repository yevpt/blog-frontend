import type { AdminModule } from "../../config/module-types";
import { TagsPage } from "./TagsPage";

export const tagsModule: AdminModule = {
  id: "tags",
  nav: {
    label: "标签",
    icon: "tag",
    path: "/tags",
    group: "内容",
    description: "整理标签与内容关联",
  },
  routes: [{ path: "/tags", element: <TagsPage /> }],
};
