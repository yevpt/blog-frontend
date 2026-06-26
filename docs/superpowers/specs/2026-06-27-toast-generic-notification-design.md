# ToastRegion 泛型化 + 实时消息通知接入设计

日期：2026-06-27

## 目标

把 `apps/web/components/notifications/notification-provider.tsx`（轮询拉取未读通知、有新消息时弹卡片提醒）的弹窗渲染从一套独立手写的 `useState`+`setTimeout` 状态机，迁移到 `@repo/ui` 的 `ToastRegion`/`ToastQueue` 引擎上，复用计时器/堆叠/可访问性能力，同时保持视觉语言与 [2026-06-26 toast 重设计](./2026-06-26-toast-notification-redesign.md) 一致。

不在本期范围：
- 通知的轮询/去重/可见性感知重试逻辑（`syncLatestUnread`/`seedUnreadSnapshot` 等）——这部分跟"怎么展示"完全正交，本次不动。
- `/notifications` 列表页（`notification-card.tsx`）——独立组件，不受影响。
- 简单消息 toast（`addToast`）自身的视觉/交互——保持 2026-06-26 那次改版后的样子，零回归。

## 现状

- `packages/ui/src/toast/toast.tsx` 的 `ToastRegion` 目前**硬编码**只认 `ToastContent`（`{message, type}`），内部渲染逻辑（图标芯片 + 文字 + 关闭按钮）写死在组件里，没有让调用方自定义内容的入口。
- `NotificationProvider` 自己维护 `useState<NotificationItemResp[]>` 当作弹窗队列，用一个全局 `useEffect`（[notification-provider.tsx:164-170](../../../apps/web/components/notifications/notification-provider.tsx)）在 `popups` 数组变化时重新安排"6 秒后砍掉数组最后一个"。**这有一个潜在 bug**：只要新通知到达间隔小于 6 秒，effect 就会反复重新挂载这个 6 秒计时器，已经在用户面前停留快 6 秒的旧通知的倒计时会被这次重挂载重置——消息密集时旧通知实际上不会按时消失。
- react-aria 的 `UNSTABLE_ToastQueue<T>`（`@repo/ui` 已经原样导出为 `ToastQueue`）本来就是**泛型**的，且实例上有公开的 `close(key: string): void` 方法，不需要靠 `slot="close"` 的隐式绑定就能在任意位置主动关闭一条指定 toast；`add(content, options)` 返回的 `key` 配合 `QueuedToast<T>.key` 即可定位。这意味着"统一引擎"不需要碰 `ToastContent` 类型本身。

## 决策

### 1. `packages/ui`：`ToastRegion` 泛型化，新增 `itemClassName` / `renderToast`

`packages/ui/src/toast/types.ts` 新增：

```ts
import type { QueuedToast } from "react-stately/useToastState";

export interface ToastRenderHelpers {
  /** 直接调用 queue.close(key)，不依赖 slot="close" 的隐式绑定。 */
  close: () => void;
}

export interface ToastRegionProps<T = ToastContent> {
  queue: UNSTABLE_ToastQueue<T>;
  className?: string;
  position?: ToastPosition;
  /** 单条 toast 容器的宽度/对齐策略覆盖；不传时用简单消息 toast 的默认值。 */
  itemClassName?: string;
  /** 自定义单条 toast 的内部内容；不传时按内置 ToastContent 渲染（图标芯片 + 文字 + 关闭按钮）。 */
  renderToast?: (toast: QueuedToast<T>, helpers: ToastRenderHelpers) => ReactNode;
}
```

`packages/ui/src/toast/toast.tsx`：

- 抽出共享的"毛玻璃外观"常量并导出：

  ```ts
  export const toastChromeClassName =
    "rounded-xl border border-border bg-card/95 px-4 py-3 shadow-lg backdrop-blur-xl [will-change:transform] animate-notification-enter";
  ```

  简单消息 toast 默认的宽度/对齐定为内部常量：

  ```ts
  const DEFAULT_ITEM_CLASS = "w-fit min-w-[15rem] max-w-[min(22rem,calc(100vw-2rem))] items-center";
  ```

  即 2026-06-26 那版的宽度/对齐策略原样保留，`itemClassName` 不传时套用它——现有视觉零变化。

