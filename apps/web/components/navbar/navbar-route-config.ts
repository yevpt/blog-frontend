export type NavbarMobileVariant = "home" | "article" | "default";

export interface NavbarRouteMatch {
  mobileVariant: NavbarMobileVariant;
  title?: string;
}

const DEFAULT_ROUTE_TITLES: Record<string, string> = {
  "/moments": "碎语",
  "/guestbook": "留言",
  "/friend-links": "友邻",
  "/circle": "圈子",
  "/notifications": "消息中心",
};

export function matchNavbarRoute(pathname: string): NavbarRouteMatch {
  if (pathname === "/") {
    return { mobileVariant: "home", title: undefined };
  }

  if (/^\/articles\/\d+$/.test(pathname)) {
    return { mobileVariant: "article", title: undefined };
  }

  return {
    mobileVariant: "default",
    title: DEFAULT_ROUTE_TITLES[pathname],
  };
}
