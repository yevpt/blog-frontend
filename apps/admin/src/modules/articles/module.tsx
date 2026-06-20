import type { AdminModule } from "../../config/module-types";
import { ArticlesPage } from "./ArticlesPage";
import { ArticleEditorPage } from "./ArticleEditorPage";
import { PinnedArticlesPage } from "./PinnedArticlesPage";

export const articlesModule: AdminModule = {
  id: "articles",
  nav: {
    label: "文章",
    icon: "pen",
    path: "/articles",
    group: "内容",
    description: "管理文章列表、发布状态与编辑入口",
  },
  routes: [
    { path: "/articles", element: <ArticlesPage /> },
    { path: "/articles/new", element: <ArticleEditorPage /> },
    { path: "/articles/pinned", element: <PinnedArticlesPage /> },
    { path: "/articles/:articleId/edit", element: <ArticleEditorPage /> },
  ],
};
