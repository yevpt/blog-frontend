import "@testing-library/jest-dom/vitest";

// Tiptap / ProseMirror 在测试环境中需要 getSelection 和 createRange
// happy-dom 未实现这些 API，此处提供最小 stub
if (typeof document !== "undefined") {
  if (!document.getSelection) {
    document.getSelection = () => null;
  }
  if (!document.createRange) {
    document.createRange = () =>
      ({
        setStart: () => {},
        setEnd: () => {},
        commonAncestorContainer: document.body,
      }) as unknown as Range;
  }
}
