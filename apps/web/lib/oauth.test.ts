import { describe, it, expect, beforeEach } from "vitest";
import {
  OAUTH_RESULT_KEY,
  OAUTH_RETURN_URL_KEY,
  consumeOAuthResult,
  consumeOAuthReturnUrl,
  getOAuthUserDisplayName,
  peekOAuthResult,
  saveOAuthReturnUrl,
} from "./oauth";

describe("oauth helpers", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("getOAuthUserDisplayName 优先昵称再用户名", () => {
    expect(getOAuthUserDisplayName({ id: 1, username: "u", nickname: "N" })).toBe("N");
    expect(getOAuthUserDisplayName({ id: 1, username: "u" })).toBe("u");
    expect(getOAuthUserDisplayName(null)).toBe("用户");
  });

  it("saveOAuthReturnUrl / consumeOAuthReturnUrl 读写并清除", () => {
    saveOAuthReturnUrl();
    expect(sessionStorage.getItem(OAUTH_RETURN_URL_KEY)).toBe(window.location.href);
    expect(consumeOAuthReturnUrl()).toBe(window.location.href);
    expect(sessionStorage.getItem(OAUTH_RETURN_URL_KEY)).toBeNull();
    expect(consumeOAuthReturnUrl()).toBe("/");
  });

  it("consumeOAuthResult 读取并清除结果", () => {
    const msg = { type: "oauth_success" as const, user: { id: 1, username: "vpt" } };
    sessionStorage.setItem(OAUTH_RESULT_KEY, JSON.stringify(msg));
    expect(peekOAuthResult()).toEqual(msg);
    expect(consumeOAuthResult()).toEqual(msg);
    expect(sessionStorage.getItem(OAUTH_RESULT_KEY)).toBeNull();
    expect(consumeOAuthResult()).toBeNull();
  });
});
