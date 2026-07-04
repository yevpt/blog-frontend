# Admin Music Audio Player Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将音乐编辑表单中的完整音频 URL 替换为带文件摘要、播放控制、可拖动进度和时间显示的自定义播放器。

**Architecture:** 在 `@repo/ui` 增加基于 React Aria 的通用 `Slider`，音乐模块增加 URL 文件名纯函数，并将现有 `MusicPreviewButton` 的媒体状态收敛到可复用的 `MusicAudioPlayer`。歌曲列表继续消费紧凑模式，编辑表单消费完整模式，上传与保存数据流保持不变。

**Tech Stack:** React 19、TypeScript、TailwindCSS、React Aria Components、Vitest、Testing Library。

## Global Constraints

- 隐藏完整 URL，不调整后端接口或提交字段。
- 自定义播放器必须提供播放/暂停、可拖动进度、当前时间和总时长。
- 旧数据缺少大小或 MIME 时隐藏缺失项，不显示错误占位。
- 不增加删除、下载、波形、倍速能力。
- UI 必须复用 `@repo/ui`、`@repo/icons` 和语义颜色令牌；禁止 `any`。
- 严格执行 RED → GREEN → REFACTOR；组件、页面和纯函数变化都有对应测试。

---

## File Structure

- `packages/ui/src/slider/slider.tsx`：通用、可访问的数值滑块。
- `packages/ui/src/slider/slider.test.tsx`：滑块渲染、受控值与键盘交互测试。
- `packages/ui/src/slider/types.ts`、`packages/ui/src/slider/index.ts`、`packages/ui/src/index.ts`：公共类型与导出。
- `apps/admin/src/modules/music/model.ts`：音频文件名解析纯函数。
- `apps/admin/src/modules/music/model.test.ts`：URL、签名参数、编码路径和回退测试。
- `apps/admin/src/modules/music/components/MusicAudioPlayer.tsx`：紧凑/完整两种播放器视图及媒体状态。
- `apps/admin/src/modules/music/components/MusicAudioPlayer.test.tsx`：播放、暂停、进度、跳转和 URL 重置测试。
- `apps/admin/src/modules/music/components/MusicPreviewButton.tsx`：兼容列表调用的紧凑播放器包装器。
- `apps/admin/src/modules/music/components/MusicSongFormDialog.tsx`：用完整播放器替代 URL 文本。
- `apps/admin/src/modules/music/MusicPage.test.tsx`：编辑表单集成回归测试。

---

### Task 1: 增加共享 Slider 组件

**Files:**
- Create: `packages/ui/src/slider/types.ts`
- Create: `packages/ui/src/slider/slider.tsx`
- Create: `packages/ui/src/slider/index.ts`
- Create: `packages/ui/src/slider/slider.test.tsx`
- Modify: `packages/ui/src/index.ts`

**Interfaces:**
- Consumes: `react-aria-components` 的 `Slider<number>`、`SliderTrack`、`SliderThumb`。
- Produces: `Slider(props: SliderProps)`；`SliderProps` 继承 `AriaSliderProps<number>`，增加必填 `label: string` 与可选 `showOutput?: boolean`。

- [ ] **Step 1: 写失败测试**

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Slider } from "./slider";

describe("Slider", () => {
  it("渲染可访问名称和当前值", () => {
    render(<Slider label="播放进度" value={25} minValue={0} maxValue={100} />);
    expect(screen.getByRole("slider", { name: "播放进度" })).toHaveAttribute(
      "aria-valuenow",
      "25",
    );
  });

  it("支持键盘调整受控值", async () => {
    const onChange = vi.fn();
    render(
      <Slider label="播放进度" value={25} minValue={0} maxValue={100} onChange={onChange} />,
    );
    await userEvent.setup().click(screen.getByRole("slider", { name: "播放进度" }));
    await userEvent.setup().keyboard("{ArrowRight}");
    expect(onChange).toHaveBeenCalledWith(26);
  });
});
```

- [ ] **Step 2: 验证测试因组件不存在而失败**

Run: `pnpm --filter @repo/ui test -- src/slider/slider.test.tsx`

Expected: FAIL，提示无法解析 `./slider`。

- [ ] **Step 3: 实现最小公共组件与导出**

```ts
// packages/ui/src/slider/types.ts
import type { SliderProps as AriaSliderProps } from "react-aria-components";

