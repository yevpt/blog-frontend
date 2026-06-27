import { render } from "@testing-library/react";
import { expect, test } from "vitest";
import { CircleVirtuosoList } from "./circle-virtuoso-grid";

test("CircleVirtuosoList 保留 Virtuoso 注入的 padding 样式", () => {
  const { container } = render(
    <CircleVirtuosoList style={{ paddingTop: 1200, paddingBottom: 800 }} data-testid="list" />,
  );

  const list = container.firstChild as HTMLElement;
  expect(list.style.paddingTop).toBe("1200px");
  expect(list.style.paddingBottom).toBe("800px");
  expect(list.style.gridTemplateColumns).toContain("repeat(auto-fill");
  expect(list.style.gridTemplateColumns).toContain("/ 6");
});
