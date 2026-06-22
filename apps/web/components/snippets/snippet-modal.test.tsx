import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { SnippetModal } from "./snippet-modal";
import { useSnippetModal } from "@/store/use-snippet-modal";

vi.mock("@/lib/toast", () => ({ addToast: vi.fn() }));
vi.mock("./snippet-text-input", () => ({
  SnippetTextInput: ({ value, onChange, placeholder }: any) => (
    <textarea aria-label="编辑器" placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} />
  ),
}));
vi.mock("./snippet-image-uploader", async () => {
  const { forwardRef } = await vi.importActual<typeof import("react")>("react");
  return {
    SnippetImageUploader: forwardRef(function MockUploader({ onChange }: any, _ref) {
      return (
        <button type="button" onClick={() => onChange([
          { id: "1", file: new File([new Uint8Array(1)], "a.png", { type: "image/png" }), previewUrl: "blob:1" },
          { id: "2", file: new File([new Uint8Array(1)], "b.png", { type: "image/png" }), previewUrl: "blob:2" },
        ])}>inject</button>
      );
    }),
  };
});

function mockDesktop() {
  window.matchMedia = vi.fn().mockImplementation((q: string) => ({
    matches: q.includes("min-width: 768px"), media: q,
    addEventListener: vi.fn(), removeEventListener: vi.fn(),
    addListener: vi.fn(), removeListener: vi.fn(), onchange: null, dispatchEvent: vi.fn(),
  }));
}

beforeEach(() => {
  vi.clearAllMocks();
  mockDesktop();
  (URL as any).createObjectURL = vi.fn(() => "blob:x");
  (URL as any).revokeObjectURL = vi.fn();
  useSnippetModal.setState({ isOpen: true });
});

describe("SnippetModal", () => {
  it("渲染编辑器与发布按钮，空正文时发布禁用", async () => {
    render(<SnippetModal />);
    expect(await screen.findByRole("dialog", { name: "写碎语" })).toBeInTheDocument();
    expect(screen.getByLabelText("编辑器")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "发布" })).toBeDisabled();
  });

  it("底栏展示图片计数并提供添加按钮", async () => {
    const user = userEvent.setup();
    render(<SnippetModal />);
    await screen.findByRole("dialog", { name: "写碎语" });
    const addBtn = screen.getByRole("button", { name: "添加图片" });
    expect(addBtn).toHaveTextContent("0/9");
    await user.click(screen.getByRole("button", { name: "inject" }));
    expect(screen.getByRole("button", { name: "添加图片" })).toHaveTextContent("2/9");
  });

  it("填写正文后发布：以 multipart 提交到 /api/moments 并关闭", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: 1 }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    render(<SnippetModal />);
    await user.type(screen.getByLabelText("编辑器"), "今天的风很温柔");
    await user.click(screen.getByRole("button", { name: "发布" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/moments");
    expect(init.method).toBe("POST");
    expect(init.body).toBeInstanceOf(FormData);
    expect((init.body as FormData).get("content")).toBe("今天的风很温柔");
    expect((init.body as FormData).get("status")).toBe("1");
    expect((init.body as FormData).get("comment_status")).toBe("1");
    await waitFor(() => expect(useSnippetModal.getState().isOpen).toBe(false));
  });

  it("超过 800 字时发布禁用", async () => {
    const user = userEvent.setup();
    render(<SnippetModal />);
    const editor = screen.getByLabelText("编辑器");
    await user.click(editor);
    await user.paste("a".repeat(801));
    expect(screen.getByRole("button", { name: "发布" })).toBeDisabled();
  });

  it("发布失败时 toast 报错且不关闭弹窗", async () => {
    const user = userEvent.setup();
    const { addToast } = await import("@/lib/toast");
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: "请求过于频繁，请稍后再试" }), { status: 400 }),
    );
    vi.stubGlobal("fetch", fetchMock);
    render(<SnippetModal />);
    await user.type(screen.getByLabelText("编辑器"), "你好");
    await user.click(screen.getByRole("button", { name: "发布" }));
    await waitFor(() => expect(addToast).toHaveBeenCalledWith("请求过于频繁，请稍后再试", "error"));
    expect(useSnippetModal.getState().isOpen).toBe(true);
    expect((screen.getByLabelText("编辑器") as HTMLTextAreaElement).value).toBe("你好");
  });

  it("发布时按顺序追加 images 与 image_order", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: 1 }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    render(<SnippetModal />);
    await user.type(screen.getByLabelText("编辑器"), "图文");
    await user.click(screen.getByRole("button", { name: "inject" }));
    await user.click(screen.getByRole("button", { name: "发布" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const body = fetchMock.mock.calls[0][1].body as FormData;
    expect(body.getAll("images").length).toBe(2);
    expect(body.getAll("image_order")).toEqual(["file:0", "file:1"]);
  });
});