export interface SliderProps extends Omit<AriaSliderProps<number>, "children"> {
  label: string;
  showOutput?: boolean;
}
```

```tsx
// packages/ui/src/slider/slider.tsx
"use client";

import {
  Slider as AriaSlider,
  SliderOutput,
  SliderThumb,
  SliderTrack,
} from "react-aria-components";
import { cn } from "../lib/utils";
import type { SliderProps } from "./types";

export function Slider({ label, showOutput = false, className, ...props }: SliderProps) {
  return (
    <AriaSlider
      {...props}
      aria-label={label}
      className={(state) =>
        cn("grid min-w-0 gap-1", state.isDisabled && "opacity-50", typeof className === "function" ? className(state) : className)
      }
    >
      {showOutput ? <SliderOutput className="text-xs text-muted-foreground" /> : null}
      <SliderTrack className="relative h-5 w-full cursor-pointer">
        {({ state }) => {
          const percentage = state.getThumbPercent(0) * 100;
          return (
            <>
              <span className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-muted" />
              <span className="absolute left-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-primary" style={{ width: `${percentage}%` }} />
              <SliderThumb className="top-1/2 size-3 rounded-full border-2 border-primary bg-background outline-none ring-ring data-[focus-visible]:ring-2" />
            </>
          );
        }}
      </SliderTrack>
    </AriaSlider>
  );
}
```

```ts
// packages/ui/src/slider/index.ts
export { Slider } from "./slider";
export type { SliderProps } from "./types";

// packages/ui/src/index.ts
export { Slider, type SliderProps } from "./slider";
```

- [ ] **Step 4: 验证 Slider 测试、类型与 lint**

Run: `pnpm --filter @repo/ui test -- src/slider/slider.test.tsx && pnpm --filter @repo/ui check-types && pnpm --filter @repo/ui lint`

Expected: 全部 PASS，无 warning。

- [ ] **Step 5: 提交共享组件**

```bash
git add packages/ui/src/slider packages/ui/src/index.ts
git commit -m "feat(ui): 新增可访问滑块组件"
```

---

### Task 2: 解析安全的音频文件名

**Files:**
- Modify: `apps/admin/src/modules/music/model.ts`
- Modify: `apps/admin/src/modules/music/model.test.ts`

**Interfaces:**
- Consumes: 音频 URL、相对对象 key 或空字符串。
- Produces: `getAudioFileName(value: string): string`，永不返回域名、查询参数或空文本。

- [ ] **Step 1: 写失败测试**

```ts
import { getAudioFileName } from "./model";

