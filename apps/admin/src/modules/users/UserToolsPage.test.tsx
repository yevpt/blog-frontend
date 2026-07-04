import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { UserToolsPage } from "./UserToolsPage";

const navigate = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<Record<string, unknown>>("react-router-dom");
  return { ...actual, useNavigate: () => navigate };
});

vi.mock("./components/AvatarNormalizeTool", () => ({
  AllUsersAvatarTool: () => <div>处理全部</div>,
}));

describe("UserToolsPage", () => {
  beforeEach(() => vi.clearAllMocks());

  it("渲染全量头像工具并可返回用户管理", async () => {
    const user = userEvent.setup();
    render(<UserToolsPage />);

    expect(screen.getByRole("heading", { name: "用户工具" })).toBeInTheDocument();
    expect(screen.getByText("处理全部")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "返回用户管理" }));
    expect(navigate).toHaveBeenCalledWith("/users");
  });
});
