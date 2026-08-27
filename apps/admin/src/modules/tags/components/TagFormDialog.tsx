import { useEffect, useState } from "react";
import { ApiError } from "@repo/api";
import { SvgIcon } from "@repo/icons";
import { Modal, Button, ButtonUtility, Input, Badge, cn } from "@repo/ui";
import {
  AdminDialogBody,
  AdminDialogFooter,
  AdminDialogFrame,
  AdminDialogHeader,
} from "../../../components/AdminDialog";
import { TagPresentationPlaceholder } from "./TagPresentationPlaceholder";
import {
  createEmptyTagForm,
  hasTagFormErrors,
  mapRowToTagItem,
  mapTagToFormValues,
  validateTagForm,
  type TagFormValues,
  type TagRow,
} from "../model";

interface TagFormDialogProps {
  mode: "create" | "edit";
  open: boolean;
  tag: TagRow | null;
  nextSeq: number;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (values: TagFormValues, mode: "create" | "edit", tagId?: string) => Promise<void>;
}

const wipBadgeClassName =
  "h-5 shrink-0 border-amber-500/30 bg-amber-500/10 px-1.5 text-[10px] text-amber-700 dark:text-amber-300";

export function TagFormDialog({
  mode,
  open,
  tag,
  nextSeq,
  isSubmitting,
  onClose,
  onSubmit,
}: TagFormDialogProps) {
  const [values, setValues] = useState<TagFormValues>(createEmptyTagForm(nextSeq));
  const [errors, setErrors] = useState<ReturnType<typeof validateTagForm>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showPresentationFields, setShowPresentationFields] = useState(false);

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setSubmitError(null);
    setShowPresentationFields(false);
    if (mode === "edit" && tag) {
      setValues(mapTagToFormValues(mapRowToTagItem(tag)));
      return;
    }
    setValues(createEmptyTagForm(nextSeq));
  }, [open, mode, tag, nextSeq]);

  const updateField = <K extends keyof TagFormValues>(key: K, value: TagFormValues[K]) => {
    setValues((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = async () => {
    const nextErrors = validateTagForm(values);
    setErrors(nextErrors);
    if (hasTagFormErrors(nextErrors)) return;

    setSubmitError(null);
    try {
      await onSubmit(values, mode, tag?.id);
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
      aria-label={mode === "create" ? "新建标签" : "编辑标签"}
      dialogClassName="min-h-0 min-w-0 flex-1 overflow-x-hidden"
    >
      <AdminDialogFrame>
        <AdminDialogHeader
          eyebrow="内容组织"
          title={mode === "create" ? "新建标签" : "编辑标签"}
          description="标签用于文章检索与前台标签云，排序值越小越靠前。"
          className="max-md:pt-[max(1rem,env(safe-area-inset-top))]"
          action={
            <ButtonUtility
              tooltip="关闭标签表单"
              color="tertiary"
              icon={<SvgIcon name="close" />}
              isDisabled={isSubmitting}
              onClick={onClose}
            />
          }
        />

        <AdminDialogBody contentClassName="grid min-w-0 gap-5">
          <div className="grid min-w-0 gap-4 md:grid-cols-2">
            <Input
              label="标签名称"
              value={values.name}
              onChange={(value) => updateField("name", value)}
              isRequired
              isInvalid={Boolean(errors.name)}
              hint={errors.name}
              placeholder="例如：Go"
              className="min-w-0"
            />
            <Input
              label="URL 别名"
              value={values.url}
              onChange={(value) => updateField("url", value)}
              hint="可选，用于前台路由"
              placeholder="go"
              className="min-w-0"
            />
          </div>

          <Input
            label="排序"
            value={values.seq}
            onChange={(value) => updateField("seq", value)}
            isRequired
            isInvalid={Boolean(errors.seq)}
            hint={errors.seq ?? "越小越靠前，0 是有效值"}
            inputMode="numeric"
            className="min-w-0"
          />

          <section className="min-w-0 overflow-hidden rounded-xl border border-border/80 bg-muted/10">
            <Button
              type="button"
              variant="ghost"
              className="h-auto w-full justify-between rounded-none px-3 py-3 text-left shadow-none"
              aria-expanded={showPresentationFields}
              onPress={() => setShowPresentationFields((current) => !current)}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-foreground">展示设置</p>
                  <Badge variant="outline" className={wipBadgeClassName}>
                    开发中
                  </Badge>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">图标、封面与描述尚未开放配置</p>
              </div>
              <SvgIcon
                name="chevron-down"
                size={16}
                className={cn(
                  "shrink-0 text-muted-foreground transition-transform",
                  showPresentationFields && "rotate-180",
                )}
              />
            </Button>

            {showPresentationFields ? (
              <TagPresentationPlaceholder
                iconUrl={values.icon || tag?.icon}
                coverUrl={values.coverImgUrl || tag?.coverImgUrl}
                description={values.description || tag?.description}
              />
            ) : null}
          </section>

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
