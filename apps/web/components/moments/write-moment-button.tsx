"use client";

import { Button, cn, Tooltip } from "@repo/ui";
import { SvgIcon } from "@repo/icons";
import { useSession } from "@/app/providers/session-provider";
import { useLoginModal } from "@/store/use-login-modal";
import { useMomentModal } from "@/store/use-moment-modal";

export function WriteMomentButton() {
  const { profile } = useSession();
  const { open: openLoginModal } = useLoginModal();
  const { open: openMomentModal } = useMomentModal();

  function handleClick() {
    if (!profile) {
      openLoginModal();
    } else {
      openMomentModal();
    }
  }

  return (
    <Tooltip title="写碎语" placement="top" delay={200}>
      <Button
        type="button"
        onPress={handleClick}
        aria-label="写碎语"
        variant="default"
        className={cn(
          "pointer-events-auto flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full p-0 shadow-lg md:h-12 md:w-12",
          "bg-primary text-primary-foreground hover:shadow-xl",
          "md:translate-x-[max(0px,calc(25vw-13.5rem))]", // 精准推到右侧空白区中心
        )}
      >
        <SvgIcon name="pen" className="size-4 shrink-0 md:size-[18px]" />
      </Button>
    </Tooltip>
  );
}
