import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";

const compressImage = vi.fn();
vi.mock("@/lib/compress-image", () => ({ compressImage: (f: File) => compressImage(f), MAX_IMAGE_BYTES: 1048576 }));
const addToast = vi.fn();
vi.mock("@/lib/toast", () => ({ addToast: (...a: unknown[]) => addToast(...a) }));

import { SnippetImageUploader, type SnippetImageItem } from "./snippet-image-uploader";

function img(name = "a.png"): File { return new File([new Uint8Array(10)], name, { type: "image/png" }); }

beforeEach(() => {
  compressImage.mockReset();
  addToast.mockReset();
  (URL as any).createObjectURL = vi.fn(() => "blob:preview");
  (URL as any).revokeObjectURL = vi.fn();
  if (!globalThis.crypto?.randomUUID) {
    (globalThis as any).crypto = { ...(globalThis.crypto ?? {}), randomUUID: () => Math.random().toString(36).slice(2) };
  }
});

describe("SnippetImageUploader", () => {
  it("选图后压缩并新增一个缩略图（带删除键）", async () => {
    const user = userEvent.setup();
    compressImage.mockImplementation(async (f: File) => f);
    let items: SnippetImageItem[] = [];
    const onChange = vi.fn((next: SnippetImageItem[]) => { items = next; });
    const { rerender } = render(<SnippetImageUploader items={items} onChange={onChange} />);
    const input = screen.getByTestId("snippet-image-input") as HTMLInputElement;
    await user.upload(input, img());
    await waitFor(() => expect(onChange).toHaveBeenCalled());
    rerender(<SnippetImageUploader items={items} onChange={onChange} />);
    expect(screen.getByRole("button", { name: "删除图片" })).toBeInTheDocument();
  });

  it("已有 9 张时不再渲染「添加」格", () => {
    const nine: SnippetImageItem[] = Array.from({ length: 9 }, (_, i) => ({ id: String(i), file: img(), previewUrl: "blob:" + i }));
    render(<SnippetImageUploader items={nine} onChange={() => {}} />);
    expect(screen.queryByRole("button", { name: "添加图片" })).not.toBeInTheDocument();
  });

  it("点击删除键移除该图并 revoke 预览 URL", async () => {
    const user = userEvent.setup();
    const items: SnippetImageItem[] = [{ id: "1", file: img(), previewUrl: "blob:1" }];
    const onChange = vi.fn();
    render(<SnippetImageUploader items={items} onChange={onChange} />);
    await user.click(screen.getByRole("button", { name: "删除图片" }));
    expect(onChange).toHaveBeenCalledWith([]);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:1");
  });

  it("压缩失败时 toast 报错且不新增", async () => {
    const user = userEvent.setup();
    compressImage.mockRejectedValue(new Error("只能添加图片"));
    const onChange = vi.fn();
    render(<SnippetImageUploader items={[]} onChange={onChange} />);
    await user.upload(screen.getByTestId("snippet-image-input") as HTMLInputElement, img());
    await waitFor(() => expect(addToast).toHaveBeenCalledWith("只能添加图片", "error"));
    expect(onChange).not.toHaveBeenCalled();
  });
});