- `ToastRegion` 始终自己渲染外层 `<AriaToast toast={toast} className={cn(toastChromeClassName, "flex gap-3", itemClassName ?? DEFAULT_ITEM_CLASS)}>`，调用方不能绕过这层（保留 react-aria 的 `role="alertdialog"`/焦点管理等可访问性保证）。内部内容：有 `renderToast` 就调用它（传入 `toast` 和 `{ close: () => queue.close(toast.key) }`），没有就走抽出来的 `defaultRenderToastContent(toast.content)`（即现在的图标芯片 + `AriaToastContent` + `slot="close"` 关闭按钮，原样保留，只是从内联 JSX 挪成一个具名内部函数）。

- **类型安全**：用函数重载而不是简单的可选泛型参数——不传 `renderToast` 时 `T` 锁定为 `ToastContent`（现有 `<ToastRegion queue={toastQueue} />` 调用点零改动、零类型变化）；传了不同的 `T` 就强制要求同时传 `renderToast`，避免"换了内容类型但忘了配渲染函数，内置渲染器拿陌生数据当 `ToastContent` 用"的运行时坑：

  ```ts
  export function ToastRegion(props: ToastRegionProps<ToastContent>): ReactElement;
  export function ToastRegion<T>(
    props: ToastRegionProps<T> & Required<Pick<ToastRegionProps<T>, "renderToast">>,
  ): ReactElement;
  ```

- `index.ts` / 根 `packages/ui/src/index.ts` 新增导出 `toastChromeClassName`、`ToastRenderHelpers` 类型。

### 2. `apps/web`：`NotificationProvider` 接入 `ToastQueue<NotificationItemResp>`

[notification-provider.tsx](../../../apps/web/components/notifications/notification-provider.tsx) 改动：

