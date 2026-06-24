// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type * as clientFetch from "@/lib/client-fetch";
import { UsernameSheet } from "./username-sheet";

// 取数纠偏：组件用 @/lib/client-fetch 的 apiJson 打 PATCH，故 mock apiJson；
// 其余导出（getApiErrorMessage 等）保留真实实现。
const apiJson = vi.fn();
vi.mock("@/lib/client-fetch", async () => {
  const actual = await vi.importActual<typeof clientFetch>("@/lib/client-fetch");
  return { ...actual, apiJson: (...args: unknown[]) => apiJson(...args) };
});

vi.mock("@/lib/toast", () => ({ addToast: vi.fn() }));

beforeEach(() => {
  apiJson.mockReset();
  apiJson.mockResolvedValue(undefined);
});

describe("UsernameSheet", () => {
  it("输入新用户名点确认 → 以 { username } 调用 apiJson PATCH", async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    render(<UsernameSheet open currentUsername="yevpt" onClose={() => {}} onSuccess={onSuccess} />);

    const input = screen.getByLabelText("用户名");
    await user.clear(input);
    await user.type(input, "newname");
    await user.click(screen.getByRole("button", { name: "确认修改" }));

    expect(apiJson).toHaveBeenCalledWith("/api/users/me/username", {
      method: "PATCH",
      body: JSON.stringify({ username: "newname" }),
    });
  });

  it("少于 3 字符时确认按钮 disabled", async () => {
    const user = userEvent.setup();
    render(<UsernameSheet open currentUsername="yevpt" onClose={() => {}} onSuccess={() => {}} />);

    const input = screen.getByLabelText("用户名");
    await user.clear(input);
    await user.type(input, "ab");

    expect(screen.getByRole("button", { name: "确认修改" })).toBeDisabled();
  });
});
