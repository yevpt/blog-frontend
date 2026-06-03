import { Button } from "@repo/ui";

export function CommentInput() {
  return (
    <div className="flex shrink-0 gap-2.5 border-t border-border px-[18px] py-3 pb-4">
      <img
        src="https://i.pravatar.cc/56?img=11"
        alt="当前用户"
        className="mt-0.5 h-7 w-7 rounded-full"
      />
      <div className="min-w-0 flex-1">
        <textarea
          placeholder="写下你的评论..."
          rows={3}
          className="min-h-[72px] w-full resize-none rounded-xl border border-input bg-background px-3 py-2.5 text-[13px] leading-normal text-foreground outline-none transition-colors placeholder:text-[var(--fg3)] focus:border-primary"
        />
        <div className="mt-2 flex justify-end">
          <Button
            variant="default"
            size="sm"
            className="h-8 rounded-full bg-primary px-[18px] text-xs font-bold text-white hover:bg-primary/85"
          >
            发布
          </Button>
        </div>
      </div>
    </div>
  );
}