- `useState<NotificationItemResp[]>([])` 换成模块级单例 `const notificationToastQueue = new ToastQueue<NotificationItemResp>({ maxVisibleToasts: 3 });`（与 `apps/web/lib/toast.ts` 的 `toastQueue` 同一种写法；`NotificationProvider` 本身就是挂载在根 layout 上的全局单例组件，不需要 `useRef`/`useState` 包一层——用 `useRef(() => new ToastQueue(...))` 反而是错的，`useRef` 不像 `useState` 支持惰性初始化函数，会把函数本身存进 `.current`）。组件内直接引用这个模块级常量。
- `setPopups((current) => [...freshItems, ...current].slice(0, 3))` 换成 `freshItems.forEach((item) => notificationToastQueue.add(item, { timeout: TOAST_TIMEOUT_MS }))`——`maxVisibleToasts: 3` 已经在 `ToastQueue` 层面保证最多同时显示 3 条，不需要再手动 `.slice(0,3)`。
- 删掉手写的"6 秒整体倒计时" `useEffect`（[notification-provider.tsx:164-170](../../../apps/web/components/notifications/notification-provider.tsx)）——每条 toast 的超时现在由 `ToastQueue` 在 `add()` 时通过 `{ timeout }` 独立管理，不再有"被新消息重置倒计时"的 bug。
- 登出（`userId == null`）分支里 `setPopups([])` 换成 `notificationToastQueue.clear()`（`ToastQueue` 自带的方法）。
- 渲染从手写的 `<div className="fixed right-4 top-20 ...">` 换成：

  ```tsx
  <ToastRegion
    queue={notificationToastQueue}
    position="top-right"
    className="top-20"
    itemClassName="w-[340px] max-w-[calc(100vw-2rem)] items-start"
    renderToast={(toast, { close }) => {
      const item = toast.content;
      const actorName = getNotificationActorName(item);
      const actionText = getNotificationActionText(item);
      const quote = getNotificationQuote(item);
      return (
        <>
          <UserAvatar src={item.actor_user?.avatar_url} name={actorName} size="md" className="mt-0.5" />
          <button
            type="button"
            className="min-w-0 flex-1 cursor-pointer text-left"
            onClick={() => {
              close();
              router.push(getNotificationHref(item));
            }}
          >
            <AriaToastContent>
              <p className="truncate text-[13px] text-foreground">
                <span className="font-semibold">{actorName}</span>{" "}
                <span className="text-muted-foreground">{actionText}</span>
              </p>
              {quote?.text ? (
                <p className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-muted-foreground">
                  {quote.title ? `${quote.title} ` : ""}
                  {quote.text}
                </p>
              ) : null}
            </AriaToastContent>
          </button>
          <Button
            type="button"
            variant={null}
            size={null}
            aria-label="关闭通知"
            onPress={close}
            className="flex size-7 shrink-0 items-center justify-center self-start rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <SvgIcon name="close" size={12} />
          </Button>
        </>
      );
    }}
  />
  ```

  `position="top-right"` 取 `right-4 items-end`，外层 `className="top-20"` 借 `cn()` 的合并顺序覆盖默认的 `top-4`，保留"导航栏下方"这个现有视觉位置，不新增第 7 个位置枚举值。
  跳转用真实 `<button>`（不是 `role="button"` 的 div）触发，因为关闭按钮已经是合法的嵌套交互元素，不需要再绕 `isCloseButtonClick` 这种点击目标检测；点击跳转按钮先 `close()` 再 `router.push(...)`，点击关闭按钮只 `close()`。
  文字内容包一层 `AriaToastContent`（`@repo/ui` 透传导出 `UNSTABLE_ToastContent`），补上 `role="alert" aria-atomic="true"` 的可访问性语义，跟简单 toast 保持一致。

### 3. 测试

- `packages/ui/src/toast/toast.test.tsx`：现有 10 条不变（默认行为零变化）；新增 2-3 条覆盖泛型用法——传自定义 `queue`+`renderToast`+`itemClassName` 时渲染自定义内容、`itemClassName` 生效、调用 `helpers.close()` 后该条从 `visibleToasts` 消失。
- `apps/web/components/notifications/notification-provider.test.tsx`：查询弹窗的方式从 `screen.getByRole("button", {name:...})` 换成 `screen.getByRole("alertdialog", {name:...})`（沿用 `toast.test.tsx` 已验证的 `document.body` 查询方式，因为 `AriaToastRegion` 会 portal 到 `document.body`）；"点击跳转"用例改成先确认 `alertdialog` 消失再断言 `mockPush`；"点击关闭按钮只消失不跳转"用例改成断言对应 `alertdialog` 不再存在。

## 影响范围

- `packages/ui/src/toast/types.ts`、`toast.tsx`、`toast.test.tsx`、`index.ts`；`packages/ui/src/index.ts`
- `apps/web/components/notifications/notification-provider.tsx`、`notification-provider.test.tsx`
- 不改 `apps/web/lib/toast.ts`、`addToast` 签名、任何 `addToast` 调用点——`ToastContent`/`ToastRegion` 默认行为路径完全不变

## 风险

- 函数重载是本次唯一有一定复杂度的 TS 写法，需要在实现时确认 `cn()`/`AriaToast` 内部对泛型 `T` 的类型收窄不会让 `defaultRenderToastContent` 那个 `as ToastContent` 断言之外的地方出现新的类型错误。
- 模块级 `notificationToastQueue` 单例在测试里每个 `it()` 之间是共享的（不会随 `render()`/`unmount` 重置），跟现有 `notification-provider.test.tsx` 里 `useNotificationStore.getState().reset()` 类似，需要在 `beforeEach` 里也 `notificationToastQueue.clear()`，否则前一条用例残留的 toast 会串到下一条用例里。
