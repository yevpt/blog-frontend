import { beforeEach, describe, expect, it, vi } from "vitest";
import { downloadBlob } from "./download";

describe("downloadBlob", () => {
  beforeEach(() => {
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:temp-url");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
  });

  it("下载完成后撤销临时 URL", () => {
    downloadBlob(new Blob(["x"]), "rules.csv");
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:temp-url");
  });
});
