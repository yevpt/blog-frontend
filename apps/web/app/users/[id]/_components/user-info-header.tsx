"use client";

import { useState, useRef, type ChangeEvent } from "react";
import type { IconName } from "@repo/icons";
import { Card, cn, Dropdown, Modal, Button } from "@repo/ui";
import { SvgIcon } from "@repo/icons";
import { useHydrated } from "@repo/hooks";
import { UserAvatar } from "@/components/common/user-avatar";
import { isAdminUser, isVipUser } from "@/lib/user-roles";
import { useAdminVipRole } from "@/hooks/use-admin-vip-role";
import { InlineFieldEditor } from "./inline-field-editor";
import { formatRelativeTime } from "@/lib/format-time";
import { addToast } from "@/lib/toast";

interface UserInfoHeaderProps {
  userId: number;
  nickname: string;
  mark: string | null;
  description: string | null;
  avatarUrl: string | null;
  lastLoginAt: string | null;
  roles: string[];
  socialLinks: Array<{ platform: string; url: string }>;
  isOwner: boolean;
  isEditMode: boolean;
  canManageVip: boolean;
  hasActiveFieldEditing?: boolean;
  onToggleEditMode: () => void;
  onSaveNickname: (value: string) => Promise<void>;
  onAvatarChange?: (file: File) => Promise<void>;
  onRolesChange: (roles: string[]) => void;
}

function DropdownIcon({ name }: { name: IconName }) {
  return function Icon({ className }: { className?: string }) {
    return <SvgIcon name={name} size={16} className={className} />;
  };
}

const vipIcon = DropdownIcon({ name: "vip" });

function getOnlineStatus(lastLoginAt: string | null): { online: boolean; label: string } {
  if (!lastLoginAt) return { online: false, label: "" };
  const loginTime = new Date(lastLoginAt);
  const diffMs = Date.now() - loginTime.getTime();
  if (diffMs < 3 * 60 * 1000) return { online: true, label: "在线" };
  return { online: false, label: `${formatRelativeTime(loginTime)}来过` };
}

