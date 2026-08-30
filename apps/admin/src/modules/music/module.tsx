import { lazy } from "react";
import type { AdminModule } from "../../config/module-types";

const MusicPage = lazy(() =>
  import("./MusicPage").then(({ MusicPage }) => ({ default: MusicPage })),
);

export const musicModule: AdminModule = {
  id: "music",
  nav: {
    label: "音乐",
    icon: "music",
    path: "/music",
    group: "站点",
    description: "维护站点音乐收藏与播放信息",
  },
  routes: [{ path: "/music", element: <MusicPage /> }],
};
