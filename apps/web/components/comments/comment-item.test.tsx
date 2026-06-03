import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { CommentItemResp, CommentReplyResp } from "@repo/api";
import { CommentItem } from "./comment-item";

vi.mock("@repo/icons", () => ({
  SvgIcon: ({ name }: { name: string }) => <span data-testid={`icon-${name}`} />,
}));

const baseComment: CommentItemResp = {
  id: 1,
  target_type: "article",
  target_id: 5,
  user_id: 10,
  content: "这篇文章写得很好",
  user: { id: 10, username: "alice", nickname: "Alice" },
  replies: [],
  created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  updated_at: new Date().toISOString(),
};

const replyData: CommentReplyResp = {
  id: 2,
  target_type: "article",
  comment_id: 1,
  from_user_id: 11,
  to_user_id: 10,
  parent_reply_id: 0,
  content: "谢谢你的反馈",
  from_user: { id: 11, username: "bob", nickname: "Bob" },
  to_user: { id: 10, username: "alice", nickname: "Alice" },
  created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  updated_at: new Date().toISOString(),
};

describe("CommentItem", () => {
  it("显示评论者昵称和评论内容", () => {
    render(<CommentItem comment={baseComment} />);
    expect(screen.getByText("Alice")).toBeTruthy();
    expect(screen.getByText("这篇文章写得很好")).toBeTruthy();
  });

  it("无昵称时显示 username", () => {
    const comment = { ...baseComment, user: { id: 10, username: "alice" } };
    render(<CommentItem comment={comment} />);
    expect(screen.getByText("alice")).toBeTruthy();
  });

  it("无头像时显示首字母占位", () => {
    render(<CommentItem comment={baseComment} />);
    expect(screen.getByText("A")).toBeTruthy();
  });

  it("点击回复触发 onReply 回调", async () => {
    const user = userEvent.setup();
    const onReply = vi.fn();
    render(<CommentItem comment={baseComment} onReply={onReply} />);

    await user.click(screen.getByText("回复"));

    expect(onReply).toHaveBeenCalledWith({
      commentId: 1,
      toUsername: "Alice",
    });
  });

  it("渲染回复列表并显示 @被回复人", () => {
    const comment = { ...baseComment, replies: [replyData] };
    render(<CommentItem comment={comment} />);
    expect(screen.getByText("Bob")).toBeTruthy();
    expect(screen.getByText("谢谢你的反馈")).toBeTruthy();
    expect(screen.getByText("@Alice")).toBeTruthy();
  });

  it("回复的回复按钮触发 onReply 带 parentReplyId", async () => {
    const user = userEvent.setup();
    const onReply = vi.fn();
    const comment = { ...baseComment, replies: [replyData] };
    render(<CommentItem comment={comment} onReply={onReply} />);

    const replyButtons = screen.getAllByText("回复");
    await user.click(replyButtons[1]);

    expect(onReply).toHaveBeenCalledWith({
      commentId: 1,
      parentReplyId: 2,
      toUsername: "Bob",
    });
  });
});
