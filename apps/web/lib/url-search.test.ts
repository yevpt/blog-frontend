// @vitest-environment jsdom
/* global window */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { replacePageSearchParam } from "./url-search";

describe("replacePageSearchParam", () => {
  beforeEach(() => {
    window.history.replaceState(null, "", "/guestbook");
  });

  afterEach(() => {
    window.history.replaceState(null, "", "/");
  });

  it("page > 1 时写入 ?page=N", () => {
    replacePageSearchParam(3);
    expect(window.location.pathname).toBe("/guestbook");
    expect(window.location.search).toBe("?page=3");
  });

  it("page <= 1 时移除 page 参数", () => {
    window.history.replaceState(null, "", "/guestbook?page=2&foo=bar");
    replacePageSearchParam(1);
    expect(window.location.search).toBe("?foo=bar");
  });

  it("保留 pathname 与其他查询参数", () => {
    window.history.replaceState(null, "", "/guestbook?foo=bar#section");
    replacePageSearchParam(2);
    expect(window.location.pathname).toBe("/guestbook");
    expect(window.location.search).toBe("?foo=bar&page=2");
    expect(window.location.hash).toBe("#section");
  });
});
