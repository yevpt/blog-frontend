import { useState } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";

const compressImage = vi.fn();
vi.mock("@/lib/compress-image", () => ({ compressImage: (f: File) => compressImage(f), MAX_IMAGE_BYTES: 1048576 }));
const addToast = vi.fn();
vi.mock("@/lib/toast", () => ({ addToast: (...a: unknown[]) => addToast(...a) }));

import { SnippetImageUploader, type SnippetImageItem } from "./snippet-image-uploader";

function img(name = "a.png"): File { return new File([new Uint8Array(10)], name, { type: "image/png" }); }

// 真实 stateful 宿主：让函数式更新得到真正执行，验证并发选图不丢图
function Harness({ initial = [] as SnippetImageItem[] }) {
  const [items, setItems] = useState<SnippetImageItem[]>(initial);
  return <SnippetImageUploader items={items} onChange={setItems} />;
}

beforeEach(() => {
  compressImage.mockReset();
  addToast.mockReset();
  let n = 0;
  (URL as any).createObjectURL = vi.fn(() => "blob:preview" + n++);
  (URL as any).revokeObjectURL = vi.fn();
  if (!globalThis.crypto?.randomUUID) {
    (globalThis as any).crypto = { ...(globalThis.crypto ?? {}), randomUUID: () => Math.random().toString(36).slice(2) };
  }
});

describe("SnippetImageUploader", () => {
  it("选图后压缩并新增一个缩略图（带删除键）", async () => {
    const user = userEvent.setup();
    compressImage.mockImplementation(async (f: File) => f);
    render(<Harness />);
    const input = screen.getByTestId("snippet-image-input") as HTMLInputElement;
    await user.upload(input, img());
    expect(await screen.findByRole("button", { name: "删除图片" })).toBeInTheDocument();
  });

  it("选图后立即显示加载占位，压缩完成后替换为缩略图", async () => {
    const user = userEvent.setup();
    let resolveCompress!: () => void;
    compressImage.mockImplementation(
      (f: File) => new Promise<File>((r) => { resolveCompress = () => r(f); }),
    );
    render(<Harness />);
    await user.upload(screen.getByTestId("snippet-image-input") as HTMLInputElement, img());
    // 压缩未完成：加载占位出现，缩略图尚未出现
    expect(await screen.findByLabelText("图片处理中")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "删除图片" })).not.toBeInTheDocument();
    // 压缩完成：占位消失，缩略图出现
    resolveCompress();
    expect(await screen.findByRole("button", { name: "删除图片" })).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByLabelText("图片处理中")).not.toBeInTheDocument());
  });

  it("连续两次选图各一张应累计 2 张缩略图（不因过期闭包丢图）", async () => {
    const user = userEvent.setup();
    compressImage.mockImplementation(async (f: File) => f);
    render(<Harness />);
    const input = screen.getByTestId("snippet-image-input") as HTMLInputElement;
    await user.upload(input, img("1.png"));
    await user.upload(input, img("2.png"));
    await waitFor(() => expect(screen.getAllByRole("button", { name: "删除图片" })).toHaveLength(2));
  });

  it("一次选 10 张时最多保留 9 张", async () => {
    const user = userEvent.setup();
    compressImage.mockImplementation(async (f: File) => f);
    render(<Harness />);
    const input = screen.getByTestId("snippet-image-input") as HTMLInputElement;
    const files = Array.from({ length: 10 }, (_, i) => img(`${i}.png`));
    await user.upload(input, files);
    await waitFor(() => expect(screen.getAllByRole("button", { name: "删除图片" })).toHaveLength(9));
  });

  it("已有 9 张时不再渲染「添加」格", () => {
    const nine: SnippetImageItem[] = Array.from({ length: 9 }, (_, i) => ({ id: String(i), file: img(), previewUrl: "blob:" + i }));
    render(<SnippetImageUploader items={nine} onChange={() => {}} />);
    expect(screen.queryByRole("button", { name: "添加图片" })).not.toBeInTheDocument();
  });

  it("点击删除键移除该图并 revoke 预览 URL", async () => {
    const user = userEvent.setup();
    render(<Harness initial={[{ id: "1", file: img(), previewUrl: "blob:1" }]} />);
    expect(screen.getByRole("button", { name: "删除图片" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "删除图片" }));
    await waitFor(() => expect(screen.queryByRole("button", { name: "删除图片" })).not.toBeInTheDocument());
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:1");
  });

  it("压缩失败时 toast 报错且不新增", async () => {
    const user = userEvent.setup();
    compressImage.mockRejectedValue(new Error("只能添加图片"));
    render(<Harness />);
    await user.upload(screen.getByTestId("snippet-image-input") as HTMLInputElement, img());
    await waitFor(() => expect(addToast).toHaveBeenCalledWith("只能添加图片", "error"));
    expect(screen.queryByRole("button", { name: "删除图片" })).not.toBeInTheDocument();
  });
});
