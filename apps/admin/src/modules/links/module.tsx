import { lazy } from "react";
import type { AdminModule } from "../../config/module-types";

const LinksPage = lazy(() =>
  import("./LinksPage").then(({ LinksPage }) => ({ default: LinksPage })),
);

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
