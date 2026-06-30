import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { RuleImportDialog } from "./RuleImportDialog";

vi.mock("../hooks/use-rule-imports", () => ({
  useRuleImports: () => ({
    active: null,
    history: [],
    isLoading: false,
    error: null,
    upload: vi.fn(),
    publish: vi.fn(),
    cancel: vi.fn(),
    reloadHistory: vi.fn(),
  }),
}));

describe("RuleImportDialog", () => {
  it("渲染导入表单与历史区", () => {
    render(
      <RuleImportDialog
        open
        metadata={{ categories: [], rule_types: [], effects: [], risk_levels: [], sources: [] }}
        currentRulesetId={7}
        onClose={vi.fn()}
        onPublished={vi.fn()}
        onDownloadErrors={vi.fn()}
      />,
    );
    expect(screen.getByText("批量导入规则")).toBeInTheDocument();
    expect(screen.getByText("暂无导入历史")).toBeInTheDocument();
  });
});
