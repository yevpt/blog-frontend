import type { FriendLinkItemResp } from "@repo/api";
import { FadeInUp } from "@repo/ui";
import { FriendLinkCard } from "./friend-link-card";

interface FriendLinksListProps {
  links: FriendLinkItemResp[];
}

const MAX_ANIMATED = 10;

export function FriendLinksList({ links }: FriendLinksListProps) {
  return (
    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
      {links.map((link, index) => (
        <FadeInUp key={link.id} delay={Math.min(index, MAX_ANIMATED - 1) * 50}>
          <FriendLinkCard link={link} />
        </FadeInUp>
      ))}
    </div>
  );
}
