"use client";

import type { FormEvent } from "react";
import { Modal, Button } from "@repo/ui";
import { useSnippetModal } from "@/store/use-snippet-modal";
import { addToast } from "@/lib/toast";

export function SnippetModal() {
  const { isOpen, close } = useSnippetModal();

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    // TODO: 接入发布碎语的 API
    addToast("发布成功（前端演示）", "success");
    close();
  }

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={(open) => !open && close()}
      placement="center"
      size="md"
      aria-label="写碎语"
    >
      <div className="p-5">
        <h2 className="mb-4 text-lg font-bold text-foreground">写碎语</h2>
        <form onSubmit={handleSubmit}>
          <textarea
            placeholder="此刻的想法..."
            className="mb-4 min-h-[140px] w-full resize-none rounded-md bg-muted/50 p-3 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <div className="flex justify-end gap-3">
            <Button variant="outline" onPress={close}>
              取消
            </Button>
            <Button type="submit">发布</Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
