export function ArticleCardSkeleton() {
  return (
    <div className="animate-pulse" aria-hidden="true">
      {/* 封面图占位 */}
      <div className="aspect-video rounded-xl bg-muted" />

      {/* 标题行占位（对应标题 + 右侧图标）*/}
      <div className="mt-3 flex items-start gap-2">
        <div className="flex-1 space-y-2">
          <div className="h-4 rounded bg-muted" />
          <div className="h-4 w-3/4 rounded bg-muted" />
        </div>
        <div className="shrink-0 mt-0.5 size-5 rounded bg-muted" />
      </div>

      {/* 分类标签占位 */}
      <div className="mt-2 h-5 w-16 rounded-full bg-muted" />

      {/* 摘要占位（三行）*/}
      <div className="mt-1 space-y-1.5">
        <div className="h-3 rounded bg-muted" />
        <div className="h-3 rounded bg-muted" />
        <div className="h-3 w-5/6 rounded bg-muted" />
      </div>

      {/* 底部统计占位 */}
      <div className="mt-3 flex justify-between items-center">
        <div className="h-3 w-24 rounded bg-muted" />
        <div className="h-3 w-20 rounded bg-muted" />
      </div>
    </div>
  );
}
