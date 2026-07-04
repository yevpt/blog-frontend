import { useEffect, useState } from "react";
import type { AdminModerationProfileResp, ModerationTrustLevel } from "@repo/api";
import { Button, Card, CardContent, Checkbox, Input, Select, cn } from "@repo/ui";
import { useUserModeration } from "../hooks/use-user-moderation";
import { ModerationUserBatchPanel } from "./ModerationUserBatchPanel";
import { ModerationUserSummary } from "./ModerationUserSummary";

interface UserModerationPanelProps {
  userId: number;
}

export function UserModerationPanel({ userId }: UserModerationPanelProps) {
  const {
    profile,
    batch,
    isLoading,
    isSaving,
    error,
    updateProfile,
    muteUser,
    banUser,
    releaseUser,
    hideContentBatch,
    restoreContentBatch,
  } = useUserModeration(userId);
  const [trustLevel, setTrustLevel] = useState<ModerationTrustLevel>("normal");
  const [manualLocked, setManualLocked] = useState(false);
  const [restrictedUntil, setRestrictedUntil] = useState("");
  const [sanctionReason, setSanctionReason] = useState("");
  const [sanctionUntil, setSanctionUntil] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    syncFromProfile(profile, {
      setTrustLevel,
      setManualLocked,
      setRestrictedUntil,
      setSanctionReason,
      setSanctionUntil,
      setValidationError,
    });
  }, [profile]);

  async function handleUpdateProfile() {
    setValidationError(null);
    await updateProfile({
      trust_level: trustLevel,
      manual_locked: manualLocked,
      restricted_until: restrictedUntil.trim() || null,
    });
  }

  async function handleSanction(action: "mute" | "ban") {
    const reason = sanctionReason.trim();
    if (!reason) {
      setValidationError(action === "mute" ? "禁言必须填写理由" : "封禁必须填写理由");
      return;
    }
    setValidationError(null);
    const req = { reason, until: sanctionUntil.trim() || undefined };
    await (action === "mute" ? muteUser(req) : banUser(req));
  }

  return (
    <Card className="w-full shadow-none">
      <CardContent className="grid gap-5 px-4 py-5">
        <div className="grid gap-1">
          <h3 className="text-base font-semibold text-foreground">内容治理</h3>
          <p className="text-sm text-muted-foreground">
            调整审核信任等级、施加处罚，或按游标分批隐藏和恢复该用户内容。
          </p>
        </div>

        {validationError ? <p className="text-sm text-destructive">{validationError}</p> : null}
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error.message}
          </p>
        ) : null}
        {isLoading && !profile ? (
          <p className="text-sm text-muted-foreground">加载审核画像中…</p>
        ) : null}

        {profile ? (
          <>
            <ModerationUserSummary profile={profile} />
            <div className="grid gap-4 md:grid-cols-2">
              <Select
                label="信任等级"
                selectedKey={trustLevel}
                onSelectionChange={(key) => setTrustLevel(String(key) as ModerationTrustLevel)}
              >
                <Select.Item id="new" label="新人" />
                <Select.Item id="normal" label="普通" />
                <Select.Item id="trusted" label="受信" />
                <Select.Item id="restricted" label="受限" />
              </Select>
              <Input
                label="受限到期（留空表示不限制）"
                size="sm"
                placeholder="例如 2026-12-31T23:59:59Z"
                value={restrictedUntil}
                onChange={setRestrictedUntil}
                isDisabled={isSaving}
              />
            </div>

            <Checkbox
              isSelected={manualLocked}
              onChange={setManualLocked}
              isDisabled={isSaving}
              label="手工锁定信任等级（阻止自动调整）"
            />

            <div className="flex items-center justify-end">
              <Button
                size="sm"
                onPress={() => void handleUpdateProfile().catch(() => undefined)}
                isDisabled={isSaving}
                isLoading={isSaving}
                loadingText="保存中…"
              >
                保存画像
              </Button>
            </div>

            <div className="grid gap-3 rounded-lg border border-border/70 p-3">
              <p className="text-sm font-medium text-foreground">处罚操作</p>
              <div className="grid min-w-0 gap-1.5">
                <label htmlFor="user-moderation-sanction-reason" className="text-sm text-foreground">
                  理由（禁言/封禁必填）
                </label>
                <textarea
                  id="user-moderation-sanction-reason"
                  aria-label="处罚理由"
                  value={sanctionReason}
                  onChange={(event) => setSanctionReason(event.target.value)}
                  placeholder="说明处罚原因…"
                  className={cn(
                    "box-border min-h-20 w-full rounded-lg border border-border bg-background px-3 py-2",
                    "text-sm leading-6 text-foreground outline-none placeholder:text-muted-foreground",
                    "focus-visible:ring-2 focus-visible:ring-ring",
                  )}
                />
              </div>
              <Input
                label="处罚到期（留空由后端策略处理）"
                size="sm"
                placeholder="例如 2026-12-31T23:59:59Z"
                value={sanctionUntil}
                onChange={setSanctionUntil}
                isDisabled={isSaving}
              />
              <div className="flex flex-wrap items-center justify-end gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onPress={() => void handleSanction("mute").catch(() => undefined)}
                  isDisabled={isSaving || profile.sanction_state === "banned"}
                >
                  禁言
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onPress={() => void handleSanction("ban").catch(() => undefined)}
                  isDisabled={isSaving}
                  className="text-destructive hover:bg-destructive/10"
                >
                  封禁
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onPress={() => void releaseUser().catch(() => undefined)}
                  isDisabled={isSaving || profile.sanction_state === "active"}
                >
                  解除处罚
                </Button>
              </div>
            </div>

            <ModerationUserBatchPanel
              batch={batch}
              isSaving={isSaving}
              onHideBatch={hideContentBatch}
              onRestoreBatch={restoreContentBatch}
            />
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}

interface ProfileSetters {
  setTrustLevel: (value: ModerationTrustLevel) => void;
  setManualLocked: (value: boolean) => void;
  setRestrictedUntil: (value: string) => void;
  setSanctionReason: (value: string) => void;
  setSanctionUntil: (value: string) => void;
  setValidationError: (value: string | null) => void;
}

function syncFromProfile(profile: AdminModerationProfileResp, setters: ProfileSetters) {
  setters.setTrustLevel(profile.trust_level);
  setters.setManualLocked(profile.manual_trust_locked);
  setters.setRestrictedUntil(profile.restricted_until ?? "");
  setters.setSanctionReason("");
  setters.setSanctionUntil("");
  setters.setValidationError(null);
}
