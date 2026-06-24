// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type { UserDetailResp, OAuthBindingResp } from "@repo/api";
import type * as clientFetch from "@/lib/client-fetch";
import { SecurityTab } from "./security-tab";

// 取数纠偏：客户端组件用 @/lib/client-fetch 的 apiJson 打 /api/**，故 mock apiJson；
// providers 走原始 fetch（不解包信封），故另 mock global.fetch。
const apiJson = vi.fn();
vi.mock("@/lib/client-fetch", async () => {
  const actual = await vi.importActual<typeof clientFetch>("@/lib/client-fetch");
  return { ...actual, apiJson: (...args: unknown[]) => apiJson(...args) };
});

function meResp(over: Partial<UserDetailResp> = {}): UserDetailResp {
  return {
    id: 1,
    username: "yevpt",
    email: "of940417@gmail.com",
    status: 0,
    roles: [],
    password_set: false,
    meta: { sub_email: null },
    setting: {
      mail_show: 0,
      mail_receive: 0,
      dark_mode: 0,
      receive_mail: false,
      show_name: false,
      show_age: false,
      show_phone: false,
      show_qq: false,
      show_wechat: false,
      show_zhihu: false,
      show_sina: false,
      show_bili: false,
      show_position: false,
    },
    ...over,
  };
}

const bindings: OAuthBindingResp[] = [{ source: "github", social_user_id: 1 }];

beforeEach(() => {
  apiJson.mockReset();
  // apiJson 按 path 分发 me / bindings
  apiJson.mockImplementation((path: string) => {
    if (path === "/api/users/me") return Promise.resolve(meResp());
    if (path === "/api/users/me/oauth-bindings") return Promise.resolve(bindings);
    return Promise.reject(new Error(`unexpected path: ${path}`));
  });
  // providers 信封
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ code: 0, data: ["github", "qq"] }),
    }),
  );
});

describe("SecurityTab", () => {
  it("展示真实用户名与邮箱", async () => {
    render(<SecurityTab userId={1} />);
    expect(await screen.findByText("yevpt")).toBeInTheDocument();
    expect(screen.getByText("of940417@gmail.com")).toBeInTheDocument();
  });

  it("password_set=false 显示「设置」按钮", async () => {
    render(<SecurityTab userId={1} />);
    expect(await screen.findByRole("button", { name: "设置" })).toBeInTheDocument();
  });

  it("providers∪bindings 合并：github 已绑定、qq 未绑定", async () => {
    render(<SecurityTab userId={1} />);
    // github 已绑 → 解绑按钮；qq 未绑 → 绑定按钮（按 aria-label 精确定位，避免短码方块文案歧义）
    expect(await screen.findByRole("button", { name: "解绑 GitHub" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "绑定 QQ" })).toBeInTheDocument();
    expect(screen.getByText("已绑定")).toBeInTheDocument();
  });

  it("取数失败时显示错误与重试", async () => {
    apiJson.mockRejectedValue(new Error("boom"));
    render(<SecurityTab userId={1} />);
    expect(await screen.findByRole("button", { name: "重试" })).toBeInTheDocument();
  });
});
