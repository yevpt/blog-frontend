import { useEffect, useState } from "react";
import { ApiError } from "@repo/api";
import { Modal, Button, Input, Label, cn } from "@repo/ui";
import { CategoryVisualAssetsPlaceholder } from "./CategoryVisualAssetsPlaceholder";
import {
  createEmptyCategoryForm,
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
  onSubmit: (values: CategoryFormValues, mode: "create" | "edit", categoryId?: string) => Promise<void>;
}

/** 区块水平内边距：放在内容层，不放在滚动容器上，避免 w-full 溢出 */
const contentInsetClassName = "px-4 sm:px-5";

const textareaClassName = cn(
  "box-border min-h-24 w-full rounded-lg border border-border bg-background px-3 py-2",
  "text-sm leading-6 text-foreground outline-none",
  "placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring",
);

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

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setSubmitError(null);
    if (mode === "edit" && category) {
      setValues(mapCategoryToFormValues({
        id: Number(category.id),
        name: category.name,
        url: category.url,
        icon: category.icon,
        description: category.description,
        cover_img_url: category.coverImgUrl,
        seq: category.seq,
        article_count: category.articleCount,
      }));
      return;
    }
    setValues(createEmptyCategoryForm(nextSeq));
  }, [open, mode, category, nextSeq]);

  const updateField = <K extends keyof CategoryFormValues>(key: K, value: CategoryFormValues[K]) => {
    setValues((current) => ({ ...current, [key]: value }));
  };

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
        if (!next) onClose();
      }}
      isDismissable={!isSubmitting}
      placement="fullscreen-mobile"
      size="lg"
      aria-label={mode === "create" ? "新建分类" : "编辑分类"}
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
            {mode === "create" ? "新建分类" : "编辑分类"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            分类会显示在首页 Tab 与文章筛选中，排序值越小越靠前。
          </p>
        </div>

        {/* 滚动层不含 padding，避免子元素 w-full 超出可视宽度 */}
        <div className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-y-contain">
          <div className={cn(contentInsetClassName, "py-5")}>
            <div className="grid min-w-0 gap-5">
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

              <CategoryVisualAssetsPlaceholder
                iconUrl={values.icon || undefined}
                coverUrl={values.coverImgUrl || undefined}
              />

              <div className="grid min-w-0 gap-2">
                <Label className="text-xs font-medium text-muted-foreground">
                  描述<span className="text-destructive"> *</span>
                </Label>
                <textarea
                  aria-label="分类描述"
                  value={values.description}
                  onChange={(event) => updateField("description", event.target.value)}
                  placeholder="简要说明该分类包含的内容"
                  className={textareaClassName}
                />
                {errors.description ? (
                  <p className="text-sm text-destructive">{errors.description}</p>
                ) : null}
              </div>

              {submitError ? <p className="text-sm text-destructive">{submitError}</p> : null}
            </div>
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
