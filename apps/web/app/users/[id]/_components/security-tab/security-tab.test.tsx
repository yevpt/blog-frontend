import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SecurityTab } from "./security-tab";

describe("SecurityTab", () => {
  it("渲染不崩溃", () => {
    render(<SecurityTab userId={1} />);
    expect(screen.getByText("登录凭证")).toBeInTheDocument();
  });

  it("显示邮箱管理区块", () => {
    render(<SecurityTab userId={1} />);
    expect(screen.getByText("邮箱")).toBeInTheDocument();
  });

  it("显示第三方绑定区块", () => {
    render(<SecurityTab userId={1} />);
    expect(screen.getByText("第三方绑定")).toBeInTheDocument();
  });
});
