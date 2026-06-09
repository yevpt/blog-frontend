export type NavbarMobileVariant = "home" | "article" | "default";

export interface NavbarRouteMatch {
  mobileVariant: NavbarMobileVariant;
  title?: string;
}

const DEFAULT_ROUTE_TITLES: Record<string, string> = {
  "/guestbook": "留言",
  "/friends": "友邻",
  "/circle": "圈子",
};

export function matchNavbarRoute(pathname: string): NavbarRouteMatch {
  if (pathname === "/") {
    return { mobileVariant: "home", title: undefined };
  }

  if (pathname === "/snippets") {
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
