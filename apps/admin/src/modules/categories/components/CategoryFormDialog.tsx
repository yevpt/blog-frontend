import { useCallback, useEffect, useState } from "react";
import { ApiError } from "@repo/api";
import { SvgIcon } from "@repo/icons";
import { Modal, Button, ButtonUtility, Input, Label } from "@repo/ui";
import {
  AdminDialogBody,
  AdminDialogFooter,
  AdminDialogFrame,
  AdminDialogHeader,
  adminDialogTextareaClassName,
} from "../../../components/AdminDialog";
import { CategoryAssetFileInputs, CategoryVisualAssetsEditor } from "./CategoryVisualAssetsEditor";
import { useCategoryAssetUpload } from "../hooks/use-category-asset-upload";
import {
  createEmptyCategoryForm,
  EMPTY_CATEGORY_ASSET,
  hasCategoryFormErrors,
  mapCategoryToFormValues,
  validateCategoryForm,
  type CategoryFormValues,
  type CategoryRow,
} from "../model";

interface CategoryFormDialogProps {
  mode: "create" | "edit";
  open: boolean;
  category: CategoryRow | null;
  nextSeq: number;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (
    values: CategoryFormValues,
    mode: "create" | "edit",
    categoryId?: string,
  ) => Promise<void>;
}

export function CategoryFormDialog({
  mode,
  open,
  category,
  nextSeq,
  isSubmitting,
  onClose,
  onSubmit,
}: CategoryFormDialogProps) {
  const [values, setValues] = useState<CategoryFormValues>(createEmptyCategoryForm(nextSeq));
  const [errors, setErrors] = useState<ReturnType<typeof validateCategoryForm>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    iconInputRef,
    coverInputRef,
    isIconUploading,
    isCoverUploading,
    isUploading,
    uploadError,
    openIconPicker,
    openCoverPicker,
    handleIconFileChange,
    handleCoverFileChange,
    resetUploadState,
  } = useCategoryAssetUpload();

  const isBusy = isSubmitting || isUploading;

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setSubmitError(null);
    resetUploadState();
    if (mode === "edit" && category) {
      setValues(
        mapCategoryToFormValues({
          id: Number(category.id),
          name: category.name,
          url: category.url,
          icon: category.icon,
          description: category.description,
          cover_img_url: category.coverImgUrl,
          seq: category.seq,
          article_count: category.articleCount,
        }),
      );
      return;
    }
    setValues(createEmptyCategoryForm(nextSeq));
  }, [open, mode, category, nextSeq, resetUploadState]);

  const updateField = <K extends keyof CategoryFormValues>(
    key: K,
    value: CategoryFormValues[K],
  ) => {
    setValues((current) => ({ ...current, [key]: value }));
  };

  const markIconDirty = useCallback((icon: CategoryFormValues["icon"]) => {
    setValues((current) => ({
      ...current,
      icon,
      dirty: { ...current.dirty, icon: true },
    }));
  }, []);

  const markCoverDirty = useCallback((coverImgUrl: CategoryFormValues["coverImgUrl"]) => {
    setValues((current) => ({
      ...current,
      coverImgUrl,
      dirty: { ...current.dirty, coverImgUrl: true },
    }));
  }, []);

  const handleSubmit = async () => {
    const nextErrors = validateCategoryForm(values);
    setErrors(nextErrors);
    if (hasCategoryFormErrors(nextErrors)) return;

    setSubmitError(null);
    try {
      await onSubmit(values, mode, category?.id);
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : "保存失败，请稍后重试");
    }
  };

  return (
    <Modal
      isOpen={open}
      onOpenChange={(next) => {
        if (!next && !isBusy) onClose();
      }}
      isDismissable={!isBusy}
      placement="fullscreen-mobile"
      size="lg"
      aria-label={mode === "create" ? "新建分类" : "编辑分类"}
      dialogClassName="min-h-0 min-w-0 flex-1 overflow-x-hidden"
    >
      <AdminDialogFrame>
        <AdminDialogHeader
          eyebrow="内容组织"
          title={mode === "create" ? "新建分类" : "编辑分类"}
          description="分类会显示在首页 Tab 与文章筛选中，排序值越小越靠前。"
          className="max-md:pt-[max(1rem,env(safe-area-inset-top))]"
          action={
            <ButtonUtility
              tooltip="关闭分类表单"
              color="tertiary"
              icon={<SvgIcon name="close" />}
              isDisabled={isBusy}
              onClick={onClose}
            />
          }
        />

        <AdminDialogBody contentClassName="grid min-w-0 gap-5">
          <div className="grid min-w-0 gap-4 md:grid-cols-2">
            <Input
              label="分类名称"
              value={values.name}
              onChange={(value) => updateField("name", value)}
              isRequired
              isInvalid={Boolean(errors.name)}
              hint={errors.name}
              placeholder="例如：编程"
              className="min-w-0"
            />
            <Input
              label="URL 别名"
              value={values.url}
              onChange={(value) => updateField("url", value)}
              hint="可选，用于前台路由"
              placeholder="programming"
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

          <CategoryVisualAssetsEditor
            icon={values.icon}
            cover={values.coverImgUrl}
            isIconUploading={isIconUploading}
            isCoverUploading={isCoverUploading}
            uploadError={uploadError}
            onIconPick={openIconPicker}
            onCoverPick={openCoverPicker}
            onIconRemove={() => markIconDirty(EMPTY_CATEGORY_ASSET)}
            onCoverRemove={() => markCoverDirty(EMPTY_CATEGORY_ASSET)}
          />

          <CategoryAssetFileInputs
            iconInputRef={iconInputRef}
            coverInputRef={coverInputRef}
            onIconChange={(event) => {
              void handleIconFileChange(event, markIconDirty);
            }}
            onCoverChange={(event) => {
              void handleCoverFileChange(event, markCoverDirty);
            }}
          />

          <div className="grid min-w-0 gap-2">
            <Label className="text-xs font-medium text-muted-foreground">描述</Label>
            <textarea
              aria-label="分类描述"
              value={values.description}
              onChange={(event) => {
                const description = event.target.value;
                setValues((current) => ({
                  ...current,
                  description,
                  dirty: { ...current.dirty, description: true },
                }));
              }}
              placeholder="简要说明该分类包含的内容（可选）"
              className={`${adminDialogTextareaClassName} min-h-24`}
            />
            {errors.description ? (
              <p className="text-sm text-destructive">{errors.description}</p>
            ) : null}
          </div>

          {submitError ? <p className="text-sm text-destructive">{submitError}</p> : null}
        </AdminDialogBody>

        <AdminDialogFooter className="max-md:pb-[max(1rem,env(safe-area-inset-bottom))]">
          <Button variant="outline" onPress={onClose} isDisabled={isBusy}>
            取消
          </Button>
          <Button
            onPress={() => {
              void handleSubmit();
            }}
            isLoading={isSubmitting}
            isDisabled={isBusy}
            loadingText="保存中…"
          >
            {mode === "create" ? "创建" : "保存"}
          </Button>
        </AdminDialogFooter>
      </AdminDialogFrame>
    </Modal>
  );
}
