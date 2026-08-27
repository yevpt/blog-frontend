import { useEffect, useRef, useState } from "react";
import { ApiError, type MusicAlbumResp, type MusicArtistResp } from "@repo/api";
import { SvgIcon } from "@repo/icons";
import { Button, ButtonUtility, Input, Label, Modal, Select, Toggle } from "@repo/ui";
import {
  AdminDialogBody,
  AdminDialogFooter,
  AdminDialogFrame,
  AdminDialogHeader,
  adminDialogSectionClassName,
  adminDialogTextareaClassName,
} from "../../../components/AdminDialog";
import {
  applyAudioUpload,
  createEmptyMusicForm,
  formatFileSize,
  getAudioFileName,
  hasFormErrors,
  mapMusicToFormValues,
  validateMusicForm,
  type MusicFormErrors,
  type MusicFormValues,
  type MusicRow,
  type MusicUploadValue,
} from "../model";
import { MusicAudioPlayer } from "./MusicAudioPlayer";

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
  const [audioPreviewUrl, setAudioPreviewUrl] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const selectedArtists = artists.filter((artist) => values.artistIds.includes(String(artist.id)));
  const selectableArtists = artists.filter(
    (artist) => !values.artistIds.includes(String(artist.id)),
  );

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setSubmitError(null);
    setUploadLabel(null);
    setAudioPreviewUrl(mode === "edit" && row ? (row.audioUrl ?? "") : "");
    setValues(mode === "edit" && row ? mapMusicToFormValues(row) : createEmptyMusicForm(nextSeq));
  }, [open, mode, nextSeq, row]);

  const updateField = <K extends keyof MusicFormValues>(key: K, value: MusicFormValues[K]) => {
    setValues((current) => ({ ...current, [key]: value }));
  };

  const addArtist = (artistId: string) => {
    setValues((current) => ({
      ...current,
      artistIds: [...new Set([...current.artistIds, artistId])],
    }));
  };

  const removeArtist = (artistId: string) => {
    setValues((current) => ({
      ...current,
      artistIds: current.artistIds.filter((id) => id !== artistId),
    }));
  };

  const handleAudioFile = async (file: File | undefined) => {
    if (!file) return;
    setIsUploading(true);
    setUploadLabel(file.name);
    try {
      const upload = await onUploadAudio(file);
      setValues((current) => applyAudioUpload(current, upload));
      setAudioPreviewUrl(upload.url);
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
      <AdminDialogFrame>
        <AdminDialogHeader
          eyebrow="音乐资料库"
          title={mode === "create" ? "新建音乐" : "编辑音乐"}
          description="音乐可作为文章背景曲，也可公开到前台音乐库。"
          className="max-md:pt-[max(1rem,env(safe-area-inset-top))]"
          action={
            <ButtonUtility
              tooltip="关闭音乐表单"
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

          <div className={`grid gap-3 ${adminDialogSectionClassName}`}>
            <Label isRequired isInvalid={Boolean(errors.artistIds)}>
              歌手
            </Label>
            {artists.length > 0 ? (
              <>
                <Select.ComboBox
                  aria-label="搜索并添加歌手"
                  placeholder="搜索并添加歌手"
                  size="sm"
                  selectedKey={null}
                  items={selectableArtists.map((artist) => ({
                    id: String(artist.id),
                    label: artist.display_name,
                    supportingText: artist.name_zh,
                    avatarUrl: artist.avatar_url,
                  }))}
                  onSelectionChange={(key) => {
                    if (key) addArtist(String(key));
                  }}
                >
                  {(item) => (
                    <Select.Item
                      id={item.id}
                      label={item.label}
                      supportingText={item.supportingText}
                      avatarUrl={item.avatarUrl}
                      selectionIndicator="none"
                    />
                  )}
                </Select.ComboBox>
                <div className="flex min-h-9 flex-wrap gap-2">
                  {selectedArtists.length > 0 ? (
                    selectedArtists.map((artist) => (
                      <span
                        key={artist.id}
                        className="inline-flex max-w-full items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-xs text-foreground"
                      >
                        <span className="truncate">{artist.display_name}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="size-5 p-0"
                          aria-label={`移除 ${artist.display_name}`}
                          onPress={() => removeArtist(String(artist.id))}
                        >
                          <SvgIcon name="close" size={12} />
                        </Button>
                      </span>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">搜索并添加至少一位歌手。</p>
                  )}
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">请先在“歌手”标签中新建歌手。</p>
            )}
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

          <div className="grid min-w-0 gap-4 md:grid-cols-[minmax(0,1fr)_12rem]">
            <div className="grid gap-2">
              <Label isRequired isInvalid={Boolean(errors.audioKey)}>
                音频文件
              </Label>
              <div className="grid min-w-0 gap-3 rounded-lg border border-border bg-background p-3">
                {values.audioKey ? (
                  <MusicAudioPlayer
                    variant="full"
                    title={values.name || "当前音频"}
                    url={audioPreviewUrl || values.audioKey}
                    fileName={getAudioFileName(values.audioKey)}
                    mime={values.audioMime || undefined}
                    size={Number(values.audioSize)}
                    fallbackDuration={Number(values.duration)}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">还没有选择音频</p>
                )}
                <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="grid min-w-0 gap-1 text-xs text-muted-foreground">
                    <span className="truncate">
                      {uploadLabel ?? "支持 mp3、m4a、flac，最大 50MB"}
                    </span>
                    <span className="truncate">
                      {values.audioMime || "MIME 待上传后自动填充"}
                      {values.audioSize !== "0"
                        ? ` · ${formatFileSize(Number(values.audioSize))}`
                        : ""}
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="shrink-0"
                    isLoading={isUploading}
                    loadingText="上传中…"
                    onPress={() => fileInputRef.current?.click()}
                  >
                    <SvgIcon name="arrow-up" size={14} />
                    {values.audioKey ? "替换音频" : "选择音频"}
                  </Button>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  aria-label="选择音频文件"
                  accept="audio/*,.mp3,.m4a,.flac"
                  className="sr-only"
                  onChange={(event) => {
                    void handleAudioFile(event.target.files?.[0]);
                    event.currentTarget.value = "";
                  }}
                />
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
