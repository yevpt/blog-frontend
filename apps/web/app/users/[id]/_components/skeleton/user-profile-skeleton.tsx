import { Card, cn } from "@repo/ui";

function Bone({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded bg-muted", className)} />;
}

export function UserProfileSkeleton() {
  return (
    <div className="min-h-screen bg-muted/40">
      <div className="h-16" />
      <div className="mx-auto max-w-2xl space-y-4 px-4 py-6">
        {/* Card 1: 用户信息头 */}
        <Card className="px-6 py-8">
          <div className="flex flex-col items-center text-center">
            <Bone className="h-20 w-20 rounded-full" />
            <Bone className="mt-3 h-6 w-32" />
            <Bone className="mt-2 h-4 w-20" />
            <Bone className="mt-2 h-4 w-48" />
            <div className="mt-3 flex gap-2">
              {[1, 2, 3].map((i) => (
                <Bone key={i} className="h-8 w-8 rounded-lg" />
              ))}
            </div>
            <Bone className="mt-4 h-9 w-28 rounded-lg" />
          </div>
        </Card>

        {/* Card 2: Tabs + 内容 */}
        <Card>
          {/* Tab 栏 */}
          <div className="flex gap-1 border-b border-border px-4 pt-2">
            {[1, 2, 3].map((i) => (
              <Bone key={i} className="mb-2 h-8 w-16 rounded-md" />
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
