import { useEffect, useRef, useState } from "react";
import { ApiError, type MusicAlbumResp, type MusicArtistResp } from "@repo/api";
import { SvgIcon } from "@repo/icons";
import { Button, Checkbox, Input, Label, Modal, Select, Toggle, cn } from "@repo/ui";
import {
  applyAudioUpload,
  createEmptyMusicForm,
  formatFileSize,
  hasFormErrors,
  mapMusicToFormValues,
  validateMusicForm,
  type MusicFormErrors,
  type MusicFormValues,
  type MusicRow,
  type MusicUploadValue,
} from "../model";

interface MusicSongFormDialogProps {
  mode: "create" | "edit";
  open: boolean;
  row: MusicRow | null;
  artists: MusicArtistResp[];
  albums: MusicAlbumResp[];
  nextSeq: number;
  isSubmitting: boolean;
  onClose: () => void;
  onUploadAudio: (file: File) => Promise<MusicUploadValue>;
  onSubmit: (values: MusicFormValues, mode: "create" | "edit", id?: string) => Promise<void>;
}

const contentInsetClassName = "px-4 sm:px-5";
const textareaClassName = cn(
  "box-border min-h-28 w-full rounded-lg border border-border bg-background px-3 py-2",
  "text-sm leading-6 text-foreground outline-none",
  "placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring",
);

