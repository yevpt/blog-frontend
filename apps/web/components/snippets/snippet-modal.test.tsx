import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ChangeEvent, Dispatch, SetStateAction } from "react";
import { SnippetModal } from "./snippet-modal";
import { useSnippetModal } from "@/store/use-snippet-modal";
import type { SnippetImageItem } from "./types";
import type { MomentItemResp } from "@repo/api";

interface MockSnippetTextInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

interface MockSnippetImageUploaderProps {
  items: SnippetImageItem[];
  onChange: Dispatch<SetStateAction<SnippetImageItem[]>>;
  readOnly?: boolean;
}

vi.mock("@/lib/toast", () => ({ addToast: vi.fn() }));
vi.mock("@/app/providers/session-provider", () => ({
  useSession: () => ({ userId: 7, profile: null }),
}));
vi.mock("./snippet-text-input", () => ({
  SnippetTextInput: ({ value, onChange, placeholder }: MockSnippetTextInputProps) => (
    <textarea
      aria-label="编辑器"
      placeholder={placeholder}
      value={value}
      onChange={(event: ChangeEvent<HTMLTextAreaElement>) => onChange(event.target.value)}
    />
  ),
}));
vi.mock("./snippet-image-uploader", () => ({
  SnippetImageUploader: function MockUploader({
    items,
    onChange,
    readOnly,
  }: MockSnippetImageUploaderProps) {
    return (
      <div data-testid="snippet-image-uploader" data-readonly={readOnly ? "true" : undefined}>
        <span data-testid="snippet-image-count">{items.length}</span>
        <button
          type="button"
          onClick={() =>
            onChange([
              ...items,
              {
                id: String(items.length + 1),
                file: new File([new Uint8Array(1)], "a.png", { type: "image/png" }),
                previewUrl: "blob:1",
              },
              {
                id: String(items.length + 2),
                file: new File([new Uint8Array(1)], "b.png", { type: "image/png" }),
                previewUrl: "blob:2",
              },
            ])
          }
        >
          inject
        </button>
      </div>
    );
  },
}));

function mockDesktop() {
  window.matchMedia = vi.fn().mockImplementation((q: string) => ({
    matches: q.includes("min-width: 768px"),
    media: q,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    onchange: null,
    dispatchEvent: vi.fn(),
  }));
}

beforeEach(() => {
  vi.clearAllMocks();
  mockDesktop();
  Object.defineProperty(URL, "createObjectURL", {
    configurable: true,
    value: vi.fn(() => "blob:x"),
  });
  Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: vi.fn() });
  useSnippetModal.setState({
    isOpen: true,
    publishCount: 0,
    lastPublishedUserId: null,
    editingSnippet: null,
    submitEdit: null,
  });
});

function makeMoment(overrides: Partial<MomentItemResp> = {}): MomentItemResp {
  return {
    id: 1,
    user_id: 7,
    content: "原来的碎语",
    status: 1,
    comment_status: 1,
    read_count: 0,
    is_top: false,
    like_count: 0,
    comment_count: 0,
    is_liked: false,
    images: [],
    created_at: "2026-05-30T09:00:00Z",
    updated_at: "2026-05-30T09:00:00Z",
    ...overrides,
  };
}

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
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ id: 1 }), { status: 200 }));
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
    expect(useSnippetModal.getState().lastPublishedUserId).toBe(7);
    await waitFor(() => expect(useSnippetModal.getState().isOpen).toBe(false));
  });

  it("编辑碎语时预填正文并调用编辑保存回调", async () => {
    const user = userEvent.setup();
    const submitEdit = vi.fn().mockResolvedValue(makeMoment({ content: "改好了" }));
    useSnippetModal.setState({
      isOpen: true,
      editingSnippet: makeMoment(),
      submitEdit,
    });

    render(<SnippetModal />);

    expect(await screen.findByRole("dialog", { name: "编辑碎语" })).toBeInTheDocument();
    const editor = screen.getByLabelText("编辑器");
    expect(editor).toHaveValue("原来的碎语");

    await user.clear(editor);
    await user.type(editor, "改好了");
    await user.click(screen.getByRole("button", { name: "保存" }));

    await waitFor(() => expect(submitEdit).toHaveBeenCalledWith("改好了", expect.any(Array)));
    expect(useSnippetModal.getState().isOpen).toBe(false);
  });

  it("编辑保存失败时不在弹窗层重复 toast", async () => {
    const user = userEvent.setup();
    const { addToast } = await import("@/lib/toast");
    const submitEdit = vi.fn().mockRejectedValue(new Error("请求过于频繁，请稍后再试"));
    useSnippetModal.setState({
      isOpen: true,
      editingSnippet: makeMoment(),
      submitEdit,
    });

    render(<SnippetModal />);

    await screen.findByRole("dialog", { name: "编辑碎语" });
    await user.click(screen.getByRole("button", { name: "保存" }));

    await waitFor(() => expect(submitEdit).toHaveBeenCalled());
    expect(addToast).not.toHaveBeenCalled();
    expect(useSnippetModal.getState().isOpen).toBe(true);
  });

  it("编辑时 submitEdit 缺失则 toast 提示编辑失败", async () => {
    const user = userEvent.setup();
    const { addToast } = await import("@/lib/toast");
    useSnippetModal.setState({
      isOpen: true,
      editingSnippet: makeMoment(),
      submitEdit: null,
    });

    render(<SnippetModal />);

    await screen.findByRole("dialog", { name: "编辑碎语" });
    await user.click(screen.getByRole("button", { name: "保存" }));

    await waitFor(() => expect(addToast).toHaveBeenCalledWith("编辑失败", "error"));
  });

  it("编辑碎语时回显已有图片并可继续添加", async () => {
    const user = userEvent.setup();
    const submitEdit = vi.fn().mockResolvedValue(makeMoment());
    useSnippetModal.setState({
      isOpen: true,
      editingSnippet: makeMoment({
        images: [
          {
            id: 1,
            name: "a.png",
            file_type: "image/png",
            url: "https://example.com/a.png",
            access_url: "https://example.com/a.png",
            size: 100,
            seq: 0,
          },
          {
            id: 2,
            name: "b.png",
            file_type: "image/png",
            url: "https://example.com/b.png",
            access_url: "https://example.com/b.png",
            size: 100,
            seq: 1,
          },
        ],
      }),
      submitEdit,
    });

    render(<SnippetModal />);

    expect(await screen.findByRole("dialog", { name: "编辑碎语" })).toBeInTheDocument();
    expect(screen.getByTestId("snippet-image-count")).toHaveTextContent("2");
    expect(screen.getByTestId("snippet-image-uploader")).not.toHaveAttribute("data-readonly");

    await user.click(screen.getByRole("button", { name: "inject" }));
    expect(screen.getByTestId("snippet-image-count")).toHaveTextContent("4");

    await user.click(screen.getByRole("button", { name: "保存" }));
    await waitFor(() => expect(submitEdit).toHaveBeenCalledWith("原来的碎语", expect.any(Array)));
    const passedImages = submitEdit.mock.calls[0][1] as SnippetImageItem[];
    expect(passedImages.length).toBe(4);
    expect(passedImages.filter((it) => it.remoteUrl).length).toBe(2);
    expect(passedImages.filter((it) => it.file).length).toBe(2);
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
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
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
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ id: 1 }), { status: 200 }));
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
