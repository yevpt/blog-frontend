import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { UserInfoHeader } from "./user-info-header";

const mockAddToast = vi.fn();
const mockGrantVip = vi.fn().mockResolvedValue(undefined);
const mockRevokeVip = vi.fn().mockResolvedValue(undefined);

vi.mock("@/lib/toast", () => ({
  addToast: (...args: unknown[]) => mockAddToast(...args),
}));

vi.mock("@/hooks/use-admin-vip-role", () => ({
  useAdminVipRole: () => ({
    grantVip: mockGrantVip,
    revokeVip: mockRevokeVip,
    isPending: false,
  }),
}));

vi.mock("@repo/icons", () => ({
  SvgIcon: ({ name }: { name: string }) => <span data-testid={`icon-${name}`} />,
}));

const baseProps = {
  userId: 42,
  nickname: "TestUser",
  mark: null,
  description: null,
  avatarUrl: null,
  lastLoginAt: null,
  roles: [],
  socialLinks: [],
  isOwner: false,
  isEditMode: false,
  canManageVip: false,
  onToggleEditMode: vi.fn(),
  onSaveNickname: vi.fn().mockResolvedValue(undefined),
  onRolesChange: vi.fn(),
};

describe("UserInfoHeader", () => {
  beforeEach(() => {
    mockAddToast.mockClear();
    mockGrantVip.mockClear();
    mockRevokeVip.mockClear();
  });

  it("渲染不崩溃", () => {
    render(<UserInfoHeader {...baseProps} />);
    expect(screen.getByText("TestUser")).toBeInTheDocument();
  });

  it("非本人不显示编辑按钮", () => {
    render(<UserInfoHeader {...baseProps} isOwner={false} />);
    expect(screen.queryByText("编辑个人资料")).not.toBeInTheDocument();
  });

  it("本人只读模式显示「编辑个人资料」按钮", () => {
    render(<UserInfoHeader {...baseProps} isOwner isEditMode={false} />);
    expect(screen.getByText("编辑个人资料")).toBeInTheDocument();
  });

  it("本人编辑模式显示「退出编辑」按钮", () => {
    render(<UserInfoHeader {...baseProps} isOwner isEditMode />);
    expect(screen.getByText("退出编辑")).toBeInTheDocument();
  });

  it("编辑模式下昵称旁显示铅笔图标", () => {
    render(<UserInfoHeader {...baseProps} isOwner isEditMode />);
    expect(screen.getByLabelText("编辑昵称")).toBeInTheDocument();
  });

  it("有身份标签时显示", () => {
    render(<UserInfoHeader {...baseProps} mark="全栈工程师" />);
    expect(screen.getByText("全栈工程师")).toBeInTheDocument();
  });

  it("VIP 角色显示 badge", () => {
    render(<UserInfoHeader {...baseProps} roles={["ROLE_VIP"]} />);
    expect(screen.getByText("VIP")).toBeInTheDocument();
  });

  it("VIP 非编辑模式头像显示皇冠", () => {
    render(<UserInfoHeader {...baseProps} roles={["ROLE_VIP"]} isEditMode={false} />);
    expect(screen.getByTestId("icon-vip")).toBeInTheDocument();
  });

  it("VIP 编辑模式头像不显示皇冠", () => {
    render(<UserInfoHeader {...baseProps} roles={["ROLE_VIP"]} isOwner isEditMode />);
    expect(screen.queryByTestId("icon-vip")).not.toBeInTheDocument();
  });

  it("点击铅笔图标进入昵称编辑态", async () => {
    render(<UserInfoHeader {...baseProps} isOwner isEditMode />);
    await userEvent.click(screen.getByLabelText("编辑昵称"));
    expect(screen.getByDisplayValue("TestUser")).toBeInTheDocument();
  });

  it("传入社交链接不崩溃", () => {
    const socialLinks = [{ platform: "github", url: "https://github.com/test" }];
    expect(() => render(<UserInfoHeader {...baseProps} socialLinks={socialLinks} />)).not.toThrow();
  });

  it("头像上传失败时 toast 展示后端错误", async () => {
    const onAvatarChange = vi.fn().mockRejectedValue(new Error("缺少上传文件"));
    render(<UserInfoHeader {...baseProps} isOwner isEditMode onAvatarChange={onAvatarChange} />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["avatar"], "avatar.png", { type: "image/png" });
    await userEvent.upload(input, file);

    expect(onAvatarChange).toHaveBeenCalledWith(file);
    expect(mockAddToast).toHaveBeenCalledWith("缺少上传文件", "error");
  });

  it("canManageVip 为 false 时不显示更多操作", () => {
    render(<UserInfoHeader {...baseProps} canManageVip={false} />);
    expect(screen.queryByRole("button", { name: "更多操作" })).not.toBeInTheDocument();
  });

  it("canManageVip 时显示授予星标认证菜单", async () => {
    const user = userEvent.setup();
    render(<UserInfoHeader {...baseProps} canManageVip roles={[]} />);
    await user.click(screen.getByRole("button", { name: "更多操作" }));
    expect(screen.getByRole("menuitem", { name: "授予星标认证" })).toBeInTheDocument();
  });

  it("已是 VIP 时菜单显示取消星标认证", async () => {
    const user = userEvent.setup();
    render(<UserInfoHeader {...baseProps} canManageVip roles={["ROLE_VIP"]} />);
    await user.click(screen.getByRole("button", { name: "更多操作" }));
    expect(screen.getByRole("menuitem", { name: "取消星标认证" })).toBeInTheDocument();
  });

  it("授予星标认证需二次确认后才调用接口", async () => {
    const user = userEvent.setup();
    const onRolesChange = vi.fn();
    render(<UserInfoHeader {...baseProps} canManageVip onRolesChange={onRolesChange} />);

    await user.click(screen.getByRole("button", { name: "更多操作" }));
    await user.click(screen.getByRole("menuitem", { name: "授予星标认证" }));
    expect(screen.getByText("确定为「TestUser」授予星标认证吗？")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "确定" }));
    expect(mockGrantVip).toHaveBeenCalled();
    expect(mockRevokeVip).not.toHaveBeenCalled();
  });

  it("取消星标认证需二次确认后才调用接口", async () => {
    const user = userEvent.setup();
    render(<UserInfoHeader {...baseProps} canManageVip roles={["ROLE_VIP"]} />);

    await user.click(screen.getByRole("button", { name: "更多操作" }));
    await user.click(screen.getByRole("menuitem", { name: "取消星标认证" }));
    expect(screen.getByText("确定取消「TestUser」的星标认证吗？")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "确定" }));
    expect(mockRevokeVip).toHaveBeenCalled();
    expect(mockGrantVip).not.toHaveBeenCalled();
  });
});
