import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { OAuthGrid } from "./oauth-grid";

describe("OAuthGrid", () => {
  it("渲染 4 个主要 provider + 展开按钮", () => {
    render(<OAuthGrid />);
    expect(screen.getByTitle("微信")).toBeInTheDocument();
    expect(screen.getByTitle("QQ")).toBeInTheDocument();
    expect(screen.getByTitle("GitHub")).toBeInTheDocument();
    expect(screen.getByTitle("Google")).toBeInTheDocument();
    expect(screen.getByLabelText("展开更多登录方式")).toBeInTheDocument();
    expect(screen.queryByTitle("微博")).not.toBeInTheDocument();
  });

  it("点击展开按钮后显示全部 7 个 provider，展开按钮消失", async () => {
    const user = userEvent.setup();
    render(<OAuthGrid />);
    await user.click(screen.getByLabelText("展开更多登录方式"));
    expect(screen.getByTitle("微博")).toBeInTheDocument();
    expect(screen.getByTitle("Gitee")).toBeInTheDocument();
    expect(screen.getByTitle("百度")).toBeInTheDocument();
    expect(screen.queryByLabelText("展开更多登录方式")).not.toBeInTheDocument();
    expect(screen.getByLabelText("收起登录方式")).toBeInTheDocument();
  });

  it("展开后点击收起按钮可折叠回 4 个 provider", async () => {
    const user = userEvent.setup();
    render(<OAuthGrid />);
    await user.click(screen.getByLabelText("展开更多登录方式"));
    expect(screen.getByTitle("微博")).toBeInTheDocument();
    await user.click(screen.getByLabelText("收起登录方式"));
    expect(screen.queryByTitle("微博")).not.toBeInTheDocument();
    expect(screen.getByLabelText("展开更多登录方式")).toBeInTheDocument();
  });
});
