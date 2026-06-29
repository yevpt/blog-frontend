import { Button, cn } from "@repo/ui";

export type ReviewMode = "approve" | "reject" | "correct" | "hide" | "restore";

interface ModerationReviewActionsProps {
  mode: ReviewMode;
  reason: string;
  correctContent: string;
  validationError: string | null;
  submitError: string | null;
  canReview: boolean;
  canHide: boolean;
  canRestore: boolean;
  isSaving: boolean;
  onModeChange: (mode: ReviewMode) => void;
  onReasonChange: (value: string) => void;
  onCorrectContentChange: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
}

const textareaClass = cn(
  "box-border min-h-32 w-full rounded-lg border border-border bg-background px-3 py-2",
  "text-sm leading-6 text-foreground outline-none",
  "placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring",
);

export function ModerationReviewActions(props: ModerationReviewActionsProps) {
  const modes: Array<{ id: ReviewMode; label: string }> = [
    ...(props.canReview
      ? [
          { id: "approve" as const, label: "通过" },
          { id: "reject" as const, label: "驳回" },
          { id: "correct" as const, label: "修正" },
        ]
      : []),
    ...(props.canHide ? [{ id: "hide" as const, label: "紧急隐藏" }] : []),
    ...(props.canRestore ? [{ id: "restore" as const, label: "恢复" }] : []),
  ];
  const activeMode = modes.some((item) => item.id === props.mode) ? props.mode : null;

  return (
    <div className="shrink-0 border-t border-border/70 bg-card px-4 py-4 sm:px-5 max-md:pb-[max(1rem,env(safe-area-inset-bottom))]">
      {modes.length > 0 ? (
        <div className="grid gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">选择操作</span>
          <div className="flex flex-wrap items-center gap-1.5" role="tablist" aria-label="审核操作">
            {modes.map((item) => (
              <Button
                key={item.id}
                size="sm"
                variant={activeMode === item.id ? "default" : "outline"}
                aria-pressed={activeMode === item.id}
                isDisabled={props.isSaving}
                onPress={() => props.onModeChange(item.id)}
              >
                {item.label}
              </Button>
            ))}
          </div>
        </div>
      ) : null}

      {activeMode ? (
        <div className="mt-3 grid gap-3">
          {activeMode === "correct" ? (
            <TextAreaField
              id="moderation-correct-content"
              label="修正正文"
              value={props.correctContent}
              placeholder="覆盖后的公开正文…"
              onChange={props.onCorrectContentChange}
            />
          ) : null}
          {activeMode === "approve" ? (
            <p className="text-xs text-muted-foreground">通过可不填理由；将发布该版本。</p>
          ) : null}
          {activeMode !== "restore" ? (
            <TextAreaField
              id="moderation-reason"
              label={reasonLabel(activeMode)}
              value={props.reason}
              placeholder={reasonPlaceholder(activeMode)}
              onChange={props.onReasonChange}
            />
          ) : (
            <p className="text-xs text-muted-foreground">
              恢复将解除紧急隐藏，使内容重新对外公开。
            </p>
          )}
          {props.validationError ? (
            <p className="text-sm text-destructive">{props.validationError}</p>
          ) : null}
          {props.submitError ? (
            <p className="text-sm text-destructive" role="alert">
              {props.submitError}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="mt-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-end">
        <Button
          variant="outline"
          onPress={props.onClose}
          isDisabled={props.isSaving}
          className="hidden md:inline-flex"
        >
          关闭
        </Button>
        {activeMode ? (
          <Button
            onPress={props.onSubmit}
            isLoading={props.isSaving}
            loadingText="提交中…"
            className="w-full md:w-auto"
          >
            {actionLabel(activeMode)}
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function TextAreaField({
  id,
  label,
  value,
  placeholder,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="grid min-w-0 gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
      </label>
      <textarea
        id={id}
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={textareaClass}
      />
    </div>
  );
}

function reasonLabel(mode: ReviewMode): string {
  if (mode === "approve") return "通过理由（可选）";
  if (mode === "reject") return "驳回理由";
  if (mode === "correct") return "修正理由";
  if (mode === "hide") return "隐藏原因";
  return "恢复理由";
}

function reasonPlaceholder(mode: ReviewMode): string {
  if (mode === "approve") return "可选，留空直接通过…";
  if (mode === "reject") return "说明驳回原因…";
  if (mode === "correct") return "说明为什么要修正…";
  if (mode === "hide") return "说明紧急隐藏原因…";
  return "可选…";
}

function actionLabel(mode: ReviewMode): string {
  if (mode === "approve") return "确认通过";
  if (mode === "reject") return "确认驳回";
  if (mode === "correct") return "保存修正";
  if (mode === "hide") return "执行隐藏";
  return "确认恢复";
}
