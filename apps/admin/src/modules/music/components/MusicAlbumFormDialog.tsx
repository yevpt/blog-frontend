import { useEffect, useRef, useState } from "react";
import { ApiError, type MusicAlbumResp, type MusicArtistResp } from "@repo/api";
import { SvgIcon } from "@repo/icons";
import { Button, ButtonUtility, Input, Label, Modal, Select } from "@repo/ui";
import {
  AdminDialogBody,
  AdminDialogFooter,
  AdminDialogFrame,
  AdminDialogHeader,
  adminDialogTextareaClassName,
} from "../../../components/AdminDialog";
import {
  createEmptyAlbumForm,
  hasFormErrors,
  mapAlbumToFormValues,
  validateAlbumForm,
  type MusicAlbumFormErrors,
  type MusicAlbumFormValues,
  type MusicUploadValue,
} from "../model";

interface MusicAlbumFormDialogProps {
  mode: "create" | "edit";
  open: boolean;
  album: MusicAlbumResp | null;
  artists: MusicArtistResp[];
  isSubmitting: boolean;
  onClose: () => void;
  onUploadCover: (file: File) => Promise<MusicUploadValue>;
  onSubmit: (values: MusicAlbumFormValues, mode: "create" | "edit", id?: number) => Promise<void>;
}

export function MusicAlbumFormDialog({
  mode,
  open,
  album,
  artists,
  isSubmitting,
  onClose,
  onUploadCover,
  onSubmit,
}: MusicAlbumFormDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [values, setValues] = useState<MusicAlbumFormValues>(createEmptyAlbumForm());
  const [errors, setErrors] = useState<MusicAlbumFormErrors>({});
  const [isUploading, setIsUploading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setSubmitError(null);
    setValues(mode === "edit" && album ? mapAlbumToFormValues(album) : createEmptyAlbumForm());
  }, [album, mode, open]);

  const updateField = <K extends keyof MusicAlbumFormValues>(
    key: K,
    value: MusicAlbumFormValues[K],
  ) => {
    setValues((current) => ({ ...current, [key]: value }));
  };

  const handleCoverFile = async (file: File | undefined) => {
    if (!file) return;
    setIsUploading(true);
    try {
      const upload = await onUploadCover(file);
      updateField("coverKey", upload.key);
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : "封面上传失败，请稍后重试");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async () => {
    const nextErrors = validateAlbumForm(values);
    setErrors(nextErrors);
    if (hasFormErrors(nextErrors)) return;
    setSubmitError(null);
    try {
      await onSubmit(values, mode, album?.id);
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
      isDismissable={!isSubmitting && !isUploading}
      placement="fullscreen-mobile"
      size="lg"
      aria-label={mode === "create" ? "新建专辑" : "编辑专辑"}
      dialogClassName="min-h-0 min-w-0 flex-1 overflow-x-hidden"
    >
      <AdminDialogFrame>
        <AdminDialogHeader
          eyebrow="音乐资料库"
          title={mode === "create" ? "新建专辑" : "编辑专辑"}
          description="专辑封面会被同专辑歌曲复用。"
          className="max-md:pt-[max(1rem,env(safe-area-inset-top))]"
          action={
            <ButtonUtility
              tooltip="关闭专辑表单"
              color="tertiary"
              icon={<SvgIcon name="close" />}
              isDisabled={isSubmitting || isUploading}
              onClick={onClose}
            />
          }
        />
        <AdminDialogBody contentClassName="grid min-w-0 gap-5">
          <div className="grid min-w-0 gap-4 md:grid-cols-2">
            <Input
              label="专辑名"
              value={values.name}
              onChange={(value) => updateField("name", value)}
              isRequired
              isInvalid={Boolean(errors.name)}
              hint={errors.name}
              placeholder="Sleepless Nights"
            />
            <div className="min-w-0">
              <Select
                label="主歌手"
                placeholder="未设置"
                selectedKey={values.artistId || null}
                onSelectionChange={(key) => updateField("artistId", key ? String(key) : "")}
              >
                <Select.Item id="" label="未设置" />
                {artists.map((artist) => (
                  <Select.Item key={artist.id} id={String(artist.id)} label={artist.display_name} />
                ))}
              </Select>
            </div>
          </div>

          <Input
            label="发行日期"
            type="date"
            value={values.releaseDate}
            onChange={(value) => updateField("releaseDate", value)}
          />

          <div className="grid gap-2">
            <Label>封面</Label>
            <div className="flex min-w-0 flex-col gap-2 rounded-lg border border-border bg-background p-3 sm:flex-row sm:items-center">
              <Button
                type="button"
                size="sm"
                variant="outline"
                isLoading={isUploading}
                loadingText="上传中…"
                onPress={() => fileInputRef.current?.click()}
              >
                <SvgIcon name="arrow-up" size={14} />
                上传封面
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(event) => {
                  void handleCoverFile(event.target.files?.[0]);
                  event.currentTarget.value = "";
                }}
              />
              <span className="min-w-0 break-all text-sm text-muted-foreground sm:truncate">
                {values.coverKey || "可选，最大 10MB"}
              </span>
            </div>
          </div>

          <div className="grid gap-2">
            <Label>简介</Label>
            <textarea
              aria-label="专辑简介"
              value={values.description}
              onChange={(event) => updateField("description", event.target.value)}
              placeholder="可选，最多 500 字"
              className={`${adminDialogTextareaClassName} min-h-28`}
            />
          </div>
          {submitError ? <p className="text-sm text-destructive">{submitError}</p> : null}
        </AdminDialogBody>
        <AdminDialogFooter className="max-md:pb-[max(1rem,env(safe-area-inset-bottom))]">
          <Button variant="outline" onPress={onClose} isDisabled={isSubmitting || isUploading}>
            取消
          </Button>
          <Button
            onPress={() => void handleSubmit()}
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
