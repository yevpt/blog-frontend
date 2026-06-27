import { useCallback, useMemo, useState } from "react";
import { ApiError } from "@repo/api";
import { SvgIcon } from "@repo/icons";
import {
  Badge,
  Button,
  DataTable,
  Pagination,
  type DataTableColumn,
  type DataTableEmptyState,
} from "@repo/ui";
import { AdminListCard } from "../../components/AdminListCard";
import { AdminListSummary } from "../../components/AdminListSummary";
import { AdminPageHeader } from "../../components/AdminPageHeader";
import { apiClient } from "../../lib/api";
import { adminFlushDataTableClassNames } from "../../lib/data-table-flush";
import { addToast } from "../../lib/toast";
import { useIsMdScreen } from "../tags/hooks/use-is-md-screen";
import { CommentDeleteDialog } from "./components/CommentDeleteDialog";
import { CommentListToolbar } from "./components/CommentListToolbar";
import { CommentMobileList } from "./components/CommentMobileList";
import { useAdminCommentList } from "./hooks/use-admin-comment-list";
import type { CommentRow } from "./model";

export function CommentsPage() {
  const {
    rows,
    pageData,
    isLoading,
    error,
    page,
    setPage,
    filters,
    setSearch,
    setTargetType,
    resetListQuery,
    hasActiveListQuery,
    refetch,
  } = useAdminCommentList();
  const isMdScreen = useIsMdScreen();
  const [deletingComment, setDeletingComment] = useState<CommentRow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteComment = useCallback(
    async (comment: CommentRow) => {
      setIsDeleting(true);
      try {
        if (comment.targetType === "article") {
          await apiClient.comments.deleteArticle(Number(comment.id));
        } else {
          await apiClient.comments.deleteMoment(Number(comment.id));
        }
        addToast("评论已删除", "success");
        setDeletingComment(null);
        await refetch();
      } catch (err) {
        addToast(err instanceof ApiError ? err.message : "删除失败，请稍后重试", "error");
        throw err;
      } finally {
        setIsDeleting(false);
      }
    },
    [refetch],
  );

  const columns = useMemo<Array<DataTableColumn<CommentRow>>>(
    () => [
      {
        id: "target",
        header: "来源",
        width: "12%",
        minWidth: 88,
        className: "text-center",
        headerClassName: "text-center [&>div]:justify-center",
        cell: (comment) => <Badge variant="outline">{comment.targetLabel}</Badge>,
      },
      {
        id: "content",
        header: "评论内容",
        isRowHeader: true,
        width: "38%",
        minWidth: 220,
        className: "min-w-0 whitespace-normal",
        cell: (comment) => (
          <div className="min-w-0">
            <p className="line-clamp-2 text-sm leading-6 text-foreground">{comment.content}</p>
            <p className="mt-1 text-xs text-muted-foreground">#{comment.targetId}</p>
          </div>
        ),
      },
      {
        id: "author",
        header: "作者",
        width: "14%",
        minWidth: 120,
        className: "truncate text-muted-foreground",
        cell: (comment) => comment.authorName,
      },
      {
        id: "stats",
        header: "互动",
        width: "14%",
        minWidth: 112,
        className: "text-muted-foreground",
        cell: (comment) => `${comment.replyCount} 回复 · ${comment.likeCount} 赞`,
      },
      {
        id: "createdAt",
        header: "时间",
        width: "14%",
        minWidth: 128,
        className: "text-muted-foreground tabular-nums",
        cell: (comment) => comment.createdAt,
      },
      {
        id: "actions",
        header: "操作",
        width: "8%",
        minWidth: 88,
        className: "text-center",
        headerClassName: "text-center [&>div]:justify-center",
        cell: (comment) => (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
            onPress={() => setDeletingComment(comment)}
          >
            删除
          </Button>
        ),
      },
    ],
    [],
  );

  const hasActiveFilter = filters.targetType !== "all" || filters.search.trim().length > 0;
  const emptyState: DataTableEmptyState = hasActiveFilter
    ? {
        icon: "search",
        title: "未找到匹配的评论",
        description: "调整搜索或筛选条件后再试。",
      }
    : {
        icon: "message-circle",
        title: "还没有评论",
        description: "文章或碎语收到评论后会出现在这里。",
      };

  const total = pageData?.total ?? 0;
  const totalPages = pageData?.pages ?? 0;
  const showPagination = totalPages > 1;
  const showSummary = !isLoading && total > 0;

  return (
    <div className="grid min-h-0 min-w-0 max-w-full gap-4 overflow-hidden md:max-h-[calc(100dvh-3rem)] md:grid-rows-[auto_minmax(0,1fr)] lg:max-h-[calc(100dvh-3.5rem)]">
      <AdminPageHeader
        title="评论管理"
        description="管理文章与碎语评论，快速定位异常互动并清理。"
        action={
          <Button
            size="sm"
            variant="outline"
            className="w-full shrink-0 sm:w-auto"
            onPress={refetch}
          >
            <SvgIcon name="refresh-cw" size={15} />
            刷新
          </Button>
        }
      />

      <section className="flex min-h-0 min-w-0 max-w-full flex-col" aria-label="评论列表">
        {error ? (
          <p role="alert" className="pb-3 text-sm text-destructive">
            {error.message}
          </p>
        ) : null}

        <AdminListCard className="md:min-h-[360px]">
          <CommentListToolbar
            searchValue={filters.search}
            targetType={filters.targetType}
            onSearchChange={setSearch}
            onTargetTypeChange={setTargetType}
            canClear={hasActiveListQuery}
            onClear={resetListQuery}
          />

          <div className="min-h-0 flex-1 overflow-hidden">
            {isMdScreen ? (
              <DataTable
                aria-label="评论列表"
                items={rows}
                columns={columns}
                getRowId={(comment) => `${comment.targetType}-${comment.id}`}
                showTotal={false}
                showToolbar={false}
                emptyState={emptyState}
                isLoading={isLoading}
                maxHeightClassName={false}
                embedded
                classNames={adminFlushDataTableClassNames}
              />
            ) : (
              <div className="h-full overflow-y-auto overscroll-y-contain">
                <CommentMobileList
                  items={rows}
                  isLoading={isLoading}
                  emptyState={emptyState}
                  onDelete={setDeletingComment}
                />
              </div>
            )}
          </div>

          {showSummary || showPagination ? (
            <div className="shrink-0 px-4 py-3">
              {showSummary ? (
                <AdminListSummary
                  visibleCount={rows.length}
                  secondary={`总计 ${total.toLocaleString()} 条`}
                  className="px-0 pt-0"
                />
              ) : null}
              {showPagination ? (
                <Pagination
                  currentPage={page}
                  totalPages={totalPages}
                  onPageChange={setPage}
                  className="pt-3 md:pt-3"
                />
              ) : null}
            </div>
          ) : null}
        </AdminListCard>
      </section>

      <CommentDeleteDialog
        comment={deletingComment}
        isDeleting={isDeleting}
        onClose={() => setDeletingComment(null)}
        onConfirm={handleDeleteComment}
      />
    </div>
  );
}
