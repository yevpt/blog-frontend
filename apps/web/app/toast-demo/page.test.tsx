import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import ToastDemoPage, { demoNotificationQueue } from "./page";

vi.mock("@/lib/toast", () => ({
  addToast: vi.fn(),
}));

describe("ToastDemoPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    demoNotificationQueue.clear();
  });

  it("渲染通知弹窗 mock 按钮", () => {
    render(<ToastDemoPage />);

    expect(screen.getByRole("heading", { name: /通知弹窗 mock/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "寒蝉 · 评论了你的文章" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "一次弹三条" })).toBeInTheDocument();
  });

  it("点击 mock 通知后渲染自定义通知内容", () => {
    render(<ToastDemoPage />);

    fireEvent.click(screen.getByRole("button", { name: "寒蝉 · 评论了你的文章" }));

    expect(
      screen.getByText(
        "《React Aria Toast 接入记录》 这段自定义渲染终于能放头像和摘要了，看起来顺眼很多。",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "关闭通知" })).toBeInTheDocument();
  });

  it("一次弹三条会展示三条 mock 通知", () => {
    render(<ToastDemoPage />);

    fireEvent.click(screen.getByRole("button", { name: "一次弹三条" }));

    expect(screen.getByText(/这段自定义渲染终于能放头像和摘要了/)).toBeInTheDocument();
    expect(screen.getByText(/雨停之后，窗台的光像被重新擦亮了一遍/)).toBeInTheDocument();
    expect(screen.getByText(/消息中心已完成实时通知弹窗升级/)).toBeInTheDocument();
  });
});
