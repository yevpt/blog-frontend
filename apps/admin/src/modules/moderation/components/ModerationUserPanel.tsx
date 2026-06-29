import { useEffect, useState } from "react";
import { Button, Card, CardContent, Input, Select, cn } from "@repo/ui";
import type { AdminModerationProfileResp, ModerationTrustLevel } from "@repo/api";
import type { BatchState, HideBatchReq } from "../hooks/use-moderation-user";
import { ModerationUserBatchPanel } from "./ModerationUserBatchPanel";
import { ModerationUserSummary } from "./ModerationUserSummary";

interface ModerationUserPanelProps {
  profile: AdminModerationProfileResp | null;
  batch: BatchState | null;
  isLoading: boolean;
  isSaving: boolean;
  error: Error | null;
  onLoadProfile: (userId: number) => Promise<void>;
  onUpdateProfile: (req: {
    trust_level: ModerationTrustLevel;
    manual_locked: boolean;
    restricted_until?: string | null;
  }) => Promise<void>;
  onMute: (req: { reason: string; until?: string | null }) => Promise<void>;
  onBan: (req: { reason: string; until?: string | null }) => Promise<void>;
  onRelease: () => Promise<void>;
  onHideBatch: (req: HideBatchReq) => Promise<void>;
  onRestoreBatch: (req: HideBatchReq) => Promise<void>;
  onResetProfile: () => void;
}

export function ModerationUserPanel({
  profile,
  batch,
  isLoading,
  isSaving,
  error,
  onLoadProfile,
  onUpdateProfile,
  onMute,
  onBan,
  onRelease,
  onHideBatch,
  onRestoreBatch,
  onResetProfile,
}: ModerationUserPanelProps) {
  const [userIdInput, setUserIdInput] = useState("");
  const [trustLevel, setTrustLevel] = useState<ModerationTrustLevel>("normal");
  const [manualLocked, setManualLocked] = useState(false);
  const [restrictedUntil, setRestrictedUntil] = useState("");
  const [sanctionReason, setSanctionReason] = useState("");
  const [sanctionUntil, setSanctionUntil] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  function syncFromProfile(next: AdminModerationProfileResp) {
    setTrustLevel(next.trust_level);
    setManualLocked(next.manual_trust_locked);
    setRestrictedUntil(next.restricted_until ?? "");
    setSanctionReason("");
    setSanctionUntil("");
    setValidationError(null);
  }

  // 每次服务端画像刷新后同步本地表单，避免处罚/信任变更后继续显示旧值。
  useEffect(() => {
    if (profile) syncFromProfile(profile);
  }, [profile]);

  async function handleLoad() {
    const trimmed = userIdInput.trim();
    const id = Number(trimmed);
    if (!Number.isInteger(id) || id <= 0) {
      setValidationError("用户 ID 必须是正整数");
      return;
    }
    setValidationError(null);
    await onLoadProfile(id);
  }

  async function handleUpdateProfile() {
    if (!profile) return;
    setValidationError(null);
    await onUpdateProfile({
      trust_level: trustLevel,
      manual_locked: manualLocked,
      restricted_until: restrictedUntil.trim() ? restrictedUntil.trim() : null,
    });
  }

  async function handleMute() {
    if (!profile) return;
    if (!sanctionReason.trim()) {
      setValidationError("禁言必须填写理由");
      return;
    }
    setValidationError(null);
    await onMute({
      reason: sanctionReason.trim(),
      until: sanctionUntil.trim() ? sanctionUntil.trim() : undefined,
    });
  }

  async function handleBan() {
    if (!profile) return;
    if (!sanctionReason.trim()) {
      setValidationError("封禁必须填写理由");
      return;
    }
    setValidationError(null);
    await onBan({
      reason: sanctionReason.trim(),
      until: sanctionUntil.trim() ? sanctionUntil.trim() : undefined,
    });
  }

  return (
    <Card className="w-full">
      <CardContent className="grid gap-5 px-4 py-5">
        <div className="grid gap-1">
          <h3 className="text-base font-semibold text-foreground">用户治理</h3>
          <p className="text-sm text-muted-foreground">
            输入用户 ID 查询审核画像，调整信任等级或施加处罚；按游标分批隐藏/恢复该用户公开内容。
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <Input
            label="用户 ID"
            size="sm"
            placeholder="例如 42"
            value={userIdInput}
            onChange={setUserIdInput}
            isDisabled={isLoading}
            className="w-full sm:max-w-[12rem]"
            inputClassName="h-8"
          />
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onPress={() => void handleLoad()}
              isLoading={isLoading}
              loadingText="查询中…"
            >
              查询画像
            </Button>
            {profile ? (
              <Button size="sm" variant="ghost" onPress={onResetProfile}>
                清除
              </Button>
            ) : null}
          </div>
        </div>

        {validationError ? <p className="text-sm text-destructive">{validationError}</p> : null}
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error.message}
          </p>
        ) : null}

        {!profile ? null : (
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

            <label className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={manualLocked}
                onChange={(event) => setManualLocked(event.target.checked)}
                disabled={isSaving}
              />
              手工锁定信任等级（阻止自动调整）
            </label>

            <div className="flex items-center justify-end">
              <Button
                size="sm"
                onPress={() => void handleUpdateProfile()}
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
                <label htmlFor="moderation-sanction-reason" className="text-sm text-foreground">
                  理由（禁言/封禁必填）
                </label>
                <textarea
                  id="moderation-sanction-reason"
                  aria-label="处罚理由"
                  value={sanctionReason}
                  onChange={(event) => setSanctionReason(event.target.value)}
                  placeholder="说明处罚原因…"
                  className={cn(
                    "box-border min-h-20 w-full rounded-lg border border-border bg-background px-3 py-2",
                    "text-sm leading-6 text-foreground outline-none",
                    "placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring",
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
                  onPress={() => void handleMute()}
                  isDisabled={isSaving || profile.sanction_state === "banned"}
                >
                  禁言
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onPress={() => void handleBan()}
                  isDisabled={isSaving}
                  className="text-destructive hover:bg-destructive/10"
                >
                  封禁
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onPress={() => void onRelease()}
                  isDisabled={isSaving || profile.sanction_state === "active"}
                >
                  解除处罚
                </Button>
              </div>
            </div>

            <ModerationUserBatchPanel
              batch={batch}
              isSaving={isSaving}
              onHideBatch={onHideBatch}
              onRestoreBatch={onRestoreBatch}
            />
          </>
        )}
      </CardContent>
    </Card>
  );
}
