"use client";

import { useState } from "react";
import { SvgIcon } from "@repo/icons";
import { Button } from "@repo/ui";

interface SnippetActionsProps {
  onCommentClick?: () => void;
}

export function SnippetActions({ onCommentClick }: SnippetActionsProps) {
  const [liked, setLiked] = useState(false);

  return (
    <div className="flex gap-1">
      {/* 喜欢：本地 toggle */}
      <Button
        variant="ghost"
        size="sm"
        onPress={() => setLiked((prev) => !prev)}
        aria-label={liked ? "取消喜欢" : "喜欢"}
        aria-pressed={liked}
        className={liked ? "text-red-500" : "text-muted-foreground"}
      >
        <SvgIcon name="heart" size={14} className={liked ? "[&_svg]:fill-red-500" : ""} />
      </Button>

      {/* 评论：触发 CommentModal */}
      <Button
        variant="ghost"
        size="sm"
        onPress={onCommentClick}
        aria-label="评论"
        className="text-muted-foreground"
      >
        <SvgIcon name="message-circle" size={14} />
      </Button>
    </div>
  );
}
