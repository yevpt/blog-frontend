import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { FadeInUp } from "./fade-in-up";

describe("FadeInUp", () => {
  it("渲染 children 内容", () => {
    render(
      <FadeInUp>
        <span>hello</span>
      </FadeInUp>,
    );
    expect(screen.getByText("hello")).toBeTruthy();
  });

  it("默认包含 animate-fade-in-up class", () => {
    const { container } = render(
      <FadeInUp>
        <span>hi</span>
      </FadeInUp>,
    );
    expect(container.firstChild).toHaveProperty("className");
    expect((container.firstChild as HTMLElement).className).toContain("animate-fade-in-up");
  });

  it("delay prop 注入到 animationDelay style", () => {
    const { container } = render(
      <FadeInUp delay={150}>
        <span>hi</span>
      </FadeInUp>,
    );
    const el = container.firstChild as HTMLElement;
    expect(el.style.animationDelay).toBe("150ms");
  });

  it("duration prop 注入到 animationDuration style", () => {
    const { container } = render(
      <FadeInUp duration={600}>
        <span>hi</span>
      </FadeInUp>,
    );
    const el = container.firstChild as HTMLElement;
    expect(el.style.animationDuration).toBe("600ms");
  });

  it("额外 className 被合并", () => {
    const { container } = render(
      <FadeInUp className="my-class">
        <span>hi</span>
      </FadeInUp>,
    );
    expect((container.firstChild as HTMLElement).className).toContain("my-class");
  });
});
