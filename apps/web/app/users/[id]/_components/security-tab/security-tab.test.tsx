// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { UserDetailResp, OAuthBindingResp } from "@repo/api";
import type * as clientFetch from "@/lib/client-fetch";
import { SecurityTab } from "./security-tab";

// 容器改名成功后走 router.refresh()；Sheet toast 走 addToast，均需 mock
const mockRefresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mockRefresh, push: vi.fn() }),
}));
vi.mock("@/lib/toast", () => ({ addToast: vi.fn() }));

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
  mockRefresh.mockReset();
  // apiJson 按 path 分发 me / bindings / 改名 PATCH
  apiJson.mockImplementation((path: string) => {
    if (path === "/api/users/me") return Promise.resolve(meResp());
    if (path === "/api/users/me/oauth-bindings") return Promise.resolve(bindings);
    if (path === "/api/users/me/username") return Promise.resolve(undefined);
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

  it("点「修改用户名」改名成功后登出并 refresh", async () => {
    const user = userEvent.setup();
    render(<SecurityTab userId={1} />);

    await user.click(await screen.findByRole("button", { name: "修改用户名" }));
    await user.click(screen.getByRole("button", { name: "确认修改" }));

    await waitFor(() =>
      expect(apiJson).toHaveBeenCalledWith("/api/users/me/username", {
        method: "PATCH",
        body: JSON.stringify({ username: "yevpt" }),
      }),
    );
    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith("/api/auth/logout", { method: "POST" }),
    );
    await waitFor(() => expect(mockRefresh).toHaveBeenCalled());
  });

  it("点未绑定平台「绑定」取授权地址并整页跳转", async () => {
    const user = userEvent.setup();
    // 复用按 path 分发的 apiJson；fetch 在 authorize 时返回 authorize_url 信封
    const origin = "http://localhost";
    const hrefSetter = vi.fn();
    Object.defineProperty(window, "location", {
      value: {
        origin,
        set href(v: string) {
          hrefSetter(v);
        },
      },
      writable: true,
    });
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) => {
        if (typeof url === "string" && url.includes("/authorize")) {
          return Promise.resolve({
            json: () => Promise.resolve({ code: 0, data: { authorize_url: "https://auth/x" } }),
          });
        }
        return Promise.resolve({
          json: () => Promise.resolve({ code: 0, data: ["github", "qq"] }),
        });
      }),
    );

    render(<SecurityTab userId={1} />);
    await user.click(await screen.findByRole("button", { name: "绑定 QQ" }));

    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(
          "/api/oauth/qq/authorize?action=bind&redirect_uri=" +
            encodeURIComponent(
              `${origin}/oauth/qq/callback?next=${encodeURIComponent("/users/1?tab=security")}`,
            ),
        ),
      ),
    );
    await waitFor(() => expect(hrefSetter).toHaveBeenCalledWith("https://auth/x"));
  });

  it("点已绑定平台「解绑」打开确认框", async () => {
    const user = userEvent.setup();
    render(<SecurityTab userId={1} />);
    await user.click(await screen.findByRole("button", { name: "解绑 GitHub" }));
    // 确认框出现「解绑」操作按钮
    expect(await screen.findByText("解绑 GitHub？")).toBeInTheDocument();
  });

  it("切换对外展示邮箱不触发全量 reload", async () => {
    const user = userEvent.setup();
    apiJson.mockImplementation((path: string, init?: { method?: string; body?: string }) => {
      if (path === "/api/users/me") return Promise.resolve(meResp());
      if (path === "/api/users/me/oauth-bindings") return Promise.resolve(bindings);
      if (path === "/api/users/me/email/display" && init?.method === "PATCH") {
        return Promise.resolve(undefined);
      }
      if (path === "/api/users/me/username") return Promise.resolve(undefined);
      return Promise.reject(new Error(`unexpected path: ${path}`));
    });

    render(<SecurityTab userId={1} />);
    expect(await screen.findByText("yevpt")).toBeInTheDocument();
    const meCalls = apiJson.mock.calls.filter(([path]) => path === "/api/users/me").length;

    await user.click(screen.getByRole("button", { name: /对外展示邮箱/ }));
    await user.click(await screen.findByRole("option", { name: "不展示" }));

    await waitFor(() =>
      expect(apiJson).toHaveBeenCalledWith(
        "/api/users/me/email/display",
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify({ display: "none" }),
        }),
      ),
    );
    expect(screen.queryByText("加载中…")).not.toBeInTheDocument();
    expect(apiJson.mock.calls.filter(([path]) => path === "/api/users/me").length).toBe(meCalls);
  });

  it("取数失败时显示错误与重试", async () => {
    apiJson.mockRejectedValue(new Error("boom"));
    render(<SecurityTab userId={1} />);
    expect(await screen.findByRole("button", { name: "重试" })).toBeInTheDocument();
  });
});
