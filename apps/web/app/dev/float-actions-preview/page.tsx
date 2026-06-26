import type { Metadata } from "next";
import { FloatActionsShowcase } from "@/components/article-detail/float-actions-showcase";

export const metadata: Metadata = {
  title: "浮动操作 UI 预览 | Dev",
  robots: { index: false, follow: false },
};

export default function FloatActionsPreviewPage() {
  return <FloatActionsShowcase />;
}
