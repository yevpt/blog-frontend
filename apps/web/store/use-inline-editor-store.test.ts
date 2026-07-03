import { describe, it, expect, beforeEach } from "vitest";
import { useInlineEditorStore } from "./use-inline-editor-store";

describe("useInlineEditorStore", () => {
  beforeEach(() => {
    useInlineEditorStore.setState({ editors: {} });
  });

  it("初始状态没有任何 editor", () => {
    expect(useInlineEditorStore.getState().editors).toEqual({});
  });

  it("open() 写入 isOpen=true 和初始内容", () => {
    useInlineEditorStore.getState().open("k1", "草稿");
    expect(useInlineEditorStore.getState().editors.k1).toEqual({ isOpen: true, content: "草稿" });
  });

  it("open() 不传初始内容时 content 为空字符串", () => {
    useInlineEditorStore.getState().open("k1");
    expect(useInlineEditorStore.getState().editors.k1).toEqual({ isOpen: true, content: "" });
  });

  it("setContent() 更新已存在 key 的内容", () => {
    useInlineEditorStore.getState().open("k1", "草稿");
    useInlineEditorStore.getState().setContent("k1", "改过的草稿");
    expect(useInlineEditorStore.getState().editors.k1?.content).toBe("改过的草稿");
    expect(useInlineEditorStore.getState().editors.k1?.isOpen).toBe(true);
  });

  it("setContent() 对不存在的 key 不做任何事", () => {
    useInlineEditorStore.getState().setContent("missing", "内容");
    expect(useInlineEditorStore.getState().editors.missing).toBeUndefined();
  });

  it("close() 删除该 key", () => {
    useInlineEditorStore.getState().open("k1", "草稿");
    useInlineEditorStore.getState().close("k1");
    expect(useInlineEditorStore.getState().editors.k1).toBeUndefined();
  });

  it("submitSuccess() 删除该 key", () => {
    useInlineEditorStore.getState().open("k1", "草稿");
    useInlineEditorStore.getState().submitSuccess("k1");
    expect(useInlineEditorStore.getState().editors.k1).toBeUndefined();
  });

  it("discardAll() 清空所有 key", () => {
    useInlineEditorStore.getState().open("k1", "草稿1");
    useInlineEditorStore.getState().open("k2", "草稿2");
    useInlineEditorStore.getState().discardAll();
    expect(useInlineEditorStore.getState().editors).toEqual({});
  });

  it("不同 key 互不影响", () => {
    useInlineEditorStore.getState().open("k1", "草稿1");
    useInlineEditorStore.getState().open("k2", "草稿2");
    useInlineEditorStore.getState().close("k1");
    expect(useInlineEditorStore.getState().editors.k1).toBeUndefined();
    expect(useInlineEditorStore.getState().editors.k2).toEqual({ isOpen: true, content: "草稿2" });
  });
});
