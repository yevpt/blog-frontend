import { SnippetCardSkeleton } from "./snippet-card-skeleton";
import { SnippetsPageHeader } from "./snippets-page-header";

const SKELETON_COUNT = 8;

/**
 * 碎语列表客户端加载前的占位：
 * 用 CSS 断点网格保证列数正确，避免 SSR 瀑布流列数闪烁。
 */
export function SnippetsListFallback() {
  return (
    <>
      <div data-testid="snippets-page-header" className="mb-6">
        <SnippetsPageHeader />

        <div
          className="flex items-end justify-between gap-6 border-b border-border pb-3"
          aria-hidden="true"
        >
          <div className="snippet-shimmer-bar h-4 w-40 rounded-md" />
          <div className="snippet-shimmer-bar h-4 w-16 rounded-md" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-[14px] sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: SKELETON_COUNT }, (_, i) => (
          <SnippetCardSkeleton key={i} variant={i} />
        ))}
      </div>
    </>
  );
}
