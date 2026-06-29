import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ChangeEvent, Dispatch, SetStateAction } from "react";
import { MomentModal } from "./moment-modal";
import { useMomentModal } from "@/store/use-moment-modal";
import type { MomentImageItem } from "./types";
import type { MomentItemResp } from "@repo/api";

interface MockMomentTextInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
}

interface MockMomentImageUploaderProps {
  items: MomentImageItem[];
  onChange: Dispatch<SetStateAction<MomentImageItem[]>>;
  readOnly?: boolean;
}

vi.mock("@/lib/toast", () => ({ addToast: vi.fn() }));
vi.mock("@/app/providers/session-provider", () => ({
  useSession: () => ({ userId: 7, profile: null }),
}));
vi.mock("./moment-text-input", () => ({
  MomentTextInput: ({ value, onChange, placeholder, maxLength }: MockMomentTextInputProps) => (
    <textarea
      aria-label="编辑器"
      placeholder={placeholder}
      maxLength={maxLength}
      value={value}
      onChange={(event: ChangeEvent<HTMLTextAreaElement>) => onChange(event.target.value)}
    />
  ),
}));
vi.mock("./moment-image-uploader", () => ({
  MomentImageUploader: function MockUploader({
    items,
    onChange,
    readOnly,
  }: MockMomentImageUploaderProps) {
    return (
      <div data-testid="moment-image-uploader" data-readonly={readOnly ? "true" : undefined}>
        <span data-testid="moment-image-count">{items.length}</span>
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
  useMomentModal.setState({
    isOpen: true,
    publishCount: 0,
    lastPublishedUserId: null,
    editingMoment: null,
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

describe("MomentModal", () => {
  it("渲染编辑器与发布按钮，空正文时发布禁用", async () => {
    render(<MomentModal />);
    expect(await screen.findByRole("dialog", { name: "写碎语" })).toBeInTheDocument();
    expect(screen.getByLabelText("编辑器")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "发布" })).toBeDisabled();
  });

  it("填写正文后发布：以 multipart 提交到 /api/moments 并关闭", async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ id: 1 }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    render(<MomentModal />);
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
    expect(useMomentModal.getState().lastPublishedUserId).toBe(7);
    await waitFor(() => expect(useMomentModal.getState().isOpen).toBe(false));
  });

  it("编辑碎语时预填正文并调用编辑保存回调", async () => {
    const user = userEvent.setup();
    const submitEdit = vi.fn().mockResolvedValue(makeMoment({ content: "改好了" }));
    useMomentModal.setState({
      isOpen: true,
      editingMoment: makeMoment(),
      submitEdit,
    });

    render(<MomentModal />);

    expect(await screen.findByRole("dialog", { name: "编辑碎语" })).toBeInTheDocument();
    const editor = screen.getByLabelText("编辑器");
    expect(editor).toHaveValue("原来的碎语");

    await user.clear(editor);
    await user.type(editor, "改好了");
    await user.click(screen.getByRole("button", { name: "保存" }));

    await waitFor(() => expect(submitEdit).toHaveBeenCalledWith("改好了", expect.any(Array)));
    expect(useMomentModal.getState().isOpen).toBe(false);
  });

  it("编辑保存失败时不在弹窗层重复 toast", async () => {
    const user = userEvent.setup();
    const { addToast } = await import("@/lib/toast");
    const submitEdit = vi.fn().mockRejectedValue(new Error("请求过于频繁，请稍后再试"));
    useMomentModal.setState({
      isOpen: true,
      editingMoment: makeMoment(),
      submitEdit,
    });

    render(<MomentModal />);

    await screen.findByRole("dialog", { name: "编辑碎语" });
    await user.click(screen.getByRole("button", { name: "保存" }));

    await waitFor(() => expect(submitEdit).toHaveBeenCalled());
    expect(addToast).not.toHaveBeenCalled();
    expect(useMomentModal.getState().isOpen).toBe(true);
  });

  it("编辑时 submitEdit 缺失则 toast 提示编辑失败", async () => {
    const user = userEvent.setup();
    const { addToast } = await import("@/lib/toast");
    useMomentModal.setState({
      isOpen: true,
      editingMoment: makeMoment(),
      submitEdit: null,
    });

    render(<MomentModal />);

    await screen.findByRole("dialog", { name: "编辑碎语" });
    await user.click(screen.getByRole("button", { name: "保存" }));

    await waitFor(() => expect(addToast).toHaveBeenCalledWith("编辑失败", "error"));
  });

  it("编辑碎语时回显已有图片并可继续添加", async () => {
    const user = userEvent.setup();
    const submitEdit = vi.fn().mockResolvedValue(makeMoment());
    useMomentModal.setState({
      isOpen: true,
      editingMoment: makeMoment({
        images: [
          {
            id: 1,
            name: "a.png",
            file_type: "image/png",
            url: "https://example.com/a.png",
            access_url: "https://example.com/a.png",
            display_mode: "original",
            size: 100,
            seq: 0,
          },
          {
            id: 2,
            name: "b.png",
            file_type: "image/png",
            url: "https://example.com/b.png",
            access_url: "https://example.com/b.png",
            display_mode: "original",
            size: 100,
            seq: 1,
          },
        ],
      }),
      submitEdit,
    });

    render(<MomentModal />);

    expect(await screen.findByRole("dialog", { name: "编辑碎语" })).toBeInTheDocument();
    expect(screen.getByTestId("moment-image-count")).toHaveTextContent("2");
    expect(screen.getByTestId("moment-image-uploader")).not.toHaveAttribute("data-readonly");

    await user.click(screen.getByRole("button", { name: "inject" }));
    expect(screen.getByTestId("moment-image-count")).toHaveTextContent("4");

    await user.click(screen.getByRole("button", { name: "保存" }));
    await waitFor(() => expect(submitEdit).toHaveBeenCalledWith("原来的碎语", expect.any(Array)));
    const passedImages = submitEdit.mock.calls[0][1] as MomentImageItem[];
    expect(passedImages.length).toBe(4);
    expect(passedImages.filter((it) => it.remoteUrl).length).toBe(2);
    expect(passedImages.filter((it) => it.file).length).toBe(2);
  });

  it("向输入框传入 800 字上限，超长粘贴会在输入层截断", async () => {
    const user = userEvent.setup();
    render(<MomentModal />);
    const editor = screen.getByLabelText("编辑器");
    expect(editor).toHaveAttribute("maxLength", "800");
    await user.click(editor);
    await user.paste("a".repeat(801));
    expect(editor).toHaveValue("a".repeat(800));
    expect(screen.getByRole("button", { name: "发布" })).toBeEnabled();
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
    render(<MomentModal />);
    await user.type(screen.getByLabelText("编辑器"), "你好");
    await user.click(screen.getByRole("button", { name: "发布" }));
    await waitFor(() => expect(addToast).toHaveBeenCalledWith("请求过于频繁，请稍后再试", "error"));
    expect(useMomentModal.getState().isOpen).toBe(true);
    expect((screen.getByLabelText("编辑器") as HTMLTextAreaElement).value).toBe("你好");
  });

  it("发布时按顺序追加 images 与 image_order", async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ id: 1 }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    render(<MomentModal />);
    await user.type(screen.getByLabelText("编辑器"), "图文");
    await user.click(screen.getByRole("button", { name: "inject" }));
    await user.click(screen.getByRole("button", { name: "发布" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const body = fetchMock.mock.calls[0][1].body as FormData;
    expect(body.getAll("images").length).toBe(2);
    expect(body.getAll("image_order")).toEqual(["file:0", "file:1"]);
  });
});
