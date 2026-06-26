import type { FriendLinkItemResp } from "@repo/api";
import { FadeInUp } from "@repo/ui";
import { FriendLinksPausedSection } from "./friend-links-paused-section";
import { FriendLinksRulesCard } from "./friend-links-rules-card";
import { FriendLinksList } from "./friend-links-list";

interface FriendLinksPageProps {
  links: FriendLinkItemResp[];
}

export function FriendLinksPage({ links }: FriendLinksPageProps) {
  const activeLinks = links.filter((link) => link.status === 1);
  const pausedLinks = links.filter((link) => link.status === 2);

  return (
    <>
      <div className="mb-8">
        <p className="mb-1.5 text-[11px] font-bold tracking-[0.1em] text-primary">友情链接</p>
        <h1 className="text-[22px] font-extrabold tracking-[-0.03em] text-foreground">
          一些有趣的友邻
        </h1>
      </div>

      <FadeInUp delay={0} className="mb-8">
        <FriendLinksRulesCard />
      </FadeInUp>

      <FriendLinksList links={activeLinks} />
      <FriendLinksPausedSection links={pausedLinks} />
    </>
  );
}
