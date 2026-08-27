import { useEffect, useState } from "react";
import { ApiError } from "@repo/api";
import { SvgIcon } from "@repo/icons";
import { Modal, Button, ButtonUtility, Input, Select } from "@repo/ui";
import {
  AdminDialogBody,
  AdminDialogFooter,
  AdminDialogFrame,
  AdminDialogHeader,
  adminDialogTextareaClassName,
} from "../../../components/AdminDialog";
import { FriendLinkLogoPicker } from "./FriendLinkLogoPicker";
import {
  createEmptyFriendLinkForm,
  createRemoteLogoValue,
  hasFriendLinkFormErrors,
  mapFriendLinkToFormValues,
  mapRowToFriendLinkItem,
  validateFriendLinkForm,
  type FriendLinkFormValues,
  type FriendLinkLogoValue,
  type FriendLinkRow,
} from "../model";

interface FriendLinkFormDialogProps {
  mode: "create" | "edit";
  open: boolean;
  link: FriendLinkRow | null;
  nextSeq: number;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (
    values: FriendLinkFormValues,
    logo: FriendLinkLogoValue | null,
    mode: "create" | "edit",
    linkId?: string,
  ) => Promise<void>;
}

function revokeBlobPreview(url: string | undefined) {
  if (url?.startsWith("blob:")) {
    URL.revokeObjectURL(url);
  }
}

export function FriendLinkFormDialog({
  mode,
  open,
  link,
  nextSeq,
  isSubmitting,
  onClose,
  onSubmit,
}: FriendLinkFormDialogProps) {
  const [values, setValues] = useState<FriendLinkFormValues>(createEmptyFriendLinkForm(nextSeq));
  const [logo, setLogo] = useState<FriendLinkLogoValue | null>(null);
  const [errors, setErrors] = useState<ReturnType<typeof validateFriendLinkForm>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setSubmitError(null);
    if (mode === "edit" && link) {
      setValues(mapFriendLinkToFormValues(mapRowToFriendLinkItem(link)));
      setLogo(link.avatarUrl ? createRemoteLogoValue(link.avatarUrl) : null);
      return;
    }
    setValues(createEmptyFriendLinkForm(nextSeq));
    setLogo(null);
  }, [open, mode, link, nextSeq]);

  const updateField = <K extends keyof FriendLinkFormValues>(
    key: K,
    value: FriendLinkFormValues[K],
  ) => {
    setValues((current) => ({ ...current, [key]: value }));
  };

  const handleLogoChange = (next: FriendLinkLogoValue | null) => {
    revokeBlobPreview(logo?.previewUrl);
    setLogo(next);
  };

  const handleSubmit = async () => {
    const nextErrors = validateFriendLinkForm(values, logo, mode);
    setErrors(nextErrors);
    if (hasFriendLinkFormErrors(nextErrors)) return;

    setSubmitError(null);
    try {
      await onSubmit(values, logo, mode, link?.id);
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
      aria-label={mode === "create" ? "新建友链" : "编辑友链"}
      dialogClassName="min-h-0 min-w-0 flex-1 overflow-x-hidden"
    >
      <AdminDialogFrame>
        <AdminDialogHeader
          eyebrow="站点关系"
          title={mode === "create" ? "新建友链" : "编辑友链"}
          description="管理友情链接展示信息；排序值越小越靠前。"
          className="max-md:pt-[max(1rem,env(safe-area-inset-top))]"
          action={
            <ButtonUtility
              tooltip="关闭友链表单"
              color="tertiary"
              icon={<SvgIcon name="close" />}
              isDisabled={isSubmitting}
              onClick={onClose}
            />
          }
        />

        <AdminDialogBody contentClassName="grid min-w-0 gap-5">
          <FriendLinkLogoPicker
            value={logo}
            onChange={handleLogoChange}
            disabled={isSubmitting}
            error={errors.logo}
          />

          <div className="grid min-w-0 gap-4 md:grid-cols-2">
            <Input
              label="网站名称"
              value={values.name}
              onChange={(value) => updateField("name", value)}
              isRequired
              isInvalid={Boolean(errors.name)}
              hint={errors.name}
              placeholder="例如：VPT"
              className="min-w-0"
            />
            <Input
              label="网站地址"
              value={values.site}
              onChange={(value) => updateField("site", value)}
              isRequired
              isInvalid={Boolean(errors.site)}
              hint={errors.site}
              placeholder="https://example.com"
              className="min-w-0"
            />
          </div>

          <div className="grid min-w-0 gap-4 md:grid-cols-2">
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
            <div className="min-w-0">
              <Select
                label="展示状态"
                selectedKey={values.status}
                onSelectionChange={(key) => updateField("status", String(key))}
                isInvalid={Boolean(errors.status)}
              >
                <Select.Item id="1" label="显示" />
                <Select.Item id="0" label="隐藏" />
                <Select.Item id="2" label="失联" />
              </Select>
              {errors.status ? (
                <p className="mt-1 text-sm text-destructive">{errors.status}</p>
              ) : null}
            </div>
          </div>

          <div className="grid min-w-0 gap-2">
            <p className="text-sm font-medium text-foreground">网站描述</p>
            <textarea
              value={values.description}
              onChange={(event) => updateField("description", event.target.value)}
              placeholder="可选，一句话介绍站点"
              className={`${adminDialogTextareaClassName} min-h-24`}
              aria-label="网站描述"
            />
          </div>

          <div className="grid min-w-0 gap-4 md:grid-cols-2">
            <Input
              label="站长邮箱"
              value={values.email}
              onChange={(value) => updateField("email", value)}
              placeholder="hello@example.com"
              className="min-w-0"
            />
            <Input
              label="联系电话"
              value={values.phone}
              onChange={(value) => updateField("phone", value)}
              placeholder="可选"
              className="min-w-0"
            />
          </div>

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