export function UserInfoHeader({
  userId,
  nickname,
  mark,
  description,
  avatarUrl,
  lastLoginAt,
  roles,
  socialLinks: _socialLinks,
  isOwner,
  isEditMode,
  canManageVip,
  hasActiveFieldEditing = false,
  onToggleEditMode,
  onSaveNickname,
  onAvatarChange,
  onRolesChange,
}: UserInfoHeaderProps) {
  const hydrated = useHydrated();
  const [isEditingNickname, setIsEditingNickname] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [pendingVipAction, setPendingVipAction] = useState<"grant" | "revoke" | null>(null);
  const {
    grantVip,
    revokeVip,
    isPending: isVipActionPending,
  } = useAdminVipRole(userId, onRolesChange);
  const isAnyEditing = isEditingNickname || hasActiveFieldEditing;
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleAvatarFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !onAvatarChange) return;
    setIsUploadingAvatar(true);
    try {
      await onAvatarChange(file);
    } catch (err) {
      addToast(err instanceof Error ? err.message : "上传失败", "error");
    } finally {
      setIsUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  const { online, label: onlineLabel } = hydrated
    ? getOnlineStatus(lastLoginAt)
    : { online: false, label: "\u00A0" };
  const isVip = isVipUser(roles);
  const isAdmin = isAdminUser(roles);
  const vipMenuLabel = isVip ? "取消星标认证" : "授予星标认证";

  async function handleConfirmVipAction() {
    if (!pendingVipAction) return;
    try {
      if (pendingVipAction === "grant") {
        await grantVip();
      } else {
        await revokeVip();
      }
      setPendingVipAction(null);
    } catch {
      // 错误已在 hook 内 toast
    }
  }

  return (
    <Card className="relative rounded-2xl px-6 py-8">
      {/* 管理员查看他人时显示更多操作 */}
      {canManageVip && (
        <>
          <Dropdown.Root>
            <Dropdown.DotsButton
              variant="ghost"
              aria-label="更多操作"
              className="absolute left-4 top-4 size-8 p-0 text-muted-foreground/50 hover:bg-foreground/[0.06] hover:text-muted-foreground"
            />
            <Dropdown.Popover placement="bottom start" className="min-w-36 w-auto">
              <Dropdown.Menu
                aria-label="用户管理"
                onAction={(key) => {
                  if (key === "toggle-vip") {
                    setPendingVipAction(isVip ? "revoke" : "grant");
                  }
                }}
              >
                <Dropdown.Item id="toggle-vip" label={vipMenuLabel} icon={vipIcon} />
              </Dropdown.Menu>
            </Dropdown.Popover>
          </Dropdown.Root>

          <Modal
            isOpen={pendingVipAction !== null}
            onOpenChange={(open) => {
              if (!open) setPendingVipAction(null);
            }}
            isDismissable={!isVipActionPending}
            size="sm"
            aria-label="确认星标认证操作"
          >
            <div className="p-5">
              <p className="text-sm leading-6 text-foreground">
                {pendingVipAction === "grant"
                  ? `确定为「${nickname}」授予星标认证吗？`
                  : `确定取消「${nickname}」的星标认证吗？`}
              </p>
              <div className="mt-4 flex justify-end gap-2">
                <Button variant="outline" size="sm" slot="close" isDisabled={isVipActionPending}>
                  取消
                </Button>
                <Button
                  type="button"
                  size="sm"
                  isDisabled={isVipActionPending}
                  onPress={() => {
                    void handleConfirmVipAction();
                  }}
                >
                  确定
                </Button>
              </div>
            </div>
          </Modal>
        </>
      )}

      {/* 在线状态 — 右上角；hydration 前占位避免 #418 */}
      {(hydrated ? onlineLabel : true) && (
        <div
          className="absolute right-4 top-4 flex items-center gap-1.5 text-sm text-muted-foreground"
          suppressHydrationWarning
        >
          <span className={cn("h-2 w-2 rounded-full", online ? "bg-emerald-400" : "bg-zinc-400")} />
          {onlineLabel}
        </div>
      )}

      {/* 居中内容区 */}
      <div className="flex flex-col items-center text-center">
        {/* 头像 */}
        <div
          className={cn(
            "relative rounded-full",
            isOwner && isEditMode && "ring-[4px] ring-black/65 dark:ring-white/35",
          )}
        >
          <UserAvatar
            src={avatarUrl ?? undefined}
            name={nickname}
            size="xl"
            isVip={!isEditMode && isVip}
            className="h-20 w-20"
          />
          {isOwner && isEditMode && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={handleAvatarFileChange}
              />
              <div className="pointer-events-none absolute inset-0 rounded-full bg-[#121212]/45" />
              <button
                type="button"
                aria-label="更换头像"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingAvatar}
                className="absolute inset-0 z-10 flex cursor-pointer items-center justify-center rounded-full disabled:cursor-wait"
              >
                {isUploadingAvatar ? (
                  <span className="block h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <SvgIcon name="camera" size={30} className="text-white" />
                )}
              </button>
            </>
          )}
        </div>

        {/* 昵称行 */}
        <div className="mt-3 flex items-center justify-center gap-2">
          {isEditMode && isOwner && isEditingNickname ? (
            <div className="w-48">
              <InlineFieldEditor
                initialValue={nickname}
                onSave={async (v) => {
                  await onSaveNickname(v);
                  setIsEditingNickname(false);
                }}
                onCancel={() => setIsEditingNickname(false)}
                validate={(v) => (v.trim().length < 1 ? "昵称不能为空" : null)}
                maxLength={30}
              />
            </div>
          ) : (
            <>
              <h1 className="text-xl font-bold text-foreground">{nickname}</h1>
              {(isVip || isAdmin) && (
                <span
                  className={cn(
                    "rounded px-1.5 py-0.5 text-[10px] font-bold tracking-wider",
                    isAdmin ? "bg-rose-500/15 text-rose-400" : "bg-amber-400/12 text-amber-400",
                  )}
                >
                  {isAdmin ? "ADMIN" : "VIP"}
                </span>
              )}
              {isEditMode && isOwner && (
                <button
                  type="button"
                  onClick={() => setIsEditingNickname(true)}
                  disabled={hasActiveFieldEditing}
                  aria-label="编辑昵称"
                  className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-md transition-colors",
                    hasActiveFieldEditing
                      ? "cursor-not-allowed text-muted-foreground/20"
                      : "text-muted-foreground/40 hover:bg-primary/10 hover:text-primary",
                  )}
                >
                  <SvgIcon name="pen" size={13} />
                </button>
              )}
            </>
          )}
        </div>

        {/* 身份标签 */}
        {mark && <p className="mt-1.5 text-sm text-muted-foreground">{mark}</p>}

        {/* 个人简介 */}
        {description && (
          <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-muted-foreground/70">
            {description}
          </p>
        )}

        {/* 编辑 / 退出编辑按钮 */}
        {isOwner && (
          <button
            type="button"
            onClick={onToggleEditMode}
            disabled={isAnyEditing}
            className={cn(
              "mt-3 h-7 rounded px-3 text-xs font-medium transition-colors",
              isEditMode
                ? isAnyEditing
                  ? "cursor-not-allowed bg-destructive/40 text-white/60"
                  : "bg-destructive/90 text-white hover:bg-destructive"
                : "bg-primary text-white hover:opacity-85",
            )}
          >
            {isEditMode ? "退出编辑" : "编辑个人资料"}
          </button>
        )}
      </div>
    </Card>
  );
}
