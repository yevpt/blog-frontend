import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import {
  ARTICLE_EDITOR_AUTOSAVE_DELAY_MS,
  getArticleEditorAutosaveKey,
  useArticleEditorAutosave,
  type ArticleEditorAutosaveFormState,
} from "./use-article-editor-autosave";

const autosaveTestTime = new Date("2026-06-24T08:00:00.000Z");

function formatAutosaveStatusTime(date: Date) {
  return date.toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

const baseState: ArticleEditorAutosaveFormState = {
  title: "",
  description: "",
  content: "",
  coverUrl: "",
  categoryId: 1,
  selectedTags: [],
  musicId: null,
  commentStatus: 1,
};

function getStoredValue(key: string) {
  const raw = localStorage.getItem(key);
  expect(raw).toBeTruthy();
  return JSON.parse(raw ?? "{}") as { updatedAt: string; form: ArticleEditorAutosaveFormState };
}

describe("useArticleEditorAutosave", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(autosaveTestTime);
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("内容变化后 debounce 写入本机备份并显示本机文案", async () => {
    const onRestore = vi.fn();
    const { result, rerender } = renderHook(
      ({ value }) =>
        useArticleEditorAutosave({
          articleId: undefined,
          isReady: true,
          value,
          onRestore,
        }),
      { initialProps: { value: baseState } },
    );

    await act(async () => undefined);
    expect(result.current.statusText).toBe("本机备份待命");

    rerender({ value: { ...baseState, title: "本机标题" } });
    await act(async () => undefined);
    expect(result.current.statusText).toBe("本机备份中...");

    await act(async () => {
      vi.advanceTimersByTime(ARTICLE_EDITOR_AUTOSAVE_DELAY_MS);
    });

    const stored = getStoredValue(getArticleEditorAutosaveKey(undefined));
    expect(stored.form.title).toBe("本机标题");
    expect(result.current.statusText).toBe(
      `已本机备份 ${formatAutosaveStatusTime(autosaveTestTime)}`,
    );
  });

  it("频繁输入时直到 debounce 触发才序列化本机备份", async () => {
    const stringifySpy = vi.spyOn(JSON, "stringify");
    const { rerender } = renderHook(
      ({ value }) =>
        useArticleEditorAutosave({
          articleId: undefined,
          isReady: true,
          value,
          onRestore: vi.fn(),
        }),
      { initialProps: { value: baseState } },
    );

    await act(async () => undefined);
    stringifySpy.mockClear();

    rerender({ value: { ...baseState, content: "第一段正文" } });
    rerender({ value: { ...baseState, content: "第一段正文继续输入" } });
    await act(async () => undefined);

    expect(stringifySpy).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(ARTICLE_EDITOR_AUTOSAVE_DELAY_MS);
    });

    expect(stringifySpy).toHaveBeenCalledTimes(1);
    stringifySpy.mockRestore();
  });

  it("新建文章加载时恢复本机备份", async () => {
    const key = getArticleEditorAutosaveKey(undefined);
    localStorage.setItem(
      key,
      JSON.stringify({
        schemaVersion: 1,
        updatedAt: "2026-06-24T07:59:00.000Z",
        form: { ...baseState, title: "意外关闭前的标题" },
      }),
    );
    const onRestore = vi.fn();

    const { result } = renderHook(() =>
      useArticleEditorAutosave({
        articleId: undefined,
        isReady: true,
        value: baseState,
        onRestore,
      }),
    );

    await act(async () => undefined);
    expect(onRestore).toHaveBeenCalledWith({ ...baseState, title: "意外关闭前的标题" });
    expect(result.current.statusText).toBe("已恢复意外关闭前的内容");
  });

  it("编辑文章只恢复比远端更新的本机备份", async () => {
    const key = getArticleEditorAutosaveKey(12);
    localStorage.setItem(
      key,
      JSON.stringify({
        schemaVersion: 1,
        updatedAt: "2026-06-24T08:10:00.000Z",
        form: { ...baseState, title: "较新的本机标题" },
      }),
    );
    const onRestore = vi.fn();

    renderHook(() =>
      useArticleEditorAutosave({
        articleId: 12,
        isReady: true,
        remoteUpdatedAt: "2026-06-24T08:00:00.000Z",
        value: baseState,
        onRestore,
      }),
    );

    await act(async () => undefined);
    expect(onRestore).toHaveBeenCalledWith({ ...baseState, title: "较新的本机标题" });
  });

  it("远端比本机备份更新时使用远端并清理过期备份", async () => {
    const key = getArticleEditorAutosaveKey(12);
    localStorage.setItem(
      key,
      JSON.stringify({
        schemaVersion: 1,
        updatedAt: "2026-06-24T08:00:00.000Z",
        form: { ...baseState, title: "较旧的本机标题" },
      }),
    );
    const onRestore = vi.fn();

    renderHook(() =>
      useArticleEditorAutosave({
        articleId: 12,
        isReady: true,
        remoteUpdatedAt: "2026-06-24T08:30:00.000Z",
        value: baseState,
        onRestore,
      }),
    );

    await act(async () => undefined);
    expect(localStorage.getItem(key)).toBeNull();
    expect(onRestore).not.toHaveBeenCalled();
  });

  it("clearBackup 清理当前文章的本机备份", async () => {
    const key = getArticleEditorAutosaveKey(12);
    localStorage.setItem(
      key,
      JSON.stringify({
        schemaVersion: 1,
        updatedAt: "2026-06-24T08:00:00.000Z",
        form: { ...baseState, title: "待清理" },
      }),
    );

    const { result } = renderHook(() =>
      useArticleEditorAutosave({
        articleId: 12,
        isReady: true,
        remoteUpdatedAt: "2026-06-24T08:30:00.000Z",
        value: baseState,
        onRestore: vi.fn(),
      }),
    );

    act(() => {
      result.current.clearBackup();
    });

    expect(localStorage.getItem(key)).toBeNull();
  });
});
