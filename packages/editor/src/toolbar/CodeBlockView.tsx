/**
 * CodeBlockView — 代码块 React NodeView
 *
 * 右上角渲染语言下拉选择器（封装 Select 组件），用户可在插入代码块后随时切换语言。
 * 语言变更通过 updateAttributes 写回 ProseMirror 节点属性，
 * lowlight 扩展监听属性变化并重新高亮代码。
 *
 * contentEditable={false} 防止选择器被纳入 ProseMirror 编辑范围。
 *
 * NodeViewContent as 类型说明：
 * Tiptap v3 的 NodeViewContentProps 使用 NoInfer<T> 阻止类型推断（默认为 'div'），
 * 这里通过类型断言绕过，以渲染正确的 <code> 元素语义。
 */
import { NodeViewContent, NodeViewWrapper } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/core";
import type React from "react";
import { Select } from "@repo/ui";

type AnyNodeViewContent = React.ComponentType<{ as?: string; className?: string }>;
const TypedNodeViewContent = NodeViewContent as AnyNodeViewContent;

const SUPPORTED_LANGUAGES: Array<{ value: string; label: string }> = [
  { value: "plaintext", label: "Plain Text" },
  { value: "javascript", label: "JavaScript" },
  { value: "typescript", label: "TypeScript" },
  { value: "python", label: "Python" },
  { value: "rust", label: "Rust" },
  { value: "go", label: "Go" },
  { value: "java", label: "Java" },
  { value: "cpp", label: "C++" },
  { value: "c", label: "C" },
  { value: "csharp", label: "C#" },
  { value: "css", label: "CSS" },
  { value: "html", label: "HTML" },
  { value: "bash", label: "Bash" },
  { value: "shell", label: "Shell" },
  { value: "json", label: "JSON" },
  { value: "sql", label: "SQL" },
  { value: "yaml", label: "YAML" },
  { value: "markdown", label: "Markdown" },
  { value: "xml", label: "XML" },
  { value: "graphql", label: "GraphQL" },
  { value: "kotlin", label: "Kotlin" },
  { value: "swift", label: "Swift" },
  { value: "php", label: "PHP" },
  { value: "ruby", label: "Ruby" },
  { value: "scala", label: "Scala" },
];

export function CodeBlockView({ node, updateAttributes }: NodeViewProps) {
  const language = (node.attrs.language as string | null) ?? "plaintext";

  return (
    <NodeViewWrapper as="div" className="rich-editor-code-wrapper">
      {/* contentEditable={false} 防止 ProseMirror 捕获 Select 的键盘事件 */}
      <span contentEditable={false} className="rich-editor-code-lang">
        <Select
          selectedKey={language}
          onSelectionChange={(key) => {
            updateAttributes({ language: key as string });
          }}
          aria-label="选择代码语言"
          variant="minimal"
          size="sm"
          popoverClassName="rich-editor-lang-popover min-w-24"
        >
          {SUPPORTED_LANGUAGES.map(({ value, label }) => (
            <Select.Item key={value} id={value} label={label} />
          ))}
        </Select>
      </span>
      <pre className="rich-editor-code-block">
        <TypedNodeViewContent as="code" />
      </pre>
    </NodeViewWrapper>
  );
}
