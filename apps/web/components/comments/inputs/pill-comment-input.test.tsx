// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { PillCommentInput } from "./pill-comment-input";

vi.mock("@repo/ui", () => ({
  cn: (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(" "),
  Button: ({
    children,
    onPress,
    isDisabled,
    ...props
  }: {
    children: ReactNode;
    onPress?: () => void;
    isDisabled?: boolean;
    [key: string]: unknown;
  }) => (
    <button type="button" onClick={onPress} disabled={isDisabled} {...props}>
      {children}
    </button>
  ),
}));

vi.mock("@repo/icons", () => ({
  SvgIcon: ({ name }: { name: string }) => <span data-testid={`icon-${name}`} />,
}));

vi.mock("@/app/providers/session-provider", () => ({
  useSession: vi.fn(() => ({ userId: 1 })),
}));

vi.mock("@/store/use-login-modal", () => ({
  useLoginModal: (selector?: (s: { open: ReturnType<typeof vi.fn> }) => unknown) => {
    const store = { open: vi.fn() };
    return typeof selector === "function" ? selector(store) : store;
  },
}));

import { useSession } from "@/app/providers/session-provider";

describe("PillCommentInput（已登录）", () => {
  beforeEach(() => {
    vi.mocked(useSession).mockReturnValue({ userId: 1, profile: null, patchProfile: () => {} });
  });

  it("渲染文本框", () => {
    render(<PillCommentInput value="" onChange={vi.fn()} onSubmit={vi.fn()} />);
    const field = screen.getByPlaceholderText("写下你的评论...");
    expect(field).toBeTruthy();
    expect(field.tagName).toBe("TEXTAREA");
  });

  it("value 为空时发送按钮不渲染", () => {
    render(<PillCommentInput value="" onChange={vi.fn()} onSubmit={vi.fn()} />);
    // 设计要求：按钮仅在有内容时出现，空值时完全不渲染
    expect(screen.queryByTestId("icon-arrow-up")).toBeNull();
  });

  it("value 非空时发送按钮出现", () => {
    render(<PillCommentInput value="有内容" onChange={vi.fn()} onSubmit={vi.fn()} />);
    expect(screen.getByTestId("icon-arrow-up")).toBeTruthy();
  });

  it("value 非空时点击发送触发 onSubmit", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<PillCommentInput value="有内容" onChange={vi.fn()} onSubmit={onSubmit} />);

    await user.click(screen.getByTestId("icon-arrow-up").closest("button")!);

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("回复模式下显示回复 @用户名 和取消按钮", () => {
    render(
      <PillCommentInput
        value=""
        onChange={vi.fn()}
        onSubmit={vi.fn()}
        replyTarget={{ commentId: 1, toUsername: "Alice" }}
        onCancelReply={vi.fn()}
      />,
    );

    expect(screen.getByText("回复")).toBeTruthy();
    expect(screen.getByText("@Alice")).toBeTruthy();
    expect(screen.getByLabelText("取消回复")).toBeTruthy();
  });

  it("回复模式下 placeholder 变为「写下你的回复...」", () => {
    render(
      <PillCommentInput
        value=""
        onChange={vi.fn()}
        onSubmit={vi.fn()}
        replyTarget={{ commentId: 1, toUsername: "Alice" }}
        onCancelReply={vi.fn()}
      />,
    );

    expect(screen.getByPlaceholderText("写下你的回复...")).toBeTruthy();
  });

  it("textarea 设置 maxLength 为 2000，提交前拦截超长内容", () => {
    render(<PillCommentInput value="" onChange={vi.fn()} onSubmit={vi.fn()} />);
    const field = screen.getByPlaceholderText("写下你的评论...");
    expect(field.getAttribute("maxlength")).toBe("2000");
  });

  it("接近字数上限时在输入框内部显示计数胶囊", () => {
    const nearLimit = "a".repeat(1950);
    render(<PillCommentInput value={nearLimit} onChange={vi.fn()} onSubmit={vi.fn()} />);
    const counter = screen.getByText("1950/2000");
    expect(counter.tagName).toBe("SPAN");
    expect(counter).toHaveClass("rounded-full", "text-muted-foreground");
  });

  it("超出字数上限时计数胶囊使用 destructive 样式", () => {
    const overLimit = "a".repeat(2001);
    render(<PillCommentInput value={overLimit} onChange={vi.fn()} onSubmit={vi.fn()} />);
    expect(screen.getByText("2001/2000")).toHaveClass("text-destructive");
  });

  it("远未到上限时不显示计数器", () => {
    render(<PillCommentInput value="短内容" onChange={vi.fn()} onSubmit={vi.fn()} />);
    expect(screen.queryByText(/\/2000$/)).toBeNull();
  });

  it("isSubmitting 时发送按钮禁用", () => {
    render(<PillCommentInput value="内容" onChange={vi.fn()} onSubmit={vi.fn()} isSubmitting />);

    const btn = screen.getByTestId("icon-arrow-up").closest("button");
    expect(btn?.disabled).toBe(true);
  });
});

describe("PillCommentInput（未登录）", () => {
  beforeEach(() => {
    vi.mocked(useSession).mockReturnValue({ userId: null, profile: null, patchProfile: () => {} });
  });

  it("未登录时显示登录提示 pill，不显示输入框", () => {
    render(<PillCommentInput value="" onChange={vi.fn()} onSubmit={vi.fn()} />);

    expect(screen.getByText("请先登录，参与评论")).toBeTruthy();
    expect(screen.queryByPlaceholderText("写下你的评论...")).toBeNull();
  });
});
