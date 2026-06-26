// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type * as ClientFetch from "@/lib/client-fetch";

vi.mock("@/lib/client-fetch", async () => {
  const actual = await vi.importActual<typeof ClientFetch>("@/lib/client-fetch");
  return { ...actual, apiJson: vi.fn().mockResolvedValue(undefined) };
});
vi.mock("@/lib/toast", () => ({ addToast: vi.fn() }));

import { SecurityList } from "./security-list";
import type { SecurityData } from "./use-account-security";

function data(over: Partial<SecurityData> = {}): SecurityData {
  return {
    username: "yevpt",
    passwordSet: true,
    mainEmail: "main@example.com",
    subEmail: null,
    mainEmailVerified: true,
    subEmailVerified: false,
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
    render(<SecurityList data={data()} onAction={onAction} onDisplayChanged={vi.fn()} />);
    expect(screen.getByText("yevpt")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "修改用户名" }));
    expect(onAction).toHaveBeenCalledWith({ type: "username" });
  });

  it("passwordSet=true 显示已设置 + 修改", () => {
    const onAction = vi.fn();
    render(
      <SecurityList
        data={data({ passwordSet: true })}
        onAction={onAction}
        onDisplayChanged={vi.fn()}
      />,
    );
    expect(screen.getByText("已设置")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "修改密码" }));
    expect(onAction).toHaveBeenCalledWith({ type: "password" });
  });

  it("passwordSet=false 显示未设置 + 设置", () => {
    render(
      <SecurityList
        data={data({ passwordSet: false })}
        onAction={vi.fn()}
        onDisplayChanged={vi.fn()}
      />,
    );
    expect(screen.getByText("未设置")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "设置" })).toBeInTheDocument();
  });

  it("主邮箱已验证：无未验证 badge，换绑触发 rebind", () => {
    const onAction = vi.fn();
    render(<SecurityList data={data()} onAction={onAction} onDisplayChanged={vi.fn()} />);
    expect(screen.getByText("main@example.com")).toBeInTheDocument();
    expect(screen.queryByText("未验证")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "换绑主邮箱" }));
    expect(onAction).toHaveBeenCalledWith({ type: "email", target: "main", intent: "rebind" });
  });

  it("主邮箱未验证：显示未验证与验证入口", () => {
    const onAction = vi.fn();
    render(
      <SecurityList
        data={data({ mainEmailVerified: false })}
        onAction={onAction}
        onDisplayChanged={vi.fn()}
      />,
    );
    expect(screen.getByText("未验证")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "验证主邮箱" }));
    expect(onAction).toHaveBeenCalledWith({ type: "email", target: "main", intent: "verify" });
  });

  it("主邮箱行移动端三行布局，其他行保持原横向布局", () => {
    render(
      <SecurityList
        data={data({ mainEmailVerified: false })}
        onAction={vi.fn()}
        onDisplayChanged={vi.fn()}
      />,
    );
    const mainRow = screen.getByRole("button", { name: "验证主邮箱" }).closest(".border-b");
    expect(mainRow).toHaveClass("grid");
    expect(mainRow).toHaveClass("sm:flex");

    const usernameRow = screen.getByText("用户名").closest(".border-b");
    expect(usernameRow).toHaveClass("flex");
    expect(usernameRow).not.toHaveClass("grid");

    const metaRow = mainRow?.querySelector(".flex.flex-wrap.items-center.gap-2");
    const actionRows = mainRow?.querySelectorAll(".flex.flex-wrap.items-center.gap-2");
    expect(metaRow).toHaveTextContent("main@example.com");
    expect(metaRow).toHaveTextContent("未验证");
    expect(actionRows?.[1]).toHaveTextContent("验证当前邮箱");
    expect(actionRows?.[1]).toHaveTextContent("换绑");
  });

  it("副邮箱无值灰显并触发 bind", () => {
    const onAction = vi.fn();
    render(
      <SecurityList
        data={data({ subEmail: null })}
        onAction={onAction}
        onDisplayChanged={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "绑定副邮箱" }));
    expect(onAction).toHaveBeenCalledWith({ type: "email", target: "sub", intent: "bind" });
  });

  it("对外展示下拉按 mailShow 映射选中值（2→不展示）", () => {
    render(
      <SecurityList data={data({ mailShow: 2 })} onAction={vi.fn()} onDisplayChanged={vi.fn()} />,
    );
    const displayRow = screen.getByText("对外展示邮箱").closest("div");
    expect(displayRow).toHaveTextContent("不展示");
  });

  it("第三方：已绑显解绑、未绑显绑定", () => {
    const onAction = vi.fn();
    render(<SecurityList data={data()} onAction={onAction} onDisplayChanged={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "解绑 GitHub" }));
    expect(onAction).toHaveBeenCalledWith({ type: "unbind", source: "github" });
    fireEvent.click(screen.getByRole("button", { name: "绑定 QQ" }));
    expect(onAction).toHaveBeenCalledWith({ type: "bind", source: "qq" });
  });
});
