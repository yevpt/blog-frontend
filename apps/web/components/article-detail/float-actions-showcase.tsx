"use client";

import { useState, type ReactNode } from "react";
import { SvgIcon } from "@repo/icons";
import { Button, ButtonUtility, cn } from "@repo/ui";

interface ShowcaseControls {
  isLiked: boolean;
  showMusic: boolean;
  showScrollTop: boolean;
  musicProgress: number;
  isPlaying: boolean;
}

function MockProgressRing({
  size,
  progress,
  className,
}: {
  size: number;
  progress: number;
  className?: string;
}) {
  const strokeWidth = 2;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - Math.min(1, Math.max(0, progress)));

  return (
    <svg
      className={cn("pointer-events-none absolute inset-0", className)}
      width={size}
      height={size}
      aria-hidden
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        className="stroke-border"
        strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        className="stroke-primary"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </svg>
  );
}

function IconBtn({
  label,
  pressed,
  onPress,
  className,
  children,
}: {
  label: string;
  pressed?: boolean;
  onPress?: () => void;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      aria-label={label}
      aria-pressed={pressed}
      onPress={onPress}
      className={className}
    >
      {children}
    </Button>
  );
}

/** 方案 A：胶囊工具条 */
function VariantDock({ c }: { c: ShowcaseControls }) {
  const btn =
    "flex h-9 w-9 shrink-0 items-center justify-center rounded-full p-0 transition-colors";

  return (
    <div
      className={cn(
        "flex items-center gap-0.5 rounded-full border border-border/60",
        "bg-card/75 px-1.5 py-1 shadow-sm backdrop-blur-md",
      )}
    >
      {c.showMusic ? (
        <>
          <IconBtn
            label={c.isPlaying ? "暂停音乐" : "播放音乐"}
            className={cn(btn, "relative hover:bg-muted")}
          >
            <MockProgressRing size={36} progress={c.musicProgress} />
            <span className="relative z-10">
              <SvgIcon
                name={c.isPlaying ? "pause" : "play"}
                size={15}
                className="text-foreground"
              />
            </span>
          </IconBtn>
          <div className="mx-0.5 h-5 w-px bg-border/80" aria-hidden />
        </>
      ) : null}
      <IconBtn
        label={c.isLiked ? "取消点赞" : "点赞"}
        pressed={c.isLiked}
        className={cn(
          btn,
          c.isLiked
            ? "bg-rose-500 text-white hover:bg-rose-600"
            : "text-muted-foreground hover:bg-muted",
        )}
      >
        <SvgIcon name={c.isLiked ? "heart-fill" : "heart-line"} size={16} />
      </IconBtn>
      <div className="mx-0.5 h-5 w-px bg-border/80" aria-hidden />
      <IconBtn
        label="回到顶部"
        className={cn(
          btn,
          "text-muted-foreground hover:bg-muted",
          c.showScrollTop ? "opacity-100" : "pointer-events-none opacity-30",
        )}
      >
        <SvgIcon name="arrow-up" size={16} />
      </IconBtn>
    </div>
  );
}

/** 方案 B：主 FAB + 展开 */
function VariantSpeedDial({ c }: { c: ShowcaseControls }) {
  const [open, setOpen] = useState(true);
  const sub =
    "flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card p-0 shadow-sm hover:bg-muted";

  const items = [
    c.showScrollTop ? { key: "top", label: "回到顶部", icon: "arrow-up" as const } : null,
    {
      key: "like",
      label: c.isLiked ? "取消点赞" : "点赞",
      icon: (c.isLiked ? "heart-fill" : "heart-line") as const,
      liked: c.isLiked,
    },
    c.showMusic
      ? { key: "music", label: "音乐", icon: (c.isPlaying ? "pause" : "music") as const }
      : null,
  ].filter(Boolean) as Array<{
    key: string;
    label: string;
    icon: "arrow-up" | "heart-fill" | "heart-line" | "pause" | "music";
    liked?: boolean;
  }>;

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className={cn(
          "flex flex-col items-center gap-2 transition-all duration-200",
          open ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-2 opacity-0",
        )}
      >
        {items.map((item) => (
          <IconBtn
            key={item.key}
            label={item.label}
            pressed={item.liked}
            className={cn(
              sub,
              item.liked && "border-rose-500 bg-rose-500 text-white hover:bg-rose-600",
            )}
          >
            <SvgIcon name={item.icon} size={15} />
          </IconBtn>
        ))}
      </div>
      <Button
        type="button"
        variant="ghost"
        aria-label={open ? "收起" : "展开操作"}
        aria-expanded={open}
        onPress={() => setOpen((v) => !v)}
        className="flex h-11 w-11 items-center justify-center rounded-full bg-primary p-0 text-primary-foreground shadow-md hover:bg-primary/90"
      >
        <SvgIcon
          name="dots-vertical"
          size={18}
          className={cn("transition-transform duration-200", open && "rotate-90")}
        />
      </Button>
    </div>
  );
}

