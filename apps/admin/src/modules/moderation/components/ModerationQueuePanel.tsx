import { useMemo } from "react";
import { SvgIcon } from "@repo/icons";
import {
  Badge,
  Button,
  DataTable,
  Pagination,
  type DataTableColumn,
  type DataTableEmptyState,
} from "@repo/ui";
import { AdminListCard } from "../../../components/AdminListCard";
import { AdminListSummary } from "../../../components/AdminListSummary";
import { adminFlushDataTableClassNames } from "../../../lib/data-table-flush";
import {
  riskLevelVariant,
  reviewStatusVariant,
  publicStateVariant,
  type ModerationRow,
} from "../model";
import type { UseModerationListResult } from "../hooks/use-moderation-list";
import { ModerationListToolbar } from "./ModerationListToolbar";

interface ModerationQueuePanelProps {
  list: UseModerationListResult;
  desktop: boolean;
  onReview: (row: ModerationRow) => void;
}

export function ModerationQueuePanel({ list, desktop, onReview }: ModerationQueuePanelProps) {
  const columns = useQueueColumns(onReview);
  const emptyState: DataTableEmptyState = list.hasActiveListQuery
    ? {
        icon: "search",
        title: "未找到匹配的审核项",
        description: "调整筛选条件后再试。",
      }
    : {
        icon: "shield",
        title: "暂无待审核内容",
        description: "新提交的内容进入审核队列后会显示在这里。",
      };
  const total = list.pageData?.total ?? 0;
  const totalPages = Math.max(0, Math.ceil(total / (list.pageData?.page_size ?? 10)));

  return (
    <section className="flex min-h-0 flex-col" aria-label="审核队列">
      {list.error ? (
        <p role="alert" className="pb-3 text-sm text-destructive">
          {list.error.message}
        </p>
      ) : null}
      <AdminListCard className="md:min-h-[360px]">
        <ModerationListToolbar
          contentType={list.filters.contentType}
          riskLevel={list.filters.riskLevel}
          reviewStatus={list.filters.reviewStatus}
          publicState={list.filters.publicState}
          onContentTypeChange={list.setContentType}
          onRiskLevelChange={list.setRiskLevel}
          onReviewStatusChange={list.setReviewStatus}
          onPublicStateChange={list.setPublicState}
          canClear={list.hasActiveListQuery}
          onClear={list.resetListQuery}
        />
        <div className="min-h-0 flex-1 overflow-hidden">
          {desktop ? (
            <DataTable
              aria-label="审核队列"
              items={list.rows}
              columns={columns}
              getRowId={(row) => String(row.itemId)}
              showTotal={false}
              showToolbar={false}
              emptyState={emptyState}
              isLoading={list.isLoading}
              maxHeightClassName={false}
              embedded
              classNames={adminFlushDataTableClassNames}
            />
          ) : (
            <ModerationMobileList
              items={list.rows}
              isLoading={list.isLoading}
              emptyState={emptyState}
              onReview={onReview}
            />
          )}
        </div>
        {!list.isLoading && total > 0 ? (
          <div className="shrink-0 px-4 py-3">
            <AdminListSummary
              visibleCount={list.rows.length}
              secondary={`总计 ${total.toLocaleString()} 条`}
              className="px-0 pt-0"
            />
            {totalPages > 1 ? (
              <Pagination
                currentPage={list.page}
                totalPages={totalPages}
                onPageChange={list.setPage}
                className="pt-3 md:pt-3"
              />
            ) : null}
          </div>
        ) : null}
      </AdminListCard>
    </section>
  );
}

function useQueueColumns(onReview: (row: ModerationRow) => void) {
  return useMemo<Array<DataTableColumn<ModerationRow>>>(
    () => [
      { id: "contentType", header: "类型", minWidth: 96, cell: (row) => row.contentTypeLabel },
      { id: "author", header: "作者", minWidth: 80, cell: (row) => `#${row.authorId}` },
      {
        id: "summary",
        header: "提交正文",
        isRowHeader: true,
        minWidth: 200,
        className: "min-w-0 whitespace-normal",
        cell: (row) => <span className="line-clamp-2 text-sm text-foreground">{row.summary}</span>,
      },
      {
        id: "risk",
        header: "风险",
        minWidth: 80,
        cell: (row) => <Badge variant={riskLevelVariant(row.riskLevel)}>{row.riskLabel}</Badge>,
      },
      { id: "policy", header: "策略", minWidth: 88, cell: (row) => row.policyLabel },
      {
        id: "review",
        header: "审核状态",
        minWidth: 92,
        cell: (row) => (
          <Badge variant={reviewStatusVariant(row.reviewStatus)}>{row.reviewLabel}</Badge>
        ),
      },
      {
        id: "publicState",
        header: "公开状态",
        minWidth: 88,
        cell: (row) => (
          <Badge variant={publicStateVariant(row.publicState)}>{row.publicStateLabel}</Badge>
        ),
      },
      {
        id: "createdAt",
        header: "创建时间",
        minWidth: 120,
        className: "text-muted-foreground tabular-nums",
        cell: (row) => row.createdAt,
      },
      {
        id: "actions",
        header: "操作",
        minWidth: 88,
        className: "text-center",
        cell: (row) => (
          <Button size="sm" variant="outline" onPress={() => onReview(row)}>
            审核
          </Button>
        ),
      },
    ],
    [onReview],
  );
}

function ModerationMobileList({
  items,
  isLoading,
  emptyState,
  onReview,
}: {
  items: ModerationRow[];
  isLoading: boolean;
  emptyState: DataTableEmptyState;
  onReview: (row: ModerationRow) => void;
}) {
  if (isLoading)
    return <div className="px-4 py-10 text-center text-sm text-muted-foreground">加载中…</div>;
  if (items.length === 0) {
    return (
      <div className="flex min-h-56 flex-col items-center justify-center gap-2 px-4 py-10 text-center">
        <SvgIcon
          name={typeof emptyState.icon === "string" ? emptyState.icon : "shield"}
          size={28}
        />
        <p className="text-sm font-medium text-foreground">{emptyState.title}</p>
        {emptyState.description ? (
          <p className="text-sm text-muted-foreground">{emptyState.description}</p>
        ) : null}
      </div>
    );
  }
  return (
    <div className="grid min-w-0 gap-2 p-3">
      {items.map((row) => (
        <article key={row.itemId} className="rounded-md border border-border/70 bg-background p-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant={riskLevelVariant(row.riskLevel)}>{row.riskLabel}</Badge>
            <Badge variant={reviewStatusVariant(row.reviewStatus)}>{row.reviewLabel}</Badge>
            <Badge variant={publicStateVariant(row.publicState)}>{row.publicStateLabel}</Badge>
            <span className="text-sm font-medium">
              {row.contentTypeLabel} · #{row.authorId}
            </span>
          </div>
          <p className="mt-2 line-clamp-3 text-sm leading-6">{row.summary}</p>
          <div className="mt-3 flex items-center justify-between gap-3">
            <span className="text-xs text-muted-foreground">
              {row.policyLabel} · {row.createdAt}
            </span>
            <Button size="sm" variant="outline" onPress={() => onReview(row)}>
              审核
            </Button>
          </div>
        </article>
      ))}
    </div>
  );
}
