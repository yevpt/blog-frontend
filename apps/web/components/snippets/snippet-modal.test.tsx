import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { SnippetModal } from "./snippet-modal";
import { useSnippetModal } from "@/store/use-snippet-modal";
import { addToast } from "@/lib/toast";

vi.mock("@/lib/toast", () => ({
  addToast: vi.fn(),
}));

describe("SnippetModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useSnippetModal.setState({ isOpen: false });
  });

  it("当 isOpen 为 false 时不渲染内容", () => {
    useSnippetModal.setState({ isOpen: false });
    render(<SnippetModal />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("当 isOpen 为 true 时渲染弹窗", async () => {
    useSnippetModal.setState({ isOpen: true });
    render(<SnippetModal />);
    expect(await screen.findByRole("dialog", { name: "写碎语" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("此刻的想法...")).toBeInTheDocument();
  });

  it("点击取消按钮关闭弹窗", async () => {
    const user = userEvent.setup();
    useSnippetModal.setState({ isOpen: true });
    render(<SnippetModal />);

    const cancelButton = await screen.findByRole("button", { name: "取消" });
    await user.click(cancelButton);

    await waitFor(() => {
      expect(useSnippetModal.getState().isOpen).toBe(false);
    });
  });

  it("提交表单时提示并关闭弹窗", async () => {
    const user = userEvent.setup();
    useSnippetModal.setState({ isOpen: true });
    render(<SnippetModal />);

    const textarea = await screen.findByPlaceholderText("此刻的想法...");
    await user.type(textarea, "这是一条测试碎语");

    const submitButton = screen.getByRole("button", { name: "发布" });
    await user.click(submitButton);

    expect(addToast).toHaveBeenCalledWith("发布成功（前端演示）", "success");

    await waitFor(() => {
      expect(useSnippetModal.getState().isOpen).toBe(false);
    });
  });
});