/** 方案 C：毛玻璃浮动岛 */
function VariantGlass({ c }: { c: ShowcaseControls }) {
  const btn = cn(
    "flex h-10 w-10 items-center justify-center rounded-full p-0",
    "ring-1 ring-border/50 transition-all duration-150",
    "bg-background/65 backdrop-blur-xl hover:bg-background/80",
  );

  return (
    <div className="flex flex-col items-center gap-2.5">
      {c.showMusic ? (
        <IconBtn label="音乐" className={cn(btn, "relative")}>
          <MockProgressRing size={40} progress={c.musicProgress} />
          <span className="relative z-10">
            <SvgIcon name={c.isPlaying ? "pause" : "music"} size={16} className="text-primary" />
          </span>
        </IconBtn>
      ) : null}
      <IconBtn
        label={c.isLiked ? "取消点赞" : "点赞"}
        pressed={c.isLiked}
        className={cn(
          btn,
          c.isLiked && "bg-rose-500/90 text-white ring-rose-400/50 hover:bg-rose-600/90",
        )}
      >
        <SvgIcon
          name={c.isLiked ? "heart-fill" : "heart-line"}
          size={16}
          className={c.isLiked ? "scale-110" : "text-muted-foreground"}
        />
      </IconBtn>
      <IconBtn
        label="回到顶部"
        className={cn(
          btn,
          c.showScrollTop ? "opacity-100" : "pointer-events-none scale-90 opacity-0",
        )}
      >
        <SvgIcon name="arrow-up" size={15} className="text-muted-foreground" />
      </IconBtn>
    </div>
  );
}

