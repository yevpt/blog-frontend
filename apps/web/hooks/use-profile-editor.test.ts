// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import type { UserPublicProfileResp } from "@repo/api";
import { useProfileEditor } from "./use-profile-editor";

let mockSessionUserId: number | null = 1;

vi.mock("@/app/providers/session-provider", () => ({
  useSession: () => ({ userId: mockSessionUserId, profile: null }),
}));

const baseProfile: UserPublicProfileResp = {
  id: 1,
  nickname: "TestUser",
  avatar_url: null,
  mark: "工程师",
  description: "简介内容",
  last_login_at: null,
  register_at: "2024-01-01T00:00:00Z",
  roles: [],
  display_email: null,
  site: "https://example.com",
  social_links: [{ platform: "github", url: "https://github.com/test" }],
  gender: "1",
  birthday: "1995-06-15",
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

describe("useProfileEditor", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    mockSessionUserId = 1;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("saving nickname PATCHes /api/users/me/profile and updates local profile", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({}));

    const { result } = renderHook(() => useProfileEditor(baseProfile));

    await act(async () => {
      await result.current.saveNickname("NewName");
    });

    expect(fetch).toHaveBeenCalledWith(
      "/api/users/me/profile",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ nickname: "NewName" }),
      }),
    );
    expect(result.current.profile.nickname).toBe("NewName");
  });

  it("saving mark/description PATCHes profile endpoint with null for empty values", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse({}))
      .mockResolvedValueOnce(jsonResponse({}));

    const { result } = renderHook(() => useProfileEditor(baseProfile));

    await act(async () => {
      await result.current.saveField("mark", "");
    });
    await act(async () => {
      await result.current.saveField("description", "新的简介");
    });

    expect(fetch).toHaveBeenNthCalledWith(
      1,
      "/api/users/me/profile",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ mark: null }),
      }),
    );
    expect(fetch).toHaveBeenNthCalledWith(
      2,
      "/api/users/me/profile",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ description: "新的简介" }),
      }),
    );
    expect(result.current.profile.mark).toBeNull();
    expect(result.current.profile.description).toBe("新的简介");
  });

  it("saving gender/birthday PATCHes /api/users/me/meta", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse({}))
      .mockResolvedValueOnce(jsonResponse({}));

    const { result } = renderHook(() => useProfileEditor(baseProfile));

    await act(async () => {
      await result.current.saveField("gender", "0");
    });
    await act(async () => {
      await result.current.saveField("birthday", "1996-01-02");
    });

    expect(fetch).toHaveBeenNthCalledWith(
      1,
      "/api/users/me/meta",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ gender: "0" }),
      }),
    );
    expect(fetch).toHaveBeenNthCalledWith(
      2,
      "/api/users/me/meta",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ birthday: "1996-01-02" }),
      }),
    );
    expect(result.current.profile.gender).toBe("0");
    expect(result.current.profile.birthday).toBe("1996-01-02");
  });

  it("saving site PATCHes profile endpoint", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({}));

    const { result } = renderHook(() => useProfileEditor(baseProfile));

    await act(async () => {
      await result.current.saveField("site", "https://blog.test");
    });

    expect(fetch).toHaveBeenCalledWith(
      "/api/users/me/profile",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ site: "https://blog.test" }),
      }),
    );
    expect(result.current.profile.site).toBe("https://blog.test");
  });

  it("saving social link PATCHes /api/users/me/social/{platform} and updates social_links", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({}));

    const { result } = renderHook(() => useProfileEditor(baseProfile));

    await act(async () => {
      await result.current.saveField("github", "https://github.com/new");
    });

    expect(fetch).toHaveBeenCalledWith(
      "/api/users/me/social/github",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ url: "https://github.com/new" }),
      }),
    );
    expect(result.current.profile.social_links).toEqual([
      { platform: "github", url: "https://github.com/new" },
    ]);
  });

  it("avatar upload sends FormData to /api/users/me/avatar and updates avatar URL", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({ avatar_url: "https://cdn.test/avatar.png" }),
    );

    const { result } = renderHook(() => useProfileEditor(baseProfile));
    const file = new File(["avatar"], "avatar.png", { type: "image/png" });

    await act(async () => {
      await result.current.changeAvatar(file);
    });

    const [, init] = vi.mocked(fetch).mock.calls[0] ?? [];
    expect(fetch).toHaveBeenCalledWith("/api/users/me/avatar", {
      method: "POST",
      body: expect.any(FormData),
    });
    expect((init?.body as FormData).get("avatar")).toBe(file);
    expect(result.current.profile.avatar_url).toBe("https://cdn.test/avatar.png");
  });
});
