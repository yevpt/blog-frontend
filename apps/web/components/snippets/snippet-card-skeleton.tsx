export function SnippetCardSkeleton() {
  return (
    <div className="rounded-[14px] bg-[#fafafa] p-3.5 dark:bg-[#1f1f23]" aria-hidden="true">
      {/* Header: avatar + 双行文字 */}
      <div className="mb-2.5 flex items-start gap-2.5">
        <div className="h-9 w-9 shrink-0 rounded-full bg-muted" />
        <div className="flex-1 space-y-1.5">
          <div className="h-3.5 w-24 rounded bg-muted" />
          <div className="h-3 w-12 rounded-full bg-muted" />
        </div>
      </div>

      {/* 正文占位（两行） */}
      <div className="space-y-1.5">
        <div className="h-3 rounded bg-muted" />
        <div className="h-3 w-4/5 rounded bg-muted" />
      </div>

      {/* 底部操作区 */}
      <div className="mt-3 flex justify-end gap-2 border-t border-border/40 pt-2">
        <div className="h-4 w-10 rounded bg-muted" />
        <div className="h-4 w-10 rounded bg-muted" />
      </div>
    </div>
  );
}