/** 方案 D：阅读进度融合 */
function VariantProgress({ c }: { c: ShowcaseControls }) {
  const pct = 62;

  return (
    <div className="absolute inset-x-0 bottom-0">
      <div className="absolute inset-x-3 bottom-3 flex items-center justify-end gap-1.5">
        {c.showMusic ? (
          <ButtonUtility
            tooltip="音乐"
            icon={<SvgIcon name={c.isPlaying ? "pause" : "music"} size={16} />}
            size="xs"
            className="rounded-full"
          />
        ) : null}
        <ButtonUtility
          tooltip={c.isLiked ? "取消点赞" : "点赞"}
          icon={
            <SvgIcon
              name={c.isLiked ? "heart-fill" : "heart-line"}
              size={16}
              className={c.isLiked ? "text-rose-500" : undefined}
            />
          }
          size="xs"
          className="rounded-full"
        />
        <ButtonUtility
          tooltip="回到顶部"
          icon={<SvgIcon name="arrow-up" size={16} />}
          size="xs"
          className={cn("rounded-full", !c.showScrollTop && "opacity-40")}
        />
      </div>
      <div className="h-0.5 bg-primary/15">
        <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/** 方案 E：侧边书签 */
function VariantEdgeTab({ c }: { c: ShowcaseControls }) {
  const tab = cn(
    "flex h-10 w-7 items-center justify-center rounded-l-lg border border-r-0 border-border",
    "bg-muted/80 text-muted-foreground backdrop-blur-sm transition-colors hover:bg-muted",
  );

  return (
    <div className="absolute top-1/3 right-0 flex flex-col gap-2">
      {c.showMusic ? (
        <IconBtn label="音乐" className={tab}>
          <SvgIcon name="music" size={14} />
        </IconBtn>
      ) : null}
      <IconBtn
        label={c.isLiked ? "取消点赞" : "点赞"}
        pressed={c.isLiked}
        className={cn(tab, c.isLiked && "bg-rose-500/90 text-white hover:bg-rose-600/90")}
      >
        <SvgIcon name={c.isLiked ? "heart-fill" : "heart-line"} size={14} />
      </IconBtn>
      <IconBtn label="回到顶部" className={cn(tab, !c.showScrollTop && "opacity-40")}>
        <SvgIcon name="arrow-up" size={14} />
      </IconBtn>
    </div>
  );
}

/** 当前实现（对照） */
function VariantCurrent({ c }: { c: ShowcaseControls }) {
  const btn = "flex h-10 w-10 items-center justify-center rounded-full p-0 shadow-md";

  return (
    <div className="flex flex-col items-center gap-3">
      {c.showMusic ? (
        <IconBtn
          label="音乐"
          className={cn(btn, "relative border border-border bg-card hover:bg-muted")}
        >
          <MockProgressRing size={40} progress={c.musicProgress} />
          <span className="relative z-10">
            <SvgIcon name={c.isPlaying ? "pause" : "music"} size={16} className="text-primary" />
          </span>
        </IconBtn>
      ) : null}
      <IconBtn
        label={c.isLiked ? "取消点赞" : "点赞"}
        pressed={c.isLiked}
        className={cn(
          btn,
          c.isLiked
            ? "bg-rose-500 text-white hover:bg-rose-600"
            : "border border-border bg-card text-muted-foreground hover:bg-muted",
        )}
      >
        <span className="text-base">{c.isLiked ? "♥" : "♡"}</span>
      </IconBtn>
      <IconBtn
        label="回到顶部"
        className={cn(
          btn,
          "border border-border bg-card hover:bg-muted",
          c.showScrollTop ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      >
        <span className="text-sm font-bold">↑</span>
      </IconBtn>
    </div>
  );
}

const VARIANTS = [
  { id: "current", title: "当前实现", desc: "独立圆钮 + Unicode 符号", Component: VariantCurrent },
  { id: "dock", title: "A · 胶囊工具条", desc: "横向 Dock，毛玻璃底", Component: VariantDock },
  { id: "dial", title: "B · Speed Dial", desc: "主 FAB 展开子操作", Component: VariantSpeedDial },
  { id: "glass", title: "C · 毛玻璃岛", desc: "纵向 + blur + SvgIcon", Component: VariantGlass },
  {
    id: "progress",
    title: "D · 进度融合",
    desc: "底栏进度 + 精简图标",
    Component: VariantProgress,
  },
  { id: "edge", title: "E · 侧边书签", desc: "贴右缘竖条 Tab", Component: VariantEdgeTab },
] as const;

function PreviewFrame({
  title,
  desc,
  placement = "corner",
  children,
}: {
  title: string;
  desc: string;
  placement?: "corner" | "full";
  children: ReactNode;
}) {
  return (
    <article className="flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <header className="border-b border-border px-4 py-3">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">{desc}</p>
      </header>
      <div className="relative h-72 overflow-hidden bg-background">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,transparent_60%,var(--color-muted)_100%)] opacity-40" />
        <div className="mx-auto max-w-[85%] px-4 pt-6">
          <div className="mb-3 h-2 w-2/3 rounded bg-muted" />
          <div className="space-y-2">
            <div className="h-1.5 w-full rounded bg-muted/70" />
            <div className="h-1.5 w-full rounded bg-muted/70" />
            <div className="h-1.5 w-4/5 rounded bg-muted/70" />
            <div className="h-1.5 w-full rounded bg-muted/70" />
            <div className="h-1.5 w-3/5 rounded bg-muted/70" />
          </div>
        </div>
        <div
          className={cn(
            "pointer-events-auto z-10",
            placement === "full" ? "absolute inset-0" : "absolute bottom-4 right-4",
          )}
        >
          {children}
        </div>
      </div>
    </article>
  );
}

/** 文章浮动操作 UI 方案对比预览（仅 dev 路由使用） */
export function FloatActionsShowcase() {
  const [isLiked, setIsLiked] = useState(true);
  const [showMusic, setShowMusic] = useState(true);
  const [showScrollTop, setShowScrollTop] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);

  const controls: ShowcaseControls = {
    isLiked,
    showMusic,
    showScrollTop,
    isPlaying,
    musicProgress: 0.42,
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">浮动操作 UI 预览</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          使用真实 Tailwind 令牌与 @repo/icons 渲染。切换下方状态可预览各方案的交互表现。
        </p>
      </div>

      <div className="mb-8 flex flex-wrap gap-2 rounded-lg border border-border bg-muted/30 p-4">
        <ToggleChip active={isLiked} onClick={() => setIsLiked((v) => !v)}>
          已点赞
        </ToggleChip>
        <ToggleChip active={showMusic} onClick={() => setShowMusic((v) => !v)}>
          有背景音乐
        </ToggleChip>
        <ToggleChip
          active={isPlaying}
          onClick={() => setIsPlaying((v) => !v)}
          disabled={!showMusic}
        >
          播放中
        </ToggleChip>
        <ToggleChip active={showScrollTop} onClick={() => setShowScrollTop((v) => !v)}>
          显示回顶
        </ToggleChip>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {VARIANTS.map(({ id, title, desc, Component }) => (
          <PreviewFrame
            key={id}
            title={title}
            desc={desc}
            placement={id === "progress" || id === "edge" ? "full" : "corner"}
          >
            <Component c={controls} />
          </PreviewFrame>
        ))}
      </div>
    </div>
  );
}

function ToggleChip({
  active,
  onClick,
  disabled,
  children,
}: {
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
        disabled && "cursor-not-allowed opacity-40",
        active
          ? "border-primary bg-primary/10 text-primary"
          : "border-border bg-card text-muted-foreground hover:bg-muted",
      )}
    >
      {children}
    </button>
  );
}
