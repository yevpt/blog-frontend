"use client";

import { useState, type Key } from "react";
import { Select } from "@repo/ui";
import { apiJson, getApiErrorMessage } from "@/lib/client-fetch";
import { addToast } from "@/lib/toast";

/** 对外展示邮箱的可选值。 */
export type EmailDisplayValue = "main" | "sub" | "none";

interface EmailDisplaySelectProps {
  /** 当前对外展示设置 */
  value: EmailDisplayValue;
  /** 副邮箱是否存在；不存在时禁用「副邮箱」选项 */
  subEmailExists: boolean;
  /** 设置成功后回调（用于刷新列表） */
  onChanged: () => void;
}

/** 选项文案，单一来源。 */
const DISPLAY_LABEL: Record<EmailDisplayValue, string> = {
  main: "主邮箱",
  sub: "副邮箱",
  none: "不展示",
};

const DISPLAY_OPTIONS: EmailDisplayValue[] = ["main", "sub", "none"];

/** 守卫：仅接受合法展示值，避免 react-aria Key 透传脏值。 */
function isDisplayValue(key: Key | null): key is EmailDisplayValue {
  return key === "main" || key === "sub" || key === "none";
}

/**
 * 对外展示邮箱下拉：变更即乐观更新本地选中值并调后端，失败回滚 + toast。
 * mailShow 数值 ↔ 展示值映射由调用方（security-list）负责，本组件只认 main/sub/none。
 */
export function EmailDisplaySelect({ value, subEmailExists, onChanged }: EmailDisplaySelectProps) {
  const [selected, setSelected] = useState<EmailDisplayValue>(value);
  const [saving, setSaving] = useState(false);

  async function handleChange(key: Key | null) {
    if (!isDisplayValue(key)) return;
    if (key === selected) return;

    const prev = selected;
    // 乐观更新本地选中值
    setSelected(key);
    setSaving(true);
    try {
      await apiJson<void>("/api/users/me/email/display", {
        method: "PATCH",
        body: JSON.stringify({ display: key }),
      });
      onChanged();
    } catch (err) {
      // 失败回滚本地值并提示
      setSelected(prev);
      addToast(getApiErrorMessage(err, "设置失败"), "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Select
      aria-label="对外展示邮箱"
      size="sm"
      selectedKey={selected}
      isDisabled={saving}
      onSelectionChange={(key) => void handleChange(key)}
    >
      {DISPLAY_OPTIONS.map((option) => (
        <Select.Item
          key={option}
          id={option}
          label={DISPLAY_LABEL[option]}
          // 副邮箱不存在时禁用该选项
          isDisabled={option === "sub" && !subEmailExists}
        />
      ))}
    </Select>
  );
}
