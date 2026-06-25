// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type * as ClientFetch from "@/lib/client-fetch";

// mock apiJson，保留 getApiErrorMessage 真实实现
const mockState = vi.hoisted(() => ({ apiJson: vi.fn() }));
vi.mock("@/lib/client-fetch", async () => {
  const actual = await vi.importActual<typeof ClientFetch>("@/lib/client-fetch");
  return { ...actual, apiJson: mockState.apiJson };
});

const addToast = vi.hoisted(() => vi.fn());
vi.mock("@/lib/toast", () => ({ addToast }));

import { EmailDisplaySelect } from "./email-display-select";

beforeEach(() => {
  vi.clearAllMocks();
  mockState.apiJson.mockResolvedValue(undefined);
});

describe("EmailDisplaySelect", () => {
  it("切换为「不展示」时以 {display:'none'} 调用 apiJson 并触发 onChanged", async () => {
    const user = userEvent.setup();
    const onChanged = vi.fn();
    render(<EmailDisplaySelect value="main" subEmailExists onChanged={onChanged} />);

    await user.click(screen.getByRole("button"));
    await user.click(await screen.findByRole("option", { name: "不展示" }));

    await waitFor(() => {
      expect(mockState.apiJson).toHaveBeenCalledWith(
        "/api/users/me/email/display",
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify({ display: "none" }),
        }),
      );
    });
    await waitFor(() => expect(onChanged).toHaveBeenCalledWith("none"));
    expect(screen.getByRole("button", { name: /不展示/ })).toBeInTheDocument();
  });

  it("副邮箱不存在时「副邮箱」选项禁用", async () => {
    const user = userEvent.setup();
    render(<EmailDisplaySelect value="main" subEmailExists={false} onChanged={() => {}} />);

    await user.click(screen.getByRole("button"));
    const subOption = await screen.findByRole("option", { name: "副邮箱" });
    expect(subOption).toHaveAttribute("aria-disabled", "true");
  });
});
