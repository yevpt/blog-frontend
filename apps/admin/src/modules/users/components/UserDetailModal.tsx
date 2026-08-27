import { SvgIcon } from "@repo/icons";
import {
  Avatar,
  Badge,
  Button,
  ButtonUtility,
  Modal,
  Tabs,
  TabsItem,
  TabsList,
  TabsPanel,
  TabsPanels,
} from "@repo/ui";
import {
  AdminDialogBody,
  AdminDialogFrame,
  AdminDialogHeader,
} from "../../../components/AdminDialog";
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
      size="xl"
      aria-label="用户详情"
      dialogClassName="min-h-0 min-w-0 flex-1 overflow-x-hidden"
    >
      <AdminDialogFrame className="min-h-[420px]">
        <AdminDialogHeader
          eyebrow={detail ? `用户档案 · #${detail.id}` : "用户档案"}
          title={
            <span className="flex min-w-0 items-center gap-3">
              {detail ? (
                <Avatar
                  size="lg"
                  src={detail.avatar_url}
                  alt={`${detail.nickname ?? detail.username} 的头像`}
                  initials={getInitials(detail.nickname ?? detail.username)}
                  status={detail.is_online ? "online" : "offline"}
                  border
                />
              ) : (
                <span className="size-12 shrink-0 animate-pulse rounded-full bg-muted" />
              )}
              <span className="min-w-0 truncate">
                {detail ? (detail.nickname ?? detail.username) : "用户详情"}
              </span>
            </span>
          }
          description={detail ? `@${detail.username}` : "正在读取用户资料与账号状态。"}
          className="max-md:pt-[max(1rem,env(safe-area-inset-top))]"
          action={
            <ButtonUtility
              tooltip="关闭用户详情"
              color="tertiary"
              icon={<SvgIcon name="close" />}
              isDisabled={isMutating}
              onClick={onClose}
            />
          }
        />

        <AdminDialogBody
          scrollable={false}
          contentClassName="flex min-h-0 h-full flex-col py-4 sm:py-5"
        >
          {error ? (
            <p role="alert" className="mb-3 text-sm text-destructive">
              {error.message}
            </p>
          ) : null}
          {isLoading || !detail ? (
            <p className="text-sm text-muted-foreground">加载中…</p>
          ) : (
            <Tabs defaultSelectedKey="profile" className="flex min-h-0 flex-1 flex-col">
              <TabsList
                variant="underline"
                aria-label="用户详情页签"
                className="shrink-0 gap-5 border-border/70 px-1"
              >
                <TabsItem id="profile" variant="underline">
                  基本信息
                </TabsItem>
                <TabsItem id="role" variant="underline">
                  角色与账号
                </TabsItem>
                <TabsItem id="moderation" variant="underline">
                  内容治理
                </TabsItem>
                <TabsItem id="avatar" variant="underline">
                  头像
                </TabsItem>
                <TabsItem id="logs" variant="underline">
                  操作日志
                </TabsItem>
              </TabsList>
              <TabsPanels className="min-h-0 flex-1 overflow-y-auto pt-5">
                <TabsPanel id="profile">
                  <dl className="grid overflow-hidden rounded-xl border border-border/70 bg-border/70 sm:grid-cols-2 sm:gap-px">
                    <DetailField label="用户名" value={detail.username} />
                    <DetailField
                      label="邮箱"
                      value={detail.email ?? "-"}
                      hint={detail.email_verified ? "已验证" : "未验证"}
                    />
                    <DetailField label="手机号" value={detail.phone ?? "-"} />
                    <DetailField label="注册时间" value={formatDateTime(detail.register_at)} />
                    <DetailField label="最近登录" value={formatDateTime(detail.last_login_at)} />
                    <DetailField label="最近活跃" value={formatDateTime(detail.last_active_at)} />
                  </dl>
                </TabsPanel>
                <TabsPanel id="role" className="grid gap-4 text-sm">
                  <section className="rounded-xl border border-border/70 bg-muted/10 p-4">
                    <h3 className="text-sm font-semibold text-foreground">当前权限与状态</h3>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      角色决定后台能力，账号状态决定用户能否继续登录。
                    </p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {detail.roles.includes("ROLE_ADMIN") ? (
                        <Badge variant="brand">管理员</Badge>
                      ) : null}
                      {detail.roles.includes("ROLE_VIP") ? (
                        <Badge variant="success">VIP</Badge>
                      ) : null}
                      <Badge variant={detail.status === 1 ? "secondary" : "error"}>
                        {detail.status === 1 ? "账号正常" : "已禁用"}
                      </Badge>
                    </div>
                  </section>
                  <section className="rounded-xl border border-border/70 p-4">
                    <h3 className="text-sm font-semibold text-foreground">账号操作</h3>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      权限与账号状态的变更会立即生效。
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
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
                        className={
                          detail.status === 1 ? "text-destructive hover:bg-destructive/10" : ""
                        }
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
                  </section>
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
        </AdminDialogBody>
      </AdminDialogFrame>
    </Modal>
  );
}

function DetailField({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="min-w-0 bg-card px-4 py-3.5">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-1 flex min-w-0 items-center gap-2 text-sm text-foreground">
        <span className="min-w-0 truncate">{value}</span>
        {hint ? <Badge variant="secondary">{hint}</Badge> : null}
      </dd>
    </div>
  );
}

function getInitials(value: string) {
  return value.trim().slice(0, 2).toUpperCase();
}

function formatDateTime(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString("zh-CN");
}
