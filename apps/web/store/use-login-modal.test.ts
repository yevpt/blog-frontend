import { describe, it, expect, beforeEach } from "vitest";
import { useLoginModal } from "./use-login-modal";

beforeEach(() => {
  useLoginModal.setState({ isOpen: false, view: "login" });
});

describe("useLoginModal", () => {
  it("初始状态：关闭，登录视图", () => {
    const state = useLoginModal.getState();
    expect(state.isOpen).toBe(false);
    expect(state.view).toBe("login");
  });

  it("open() 默认打开登录视图", () => {
    useLoginModal.getState().open();
    const state = useLoginModal.getState();
    expect(state.isOpen).toBe(true);
    expect(state.view).toBe("login");
  });

  it('open("register") 打开注册视图', () => {
    useLoginModal.getState().open("register");
    const state = useLoginModal.getState();
    expect(state.isOpen).toBe(true);
    expect(state.view).toBe("register");
  });

  it("close() 关闭并重置视图为登录", () => {
    useLoginModal.getState().open("register");
    useLoginModal.getState().close();
    const state = useLoginModal.getState();
    expect(state.isOpen).toBe(false);
    expect(state.view).toBe("login");
  });

  it("setView() 切换当前视图", () => {
    useLoginModal.getState().setView("register");
    expect(useLoginModal.getState().view).toBe("register");
    useLoginModal.getState().setView("login");
    expect(useLoginModal.getState().view).toBe("login");
  });
});
