// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SecurityList } from "./security-list";
import type { SecurityData } from "./use-account-security";

function data(over: Partial<SecurityData> = {}): SecurityData {
  return {
    username: "yevpt",
    passwordSet: true,
    mainEmail: "main@example.com",
    subEmail: null,
    mailShow: 1,
    providers: [
      { source: "github", bound: true },
      { source: "qq", bound: false },
    ],
    ...over,
  };
}

describe("SecurityList", () => {
  it("展示用户名并触发 username action", () => {
    const onAction = vi.fn();
    render(<SecurityList data={data()} onAction={onAction} />);
    expect(screen.getByText("yevpt")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "修改用户名" }));
    expect(onAction).toHaveBeenCalledWith({ type: "username" });
  });

  it("passwordSet=true 显示已设置 + 修改", () => {
    const onAction = vi.fn();
    render(<SecurityList data={data({ passwordSet: true })} onAction={onAction} />);
    expect(screen.getByText("已设置")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "修改密码" }));
    expect(onAction).toHaveBeenCalledWith({ type: "password" });
  });

  it("passwordSet=false 显示未设置 + 设置", () => {
    render(<SecurityList data={data({ passwordSet: false })} onAction={vi.fn()} />);
    expect(screen.getByText("未设置")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "设置" })).toBeInTheDocument();
  });

  it("主邮箱有值显具体邮箱并触发 email/main", () => {
    const onAction = vi.fn();
    render(<SecurityList data={data()} onAction={onAction} />);
    expect(screen.getByText("main@example.com")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "换绑主邮箱" }));
    expect(onAction).toHaveBeenCalledWith({ type: "email", target: "main" });
  });

  it("副邮箱无值灰显并触发 email/sub 绑定", () => {
    const onAction = vi.fn();
    render(<SecurityList data={data({ subEmail: null })} onAction={onAction} />);
    fireEvent.click(screen.getByRole("button", { name: "绑定副邮箱" }));
    expect(onAction).toHaveBeenCalledWith({ type: "email", target: "sub" });
  });

  it("对外展示按 mailShow 映射为只读文本", () => {
    render(<SecurityList data={data({ mailShow: 2 })} onAction={vi.fn()} />);
    // mailShow=2 → 「副邮箱」只读文本（与副邮箱行 label 同名，故按对外展示行的兄弟节点定位）
    const displayRow = screen.getByText("对外展示邮箱").closest("div");
    expect(displayRow).toHaveTextContent("副邮箱");
  });

  it("第三方：已绑显解绑、未绑显绑定", () => {
    const onAction = vi.fn();
    render(<SecurityList data={data()} onAction={onAction} />);
    fireEvent.click(screen.getByRole("button", { name: "解绑 GitHub" }));
    expect(onAction).toHaveBeenCalledWith({ type: "unbind", source: "github" });
    fireEvent.click(screen.getByRole("button", { name: "绑定 QQ" }));
    expect(onAction).toHaveBeenCalledWith({ type: "bind", source: "qq" });
  });
});
