export function CommentItemSkeleton() {
  return (
    <div className="animate-pulse" aria-hidden="true">
      <div className="flex gap-2.5">
        <div className="size-8 shrink-0 rounded-full bg-muted" />
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            <div className="h-3 w-14 rounded bg-muted" />
            <div className="h-3 w-10 rounded bg-muted" />
          </div>
          <div className="flex-1 space-y-1.5">
            <div className="h-3 w-full rounded bg-muted" />
            <div className="h-3 w-4/5 rounded bg-muted" />
          </div>
          <div className="mt-1.5 h-3 w-8 rounded bg-muted" />
        </div>
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
