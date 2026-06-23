import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { NotificationCardMotion } from "./notification-card-motion";

vi.mock("@repo/ui", () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

describe("NotificationCardMotion", () => {
  it("未标记 staggerAnimate 时不添加动画 class", () => {
    const { container } = render(
      <NotificationCardMotion staggerIndex={2}>
        <p>消息卡片</p>
      </NotificationCardMotion>,
    );
    const shell = container.firstChild as HTMLElement;
    expect(shell.className).not.toContain("animate-fade-in-up");
    expect(screen.getByText("消息卡片")).toBeInTheDocument();
  });

  it("staggerAnimate 时使用阶梯 fade-in-up 动画", () => {
    const { container } = render(
      <NotificationCardMotion staggerIndex={2} staggerAnimate>
        <p>消息卡片</p>
      </NotificationCardMotion>,
    );
    const shell = container.firstChild as HTMLElement;
    expect(shell.className).toContain("animate-fade-in-up");
    expect(shell.style.animationDelay).toBe("90ms");
    expect(screen.getByText("消息卡片")).toBeInTheDocument();
  });

  it("实时插入时使用 notification-enter 动画且无延迟", () => {
    const { container } = render(
      <NotificationCardMotion staggerIndex={0} entering>
        <p>新消息</p>
      </NotificationCardMotion>,
    );
    const shell = container.firstChild as HTMLElement;
    expect(shell.className).toContain("animate-notification-enter");
    expect(shell.style.animationDelay).toBe("");
  });
});