it("只从音频地址解析安全文件名", () => {
  expect(getAudioFileName("https://cdn.example.com/audio/ref.mp3?token=secret")).toBe("ref.mp3");
  expect(getAudioFileName("temp/music/%E9%9F%B3%E4%B9%90.m4a")).toBe("音乐.m4a");
  expect(getAudioFileName("https://cdn.example.com/")).toBe("已上传音频");
  expect(getAudioFileName("not a url")).toBe("not a url");
  expect(getAudioFileName("")).toBe("已上传音频");
});
```

- [ ] **Step 2: 验证测试因导出不存在而失败**

Run: `pnpm --filter admin test -- src/modules/music/model.test.ts`

Expected: FAIL，提示 `getAudioFileName` 未导出。

- [ ] **Step 3: 实现纯函数**

```ts
export function getAudioFileName(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "已上传音频";

  const withoutQuery = trimmed.split(/[?#]/, 1)[0] ?? "";
  const encodedName = withoutQuery.split("/").filter(Boolean).at(-1);
  if (!encodedName) return "已上传音频";

  try {
    return decodeURIComponent(encodedName);
  } catch {
    return encodedName;
  }
}
```

- [ ] **Step 4: 验证纯函数测试**

Run: `pnpm --filter admin test -- src/modules/music/model.test.ts`

Expected: PASS。

- [ ] **Step 5: 提交解析逻辑**

```bash
git add apps/admin/src/modules/music/model.ts apps/admin/src/modules/music/model.test.ts
git commit -m "feat(admin-music): 增加音频文件名解析"
```

---

### Task 3: 建立可复用的紧凑/完整播放器

**Files:**
- Create: `apps/admin/src/modules/music/components/MusicAudioPlayer.tsx`
- Create: `apps/admin/src/modules/music/components/MusicAudioPlayer.test.tsx`
- Modify: `apps/admin/src/modules/music/components/MusicPreviewButton.tsx`

**Interfaces:**
- Consumes: `title`、可选 `url`、`variant`、`fileName`、`mime`、`size`、`fallbackDuration`。
- Produces: `MusicAudioPlayer`；`variant="compact"` 保持列表“试听”按钮，`variant="full"` 输出文件摘要和完整控制。

- [ ] **Step 1: 写失败的播放器渲染与交互测试**

```tsx
import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MusicAudioPlayer } from "./MusicAudioPlayer";

describe("MusicAudioPlayer", () => {
  beforeEach(() => {
    vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
    vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => undefined);
  });

  it("完整模式展示文件摘要并隐藏 URL", () => {
    render(
      <MusicAudioPlayer
        variant="full"
        title="Ref:rain"
        url="https://cdn.example.com/ref.mp3?token=secret"
        fileName="ref.mp3"
        mime="audio/mpeg"
        size={3_145_728}
        fallbackDuration={270}
      />,
    );
    expect(screen.getByText("ref.mp3")).toBeInTheDocument();
    expect(screen.getByText(/audio\/mpeg/i)).toBeInTheDocument();
    expect(screen.getByText(/3\.0 MB/)).toBeInTheDocument();
    expect(screen.getByRole("slider", { name: "Ref:rain 播放进度" })).toBeInTheDocument();
    expect(screen.queryByText(/cdn\.example\.com/)).not.toBeInTheDocument();
  });

  it("播放、更新时间并跳转进度", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <MusicAudioPlayer variant="full" title="Ref:rain" url="/ref.mp3" fallbackDuration={100} />,
    );
    const audio = container.querySelector("audio")!;
    Object.defineProperty(audio, "duration", { configurable: true, value: 100 });
    Object.defineProperty(audio, "currentTime", { configurable: true, writable: true, value: 0 });

    await user.click(screen.getByRole("button", { name: "播放 Ref:rain" }));
    expect(audio.play).toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "暂停 Ref:rain" })).toBeInTheDocument();

    act(() => {
      audio.currentTime = 25;
      fireEvent.timeUpdate(audio);
    });
    expect(screen.getByText("0:25")).toBeInTheDocument();

    await user.click(screen.getByRole("slider", { name: "Ref:rain 播放进度" }));
    await user.keyboard("{ArrowRight}");
    expect(audio.currentTime).toBe(26);
  });

  it("URL 变化时暂停旧音频并重置进度", () => {
    const { container, rerender } = render(
      <MusicAudioPlayer variant="full" title="Ref:rain" url="/old.mp3" fallbackDuration={100} />,
    );
    const audio = container.querySelector("audio")!;
    Object.defineProperty(audio, "currentTime", { configurable: true, writable: true, value: 30 });
    fireEvent.timeUpdate(audio);

    rerender(
      <MusicAudioPlayer variant="full" title="Ref:rain" url="/new.mp3" fallbackDuration={100} />,
    );

    expect(audio.pause).toHaveBeenCalled();
    expect(screen.getByText("0:00 / 1:40")).toBeInTheDocument();
  });

  it("播放被拒绝时恢复为停止状态", async () => {
    vi.mocked(HTMLMediaElement.prototype.play).mockRejectedValueOnce(new Error("blocked"));
    render(<MusicAudioPlayer title="Ref:rain" url="/ref.mp3" />);

    await userEvent.setup().click(screen.getByRole("button", { name: "播放 Ref:rain" }));

    expect(screen.getByRole("button", { name: "播放 Ref:rain" })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 验证测试因播放器不存在而失败**

Run: `pnpm --filter admin test -- src/modules/music/components/MusicAudioPlayer.test.tsx`

Expected: FAIL，提示无法解析 `MusicAudioPlayer`。

- [ ] **Step 3: 实现媒体状态和两种视图**

`MusicAudioPlayer.tsx` 必须精确实现以下状态与事件：

```tsx
import { useEffect, useRef, useState } from "react";
import { SvgIcon } from "@repo/icons";
import { Button, Slider, cn } from "@repo/ui";
import { formatFileSize } from "../model";

interface MusicAudioPlayerProps {
  title: string;
  url?: string;
  variant?: "compact" | "full";
  fileName?: string;
  mime?: string;
  size?: number;
  fallbackDuration?: number;
}

const formatPlaybackTime = (seconds: number) => {
  const safeSeconds = Number.isFinite(seconds) && seconds > 0 ? Math.floor(seconds) : 0;
  return `${Math.floor(safeSeconds / 60)}:${String(safeSeconds % 60).padStart(2, "0")}`;
};

export function MusicAudioPlayer({
  title,
  url,
  variant = "compact",
  fileName,
  mime,
  size = 0,
  fallbackDuration = 0,
}: MusicAudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(fallbackDuration);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return undefined;
    const syncTime = () => setCurrentTime(audio.currentTime);
    const syncDuration = () => setDuration(Number.isFinite(audio.duration) ? audio.duration : fallbackDuration);
    const stop = () => setIsPlaying(false);
    audio.addEventListener("timeupdate", syncTime);
    audio.addEventListener("loadedmetadata", syncDuration);
    audio.addEventListener("durationchange", syncDuration);
    audio.addEventListener("ended", stop);
    audio.addEventListener("error", stop);
    setCurrentTime(0);
    setDuration(fallbackDuration);
    setIsPlaying(false);
    return () => {
      audio.pause();
      audio.removeEventListener("timeupdate", syncTime);
      audio.removeEventListener("loadedmetadata", syncDuration);
      audio.removeEventListener("durationchange", syncDuration);
      audio.removeEventListener("ended", stop);
      audio.removeEventListener("error", stop);
    };
  }, [fallbackDuration, url]);

  const handleToggle = async () => {
    const audio = audioRef.current;
    if (!url || !audio || isLoading) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      return;
    }
    setIsLoading(true);
    try {
      await audio.play();
      setIsPlaying(true);
    } catch {
      setIsPlaying(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSeek = (nextTime: number) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = nextTime;
    setCurrentTime(nextTime);
  };

  const audio = (
    // eslint-disable-next-line jsx-a11y/media-has-caption
    <audio ref={audioRef} src={url} preload="metadata" />
  );
  const playButton = (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      className={cn(variant === "compact" ? "h-7 px-2 text-xs" : "size-9 shrink-0 p-0")}
      aria-label={isPlaying ? `暂停 ${title}` : `播放 ${title}`}
      isDisabled={!url}
      isLoading={isLoading}
      onPress={() => void handleToggle()}
    >
      <SvgIcon name={isPlaying ? "pause" : "play"} size={variant === "compact" ? 13 : 16} />
      {variant === "compact" ? <span aria-hidden="true">试听</span> : null}
    </Button>
  );

  if (variant === "compact") {
    return <>{audio}{playButton}</>;
  }

  const metadata = [mime || null, size > 0 ? formatFileSize(size) : null]
    .filter((item): item is string => Boolean(item))
    .join(" · ");

  return (
    <div className="grid min-w-0 gap-3 rounded-lg border border-border bg-card p-3">
      {audio}
      <div className="flex min-w-0 items-center gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
          <SvgIcon name="music" size={18} />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">{fileName ?? "已上传音频"}</p>
          {metadata ? <p className="mt-0.5 text-xs text-muted-foreground">{metadata}</p> : null}
        </div>
      </div>
      <div className="flex min-w-0 items-center gap-2">
        {playButton}
        <Slider
          label={`${title} 播放进度`}
          value={Math.min(currentTime, Math.max(duration, 1))}
          minValue={0}
          maxValue={Math.max(duration, 1)}
          step={1}
          isDisabled={!url || duration <= 0}
          onChange={handleSeek}
          className="flex-1"
        />
        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
          {formatPlaybackTime(currentTime)} / {formatPlaybackTime(duration)}
        </span>
      </div>
    </div>
  );
}
```

紧凑视图必须保留现有 `aria-label`、`size="sm"`、`variant="ghost"` 和“试听”文案。

- [ ] **Step 4: 让旧包装器委托紧凑模式**

```tsx
import { MusicAudioPlayer } from "./MusicAudioPlayer";

interface MusicPreviewButtonProps {
  title: string;
  url?: string;
}

export function MusicPreviewButton(props: MusicPreviewButtonProps) {
  return <MusicAudioPlayer {...props} variant="compact" />;
}
```

- [ ] **Step 5: 验证播放器与现有音乐页面测试**

Run: `pnpm --filter admin test -- src/modules/music/components/MusicAudioPlayer.test.tsx src/modules/music/MusicPage.test.tsx`

Expected: PASS；现有“播放 Ref:rain”断言继续通过。

- [ ] **Step 6: 提交播放器**

```bash
git add apps/admin/src/modules/music/components/MusicAudioPlayer.tsx apps/admin/src/modules/music/components/MusicAudioPlayer.test.tsx apps/admin/src/modules/music/components/MusicPreviewButton.tsx
git commit -m "feat(admin-music): 新增完整音频播放器"
```

---

### Task 4: 接入音乐编辑表单

**Files:**
- Modify: `apps/admin/src/modules/music/components/MusicSongFormDialog.tsx`
- Modify: `apps/admin/src/modules/music/MusicPage.test.tsx`

**Interfaces:**
- Consumes: Task 2 的 `getAudioFileName` 与 Task 3 的 `MusicAudioPlayer`。
- Produces: 编辑表单不再渲染 `audioKey` 文本；有音频时渲染完整播放器和“替换音频”。

- [ ] **Step 1: 将页面测试改成期望新行为并验证失败**

```tsx
it("音乐表单隐藏音频链接并展示完整播放器", async () => {
  const user = userEvent.setup();
  renderMusicPage();

  await user.click(screen.getAllByRole("button", { name: "编辑" })[0]!);
  const dialog = await screen.findByRole("dialog", { name: "编辑音乐" });

  expect(within(dialog).getByText("ref.mp3")).toBeInTheDocument();
  expect(within(dialog).getByRole("button", { name: "播放 Ref:rain" })).toBeInTheDocument();
  expect(within(dialog).getByRole("slider", { name: "Ref:rain 播放进度" })).toBeInTheDocument();
  expect(within(dialog).getByRole("button", { name: "替换音频" })).toBeInTheDocument();
  expect(within(dialog).queryByText("https://cdn.example.com/ref.mp3")).not.toBeInTheDocument();
});
```

Run: `pnpm --filter admin test -- src/modules/music/MusicPage.test.tsx`

Expected: FAIL，找不到 `ref.mp3`、slider 或“替换音频”。

- [ ] **Step 2: 用完整播放器替换 URL 区块**

```tsx
import { getAudioFileName } from "../model";
import { MusicAudioPlayer } from "./MusicAudioPlayer";

// 在音频文件卡片中：
{values.audioKey ? (
  <MusicAudioPlayer
    variant="full"
    title={values.name || "当前音频"}
    url={values.audioKey}
    fileName={getAudioFileName(values.audioKey)}
    mime={values.audioMime || undefined}
    size={Number(values.audioSize)}
    fallbackDuration={Number(values.duration)}
  />
) : (
  <p className="text-sm text-muted-foreground">还没有选择音频</p>
)}

<Button
  type="button"
  variant="outline"
  size="sm"
  isLoading={isUploading}
  loadingText="上传中…"
  onPress={() => fileInputRef.current?.click()}
>
  <SvgIcon name="arrow-up" size={14} />
  {values.audioKey ? "替换音频" : "选择音频"}
</Button>
```

删除“当前音频”标题和直接输出 `{values.audioKey}` 的段落；保留隐藏 file input、上传摘要、格式限制与错误提示。

- [ ] **Step 3: 验证表单、组件和模型测试**

Run: `pnpm --filter admin test -- src/modules/music/MusicPage.test.tsx src/modules/music/components/MusicAudioPlayer.test.tsx src/modules/music/model.test.ts`

Expected: PASS。

- [ ] **Step 4: 运行完整静态验证**

Run: `pnpm --filter @repo/ui test && pnpm --filter admin test && pnpm --filter @repo/ui check-types && pnpm --filter admin check-types && pnpm --filter @repo/ui lint && pnpm --filter admin lint`

Expected: 全部 PASS，无 TypeScript、ESLint 或测试 warning。

- [ ] **Step 5: 提交表单集成**

```bash
git add apps/admin/src/modules/music/components/MusicSongFormDialog.tsx apps/admin/src/modules/music/MusicPage.test.tsx docs/superpowers/plans/2026-07-04-admin-music-audio-player.md
git commit -m "feat(admin-music): 优化编辑表单音频展示"
```

---

## Final Verification

- [ ] 编辑已有音乐时，页面只显示文件名，不出现域名或签名查询参数。
- [ ] 播放、暂停、进度自动更新、拖动跳转与总时长显示正常。
- [ ] 替换上传后播放器切换到新 URL 并重置为 0:00。
- [ ] 无 MIME/大小的旧记录不显示伪造信息或错误占位。
- [ ] 音乐列表原有紧凑“试听”按钮行为不变。
- [ ] `git status --short` 只包含预期文件，无构建产物或临时视觉稿。
