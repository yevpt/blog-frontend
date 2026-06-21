import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProfileTabEmptyState } from "./profile-tab-empty-state";

describe("ProfileTabEmptyState", () => {
  it("渲染标题与说明文案", () => {
    render(
      <ProfileTabEmptyState
        icon="message-circle"
        title="暂无碎语"
        description="你还没有发布过碎语"
      />,
    );

    expect(screen.getByTestId("profile-tab-empty-state")).toBeInTheDocument();
    expect(screen.getByText("暂无碎语")).toBeInTheDocument();
    expect(screen.getByText("你还没有发布过碎语")).toBeInTheDocument();
  });

  it("装饰图标容器对屏幕阅读器隐藏", () => {
    render(
      <ProfileTabEmptyState icon="heart-fill" title="暂无点赞" description="还没有点赞内容" />,
    );

    expect(
      screen.getByText("暂无点赞").closest("[data-testid='profile-tab-empty-state']"),
    ).toBeTruthy();
    expect(document.querySelector("[aria-hidden='true']")).toBeTruthy();
  });
});
