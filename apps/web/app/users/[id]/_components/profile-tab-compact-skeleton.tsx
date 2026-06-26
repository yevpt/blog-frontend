/** 个人页 Tab 首屏加载骨架：与 ProfileTabEmptyState 同高，避免空态 ↔ 骨架切换时布局跳动 */
export function ProfileTabCompactSkeleton({
  testId = "profile-tab-compact-skeleton",
}: {
  testId?: string;
}) {
  return (
    <div
      data-testid={testId}
      className="flex min-h-[180px] flex-col items-center justify-center px-6 py-10 text-center"
    >
      <div className="mb-4 size-14 animate-pulse rounded-2xl bg-muted" />
      <div className="h-4 w-24 animate-pulse rounded bg-muted" />
      <div className="mt-1.5 h-4 w-48 max-w-[260px] animate-pulse rounded bg-muted" />
    </div>
  );
}
