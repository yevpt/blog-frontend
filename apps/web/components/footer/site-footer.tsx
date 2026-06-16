import Image from "next/image";
import { cn } from "@repo/ui";

interface FooterLinkItem {
  href: string;
  label: string;
  openInNewTab?: boolean;
  showBeianIcon?: boolean;
}

const LINK_CLASS_NAME = cn(
  "text-muted-foreground hover:text-foreground transition-colors",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
);

/** 版权与备案信息，每项独占一行 */
const FOOTER_INFO_LINKS: FooterLinkItem[] = [
  {
    href: "https://www.yevpt.com",
    label: "© 2026 yevpt.com All Rights Reserved.",
  },
  {
    href: "http://www.beian.gov.cn/portal/registerSystemInfo?recordcode=37011202000953",
    label: "鲁公网安备 37011202000953号",
    openInNewTab: true,
    showBeianIcon: true,
  },
  {
    href: "https://beian.miit.gov.cn/",
    label: "京ICP备2023025236",
  },
];

/** 外部工具链接，同一行展示 */
const FOOTER_TOOL_LINKS: FooterLinkItem[] = [
  { href: "https://tc.yevpt.com", label: "图床", openInNewTab: true },
  { href: "https://vps.yevpt.com", label: "监控", openInNewTab: true },
];

function FooterLink({ href, label, openInNewTab = false, showBeianIcon = false }: FooterLinkItem) {
  return (
    <a
      href={href}
      className={cn(LINK_CLASS_NAME, showBeianIcon && "inline-flex items-center h-5 leading-5")}
      {...(openInNewTab ? { target: "_blank", rel: "noopener noreferrer" } : undefined)}
    >
      {showBeianIcon ? (
        <>
          <Image
            src="/image/beian110.png"
            alt=""
            width={20}
            height={20}
            className="shrink-0"
            suppressHydrationWarning
          />
          <span className="ml-1.5">{label}</span>
        </>
      ) : (
        label
      )}
    </a>
  );
}

function FooterLinkList({ items }: { items: FooterLinkItem[] }) {
  return items.map((item) => <FooterLink key={item.href} {...item} />);
}

export function SiteFooter() {
  return (
    <footer className="border-t border-border mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-12 text-center text-sm">
        <nav aria-label="站点信息" className="flex flex-col items-center gap-1">
          <FooterLinkList items={FOOTER_INFO_LINKS} />

          <div className="flex items-center justify-center gap-4">
            <FooterLinkList items={FOOTER_TOOL_LINKS} />
          </div>
        </nav>
      </div>
    </footer>
  );
}
