import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ArticleTag } from "../editor-options";

export const ARTICLE_EDITOR_AUTOSAVE_DELAY_MS = 1000;

const ARTICLE_EDITOR_AUTOSAVE_SCHEMA_VERSION = 1;
const ARTICLE_EDITOR_AUTOSAVE_PREFIX = "admin:article-editor:draft:";
const ARTICLE_EDITOR_AUTOSAVE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export interface ArticleEditorAutosaveFormState {
  title: string;
  description: string;
  content: string;
  coverUrl: string;
  categoryId: number | null;
  selectedTags: ArticleTag[];
  musicId: number | null;
  commentStatus: 0 | 1;
}

type AutosaveStatus =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "saved"; savedAt: Date }
  | { kind: "restored" }
  | { kind: "error" };

interface ArticleEditorAutosaveRecord {
  schemaVersion: 1;
  updatedAt: string;
  form: ArticleEditorAutosaveFormState;
}

interface UseArticleEditorAutosaveOptions {
  articleId: number | undefined;
  isReady: boolean;
  remoteUpdatedAt?: string;
  value: ArticleEditorAutosaveFormState;
  onRestore: (value: ArticleEditorAutosaveFormState) => void;
}

export function getArticleEditorAutosaveKey(articleId: number | undefined) {
  return `${ARTICLE_EDITOR_AUTOSAVE_PREFIX}${articleId ?? "new"}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isArticleTag(value: unknown): value is ArticleTag {
  return (
    isRecord(value) &&
    typeof value.id === "number" &&
    Number.isFinite(value.id) &&
    typeof value.label === "string"
  );
}

function isCommentStatus(value: unknown): value is 0 | 1 {
  return value === 0 || value === 1;
}

function parseForm(value: unknown): ArticleEditorAutosaveFormState | null {
  if (!isRecord(value)) return null;
  if (
    typeof value.title !== "string" ||
    typeof value.description !== "string" ||
    typeof value.content !== "string" ||
    typeof value.coverUrl !== "string" ||
    !Array.isArray(value.selectedTags) ||
    !isCommentStatus(value.commentStatus)
  ) {
    return null;
  }

  const categoryId =
    typeof value.categoryId === "number" && Number.isInteger(value.categoryId)
      ? value.categoryId
      : null;
  const musicId =
    typeof value.musicId === "number" && Number.isInteger(value.musicId) ? value.musicId : null;
  const selectedTags = value.selectedTags.filter(isArticleTag);

  return {
    title: value.title,
    description: value.description,
    content: value.content,
    coverUrl: value.coverUrl,
    categoryId,
    selectedTags,
    musicId,
    commentStatus: value.commentStatus,
  };
}

function parseAutosaveRecord(raw: string): ArticleEditorAutosaveRecord | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return null;
    if (
      parsed.schemaVersion !== ARTICLE_EDITOR_AUTOSAVE_SCHEMA_VERSION ||
      typeof parsed.updatedAt !== "string"
    ) {
      return null;
    }

    const form = parseForm(parsed.form);
    if (!form) return null;

    return {
      schemaVersion: ARTICLE_EDITOR_AUTOSAVE_SCHEMA_VERSION,
      updatedAt: parsed.updatedAt,
      form,
    };
  } catch {
    return null;
  }
}

function removeAutosaveRecord(key: string) {
  try {
    localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

function readAutosaveRecord(key: string): ArticleEditorAutosaveRecord | null {
  const raw = localStorage.getItem(key);
  if (!raw) return null;

  const record = parseAutosaveRecord(raw);
  if (!record) {
    removeAutosaveRecord(key);
    return null;
  }

  const updatedAt = Date.parse(record.updatedAt);
  if (Number.isNaN(updatedAt) || Date.now() - updatedAt > ARTICLE_EDITOR_AUTOSAVE_TTL_MS) {
    removeAutosaveRecord(key);
    return null;
  }

  return record;
}

function isAutosaveNewerThanRemote(autosaveUpdatedAt: string, remoteUpdatedAt?: string) {
  if (!remoteUpdatedAt) return true;

  const autosaveTime = Date.parse(autosaveUpdatedAt);
  const remoteTime = Date.parse(remoteUpdatedAt);
  if (Number.isNaN(autosaveTime)) return false;
  if (Number.isNaN(remoteTime)) return true;

  return autosaveTime > remoteTime;
}

function getStatusText(status: AutosaveStatus) {
  switch (status.kind) {
    case "saving":
      return "本机备份中...";
    case "saved":
      return `已本机备份 ${status.savedAt.toLocaleTimeString("zh-CN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      })}`;
    case "restored":
      return "已恢复意外关闭前的内容";
    case "error":
      return "本机备份失败";
    case "idle":
    default:
      return "本机备份待命";
  }
}

function isMeaningfulDraft(value: ArticleEditorAutosaveFormState) {
  return (
    value.title.trim() !== "" ||
    value.description.trim() !== "" ||
    value.content.trim() !== "" ||
    value.coverUrl.trim() !== "" ||
    value.selectedTags.length > 0 ||
    value.musicId !== null
  );
}

function areTagsEqual(left: ArticleTag[], right: ArticleTag[]) {
  if (left.length !== right.length) return false;

  return left.every((tag, index) => {
    const other = right[index];
    return other !== undefined && tag.id === other.id && tag.label === other.label;
  });
}

function areFormsEqual(
  left: ArticleEditorAutosaveFormState | null,
  right: ArticleEditorAutosaveFormState | null,
) {
  if (left === null || right === null) return false;

  return (
    left.title === right.title &&
    left.description === right.description &&
    left.content === right.content &&
    left.coverUrl === right.coverUrl &&
    left.categoryId === right.categoryId &&
    left.musicId === right.musicId &&
    left.commentStatus === right.commentStatus &&
    areTagsEqual(left.selectedTags, right.selectedTags)
  );
}

export function useArticleEditorAutosave({
  articleId,
  isReady,
  remoteUpdatedAt,
  value,
  onRestore,
}: UseArticleEditorAutosaveOptions) {
  const storageKey = useMemo(() => getArticleEditorAutosaveKey(articleId), [articleId]);
  const [status, setStatus] = useState<AutosaveStatus>({ kind: "idle" });
  const [restoreCheckVersion, setRestoreCheckVersion] = useState(0);
  const checkedStorageKeyRef = useRef<string | null>(null);
  const baselineFormRef = useRef<ArticleEditorAutosaveFormState | null>(null);
  const restoredFormRef = useRef<ArticleEditorAutosaveFormState | null>(null);

  useEffect(() => {
    checkedStorageKeyRef.current = null;
    baselineFormRef.current = null;
    restoredFormRef.current = null;
    setRestoreCheckVersion((version) => version + 1);
    setStatus({ kind: "idle" });
  }, [storageKey]);

  useEffect(() => {
    if (!isReady || checkedStorageKeyRef.current !== storageKey) return;

    if (areFormsEqual(value, restoredFormRef.current)) {
      return;
    }

    if (areFormsEqual(value, baselineFormRef.current) || !isMeaningfulDraft(value)) {
      removeAutosaveRecord(storageKey);
      return;
    }

    setStatus({ kind: "saving" });
    const timerId = window.setTimeout(() => {
      try {
        const updatedAt = new Date();
        const record: ArticleEditorAutosaveRecord = {
          schemaVersion: ARTICLE_EDITOR_AUTOSAVE_SCHEMA_VERSION,
          updatedAt: updatedAt.toISOString(),
          form: value,
        };
        localStorage.setItem(storageKey, JSON.stringify(record));
        restoredFormRef.current = null;
        setStatus({ kind: "saved", savedAt: updatedAt });
      } catch {
        setStatus({ kind: "error" });
      }
    }, ARTICLE_EDITOR_AUTOSAVE_DELAY_MS);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [isReady, restoreCheckVersion, storageKey, value]);

  useEffect(() => {
    if (!isReady || checkedStorageKeyRef.current === storageKey) return;

    checkedStorageKeyRef.current = storageKey;
    baselineFormRef.current = value;

    try {
      const record = readAutosaveRecord(storageKey);
      if (!record) {
        setStatus({ kind: "idle" });
        setRestoreCheckVersion((version) => version + 1);
        return;
      }

      if (!isAutosaveNewerThanRemote(record.updatedAt, remoteUpdatedAt)) {
        removeAutosaveRecord(storageKey);
        setStatus({ kind: "idle" });
        setRestoreCheckVersion((version) => version + 1);
        return;
      }

      onRestore(record.form);
      restoredFormRef.current = record.form;
      setStatus({ kind: "restored" });
      setRestoreCheckVersion((version) => version + 1);
    } catch {
      setStatus({ kind: "error" });
      setRestoreCheckVersion((version) => version + 1);
    }
  }, [isReady, onRestore, remoteUpdatedAt, storageKey, value]);

  const clearBackup = useCallback(() => {
    setStatus(removeAutosaveRecord(storageKey) ? { kind: "idle" } : { kind: "error" });
  }, [storageKey]);

  return {
    statusText: getStatusText(status),
    clearBackup,
  };
}