export function MusicSongFormDialog({
  mode,
  open,
  row,
  artists,
  albums,
  nextSeq,
  isSubmitting,
  onClose,
  onUploadAudio,
  onSubmit,
}: MusicSongFormDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [values, setValues] = useState<MusicFormValues>(createEmptyMusicForm(nextSeq));
  const [errors, setErrors] = useState<MusicFormErrors>({});
  const [uploadLabel, setUploadLabel] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setSubmitError(null);
    setUploadLabel(null);
    setValues(mode === "edit" && row ? mapMusicToFormValues(row) : createEmptyMusicForm(nextSeq));
  }, [open, mode, nextSeq, row]);

  const updateField = <K extends keyof MusicFormValues>(key: K, value: MusicFormValues[K]) => {
    setValues((current) => ({ ...current, [key]: value }));
  };

  const toggleArtist = (artistId: string, selected: boolean) => {
    setValues((current) => ({
      ...current,
      artistIds: selected
        ? [...new Set([...current.artistIds, artistId])]
        : current.artistIds.filter((id) => id !== artistId),
    }));
  };

  const handleAudioFile = async (file: File | undefined) => {
    if (!file) return;
    setIsUploading(true);
    setUploadLabel(file.name);
    try {
      const upload = await onUploadAudio(file);
      setValues((current) => applyAudioUpload(current, upload));
      setUploadLabel(`${file.name} · ${formatFileSize(upload.size)}`);
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : "音频上传失败，请稍后重试");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async () => {
    const nextErrors = validateMusicForm(values);
    setErrors(nextErrors);
    if (hasFormErrors(nextErrors)) return;

    setSubmitError(null);
    try {
      await onSubmit(values, mode, row?.id);
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
      size="xl"
      aria-label={mode === "create" ? "新建音乐" : "编辑音乐"}
      dialogClassName="min-h-0 min-w-0 flex-1 overflow-x-hidden"
    >
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden">
        <div className={cn("shrink-0 border-b border-border/70 py-4", contentInsetClassName)}>
          <h2 className="text-lg font-semibold text-foreground">
            {mode === "create" ? "新建音乐" : "编辑音乐"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            音乐可作为文章背景曲，也可公开到前台音乐库。
          </p>
        </div>

        <div className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-y-contain">
          <div className={cn(contentInsetClassName, "grid gap-5 py-5")}>
            <div className="grid min-w-0 gap-4 md:grid-cols-2">
              <Input
                label="曲名"
                value={values.name}
                onChange={(value) => updateField("name", value)}
                isRequired
                isInvalid={Boolean(errors.name)}
                hint={errors.name}
                placeholder="例如：Ref:rain"
              />
              <Input
                label="歌手展示名"
                value={values.artistDisplayName}
                onChange={(value) => updateField("artistDisplayName", value)}
                hint="留空时后端会按歌手列表生成"
                placeholder="Aimer / milet"
              />
            </div>

            <div className="grid gap-2">
              <Label isRequired isInvalid={Boolean(errors.artistIds)}>
                歌手
              </Label>
              <div className="grid max-h-36 gap-2 overflow-y-auto rounded-lg border border-border bg-background p-3 sm:grid-cols-2">
                {artists.length > 0 ? (
                  artists.map((artist) => (
                    <Checkbox
                      key={artist.id}
                      label={artist.display_name}
                      isSelected={values.artistIds.includes(String(artist.id))}
                      onChange={(selected) => toggleArtist(String(artist.id), selected)}
                    />
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">请先在“歌手”标签中新建歌手。</p>
                )}
              </div>
              {errors.artistIds ? (
                <p className="text-sm text-destructive">{errors.artistIds}</p>
              ) : null}
            </div>

            <div className="grid min-w-0 gap-4 md:grid-cols-3">
              <Select
                label="专辑"
                placeholder="未归入专辑"
                selectedKey={values.albumId || null}
                onSelectionChange={(key) => updateField("albumId", key ? String(key) : "")}
              >
                <Select.Item id="" label="未归入专辑" />
                {albums.map((album) => (
                  <Select.Item
                    key={album.id}
                    id={String(album.id)}
                    label={album.name}
                    supportingText={album.artist?.display_name}
                  />
                ))}
              </Select>
              <Input
                label="专辑曲序"
                value={values.albumTrackNo}
                onChange={(value) => updateField("albumTrackNo", value)}
                isInvalid={Boolean(errors.albumTrackNo)}
                hint={errors.albumTrackNo ?? "0 表示不记录"}
                inputMode="numeric"
              />
              <Input
                label="排序"
                value={values.seq}
                onChange={(value) => updateField("seq", value)}
                isRequired
                isInvalid={Boolean(errors.seq)}
                hint={errors.seq ?? "越小越靠前"}
                inputMode="numeric"
              />
            </div>

            <div className="grid min-w-0 gap-4 md:grid-cols-[1fr_12rem]">
              <div className="grid gap-2">
                <Label isRequired isInvalid={Boolean(errors.audioKey)}>
                  音频文件
                </Label>
                <div className="flex min-w-0 flex-col gap-2 rounded-lg border border-border bg-background p-3 sm:flex-row sm:items-center">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    isLoading={isUploading}
                    loadingText="上传中…"
                    onPress={() => fileInputRef.current?.click()}
                  >
                    <SvgIcon name="arrow-up" size={14} />
                    选择音频
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="audio/*,.mp3,.m4a,.flac"
                    className="sr-only"
                    onChange={(event) => {
                      void handleAudioFile(event.target.files?.[0]);
                      event.currentTarget.value = "";
                    }}
                  />
                  <span className="min-w-0 truncate text-sm text-muted-foreground">
                    {uploadLabel ?? (values.audioKey || "支持 mp3、m4a、flac，最大 50MB")}
                  </span>
                </div>
                {errors.audioKey ? (
                  <p className="text-sm text-destructive">{errors.audioKey}</p>
                ) : null}
              </div>
              <Input
                label="时长（秒）"
                value={values.duration}
                onChange={(value) => updateField("duration", value)}
                isInvalid={Boolean(errors.duration)}
                hint={errors.duration}
                inputMode="numeric"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Input
                label="音频 MIME"
                value={values.audioMime}
                onChange={(value) => updateField("audioMime", value)}
                placeholder="audio/mpeg"
              />
              <Input
                label="音频 Hash"
                value={values.audioHash}
                onChange={(value) => updateField("audioHash", value)}
                placeholder="上传后自动填充"
              />
            </div>

            <Toggle
              label="公开展示"
              hint="关闭后仍可在后台维护，但不会进入公开音乐库。"
              isSelected={values.isPublic}
              onChange={(selected) => updateField("isPublic", selected)}
            />

            <div className="grid min-w-0 gap-2">
              <Label>歌词</Label>
              <textarea
                aria-label="歌词"
                value={values.lyric}
                onChange={(event) => updateField("lyric", event.target.value)}
                placeholder="可选，支持纯文本歌词"
                className={textareaClassName}
              />
            </div>

            {submitError ? <p className="text-sm text-destructive">{submitError}</p> : null}
          </div>
        </div>

        <div
          className={cn(
            "flex shrink-0 justify-end gap-2 border-t border-border/70 bg-card py-4",
            contentInsetClassName,
          )}
        >
          <Button variant="outline" onPress={onClose} isDisabled={isSubmitting || isUploading}>
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
