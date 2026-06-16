"use client";

import { useState, useRef, useEffect, type KeyboardEvent } from "react";
import { cn } from "@repo/ui";
import { SvgIcon } from "@repo/icons";

interface InlineFieldEditorProps {
  initialValue: string;
  onSave: (value: string) => Promise<void>;
  onCancel: () => void;
  validate?: (value: string) => string | null;
  placeholder?: string;
  inputType?: "text" | "email" | "tel" | "url";
  className?: string;
}

type SaveState = "idle" | "saving" | "success" | "error";

export function InlineFieldEditor({
  initialValue,
  onSave,
  onCancel,
  validate,
  placeholder,
  inputType = "text",
  className,
}: InlineFieldEditorProps) {
  const [value, setValue] = useState(initialValue);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const validationError = validate?.(value) ?? null;
  const isDisabled = saveState === "saving" || saveState === "success";

  async function handleSave() {
    if (validationError || isDisabled) return;
    setSaveState("saving");
    setErrorMsg(null);
    try {
      await onSave(value);
      setSaveState("success");
      setTimeout(() => setSaveState("idle"), 800);
    } catch (err) {
      setSaveState("error");
      setErrorMsg(err instanceof Error ? err.message : "保存失败");
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") handleSave();
    if (e.key === "Escape") onCancel();
  }

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      {/* 输入行：深色背景 + primary ring */}
      <div
        className={cn(
          "flex h-8 items-center gap-1 rounded-lg bg-background pl-2.5 pr-1 shadow-[0_0_0_2px] shadow-primary",
          validationError && "shadow-destructive",
        )}
      >
        <input
          ref={inputRef}
          type={inputType}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setSaveState("idle");
            setErrorMsg(null);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={isDisabled}
          className="min-w-0 flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/40 outline-none"
        />

        {/* 保存 ✓ */}
        <button
          type="button"
          onClick={handleSave}
          disabled={!!validationError || isDisabled}
          aria-label="保存"
          className={cn(
            "flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-[5px] font-bold transition-colors",
            saveState === "success" && "bg-emerald-500 text-white",
            saveState === "error" && "bg-destructive text-white",
            saveState === "idle" && !validationError && "bg-primary text-white hover:bg-primary/90",
            (saveState === "saving" || !!validationError) &&
              "cursor-not-allowed bg-muted text-muted-foreground",
          )}
        >
          {saveState === "saving" ? (
            <span className="block h-[10px] w-[10px] animate-spin rounded-full border-2 border-current border-t-transparent" />
          ) : (
            <SvgIcon name="check" size={12} />
          )}
        </button>

        {/* 取消 ✕ */}
        <button
          type="button"
          onClick={onCancel}
          disabled={saveState === "saving"}
          aria-label="取消"
          className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-[5px] text-muted-foreground/60 transition-colors hover:text-muted-foreground"
        >
          <SvgIcon name="close" size={12} />
        </button>
      </div>

      {/* 错误提示 */}
      {(validationError || (saveState === "error" && errorMsg)) && (
        <p className="text-[9px] text-destructive">{validationError ?? errorMsg}</p>
      )}
    </div>
  );
}
