"use client";

import { useState } from "react";
import { Button } from "@repo/ui";

interface CommentInputProps {
  onSubmit?: (text: string) => void;
}

export function CommentInput({ onSubmit }: CommentInputProps) {
  const [text, setText] = useState("");

  const handleSubmit = () => {
    if (!text.trim()) return;
    onSubmit?.(text.trim());
    setText("");
  };

  return (
    <div className="flex items-start gap-3 p-4 border-t border-border/30 bg-card">
      <img
        src="https://i.pravatar.cc/32?img=1"
        alt="你"
        className="w-8 h-8 rounded-full object-cover flex-shrink-0 mt-1"
      />
      <div className="flex-1 flex gap-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="写下你的评论..."
          rows={1}
          className="flex-1 resize-none rounded-xl bg-secondary/60 border border-border/30 px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
        />
        <Button variant="default" size="sm" onPress={handleSubmit} isDisabled={!text.trim()}>
          发送
        </Button>
      </div>
    </div>
  );
}
