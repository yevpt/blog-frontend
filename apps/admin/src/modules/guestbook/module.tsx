import type { AdminModule } from "../../config/module-types";
import { GuestbookPage } from "./GuestbookPage";

export const guestbookModule: AdminModule = {
  id: "guestbook",
  nav: {
    label: "留言",
    icon: "quote",
    path: "/guestbook",
    group: "内容",
    description: "管理留言板内容",
  },
  routes: [{ path: "/guestbook", element: <GuestbookPage /> }],
};
