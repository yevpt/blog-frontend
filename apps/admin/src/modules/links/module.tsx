import type { AdminModule } from "../../config/module-types";
import { LinksPage } from "./LinksPage";

export const linksModule: AdminModule = {
  id: "links",
  nav: {
    label: "友链",
    icon: "link",
    path: "/links",
    group: "站点",
    description: "管理友情链接与展示状态",
  },
  routes: [{ path: "/links", element: <LinksPage /> }],
};
