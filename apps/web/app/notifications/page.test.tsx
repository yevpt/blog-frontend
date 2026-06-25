import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";

vi.mock("@/components/notifications/notifications-page", () => ({
  default: () => <div data-testid="notifications-page" />,
}));

import NotificationsRoute, { metadata } from "./page";

describe("NotificationsRoute", () => {
  it("导出 metadata 标题", () => {
    expect(metadata.title).toContain("消息中心");
  });

  it("消息中心不允许搜索引擎收录", () => {
    expect(metadata.robots).toEqual({ index: false, follow: false });
  });
  it("渲染消息中心容器", () => {
    const { getByTestId } = render(<NotificationsRoute />);
    expect(getByTestId("notifications-page")).toBeTruthy();
  });
});
