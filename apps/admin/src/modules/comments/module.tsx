import { lazy } from "react";
import type { AdminModule } from "../../config/module-types";

const CommentsPage = lazy(() =>
  import("./CommentsPage").then(({ CommentsPage }) => ({ default: CommentsPage })),
);

export const commentsModule: AdminModule = {
  id: "comments",
  nav: {
    label: "评论",
    icon: "message-circle",
    path: "/comments",
    group: "内容",
    description: "管理文章与碎语评论",
  },
  routes: [{ path: "/comments", element: <CommentsPage /> }],
};
