import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FriendLinkFormDialog } from "./FriendLinkFormDialog";
import type { FriendLinkRow } from "../model";

const editingLink: FriendLinkRow = {
  id: "1",
  name: "VPT",
  site: "https://vpt.im",
  seq: 0,
  status: 1,
  updatedAt: "2026/06/01",
  avatarUrl: "https://cdn.example.com/logo.jpg",
};

describe("FriendLinkFormDialog", () => {
  const onSubmit = vi.fn().mockResolvedValue(undefined);
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("编辑模式保留远程 logo 时可提交", async () => {
    const user = userEvent.setup();
    render(
      <FriendLinkFormDialog
        mode="edit"
        open
        link={editingLink}
        nextSeq={1}
        isSubmitting={false}
        onClose={onClose}
        onSubmit={onSubmit}
      />,
    );

    await user.click(screen.getByRole("button", { name: "保存" }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ name: "VPT", site: "https://vpt.im" }),
        expect.objectContaining({
          remoteUrl: "https://cdn.example.com/logo.jpg",
          previewUrl: "https://cdn.example.com/logo.jpg",
        }),
        "edit",
        "1",
      );
    });
  });

  it("创建模式未上传 logo 时阻止提交", async () => {
    const user = userEvent.setup();
    render(
      <FriendLinkFormDialog
        mode="create"
        open
        link={null}
        nextSeq={0}
        isSubmitting={false}
        onClose={onClose}
        onSubmit={onSubmit}
      />,
    );

    await user.type(screen.getByLabelText(/网站名称/i), "VPT");
    await user.type(screen.getByLabelText(/网站地址/i), "https://vpt.im");
    await user.click(screen.getByRole("button", { name: "创建" }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText("请上传友链 Logo")).toBeInTheDocument();
    expect(screen.getByText("站点关系")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "关闭友链表单" })).toBeInTheDocument();
    expect(screen.getByLabelText("网站描述")).toHaveClass("shadow-xs");
  });
});
