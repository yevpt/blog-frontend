import { useState, type ReactNode } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";

const dndState = vi.hoisted(() => ({
  lastDndContextProps: null as { autoScroll?: boolean } | null,
}));

const compressImage = vi.fn();
vi.mock("@/lib/compress-image", () => ({
  compressImage: (f: File) => compressImage(f),
  MAX_IMAGE_BYTES: 1048576,
  USER_FACING_IMAGE_ERROR_PREFIXES: [
    "只能上传图片文件",
    "不支持",
    "图片文件为空",
    "图片过大",
    "图片无法读取",
    "HEIC 图片转换失败",
  ],
}));
const addToast = vi.fn();
vi.mock("@/lib/toast", () => ({ addToast: (...a: unknown[]) => addToast(...a) }));
vi.mock("@dnd-kit/core", () => ({
  DndContext: ({ children, autoScroll }: { children: ReactNode; autoScroll?: boolean }) => {
    dndState.lastDndContextProps = { autoScroll };
    return <>{children}</>;
  },
  KeyboardSensor: function KeyboardSensor() {},
  MouseSensor: function MouseSensor() {},
  TouchSensor: function TouchSensor() {},
  closestCenter: vi.fn(),
  useSensor: vi.fn((sensor: unknown, options?: unknown) => ({ sensor, options })),
  useSensors: vi.fn((...sensors: unknown[]) => sensors),
}));
vi.mock("@dnd-kit/sortable", () => ({
  SortableContext: ({ children }: { children: ReactNode }) => <>{children}</>,
  rectSortingStrategy: vi.fn(),
  sortableKeyboardCoordinates: vi.fn(),
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: undefined,
    isDragging: false,
  }),
}));
vi.mock("@dnd-kit/utilities", () => ({
  CSS: { Transform: { toString: () => undefined } },
}));

import { SnippetImageUploader } from "./snippet-image-uploader";
import type { SnippetImageItem } from "./types";

function img(name = "a.png"): File {
  return new File([new Uint8Array(10)], name, { type: "image/png" });
}

// 真实 stateful 宿主：让函数式更新得到真正执行，验证并发选图不丢图
function Harness({ initial = [] as SnippetImageItem[] }) {
  const [items, setItems] = useState<SnippetImageItem[]>(initial);
  return <SnippetImageUploader items={items} onChange={setItems} />;
}

