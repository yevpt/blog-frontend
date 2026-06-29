import { useEffect, useState } from "react";
import { Badge, Button, Card, CardContent, Select, cn } from "@repo/ui";
import { SvgIcon } from "@repo/icons";
import type {
  AdminModerationControlResp,
  ModerationPublishingMode,
  ModerationRegistrationMode,
} from "@repo/api";
import type { ControlDraft } from "../hooks/use-moderation-control";

interface ModerationControlPanelProps {
  control: AdminModerationControlResp | null;
  isLoading: boolean;
  isSaving: boolean;
  error: Error | null;
  onSave: (draft: ControlDraft) => Promise<void>;
  onReload: () => Promise<void>;
}

const REGISTRATION_IMPACT: Record<ModerationRegistrationMode, string> = {
  open: "允许新用户注册。",
  closed: "关闭注册，新用户无法创建账号。",
};

const PUBLISHING_IMPACT: Record<ModerationPublishingMode, string> = {
  open: "按策略自动放行或转入审核队列。",
  pre_review_all: "所有新发布内容必须先审后发。",
  closed: "暂停全站新内容发布。",
};

const DANGEROUS_MODES: Array<string> = ["closed", "pre_review_all"];

function isDangerous(draft: ControlDraft): boolean {
  return (
    DANGEROUS_MODES.includes(draft.publishing_mode) ||
    DANGEROUS_MODES.includes(draft.registration_mode)
  );
}

export function ModerationControlPanel({
  control,
  isLoading,
  isSaving,
  error,
  onSave,
  onReload,
}: ModerationControlPanelProps) {
  const [draft, setDraft] = useState<ControlDraft | null>(null);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!control) {
      setDraft(null);
      return;
    }
    setDraft({
      registration_mode: control.registration_mode,
      publishing_mode: control.publishing_mode,
      reason: control.reason ?? "",
    });
  }, [control]);

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardContent className="px-4 py-6 text-sm text-muted-foreground">
          加载全站控制状态…
        </CardContent>
      </Card>
    );
  }

  if (error && !control) {
    return (
      <Card className="w-full">
        <CardContent className="px-4 py-6">
          <p role="alert" className="text-sm text-destructive">
            {error.message}
          </p>
          <Button size="sm" variant="outline" className="mt-3" onPress={() => void onReload()}>
            <SvgIcon name="refresh-cw" size={14} />
            重新加载
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!control || !draft) return null;

  const dirty =
    draft.registration_mode !== control.registration_mode ||
    draft.publishing_mode !== control.publishing_mode ||
    (draft.reason ?? "") !== (control.reason ?? "");

  async function handleSave() {
    if (!dirty || !draft) return;
    if (isDangerous(draft) && !confirming) {
      setConfirming(true);
      return;
    }
    setConfirming(false);
    await onSave(draft);
  }

  return (
    <Card className="w-full">
      <CardContent className="grid gap-5 px-4 py-5">
        <div className="grid gap-1">
          <h3 className="text-base font-semibold text-foreground">全站注册与发布控制</h3>
          <p className="text-sm text-muted-foreground">
            最近变更 {control.changed_at} · lock_version {control.lock_version}
            {control.operator_id ? ` · 操作员 #${control.operator_id}` : ""}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={control.registration_mode === "open" ? "success" : "warning"}>
            注册：{control.registration_mode === "open" ? "开放" : "关闭"}
          </Badge>
          <Badge
            variant={
              control.publishing_mode === "open"
                ? "success"
                : control.publishing_mode === "pre_review_all"
                  ? "warning"
                  : "error"
            }
          >
            发布：{publishingLabel(control.publishing_mode)}
          </Badge>
          {control.reason ? (
            <span className="text-sm text-muted-foreground">原因：{control.reason}</span>
          ) : null}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Select
            label="注册模式"
            selectedKey={draft.registration_mode}
            onSelectionChange={(key) =>
              setDraft((current) =>
                current
                  ? { ...current, registration_mode: String(key) as ModerationRegistrationMode }
                  : current,
              )
            }
          >
            <Select.Item id="open" label="开放注册" />
            <Select.Item id="closed" label="关闭注册" />
          </Select>
          <Select
            label="发布模式"
            selectedKey={draft.publishing_mode}
            onSelectionChange={(key) =>
              setDraft((current) =>
                current
                  ? { ...current, publishing_mode: String(key) as ModerationPublishingMode }
                  : current,
              )
            }
          >
            <Select.Item id="open" label="开放发布" />
            <Select.Item id="pre_review_all" label="全部先审后发" />
            <Select.Item id="closed" label="暂停发布" />
          </Select>
        </div>

        <div className="grid min-w-0 gap-1.5">
          <label
            htmlFor="moderation-control-reason"
            className="text-sm font-medium text-foreground"
          >
            变更原因
          </label>
          <textarea
            id="moderation-control-reason"
            aria-label="变更原因"
            value={draft.reason}
            onChange={(event) =>
              setDraft((current) =>
                current ? { ...current, reason: event.target.value } : current,
              )
            }
            placeholder="记录本次调整的背景，便于追溯…"
            className={cn(
              "box-border min-h-24 w-full rounded-lg border border-border bg-background px-3 py-2",
              "text-sm leading-6 text-foreground outline-none",
              "placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring",
            )}
          />
        </div>

        <p className="text-xs text-muted-foreground">
          注册：{REGISTRATION_IMPACT[draft.registration_mode]} 发布：
          {PUBLISHING_IMPACT[draft.publishing_mode]}
        </p>

        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error.message}
          </p>
        ) : null}

        {confirming ? (
          <div
            className={cn(
              "rounded-lg border border-warning/40 bg-warning/10 px-3 py-3 text-sm text-foreground",
            )}
            role="alert"
          >
            <p className="font-medium">请确认高危操作</p>
            <p className="mt-1 text-muted-foreground">
              当前选择会显著影响站点可用性，再次点击「确认保存」才会提交。
            </p>
            <div className="mt-3 flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onPress={() => setConfirming(false)}
                isDisabled={isSaving}
              >
                取消
              </Button>
              <Button
                size="sm"
                onPress={() => void handleSave()}
                isLoading={isSaving}
                loadingText="保存中…"
              >
                确认保存
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-end gap-2">
            <Button
              size="sm"
              variant="outline"
              onPress={() => void onReload()}
              isDisabled={isSaving}
            >
              <SvgIcon name="refresh-cw" size={14} />
              重新加载
            </Button>
            <Button
              size="sm"
              onPress={() => void handleSave()}
              isDisabled={!dirty || isSaving}
              isLoading={isSaving}
              loadingText="保存中…"
            >
              保存
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function publishingLabel(mode: ModerationPublishingMode): string {
  switch (mode) {
    case "open":
      return "开放";
    case "pre_review_all":
      return "全部先审后发";
    case "closed":
      return "已暂停";
  }
}
