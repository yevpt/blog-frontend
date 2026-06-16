---
name: "writing-tests"
description: "Use when writing, fixing, or running Vitest tests in this monorepo — *.test.ts(x) / page.test.tsx for hooks, components, pages, or stores in apps/web, apps/admin, packages/ui, packages/hooks, packages/api. Covers the per-area test environment, the run commands, the known Vitest 4.x / Node 22 gotchas, and the copy-paste mock recipes for @repo/ui, @repo/icons, @repo/hooks, the api client, Next Server Components, and React Query. Trigger whenever a test won't run, a mock is needed, or AGENTS.md says a change requires a matching test file."
license: "MIT"
metadata:
  scope: "project"
---

# 写测试

什么时候必须写测试见 `AGENTS.md`（改 Hook/组件/页面就得补对应 `*.test.*`）。本文件讲**怎么写、怎么跑、怎么绕开坑**。

## 跑测试

- 全仓:`pnpm test:run`(`vitest --run`);看一个包:`pnpm --filter <name> test`(name 见下表)。
- 单文件:在对应包内 `pnpm test:run path/to/file.test.tsx`。
- watch:`pnpm --filter <name> test:watch`。

## 测试环境(关键)

Vitest 4.x **没有** workspace / `environmentMatchGlobs`。环境由各包自己的 `vitest.config.ts` 定:

| 区域 | filter name | environment |
| --- | --- | --- |
| `apps/web` | `web` | **jsdom** |
| `apps/admin` | `admin` | happy-dom |
| `packages/ui` | `@repo/ui` | happy-dom |
| `packages/hooks` / `packages/api` | `@repo/hooks` / `@repo/api` | happy-dom(根默认) |

**单文件要换环境**用文件首行注解(不要改 config):
```ts
// @vitest-environment jsdom
```

## 已知坑(别重新踩)

- **localStorage / sessionStorage 已在根 `vitest.setup.ts` 修好**(Node ≥22 把实验性 `localStorage` 塞进 globalThis,导致 Vitest 不注入 jsdom/happy-dom 的实现)。测试里**直接用** `localStorage` 即可,**别再自己 polyfill 或 mock**;只需在 `beforeEach` 里 `localStorage.clear()`。
- `IS_REACT_ACT_ENVIRONMENT` 也已在 setup 里置好,React 19 的 act 警告无需再处理。
- 真实 HTTP 一律 mock 掉,测试不发网络请求。

## 复位(每个测试文件)

```ts
beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  // 用到 zustand store 时手动复位:
  // useAuthStore.setState({ accessToken: null, user: null });
});
```

## Mock 配方

**共享包**(组件测试里几乎都要,只 mock 你这次用到的导出):
```ts
vi.mock("@repo/icons", () => ({
  SvgIcon: ({ name }: { name: string }) => <span data-testid={`icon-${name}`} />,
}));
vi.mock("@repo/hooks", () => ({
  useLocale: () => ({ locale: "zh", setLocale: () => undefined, t: (k: string) => k }),
}));
vi.mock("@repo/ui", () => ({
  cn: (...c: Array<string | false | null | undefined>) => c.filter(Boolean).join(" "),
  Button: ({ children, ...p }: { children: ReactNode; [k: string]: unknown }) => <button {...p}>{children}</button>,
}));
```

**类型安全的返回值**:用 `vi.mocked`,别 `as any`:
```ts
vi.mocked(apiClient.auth.login).mockResolvedValue({ access_token: "acc", /* ... */ });
```

**web Server Component / page.tsx**:mock 数据源 `@/lib/server-api` 和重子组件,只验输出的 HTML 结构,不测服务端取数逻辑。`vi.fn` 要提到顶层用 `vi.hoisted`:
```ts
const mockState = vi.hoisted(() => ({ listPublic: vi.fn() }));
vi.mock("@/lib/server-api", () => ({
  createServerApiClient: async () => ({ moments: { listPublic: mockState.listPublic } }),
}));
```

**web 客户端组件**:数据走 hook,所以 mock `@/hooks/use-*`(及 `@/lib/toast` 等副作用),不要去 mock 裸 fetch。

**admin(React Query + 路由 + zustand)**:mock 全局 `apiClient`,组件用 `<MemoryRouter>` 包裹,store 用 `setState` 复位;断言异步用 `waitFor`。React Query 组件需 `QueryClientProvider` 包裹,覆盖 loading/error/success。
```ts
vi.mock("../lib/api", () => ({ apiClient: { auth: { login: vi.fn() } } }));
```

## 工具与最低覆盖

工具链已配好:Vitest + `@testing-library/react`(`render`/`screen`/`renderHook`/`userEvent`)+ 内置 `expect`(全局,已开 `globals`)。最低覆盖:组件 渲染/props/交互;Hook 初始/变更/边界;页面 核心内容/loading-error。