beforeEach(() => {
  compressImage.mockReset();
  addToast.mockReset();
  dndState.lastDndContextProps = null;
  let n = 0;
  Object.defineProperty(URL, "createObjectURL", {
    configurable: true,
    value: vi.fn(() => "blob:preview" + n++),
  });
  Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: vi.fn() });
  if (!globalThis.crypto?.randomUUID) {
    Object.defineProperty(globalThis, "crypto", {
      configurable: true,
      value: {
        ...(globalThis.crypto ?? {}),
        randomUUID: () => Math.random().toString(36).slice(2),
      },
    });
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
      (f: File) =>
        new Promise<File>((r) => {
          resolveCompress = () => r(f);
        }),
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
    await waitFor(() =>
      expect(screen.getAllByRole("button", { name: "删除图片" })).toHaveLength(2),
    );
  });

  it("一次选 10 张时最多保留 9 张", async () => {
    const user = userEvent.setup();
    compressImage.mockImplementation(async (f: File) => f);
    render(<Harness />);
    const input = screen.getByTestId("snippet-image-input") as HTMLInputElement;
    const files = Array.from({ length: 10 }, (_, i) => img(`${i}.png`));
    await user.upload(input, files);
    await waitFor(() =>
      expect(screen.getAllByRole("button", { name: "删除图片" })).toHaveLength(9),
    );
  });

  it("重复选择同名文件不会重复添加", async () => {
    const user = userEvent.setup();
    compressImage.mockImplementation(async (f: File) => f);
    render(<Harness />);
    const input = screen.getByTestId("snippet-image-input") as HTMLInputElement;
    await user.upload(input, img("dup.png"));
    expect(await screen.findByRole("button", { name: "删除图片" })).toBeInTheDocument();
    await user.upload(input, img("dup.png"));
    await waitFor(() =>
      expect(screen.getAllByRole("button", { name: "删除图片" })).toHaveLength(1),
    );
  });

  it("已有 9 张时不再渲染「添加」格", () => {
    const nine: SnippetImageItem[] = Array.from({ length: 9 }, (_, i) => ({
      id: String(i),
      file: img(),
      previewUrl: "blob:" + i,
    }));
    render(<SnippetImageUploader items={nine} onChange={() => {}} />);
    expect(screen.queryByRole("button", { name: "添加图片" })).not.toBeInTheDocument();
  });

  it("图片排序禁用 DnD 自动滚动，避免拖拽时撑高弹窗滚动区域", () => {
    render(
      <SnippetImageUploader
        items={[{ id: "1", file: img(), previewUrl: "blob:1" }]}
        onChange={() => {}}
      />,
    );
    expect(dndState.lastDndContextProps?.autoScroll).toBe(false);
  });

  it("点击删除键移除该图并 revoke 预览 URL", async () => {
    const user = userEvent.setup();
    render(<Harness initial={[{ id: "1", file: img(), previewUrl: "blob:1" }]} />);
    expect(screen.getByRole("button", { name: "删除图片" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "删除图片" }));
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: "删除图片" })).not.toBeInTheDocument(),
    );
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:1");
  });

  it("压缩失败时 toast 报错且不新增", async () => {
    const user = userEvent.setup();
    compressImage.mockRejectedValue(
      new Error("只能上传图片文件，请选择 JPG、PNG、WebP 或 HEIC/HEIF 图片"),
    );
    render(<Harness />);
    await user.upload(screen.getByTestId("snippet-image-input") as HTMLInputElement, img());
    await waitFor(() =>
      expect(addToast).toHaveBeenCalledWith(
        "只能上传图片文件，请选择 JPG、PNG、WebP 或 HEIC/HEIF 图片",
        "error",
      ),
    );
    expect(screen.queryByRole("button", { name: "删除图片" })).not.toBeInTheDocument();
  });

  it("iOS 缺少 crypto.randomUUID 时仍可添加图片", async () => {
    const user = userEvent.setup();
    Object.defineProperty(globalThis, "crypto", {
      configurable: true,
      value: { getRandomValues: vi.fn((array: Uint8Array) => array.fill(1)) },
    });
    compressImage.mockImplementation(async (f: File) => f);

    render(<Harness />);
    await user.upload(screen.getByTestId("snippet-image-input") as HTMLInputElement, img());

    expect(await screen.findByRole("button", { name: "删除图片" })).toBeInTheDocument();
    expect(addToast).not.toHaveBeenCalled();
  });

  it("内部异常不向用户透出原始错误", async () => {
    const user = userEvent.setup();
    compressImage.mockRejectedValue(new TypeError("crypto.randomUUID is not a function"));

    render(<Harness />);
    await user.upload(screen.getByTestId("snippet-image-input") as HTMLInputElement, img());

    await waitFor(() => expect(addToast).toHaveBeenCalledWith("图片处理失败，请重试", "error"));
  });

  it("HEIC 转换失败时展示可操作提示", async () => {
    const user = userEvent.setup();
    compressImage.mockRejectedValue(new Error("HEIC 图片转换失败，请换一张或转为 JPG 后上传"));

    render(<Harness />);
    await user.upload(
      screen.getByTestId("snippet-image-input") as HTMLInputElement,
      img("photo.heic"),
    );

    await waitFor(() =>
      expect(addToast).toHaveBeenCalledWith(
        "HEIC 图片转换失败，请换一张或转为 JPG 后上传",
        "error",
      ),
    );
  });

  it("图片格式和文件内容错误直接展示具体原因", async () => {
    const user = userEvent.setup();
    compressImage.mockRejectedValue(
      new Error("不支持 SVG 格式，请上传 JPG、PNG、WebP 或 HEIC/HEIF 图片"),
    );

    render(<Harness />);
    await user.upload(
      screen.getByTestId("snippet-image-input") as HTMLInputElement,
      img("vector.svg"),
    );

    await waitFor(() =>
      expect(addToast).toHaveBeenCalledWith(
        "不支持 SVG 格式，请上传 JPG、PNG、WebP 或 HEIC/HEIF 图片",
        "error",
      ),
    );
  });

  it("图片无法读取时展示具体原因", async () => {
    const user = userEvent.setup();
    compressImage.mockRejectedValue(
      new Error("图片无法读取，请确认文件未损坏，并尝试换一张 JPG、PNG、WebP 或 HEIC/HEIF 图片"),
    );

    render(<Harness />);
    await user.upload(
      screen.getByTestId("snippet-image-input") as HTMLInputElement,
      img("broken.png"),
    );

    await waitFor(() =>
      expect(addToast).toHaveBeenCalledWith(
        "图片无法读取，请确认文件未损坏，并尝试换一张 JPG、PNG、WebP 或 HEIC/HEIF 图片",
        "error",
      ),
    );
  });
});
