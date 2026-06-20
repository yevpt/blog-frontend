export function CommentItemSkeleton() {
  return (
    <div className="animate-pulse" aria-hidden="true">
      <div className="mb-2 flex gap-2.5">
        <div className="size-[30px] shrink-0 rounded-full bg-muted" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-3.5 w-20 rounded bg-muted" />
              <div className="h-3 w-28 rounded bg-muted" />
            </div>
            <div className="size-6 shrink-0 rounded bg-muted" />
          </div>
        </div>
      </div>
      <div className="space-y-1.5">
        <div className="h-3 w-full rounded bg-muted" />
        <div className="h-3 w-4/5 rounded bg-muted" />
      </div>
    </div>
  );
}

export function CommentListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-[18px]" aria-label="评论加载中">
      {Array.from({ length: count }, (_, i) => (
        <CommentItemSkeleton key={i} />
      ))}
    </div>
  );
}
