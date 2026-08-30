import { lazy } from "react";
import type { AdminModule } from "../../config/module-types";

const CategoriesPage = lazy(() =>
  import("./CategoriesPage").then(({ CategoriesPage }) => ({ default: CategoriesPage })),
);

export const categoriesModule: AdminModule = {
  id: "categories",
  nav: {
    label: "分类",
    icon: "folder",
    path: "/categories",
    group: "内容",
    description: "维护文章分类与内容结构",
  },
  routes: [{ path: "/categories", element: <CategoriesPage /> }],
};
