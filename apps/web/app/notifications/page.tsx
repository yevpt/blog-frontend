import type { Metadata } from "next";
import NotificationsPage from "@/components/notifications/notifications-page";

export const metadata: Metadata = {
  title: "消息中心 | Yevpt's Blog",
  description: "查看你的站内通知与互动消息",
  robots: { index: false, follow: false },
};

export default function NotificationsRoute() {
  return <NotificationsPage />;
}
