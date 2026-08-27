import { useEffect, useState } from "react";
import { ApiError } from "@repo/api";
import { SvgIcon } from "@repo/icons";
import { Button, ButtonUtility, Modal, Select } from "@repo/ui";
import {
  AdminDialogBody,
  AdminDialogFooter,
  AdminDialogFrame,
  AdminDialogHeader,
  adminDialogTextareaClassName,
} from "../../../components/AdminDialog";
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
      aria-label={mode === "create" ? "新建碎语" : "编辑碎语"}
      dialogClassName="min-h-0 min-w-0 flex-1 overflow-x-hidden"
    >
      <AdminDialogFrame>
        <AdminDialogHeader
          eyebrow="即时内容"
          title={mode === "create" ? "新建碎语" : "编辑碎语"}
          description="编辑正文、公开状态和评论开关；已有图片会保持原顺序。"
          className="max-md:pt-[max(1rem,env(safe-area-inset-top))]"
          action={
            <ButtonUtility
              tooltip="关闭碎语表单"
              color="tertiary"
              icon={<SvgIcon name="close" />}
              isDisabled={isSubmitting}
              onClick={onClose}
            />
          }
        />

        <AdminDialogBody contentClassName="grid min-w-0 gap-5">
          <div className="grid min-w-0 gap-2">
            <p className="text-sm font-medium text-foreground">碎语内容</p>
            <textarea
              aria-label="碎语内容"
              value={values.content}
              onChange={(event) => updateField("content", event.target.value)}
              placeholder="写点新的碎语…"
              className={`${adminDialogTextareaClassName} min-h-40`}
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
        </AdminDialogBody>

        <AdminDialogFooter className="max-md:pb-[max(1rem,env(safe-area-inset-bottom))]">
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
        </AdminDialogFooter>
      </AdminDialogFrame>
    </Modal>
  );
}
