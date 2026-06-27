import { createElement, type ReactElement, type ReactNode } from "react";
import { render, type RenderOptions } from "@testing-library/react";
import { renderHook, type RenderHookOptions } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

export function renderWithAdminRouter(
  ui: ReactElement,
  options?: Omit<RenderOptions, "wrapper"> & { initialEntry?: string },
) {
  const initialEntry = options?.initialEntry ?? "/";
  return render(ui, {
    ...options,
    wrapper: ({ children }: { children: ReactNode }) =>
      createElement(MemoryRouter, { initialEntries: [initialEntry] }, children),
  });
}

export function renderHookWithAdminRouter<Result, Props>(
  hook: (props: Props) => Result,
  options?: Omit<RenderHookOptions<Props>, "wrapper"> & { initialEntry?: string },
) {
  const initialEntry = options?.initialEntry ?? "/";
  return renderHook(hook, {
    ...options,
    wrapper: ({ children }: { children: ReactNode }) =>
      createElement(MemoryRouter, { initialEntries: [initialEntry] }, children),
  });
}
