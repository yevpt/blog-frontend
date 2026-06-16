"use client";

import { useState } from "react";
import { cn, DatePicker, parseDate } from "@repo/ui";
import type { DateValue } from "@repo/ui";
import { SvgIcon } from "@repo/icons";

interface InlineDateEditorProps {
  initialValue: string; // "YYYY-MM-DD" or ""
  onSave: (value: string) => Promise<void>;
  onCancel: () => void;
}

type SaveState = "idle" | "saving" | "success" | "error";

export function InlineDateEditor({ initialValue, onSave, onCancel }: InlineDateEditorProps) {
  const [date, setDate] = useState<DateValue | null>(() => {
    try {
      return initialValue ? parseDate(initialValue) : null;
    } catch {
      return null;
    }
  });
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isDisabled = saveState === "saving" || saveState === "success";

  async function handleSave() {
    if (isDisabled) return;
    setSaveState("saving");
    setErrorMsg(null);
    try {
      await onSave(date ? date.toString() : "");
      setSaveState("success");
      setTimeout(() => setSaveState("idle"), 800);
    } catch (err) {
      setSaveState("error");
      setErrorMsg(err instanceof Error ? err.message : "保存失败");
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <DatePicker value={date} onChange={setDate} isDisabled={isDisabled} />
        <div className="flex items-center gap-0.5">
          {/* 保存 */}
          <button
            type="button"
            onClick={handleSave}
            disabled={isDisabled}
            aria-label="保存"
            className={cn(
              "flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-[5px] font-bold transition-colors",
              saveState === "success" && "bg-emerald-500 text-white",
              saveState === "error" && "bg-destructive text-white",
              saveState === "idle" && "bg-primary text-white hover:bg-primary/90",
              saveState === "saving" && "cursor-not-allowed bg-muted text-muted-foreground",
            )}
          >
            {saveState === "saving" ? (
              <span className="block h-[10px] w-[10px] animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              <SvgIcon name="check" size={12} />
            )}
          </button>
          {/* 取消 */}
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
      </div>
      {saveState === "error" && errorMsg && (
        <p className="text-[9px] text-destructive">{errorMsg}</p>
      )}
    </div>
  );
}
