"use client";

import { useEffect, useState } from "react";
import { Button, Modal, Select } from "@repo/ui";

export const SUPPORTED_LANGUAGES = [
  "plaintext",
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
  plaintext: "纯文本",
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

export interface CodeDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (code: string, lang: string) => void;
}

export function CodeDialog({ open, onClose, onConfirm }: CodeDialogProps) {
  const [code, setCode] = useState("");
  const [lang, setLang] = useState<SupportedLanguage>("plaintext");

  useEffect(() => {
    if (!open) {
      setCode("");
      setLang("plaintext");
    }
  }, [open]);

  function handleConfirm() {
    if (!code.trim()) return;
    onConfirm(code, lang);
    onClose();
  }

  return (
    <Modal
      isOpen={open}
      isDismissable
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose();
      }}
      aria-label="插入代码块"
      size="lg"
      overlayClassName="z-[400]"
      modalClassName="w-[min(90vw,520px)]"
      dialogClassName="p-5"
    >
      <h3 className="mb-4 text-[15px] font-semibold text-foreground">插入代码块</h3>

      <div className="flex flex-col gap-3">
        <div>
          <p className="mb-1 text-xs font-medium text-(--fg2)">语言</p>
          <Select
            selectedKey={lang}
            onSelectionChange={(key) => setLang(key as SupportedLanguage)}
            aria-label="语言"
            size="sm"
            popoverClassName="rich-editor-lang-popover"
          >
            {SUPPORTED_LANGUAGES.map((language) => (
              <Select.Item key={language} id={language} label={LANGUAGE_LABELS[language]} />
            ))}
          </Select>
        </div>

        <div>
          <label htmlFor="code-content" className="mb-1 block text-xs font-medium text-(--fg2)">
            代码内容 <span className="text-red-500">*</span>
          </label>
          <textarea
            id="code-content"
            aria-label="代码内容"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            rows={8}
            placeholder="在此输入代码..."
            className="w-full rounded-lg border border-input bg-background px-3 py-2 font-mono text-sm text-foreground outline-none transition-colors placeholder:text-(--fg3) focus:border-primary"
          />
        </div>
      </div>

      <div className="mt-5 flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onPress={onClose}>
          取消
        </Button>
        <Button type="button" size="sm" isDisabled={!code.trim()} onPress={handleConfirm}>
          插入
        </Button>
      </div>
    </Modal>
  );
}
