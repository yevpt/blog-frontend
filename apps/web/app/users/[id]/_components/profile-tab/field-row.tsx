"use client";

import { cn } from "@repo/ui";
import { SvgIcon } from "@repo/icons";
import type { IconName } from "@repo/icons";
import { InlineFieldEditor } from "../inline-field-editor";
import { SelectInlineEditor, type SelectOption } from "../select-inline-editor";
import { InlineDateEditor } from "../inline-date-editor";

export interface FieldRowProps {
  label: string;
  icon?: IconName;
  iconColor?: string;
  value: string | null;
  displayValue?: string | null;
  isEditMode: boolean;
  isOwner: boolean;
  emptyText?: string;
  onSave: (value: string) => Promise<void>;
  validate?: (value: string) => string | null;
  inputType?: "text" | "email" | "tel" | "url" | "date";
  options?: SelectOption[];
  isLink?: boolean;
  isActiveEditing: boolean;
  isAnyEditing: boolean;
  onActivate: () => void;
  onDeactivate: () => void;
}

export function FieldRow({
  label,
  icon,
  iconColor,
  value,
  displayValue,
  isEditMode,
  isOwner,
  emptyText,
  onSave,
  validate,
  inputType = "text",
  options,
  isLink,
  isActiveEditing,
  isAnyEditing,
  onActivate,
  onDeactivate,
}: FieldRowProps) {
  const isEmpty = !value;

  if (!isEditMode && isEmpty && !emptyText) return null;
  if (!isOwner && isEmpty) return null;

  if (isEditMode && isOwner && isActiveEditing) {
    // 日期选择器宽度固定，直接在右侧内联展示，无需跳到第二行
    if (inputType === "date") {
      return (
        <div className="flex min-h-[48px] items-center border-b border-border px-4 py-2 last:border-b-0">
          <div className="flex w-[120px] shrink-0 items-center gap-2.5">
            {icon && (
              <SvgIcon
                name={icon}
                size={20}
                className={cn("shrink-0", iconColor ?? "text-primary")}
              />
            )}
            <span className="text-sm font-medium text-primary">{label}</span>
          </div>
          <div className="flex flex-1 items-center justify-end">
            <InlineDateEditor
              initialValue={value ?? ""}
              onSave={async (v) => {
                await onSave(v);
                onDeactivate();
              }}
              onCancel={onDeactivate}
            />
          </div>
        </div>
      );
    }

    return (
      <div className="border-b border-border px-4 py-3 last:border-b-0">
        <div className="mb-2 flex items-center gap-2.5">
          {icon && (
            <SvgIcon
              name={icon}
              size={20}
              className={cn("shrink-0", iconColor ?? "text-primary")}
            />
          )}
          <span className="text-sm font-medium text-primary">{label}</span>
        </div>
        {options ? (
          <SelectInlineEditor
            initialValue={value ?? ""}
            options={options}
            onSave={async (v) => {
              await onSave(v);
              onDeactivate();
            }}
            onCancel={onDeactivate}
          />
        ) : (
          <InlineFieldEditor
            initialValue={value ?? ""}
            onSave={async (v) => {
              await onSave(v);
              onDeactivate();
            }}
            onCancel={onDeactivate}
            validate={validate}
            inputType={inputType}
          />
        )}
      </div>
    );
  }

  return (
    <div className="flex min-h-[48px] items-center border-b border-border px-4 py-2 last:border-b-0">
      {/* 左：图标 + 标签 */}
      <div className="flex w-[120px] shrink-0 items-center gap-2.5">
        {icon && (
          <SvgIcon
            name={icon}
            size={20}
            className={cn("shrink-0", iconColor ?? "text-muted-foreground")}
          />
        )}
        <span className="text-[13px] text-muted-foreground">{label}</span>
      </div>

      {/* 右：值 + 编辑按钮 */}
      <div className="flex flex-1 items-center justify-end gap-1.5">
        <span
          className={cn(
            "min-w-0 flex-1 truncate text-right text-[13px]",
            isEmpty
              ? "italic text-muted-foreground/40"
              : isLink
                ? "text-primary"
                : "text-foreground",
          )}
        >
          {displayValue ?? value ?? (isEditMode && isOwner && emptyText ? emptyText : "—")}
        </span>
        {isEditMode && isOwner && (
          <button
            type="button"
            onClick={onActivate}
            disabled={isAnyEditing && !isActiveEditing}
            aria-label={`编辑${label}`}
            className={cn(
              "flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors",
              isAnyEditing && !isActiveEditing
                ? "cursor-not-allowed text-muted-foreground/20"
                : "text-muted-foreground/40 hover:bg-primary/10 hover:text-primary",
            )}
          >
            <SvgIcon name="pen" size={14} />
          </button>
        )}
      </div>
    </div>
  );
}
