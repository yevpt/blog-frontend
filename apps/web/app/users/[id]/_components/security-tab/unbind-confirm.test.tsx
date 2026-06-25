// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type * as clientFetch from "@/lib/client-fetch";
import { ApiClientError } from "@/lib/client-fetch";
import { UnbindConfirm } from "./unbind-confirm";

// 解绑走 @/lib/client-fetch 的 apiJson(DELETE)，故 mock apiJson；
// getApiErrorMessage / ApiClientError 保留真实实现（取后端文案）。
const apiJson = vi.fn();
vi.mock("@/lib/client-fetch", async () => {
  const actual = await vi.importActual<typeof clientFetch>("@/lib/client-fetch");
  return { ...actual, apiJson: (...args: unknown[]) => apiJson(...args) };
});

vi.mock("@/lib/toast", () => ({ addToast: vi.fn() }));

beforeEach(() => {
  apiJson.mockReset();
});

describe("UnbindConfirm", () => {
  it("点解绑以 DELETE /api/oauth/bindings/{source} 调用并触发 onSuccess", async () => {
    apiJson.mockResolvedValue(undefined);
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    render(<UnbindConfirm open source="github" onClose={() => {}} onSuccess={onSuccess} />);

    await user.click(screen.getByRole("button", { name: "解绑" }));

    expect(apiJson).toHaveBeenCalledWith("/api/oauth/bindings/github", { method: "DELETE" });
    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
  });

  it("后端拒绝时显示错误文案且不触发 onSuccess", async () => {
    apiJson.mockRejectedValue(new ApiClientError("这是你最后的登录方式，无法解绑", 400));
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    render(<UnbindConfirm open source="github" onClose={() => {}} onSuccess={onSuccess} />);

    await user.click(screen.getByRole("button", { name: "解绑" }));

    expect(await screen.findByText(/最后的登录方式/)).toBeInTheDocument();
    expect(onSuccess).not.toHaveBeenCalled();
  });
});
