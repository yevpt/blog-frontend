import {
  Badge,
  Button,
  Modal,
  Tabs,
  TabsItem,
  TabsList,
  TabsPanel,
  TabsPanels,
} from "@repo/ui";
import { useUserDetail } from "../hooks/use-user-detail";
import { SingleUserAvatarTool } from "./AvatarNormalizeTool";
import { UserModerationPanel } from "./UserModerationPanel";
import { UserOperationLogList } from "./UserOperationLogList";

interface UserDetailModalProps {
  userId: number | null;
  onClose: () => void;
  onChanged?: () => void;
}

export function UserDetailModal({ userId, onClose, onChanged }: UserDetailModalProps) {
  const {
    detail,
    isLoading,
    error,
    isMutating,
    grantVip,
    revokeVip,
    disableAccount,
    enableAccount,
  } = useUserDetail(userId);

  async function withRefresh(action: () => Promise<void>) {
    await action();
    onChanged?.();
  }

  return (
    <Modal
      isOpen={userId !== null}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose();
      }}
      isDismissable={!isMutating}
      placement="fullscreen-mobile"
      size="lg"
      aria-label="用户详情"
      dialogClassName="min-h-0 min-w-0 flex-1 overflow-x-hidden"
    >
      <div className="flex min-h-[420px] min-w-0 flex-1 flex-col gap-4 overflow-hidden p-4">
        <h2 className="shrink-0 text-lg font-semibold text-foreground">
          用户详情 {detail ? `#${detail.id} · ${detail.nickname ?? detail.username}` : ""}
        </h2>

        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error.message}
          </p>
        ) : null}
        {isLoading || !detail ? (
          <p className="text-sm text-muted-foreground">加载中…</p>
        ) : (
          <Tabs defaultSelectedKey="profile" className="flex min-h-0 flex-1 flex-col">
            <TabsList aria-label="用户详情页签" className="mb-3 shrink-0">
              <TabsItem id="profile">基本信息</TabsItem>
              <TabsItem id="role">角色与账号</TabsItem>
              <TabsItem id="moderation">内容治理</TabsItem>
              <TabsItem id="avatar">头像</TabsItem>
              <TabsItem id="logs">操作日志</TabsItem>
            </TabsList>
            <TabsPanels className="min-h-0 flex-1 overflow-y-auto">
              <TabsPanel id="profile" className="grid gap-2 text-sm">
                <p>用户名：{detail.username}</p>
                <p>
                  邮箱：{detail.email ?? "-"}（{detail.email_verified ? "已验证" : "未验证"}）
                </p>
                <p>手机号：{detail.phone ?? "-"}</p>
                <p>注册时间：{formatDateTime(detail.register_at)}</p>
                <p>最近登录：{formatDateTime(detail.last_login_at)}</p>
                <p>最近活跃：{formatDateTime(detail.last_active_at)}</p>
              </TabsPanel>
              <TabsPanel id="role" className="grid gap-4 text-sm">
                <div className="flex flex-wrap gap-1.5">
                  {detail.roles.includes("ROLE_ADMIN") ? (
                    <Badge variant="brand">管理员</Badge>
                  ) : null}
                  {detail.roles.includes("ROLE_VIP") ? <Badge variant="success">VIP</Badge> : null}
                  <Badge variant={detail.status === 1 ? "secondary" : "error"}>
                    {detail.status === 1 ? "账号正常" : "已禁用"}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant={detail.roles.includes("ROLE_VIP") ? "outline" : "default"}
                    isLoading={isMutating}
                    onPress={() =>
                      void withRefresh(
                        detail.roles.includes("ROLE_VIP") ? revokeVip : grantVip,
                      ).catch(() => undefined)
                    }
                  >
                    {detail.roles.includes("ROLE_VIP") ? "取消 VIP" : "授予 VIP"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className={detail.status === 1 ? "text-destructive hover:bg-destructive/10" : ""}
                    isLoading={isMutating}
                    onPress={() =>
                      void withRefresh(
                        detail.status === 1 ? disableAccount : enableAccount,
                      ).catch(() => undefined)
                    }
                  >
                    {detail.status === 1 ? "禁用账号" : "启用账号"}
                  </Button>
                </div>
              </TabsPanel>
              <TabsPanel id="moderation" className="overflow-y-auto">
                <UserModerationPanel userId={detail.id} />
              </TabsPanel>
              <TabsPanel id="avatar" className="overflow-y-auto">
                <SingleUserAvatarTool userId={detail.id} />
              </TabsPanel>
              <TabsPanel id="logs" className="overflow-y-auto">
                <UserOperationLogList userId={detail.id} />
              </TabsPanel>
            </TabsPanels>
          </Tabs>
        )}
      </div>
    </Modal>
  );
}

function formatDateTime(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString("zh-CN");
}
