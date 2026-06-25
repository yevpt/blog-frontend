import { useCallback, useRef, useState } from "react";
import { compressAvatarImage, getAvatarProcessingErrorMessage } from "@repo/hooks";
import { SvgIcon } from "@repo/icons";
import { Button, cn } from "@repo/ui";
import { addToast } from "../../../lib/toast";
import { FRIEND_LINK_LOGO_RAW_MAX_BYTES, type FriendLinkLogoValue } from "../model";

interface FriendLinkLogoPickerProps {
  value: FriendLinkLogoValue | null;
  onChange: (value: FriendLinkLogoValue | null) => void;
  disabled?: boolean;
  error?: string;
}

function revokeBlobPreview(url: string | undefined) {
  if (url?.startsWith("blob:")) {
    URL.revokeObjectURL(url);
  }
}

export function FriendLinkLogoPicker({
  value,
  onChange,
  disabled = false,
  error,
}: FriendLinkLogoPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isCompressing, setIsCompressing] = useState(false);

  const openPicker = useCallback(() => {
    if (disabled || isCompressing) return;
    inputRef.current?.click();
  }, [disabled, isCompressing]);

  const handleRemove = useCallback(() => {
    if (disabled || isCompressing) return;
    revokeBlobPreview(value?.previewUrl);
    onChange(null);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }, [disabled, isCompressing, onChange, value?.previewUrl]);

  const handleFileChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      if (file.size > FRIEND_LINK_LOGO_RAW_MAX_BYTES) {
        addToast("友链 Logo 不能超过 2MB", "error");
        if (event.target) event.target.value = "";
        return;
      }

      setIsCompressing(true);
      try {
        const compressed = await compressAvatarImage(file);
        revokeBlobPreview(value?.previewUrl);
        onChange({
          file: compressed,
          previewUrl: URL.createObjectURL(compressed),
        });
      } catch (err) {
        addToast(getAvatarProcessingErrorMessage(err), "error");
      } finally {
        setIsCompressing(false);
        if (event.target) event.target.value = "";
      }
    },
    [onChange, value?.previewUrl],
  );

  const previewUrl = value?.previewUrl;
  const isBusy = disabled || isCompressing;

  return (
    <div className="grid min-w-0 gap-2">
      <p className="text-sm font-medium text-foreground">
        友链 Logo <span className="text-destructive">*</span>
      </p>

      <div className="flex items-start gap-3">
        <div className="relative size-20 shrink-0">
          <button
            type="button"
            disabled={isBusy}
            aria-label={previewUrl ? "更换友链 Logo" : "上传友链 Logo"}
            onClick={openPicker}
            className={cn(
              "relative size-full overflow-hidden rounded-[10px] border border-dashed border-border bg-muted/30",
              isBusy ? "cursor-wait opacity-70" : "cursor-pointer hover:border-primary/40",
            )}
          >
            {previewUrl ? (
              <img src={previewUrl} alt="友链 Logo 预览" className="size-full object-cover" />
            ) : (
              <span className="flex size-full items-center justify-center text-muted-foreground">
                <SvgIcon name="image" size={20} className="opacity-60" />
              </span>
            )}
            {isCompressing ? (
              <div
                aria-label="Logo 处理中"
                className="absolute inset-0 flex items-center justify-center bg-background/60"
              >
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-foreground" />
              </div>
            ) : null}
          </button>

          {previewUrl && !isCompressing ? (
            <Button
              type="button"
              variant="ghost"
              onPress={handleRemove}
              aria-label="移除 Logo"
              isDisabled={disabled}
              className="absolute -right-1.5 -top-1.5 size-5 rounded-full bg-destructive p-0 text-destructive-foreground shadow-sm"
            >
              <SvgIcon name="close" size={10} className="text-white" />
            </Button>
          ) : null}
        </div>

        <button
          type="button"
          disabled={isBusy}
          onClick={openPicker}
          className={cn(
            "min-w-0 flex-1 text-left",
            isBusy ? "cursor-wait opacity-70" : "cursor-pointer",
          )}
        >
          <p className="text-sm text-muted-foreground">
            {previewUrl ? "更换 Logo" : "点击上传 Logo"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground/70">
            {isCompressing
              ? "Logo 处理中…"
              : "JPG / PNG / WebP · 原始 ≤ 2MB · 自动压缩为 120px · ≤ 20KB"}
          </p>
        </button>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
        className="sr-only"
        tabIndex={-1}
        disabled={isBusy}
        onChange={(event) => {
          void handleFileChange(event);
        }}
      />
    </div>
  );
}
