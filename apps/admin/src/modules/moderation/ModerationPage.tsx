import { useCallback, useRef, useState } from "react";
import { Tabs, TabsItem, TabsList, TabsPanel, TabsPanels } from "@repo/ui";
import { AdminPageHeader } from "../../components/AdminPageHeader";
import { useIsMdScreen } from "../tags/hooks/use-is-md-screen";
import { ModerationControlPanel } from "./components/ModerationControlPanel";
import { ModerationQueuePanel } from "./components/ModerationQueuePanel";
import { ModerationReviewDialog } from "./components/ModerationReviewDialog";
import { useModerationControl } from "./hooks/use-moderation-control";
import { useModerationList } from "./hooks/use-moderation-list";
import { useModerationBatchReview } from "./hooks/use-moderation-batch-review";
import { useModerationReview } from "./hooks/use-moderation-review";
import { ModerationBatchRejectDialog } from "./components/ModerationBatchRejectDialog";
import { RulesTab } from "./rules/RulesTab";

export function ModerationPage() {
  const list = useModerationList();
  const control = useModerationControl();
  const review = useModerationReview(list);
  const batchReview = useModerationBatchReview(list);
  const isMdScreen = useIsMdScreen();
  const [rulesTabVisited, setRulesTabVisited] = useState(false);
  const activeTabRef = useRef("queue");

  const refreshTabData = useCallback(
    (tab: string) => {
      switch (tab) {
        case "queue":
          void list.refetch();
          break;
        case "control":
          void control.reload();
          break;
        case "rules":
          // 规则 Tab 离开后会卸载，切回时重新挂载并自动拉取
          setRulesTabVisited(true);
          break;
      }
    },
    [control, list],
  );

  return (
    <div className="grid min-h-0 min-w-0 max-w-full gap-4 overflow-hidden md:h-[calc(100dvh-3rem)] md:grid-rows-[auto_minmax(0,1fr)] lg:h-[calc(100dvh-3.5rem)]">
      <AdminPageHeader
        title="内容审核"
        description="审核队列、全站控制与规则管理：通过/驳回/修正、紧急隐藏、站点模式与大规模词库维护。"
      />
      <Tabs
        defaultSelectedKey="queue"
        className="flex min-h-0 flex-1 flex-col"
        onSelectionChange={(key) => {
          const tab = String(key);
          if (tab !== activeTabRef.current) refreshTabData(tab);
          activeTabRef.current = tab;
        }}
      >
        <TabsList className="mb-4">
          <TabsItem id="queue">审核队列</TabsItem>
          <TabsItem id="control">全站控制</TabsItem>
          <TabsItem id="rules">规则管理</TabsItem>
        </TabsList>
        <TabsPanels className="h-full min-h-0 flex-1 overflow-hidden">
          <TabsPanel id="queue" className="min-h-0 h-full flex flex-col overflow-hidden">
            <ModerationQueuePanel
              list={list}
              desktop={isMdScreen}
              onReview={review.openReview}
              selection={{
                selectedRowIds: batchReview.selectedRowIds,
                selectableCount: batchReview.selectableCount,
                onToggleSelect: batchReview.toggleSelect,
                onToggleSelectAll: batchReview.toggleSelectAll,
              }}
              batchBar={{
                selectedCount: batchReview.selectedCount,
                isBusy: batchReview.isBusy,
                onApprove: batchReview.batchApprove,
                onReject: () => batchReview.setRejectDialogOpen(true),
                onClear: batchReview.clearSelection,
              }}
            />
          </TabsPanel>
          <TabsPanel id="control" className="h-full min-h-0 overflow-y-auto overscroll-y-contain">
            <ModerationControlPanel
              control={control.control}
              isLoading={control.isLoading}
              isSaving={control.isSaving}
              error={control.error}
              onSave={control.saveControl}
              onReload={control.reload}
            />
          </TabsPanel>
          <TabsPanel id="rules" className="min-h-0 h-full flex flex-col overflow-hidden">
            <RulesTab enabled={rulesTabVisited} />
          </TabsPanel>
        </TabsPanels>
      </Tabs>
      <ModerationReviewDialog {...review.dialogProps} />
      <ModerationBatchRejectDialog
        open={batchReview.rejectDialogOpen}
        selectedCount={batchReview.selectedCount}
        isSaving={batchReview.isBusy}
        onClose={() => batchReview.setRejectDialogOpen(false)}
        onSubmit={batchReview.batchReject}
      />
    </div>
  );
}
