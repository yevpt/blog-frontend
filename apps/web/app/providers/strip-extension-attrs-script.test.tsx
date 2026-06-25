import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { StripExtensionAttrsScript } from "./strip-extension-attrs-script";

describe("StripExtensionAttrsScript", () => {
  it("服务端渲染输出内联 script", () => {
    const html = renderToString(<StripExtensionAttrsScript />);

    expect(html).toContain('id="strip-extension-attrs"');
    expect(html).toContain("MutationObserver");
  });

  it("客户端渲染不输出 script，避免 React 19 控制台警告", () => {
    render(<StripExtensionAttrsScript />);

    expect(document.getElementById("strip-extension-attrs")).toBeNull();
  });
});
