import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-3">
      <p className="text-7xl font-bold text-(--fg3)">404</p>
      <p className="text-base text-(--fg2)">页面不存在</p>
      <Link
        href="/"
        className="mt-2 rounded-full bg-foreground px-6 py-2 text-sm font-semibold text-background transition-colors hover:bg-foreground/85"
      >
        返回首页
      </Link>
    </div>
  );
}
