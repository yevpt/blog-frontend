import { Tabs, TabsItem, TabsList, TabsPanel, TabsPanels } from "@repo/ui";
import { AdminPageHeader } from "../../components/AdminPageHeader";
import { useIsMdScreen } from "../tags/hooks/use-is-md-screen";
import { ModerationControlPanel } from "./components/ModerationControlPanel";
import { ModerationQueuePanel } from "./components/ModerationQueuePanel";
import { ModerationReviewDialog } from "./components/ModerationReviewDialog";
import { ModerationUserPanel } from "./components/ModerationUserPanel";
import { useModerationControl } from "./hooks/use-moderation-control";
import { useModerationList } from "./hooks/use-moderation-list";
import { useModerationReview } from "./hooks/use-moderation-review";
import { useModerationUser } from "./hooks/use-moderation-user";

export function ModerationPage() {
  const list = useModerationList();
  const control = useModerationControl();
  const user = useModerationUser();
  const review = useModerationReview(list);
  const isMdScreen = useIsMdScreen();

  return (
    <div className="grid min-h-0 min-w-0 max-w-full gap-4 overflow-hidden md:max-h-[calc(100dvh-3rem)] md:grid-rows-[auto_minmax(0,1fr)] lg:max-h-[calc(100dvh-3.5rem)]">
      <AdminPageHeader
        title="内容审核"
        description="审核队列、全站控制与用户治理：通过、驳回、修正提交，紧急隐藏/恢复，调整站点注册与发布模式。"
      />
      <Tabs defaultSelectedKey="queue" className="min-h-0 flex-1">
        <TabsList>
          <TabsItem id="queue">审核队列</TabsItem>
          <TabsItem id="control">全站控制</TabsItem>
          <TabsItem id="user">用户治理</TabsItem>
        </TabsList>
        <TabsPanels className="min-h-0 flex-1 overflow-hidden">
          <TabsPanel id="queue" className="min-h-0 overflow-hidden">
            <ModerationQueuePanel list={list} desktop={isMdScreen} onReview={review.openReview} />
          </TabsPanel>
          <TabsPanel id="control" className="min-h-0 overflow-y-auto overscroll-y-contain">
            <ModerationControlPanel
              control={control.control}
              isLoading={control.isLoading}
              isSaving={control.isSaving}
              error={control.error}
              onSave={control.saveControl}
              onReload={control.reload}
            />
          </TabsPanel>
          <TabsPanel id="user" className="min-h-0 overflow-y-auto overscroll-y-contain">
            <ModerationUserPanel
              profile={user.profile}
              batch={user.batch}
              isLoading={user.isLoading}
              isSaving={user.isSaving}
              error={user.error}
              onLoadProfile={user.loadProfile}
              onUpdateProfile={user.updateProfile}
              onMute={user.muteUser}
              onBan={user.banUser}
              onRelease={user.releaseUser}
              onHideBatch={user.hideContentBatch}
              onRestoreBatch={user.restoreContentBatch}
              onResetProfile={user.resetProfile}
            />
          </TabsPanel>
        </TabsPanels>
      </Tabs>
      <ModerationReviewDialog {...review.dialogProps} />
    </div>
  );
}
