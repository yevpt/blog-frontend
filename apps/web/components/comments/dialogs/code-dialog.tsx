"use client";

import { useState, useEffect } from "react";

export const SUPPORTED_LANGUAGES = [
  "plain",
  "javascript",
  "typescript",
  "python",
  "rust",
  "go",
  "java",
  "cpp",
  "css",
  "html",
  "bash",
  "json",
  "sql",
  "yaml",
] as const;

type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

const LANGUAGE_LABELS: Record<SupportedLanguage, string> = {
  plain: "纯文本",
  javascript: "JavaScript",
  typescript: "TypeScript",
  python: "Python",
  rust: "Rust",
  go: "Go",
  java: "Java",
  cpp: "C++",
  css: "CSS",
  html: "HTML",
  bash: "Bash",
  json: "JSON",
  sql: "SQL",
  yaml: "YAML",
};

interface CodeDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (code: string, lang: string) => void;
}

export function CodeDialog({ open, onClose, onConfirm }: CodeDialogProps) {
  const [code, setCode] = useState("");
  const [lang, setLang] = useState<SupportedLanguage>("plain");

  useEffect(() => {
    if (!open) {
      setCode("");
      setLang("plain");
    }
  }, [open]);

  if (!open) return null;

  function handleConfirm() {
    if (!code.trim()) return;
    onConfirm(code, lang);
    onClose();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="插入代码"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
    >
      <div className="w-[min(90vw,520px)] rounded-2xl bg-background p-5 shadow-xl">
        <h3 className="mb-4 text-[15px] font-semibold text-foreground">插入代码</h3>

        <div className="flex flex-col gap-3">
          <div>
            <label htmlFor="code-lang" className="mb-1 block text-xs font-medium text-(--fg2)">
              语言
            </label>
            <select
              id="code-lang"
              aria-label="语言"
              value={lang}
              onChange={(e) => setLang(e.target.value as SupportedLanguage)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-primary"
            >
              {SUPPORTED_LANGUAGES.map((l) => (
                <option key={l} value={l}>
                  {LANGUAGE_LABELS[l]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="code-content" className="mb-1 block text-xs font-medium text-(--fg2)">
              代码内容 <span className="text-red-500">*</span>
            </label>
            <textarea
              id="code-content"
              aria-label="代码内容"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              rows={8}
              placeholder="在此输入代码..."
              className="w-full rounded-lg border border-input bg-background px-3 py-2 font-mono text-sm text-foreground outline-none transition-colors placeholder:text-(--fg3) focus:border-primary"
            />
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 items-center justify-center rounded-md px-3 text-xs font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            取消
          </button>
          <button
            type="button"
            disabled={!code.trim()}
            onClick={handleConfirm}
            className="inline-flex h-8 items-center justify-center rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
          >
            插入
          </button>
        </div>
      </div>
    </div>
  );
}
