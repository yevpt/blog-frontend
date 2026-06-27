import type { UserListItemResp } from "@repo/api";
import { CIRCLE_USER_CARD_CLASS } from "./circle-grid";

/** 与 BaseUserCard variant=normal（showRoleLabel=false）DOM 结构对齐的骨架 */
export function CircleUserCardSkeleton() {
  return (
    <div
      className={CIRCLE_USER_CARD_CLASS}
      data-testid="circle-user-card-skeleton"
      aria-hidden="true"
    >
      <div className="relative">
        <div className="h-12 w-12 shrink-0 rounded-full moment-shimmer-bar" />
      </div>
      <div className="flex w-full flex-col items-center gap-0.5">
        <div className="moment-shimmer-bar h-3.5 w-16 max-w-[70%] rounded-md" />
      </div>
      <div className="flex w-full items-center justify-center">
        <div className="moment-shimmer-bar h-3.5 w-12 rounded-md" />
      </div>
    </div>
  );
}

export function isCircleSkeletonUser(user: UserListItemResp): boolean {
  return user.id < 0;
}
