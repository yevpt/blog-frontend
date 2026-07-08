import type { ReactNode } from "react";
import { SvgIcon } from "@repo/icons";
import { cn } from "@repo/ui";
import { SiteUptime } from "./site-uptime";

const FOOTER_LINK_CLASS = cn(
  "text-muted-foreground/70 hover:text-foreground transition-colors",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
);

const EXTERNAL_LINK_PROPS = {
  target: "_blank",
  rel: "noopener noreferrer",
} as const;

function FooterSeparator({ className }: { className?: string }) {
  return (
    <span
      className={cn("text-muted-foreground/25 select-none hidden sm:inline", className)}
      aria-hidden
    >
      ·
    </span>
  );
}

interface FooterAnchorProps {
  href: string;
  children: ReactNode;
  external?: boolean;
  className?: string;
}

function FooterAnchor({ href, children, external = false, className }: FooterAnchorProps) {
  return (
    <a
      href={href}
      className={cn(FOOTER_LINK_CLASS, className)}
      {...(external ? EXTERNAL_LINK_PROPS : undefined)}
    >
      {children}
    </a>
  );
}

function PoweredByStack() {
  return (
    <span className="text-muted-foreground/70">
      Powered by{" "}
      <FooterAnchor
        href="https://nextjs.org"
        external
        className="underline-offset-2 hover:underline"
      >
        Next
      </FooterAnchor>
      {" & "}
      <FooterAnchor
        href="https://gin-gonic.com"
        external
        className="underline-offset-2 hover:underline"
      >
        Gin
      </FooterAnchor>
    </span>
  );
}

function RssLink() {
  return (
    <FooterAnchor href="/feed.xml" external className="inline-flex items-center gap-1">
      <SvgIcon name="rss" size={13} className="shrink-0 opacity-55" aria-hidden />
      RSS
    </FooterAnchor>
  );
}

function SiteIdentityLinks() {
  return (
    <span className="inline-flex w-full sm:w-auto justify-center items-center gap-x-2">
      <FooterAnchor href="https://www.yevpt.com">© 2026 yevpt.com</FooterAnchor>
      <span className="text-muted-foreground/25 select-none hidden sm:inline" aria-hidden>
        ·
      </span>
      <RssLink />
    </span>
  );
}

function ComplianceLinks() {
  return (
    <div className="flex w-full sm:w-auto flex-col sm:flex-row sm:flex-wrap justify-center items-center gap-x-2 gap-y-1.5 sm:gap-y-1">
      <FooterAnchor
        href="http://www.beian.gov.cn/portal/registerSystemInfo?recordcode=37011202000953"
        external
        className="inline-flex items-center gap-1"
      >
        <SvgIcon name="shield" size={13} className="shrink-0 opacity-55" aria-hidden />
        鲁公网安备 37011202000953号
      </FooterAnchor>
      <FooterSeparator />
      <FooterAnchor href="https://beian.miit.gov.cn/">京ICP备2023025236</FooterAnchor>
    </div>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-border/50 mt-auto">
      <div className="mx-auto max-w-[1120px] px-5 py-7">
        <nav
          aria-label="站点信息"
          className="flex flex-row flex-wrap justify-center items-center gap-x-2.5 gap-y-2.5 sm:gap-y-2 text-center text-xs tracking-normal sm:tracking-wide"
        >
          <SiteIdentityLinks />

          <FooterSeparator />

          <span className="w-full sm:w-auto text-muted-foreground/70">
            <PoweredByStack />
          </span>

          <FooterSeparator />

          <ComplianceLinks />
        </nav>

        <SiteUptime className="text-center" />
      </div>
    </footer>
  );
}
