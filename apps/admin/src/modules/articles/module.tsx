import { lazy } from "react";
import type { AdminModule } from "../../config/module-types";

const ArticlesPage = lazy(() =>
  import("./ArticlesPage").then(({ ArticlesPage }) => ({ default: ArticlesPage })),
);
const ArticleEditorPage = lazy(() =>
  import("./ArticleEditorPage").then(({ ArticleEditorPage }) => ({ default: ArticleEditorPage })),
);
const PinnedArticlesPage = lazy(() =>
  import("./PinnedArticlesPage").then(({ PinnedArticlesPage }) => ({
    default: PinnedArticlesPage,
  })),
);

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
