import { describe, expect, it, vi } from "vitest";
import { isValidElement } from "react";
import type { ReactElement, ReactNode } from "react";

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({ get: vi.fn() }),
}));

vi.mock("next/script", () => ({
  default: function NextScriptMock(props: { id?: string; strategy?: string }) {
    return <template data-testid={props.id} data-strategy={props.strategy} />;
  },
}));

vi.mock("@repo/icons", () => ({
  SvgSprite: () => null,
}));

vi.mock("@/components/footer", () => ({
  SiteFooter: () => null,
}));

const mockSiteNavbar = vi.hoisted(() => vi.fn(() => null));
const mockGetSession = vi.hoisted(() => vi.fn().mockResolvedValue(null));
const mockCreateServerApiClient = vi.hoisted(() => vi.fn());

vi.mock("@/components/navbar", () => ({
  SiteNavbar: mockSiteNavbar,
}));

vi.mock("@/lib/session", () => ({
  getSession: mockGetSession,
}));

vi.mock("@/lib/server-api", () => ({
  createServerApiClient: mockCreateServerApiClient,
}));

vi.mock("./providers/theme-provider", () => ({
  ThemeProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock("./providers/locale-provider", () => ({
  LocaleProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock("./providers/session-provider", () => ({
  SessionProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock("./providers/global-modals", () => ({
  GlobalModals: () => null,
}));

import RootLayout, { viewport } from "./layout";

type LayoutElementProps = {
  children?: ReactNode;
  id?: string;
  strategy?: string;
};

function findElements(
  node: ReactNode,
  predicate: (element: ReactElement<LayoutElementProps>) => boolean,
): ReactElement<LayoutElementProps>[] {
  if (node === null || node === undefined || typeof node === "boolean") return [];
  if (typeof node === "string" || typeof node === "number" || typeof node === "bigint") return [];
  if (Array.isArray(node)) return node.flatMap((child) => findElements(child, predicate));
  if (!isValidElement(node)) return [];

  const element = node as ReactElement<LayoutElementProps>;
  const matches = predicate(element) ? [element] : [];
  return matches.concat(findElements(element.props.children, predicate));
}

describe("Root layout viewport", () => {
  it("禁用移动端页面缩放", () => {
    expect(viewport).toMatchObject({
      width: "device-width",
      initialScale: 1,
      maximumScale: 1,
      userScalable: false,
    });
  });
});

describe("RootLayout", () => {
  it("已登录时读取首屏未读数并传给导航", async () => {
    mockGetSession.mockResolvedValueOnce({ userId: 7 });
    mockCreateServerApiClient.mockResolvedValueOnce({
      users: { getMe: vi.fn().mockResolvedValue({ id: 7, username: "vpt" }) },
      notifications: { unreadCount: vi.fn().mockResolvedValue({ count: 12 }) },
    });

    const layout = await RootLayout({ children: <main /> });

    const nav = findElements(layout, (element) => element.type === mockSiteNavbar);
    expect(nav[0]?.props).toMatchObject({ initialUnreadCount: 12 });
  });

  it("使用 next/script 在 hydration 前清除扩展注入属性", async () => {
    const layout = await RootLayout({ children: <main /> });

    expect(findElements(layout, (element) => element.type === "script")).toHaveLength(0);
    expect(
      findElements(
        layout,
        (element) =>
          typeof element.type === "function" &&
          element.type.name === "NextScriptMock" &&
          element.props.id === "strip-extension-attrs" &&
          element.props.strategy === "beforeInteractive",
      ),
    ).toHaveLength(1);
  });
});
