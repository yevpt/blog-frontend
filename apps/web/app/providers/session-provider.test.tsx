// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SessionProvider, useSession } from "./session-provider";

function ProfileProbe() {
  const { profile, patchProfile } = useSession();
  return (
    <>
      <span data-testid="avatar">{profile?.avatar_url ?? "none"}</span>
      <button
        type="button"
        onClick={() => patchProfile({ avatar_url: "https://cdn.test/new.png" })}
      >
        patch
      </button>
    </>
  );
}

describe("SessionProvider", () => {
  it("patchProfile 合并更新 profile", async () => {
    render(
      <SessionProvider
        userId={1}
        profile={{
          id: 1,
          username: "alice",
          roles: [],
          status: 1,
          avatar_url: "https://cdn.test/old.png",
        }}
      >
        <ProfileProbe />
      </SessionProvider>,
    );

    expect(screen.getByTestId("avatar")).toHaveTextContent("https://cdn.test/old.png");
    await userEvent.click(screen.getByRole("button", { name: "patch" }));
    expect(screen.getByTestId("avatar")).toHaveTextContent("https://cdn.test/new.png");
  });

  it("SSR profile 变更时重置本地 state", () => {
    const { rerender } = render(
      <SessionProvider
        userId={1}
        profile={{
          id: 1,
          username: "alice",
          roles: [],
          status: 1,
          avatar_url: "https://cdn.test/v1.png",
        }}
      >
        <ProfileProbe />
      </SessionProvider>,
    );

    act(() => {
      screen.getByRole("button", { name: "patch" }).click();
    });
    expect(screen.getByTestId("avatar")).toHaveTextContent("https://cdn.test/new.png");

    rerender(
      <SessionProvider
        userId={1}
        profile={{
          id: 1,
          username: "alice",
          roles: [],
          status: 1,
          avatar_url: "https://cdn.test/v2.png",
        }}
      >
        <ProfileProbe />
      </SessionProvider>,
    );
    expect(screen.getByTestId("avatar")).toHaveTextContent("https://cdn.test/v2.png");
  });
});
