import { describe, expect, it } from "vitest";
import { matchNavbarRoute } from "./navbar-route-config";

describe("matchNavbarRoute", () => {
  it("首页命中 home", () => {
    expect(matchNavbarRoute("/")).toEqual({
      mobileVariant: "home",
      title: undefined,
    });
  });

  it("文章详情页命中 article", () => {
    expect(matchNavbarRoute("/articles/42")).toEqual({
      mobileVariant: "article",
      title: undefined,
    });
  });

  it("非数字文章路径回退到 default", () => {
    expect(matchNavbarRoute("/articles/abc")).toEqual({
      mobileVariant: "default",
      title: undefined,
    });
  });

  it("文章子路径回退到 default", () => {
    expect(matchNavbarRoute("/articles/42/comments")).toEqual({
      mobileVariant: "default",
      title: undefined,
    });
  });

  it("snippets 命中 default，并返回碎语标题", () => {
    expect(matchNavbarRoute("/snippets")).toEqual({
      mobileVariant: "default",
      title: "碎语",
    });
  });

  it("guestbook、friends、circle 命中 default", () => {
    expect(matchNavbarRoute("/guestbook")).toEqual({
      mobileVariant: "default",
      title: "留言",
    });
    expect(matchNavbarRoute("/friends")).toEqual({
      mobileVariant: "default",
      title: "友邻",
    });
    expect(matchNavbarRoute("/circle")).toEqual({
      mobileVariant: "default",
      title: "圈子",
    });
  });

  it("未显式登记的其他路径仍走 default，但 title 为空", () => {
    expect(matchNavbarRoute("/login")).toEqual({
      mobileVariant: "default",
      title: undefined,
    });
  });
});
