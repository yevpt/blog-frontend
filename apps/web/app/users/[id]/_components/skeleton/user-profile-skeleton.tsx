import { Card, cn } from "@repo/ui";
import { PROFILE_PAGE_MAX_WIDTH_CLASS } from "../constants";

function Bone({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded bg-muted", className)} />;
}

export function UserProfileSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <div className="h-16" />
      <div className={cn("mx-auto space-y-4 px-4 py-6", PROFILE_PAGE_MAX_WIDTH_CLASS)}>
        {/* Card 1: 用户信息头 — 间距与尺寸对齐 UserInfoHeader 实际渲染 */}
        <Card className="rounded-2xl px-6 py-8">
          <div className="flex flex-col items-center text-center">
            <Bone className="h-20 w-20 rounded-full" />
            <Bone className="mt-3 h-7 w-32" />
            <Bone className="mt-1.5 h-5 w-20" />
            <Bone className="mt-1.5 h-5 w-48" />
            <Bone className="mt-3 h-7 w-28 rounded" />
          </div>
        </Card>

        {/* Card 2: Tabs + 内容 — 对齐 UserProfileTabs + ProfileReadView 实际结构 */}
        <Card className="rounded-2xl overflow-hidden">
          {/* Tab 栏 — flex-1 匹配实际按钮等比宽度 */}
          <div className="flex border-b border-border">
            {[1, 2, 3].map((i) => (
              <Bone key={i} className="flex-1 h-11 rounded-none" />
            ))}
          </div>
          {/* 字段列表 */}
          <div className="divide-y divide-border">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3">
                <Bone className="h-5 w-5 shrink-0 rounded" />
                <Bone className="h-4 w-28" />
                <Bone className="ml-auto h-4 w-24" />
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
