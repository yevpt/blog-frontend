import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import type { AdminModerationImportResp } from "@repo/api";
import userEvent from "@testing-library/user-event";
import { RuleImportDialog } from "./RuleImportDialog";
import * as useRuleImportsHooks from "../hooks/use-rule-imports";

vi.mock("../hooks/use-rule-imports", () => ({
  useRuleImports: vi.fn(),
}));

describe("RuleImportDialog", () => {
  const mockUpload = vi.fn();
  const mockPublish = vi.fn();
  const mockCancel = vi.fn();
  const mockDownloadErrors = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useRuleImportsHooks.useRuleImports).mockReturnValue({
      active: null,
      history: [],
      isLoading: false,
      error: null,
      upload: mockUpload,
      publish: mockPublish,
      cancel: mockCancel,
      reloadHistory: vi.fn(),
    });
  });

  it("渲染导入表单与历史区", () => {
    render(
      <RuleImportDialog
        open
        metadata={{ categories: [], rule_types: [], effects: [], risk_levels: [], sources: [] }}
        currentRulesetId={7}
        onClose={vi.fn()}
        onPublished={vi.fn()}
        onDownloadErrors={mockDownloadErrors}
      />,
    );
    const dialog = screen.getByRole("dialog", { name: "批量导入规则" });
    expect(within(dialog).getByRole("heading", { name: "批量导入规则" })).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "选择文件" })).toBeInTheDocument();
    expect(within(dialog).getByLabelText("规则文件")).toHaveClass("sr-only");
    expect(dialog.querySelector("footer")).toHaveClass("border-t", "bg-muted/15");
    expect(screen.getByText("暂无导入历史")).toBeInTheDocument();
  });

  it("上传 CSV 文件时传递原 File 对象", async () => {
    render(
      <RuleImportDialog
        open
        metadata={{ categories: [], rule_types: [], effects: [], risk_levels: [], sources: [] }}
        currentRulesetId={7}
        onClose={vi.fn()}
        onPublished={vi.fn()}
        onDownloadErrors={mockDownloadErrors}
      />,
    );

    const sourceInput = screen.getByLabelText("来源名称");
    await userEvent.type(sourceInput, "test-source");

    const fileInput = screen.getByLabelText("规则文件");
    const file = new File(["regexp,test\ncomposite,test"], "rules.csv", { type: "text/csv" });
    await userEvent.upload(fileInput, file);

    const uploadBtn = screen.getByRole("button", { name: "上传并开始校验" });
    expect(uploadBtn).not.toBeDisabled();
    await userEvent.click(uploadBtn);

    expect(mockUpload).toHaveBeenCalledWith(
      expect.objectContaining({
        file,
        format: "csv",
        sourceName: "test-source",
      }),
    );
  });

  it("验证状态为 invalid 且有错误行时，提供下载错误报告按钮", async () => {
    vi.mocked(useRuleImportsHooks.useRuleImports).mockReturnValue({
      active: {
        id: 1,
        file_name: "rules.csv",
        validation_status: "invalid",
        total_rows: 10,
        valid_rows: 8,
        duplicate_rows: 0,
        error_rows: 2,
        created_at: "2026-06-29T10:00:00Z",
      } as unknown as AdminModerationImportResp,
      history: [],
      isLoading: false,
      error: null,
      upload: mockUpload,
      publish: mockPublish,
      cancel: mockCancel,
      reloadHistory: vi.fn(),
    });

    render(
      <RuleImportDialog
        open
        metadata={null}
        currentRulesetId={7}
        onClose={vi.fn()}
        onPublished={vi.fn()}
        onDownloadErrors={mockDownloadErrors}
      />,
    );

    const downloadBtn = screen.getByRole("button", { name: "下载错误报告" });
    await userEvent.click(downloadBtn);

    expect(mockDownloadErrors).toHaveBeenCalledWith(1);
    expect(screen.queryByRole("button", { name: "确认发布" })).not.toBeInTheDocument();
  });

  it("验证状态为 valid 且有 ruleset_id 时，提供确认发布按钮", async () => {
    vi.mocked(useRuleImportsHooks.useRuleImports).mockReturnValue({
      active: {
        id: 2,
        file_name: "rules.csv",
        validation_status: "valid",
        total_rows: 10,
        valid_rows: 10,
        duplicate_rows: 0,
        error_rows: 0,
        ruleset_id: 8,
        created_at: "2026-06-29T10:00:00Z",
      } as unknown as AdminModerationImportResp,
      history: [],
      isLoading: false,
      error: null,
      upload: mockUpload,
      publish: mockPublish,
      cancel: mockCancel,
      reloadHistory: vi.fn(),
    });

    render(
      <RuleImportDialog
        open
        metadata={null}
        currentRulesetId={7}
        onClose={vi.fn()}
        onPublished={vi.fn()}
        onDownloadErrors={mockDownloadErrors}
      />,
    );

    const publishBtn = screen.getByRole("button", { name: "确认发布" });
    await userEvent.click(publishBtn);

    expect(mockPublish).toHaveBeenCalled();
  });
});
