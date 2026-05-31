import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AuthGuard } from "./AuthGuard";
import { useAuthStore } from "../store/auth";

describe("AuthGuard", () => {
  beforeEach(() => {
    useAuthStore.setState({ accessToken: null, user: null });
  });

  it("已登录时渲染子路由内容", () => {
    useAuthStore.setState({ accessToken: "valid-token" });
    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <Routes>
          <Route element={<AuthGuard />}>
            <Route path="/dashboard" element={<div>Dashboard</div>} />
          </Route>
          <Route path="/login" element={<div>Login</div>} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.queryByText("Login")).toBeNull();
  });

  it("未登录时重定向到 /login", () => {
    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <Routes>
          <Route element={<AuthGuard />}>
            <Route path="/dashboard" element={<div>Dashboard</div>} />
          </Route>
          <Route path="/login" element={<div>Login</div>} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByText("Login")).toBeInTheDocument();
    expect(screen.queryByText("Dashboard")).toBeNull();
  });
});
