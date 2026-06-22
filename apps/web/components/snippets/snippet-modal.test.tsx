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
});
