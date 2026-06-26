import { useEffect, useState } from "react";
import { ApiError } from "@repo/api";
import { Button, Modal, Select, cn } from "@repo/ui";
import {
  createEmptyMomentForm,
  hasMomentFormErrors,
  mapMomentToFormValues,
  validateMomentForm,
  type MomentFormValues,
  type MomentRow,
} from "../model";

interface MomentFormDialogProps {
  mode: "create" | "edit";
  open: boolean;
  moment: MomentRow | null;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (
    values: MomentFormValues,
    mode: "create" | "edit",
    moment: MomentRow | null,
  ) => Promise<void>;
}

const contentInsetClassName = "px-4 sm:px-5";

const textareaClassName = cn(
  "box-border min-h-40 w-full rounded-lg border border-border bg-background px-3 py-2",
  "text-sm leading-6 text-foreground outline-none",
  "placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring",
);

export function MomentFormDialog({
  mode,
  open,
  moment,
  isSubmitting,
  onClose,
  onSubmit,
}: MomentFormDialogProps) {
  const [values, setValues] = useState<MomentFormValues>(createEmptyMomentForm);
  const [errors, setErrors] = useState<ReturnType<typeof validateMomentForm>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setSubmitError(null);
    setValues(mode === "edit" && moment ? mapMomentToFormValues(moment) : createEmptyMomentForm());
  }, [mode, moment, open]);

  const updateField = <K extends keyof MomentFormValues>(key: K, value: MomentFormValues[K]) => {
    setValues((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = async () => {
    const nextErrors = validateMomentForm(values);
    setErrors(nextErrors);
    if (hasMomentFormErrors(nextErrors)) return;

    setSubmitError(null);
    try {
      await onSubmit(values, mode, moment);
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : "保存失败，请稍后重试");
    }
  };

  return (
    <Modal
      isOpen={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      isDismissable={!isSubmitting}
      placement="fullscreen-mobile"
      size="lg"
      aria-label={mode === "create" ? "新建动态" : "编辑动态"}
      dialogClassName="min-h-0 min-w-0 flex-1 overflow-x-hidden"
    >
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden">
        <div
          className={cn(
            "shrink-0 border-b border-border/70",
            contentInsetClassName,
            "py-4 max-md:pt-[max(1rem,env(safe-area-inset-top))]",
          )}
        >
          <h2 className="text-lg font-semibold text-foreground">
            {mode === "create" ? "新建动态" : "编辑动态"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            编辑正文、公开状态和评论开关；已有图片会保持原顺序。
          </p>
        </div>

        <div className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-y-contain">
          <div className={cn(contentInsetClassName, "grid gap-5 py-5")}>
            <div className="grid min-w-0 gap-2">
              <p className="text-sm font-medium text-foreground">动态内容</p>
              <textarea
                aria-label="动态内容"
                value={values.content}
                onChange={(event) => updateField("content", event.target.value)}
                placeholder="写点新的动态…"
                className={textareaClassName}
              />
              {errors.content ? <p className="text-sm text-destructive">{errors.content}</p> : null}
            </div>

            <div className="grid min-w-0 gap-4 md:grid-cols-2">
              <Select
                label="公开状态"
                selectedKey={values.status}
                onSelectionChange={(key) => updateField("status", String(key) as "0" | "1")}
              >
                <Select.Item id="1" label="公开" />
                <Select.Item id="0" label="隐藏" />
              </Select>
              <Select
                label="评论状态"
                selectedKey={values.commentStatus}
                onSelectionChange={(key) => updateField("commentStatus", String(key) as "0" | "1")}
              >
                <Select.Item id="1" label="允许评论" />
                <Select.Item id="0" label="关闭评论" />
              </Select>
            </div>

            {mode === "edit" && moment ? (
              <p className="text-sm text-muted-foreground">
                已有图片 {moment.images.length} 张，将随本次保存保留。
              </p>
            ) : null}

            {submitError ? <p className="text-sm text-destructive">{submitError}</p> : null}
          </div>
        </div>

        <div
          className={cn(
            "flex shrink-0 items-center justify-end gap-2 border-t border-border/70 bg-card",
            contentInsetClassName,
            "py-4 max-md:pb-[max(1rem,env(safe-area-inset-bottom))]",
          )}
        >
          <Button variant="outline" onPress={onClose} isDisabled={isSubmitting}>
            取消
          </Button>
          <Button
            onPress={() => {
              void handleSubmit();
            }}
            isLoading={isSubmitting}
            loadingText="保存中…"
          >
            {mode === "create" ? "创建" : "保存"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
