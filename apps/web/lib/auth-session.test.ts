import { describe, it, expect } from "vitest";
import { resolveAuthUser } from "./auth-session";

/** 仅含 uid 的 JWT payload，用于测试 decodeJwt */
const accessTokenWithUid42 = "eyJhbGciOiJIUzI1NiJ9.eyJ1aWQiOjQyLCJ0eXBlIjoiYWNjZXNzIn0.signature";

describe("resolveAuthUser", () => {
  const tokenPayload = {
    access_token: accessTokenWithUid42,
    refresh_token: "ref",
    expires_in: 7200,
  };

  it("后端已返回 user 时原样使用", () => {
    const user = { id: 1, username: "alice@example.com", nickname: "Alice" };
    expect(resolveAuthUser({ ...tokenPayload, user })).toEqual(user);
  });

  it("后端未返回 user 时从 JWT 与表单字段补全", () => {
    expect(
      resolveAuthUser(tokenPayload, {
        email: "user@example.com",
        nickname: "新用户",
      }),
    ).toEqual({
      id: 42,
      username: "user@example.com",
      email: "user@example.com",
      nickname: "新用户",
    });
  });

  it("无昵称时省略 nickname 字段", () => {
    expect(resolveAuthUser(tokenPayload, { email: "user@example.com" })).toEqual({
      id: 42,
      username: "user@example.com",
      email: "user@example.com",
      nickname: undefined,
    });
  });
});
