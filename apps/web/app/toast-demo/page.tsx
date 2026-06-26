"use client";

import {
  Avatar,
  Button,
  ToastRegion,
  ToastQueue,
  type ToastContent,
  type ToastPosition,
  type ToastType,
} from "@repo/ui";
import { SvgIcon } from "@repo/icons";
import { addToast } from "@/lib/toast";

const samples: { label: string; message: string; type: ToastType }[] = [
  { label: "成功 · 短", message: "已置顶", type: "success" },
  { label: "成功 · 中", message: "密码已修改，请重新登录", type: "success" },
  { label: "失败 · 短", message: "请先登录", type: "error" },
  {
    label: "失败 · 长（测试换行对齐）",
    message: "浏览器阻止了弹出窗口，请允许后重试",
    type: "error",
  },
  { label: "信息 · 中", message: "B站登录暂未开放", type: "info" },
];

const positions: { position: ToastPosition; label: string }[] = [
  { position: "top-left", label: "左上" },
  { position: "top-center", label: "中上" },
  { position: "top-right", label: "右上" },
  { position: "bottom-left", label: "左下" },
  { position: "bottom-center", label: "中下" },
  { position: "bottom-right", label: "右下" },
];

interface DemoNotification {
  id: number;
  actorName: string;
  actionText: string;
  quoteTitle?: string;
  quoteText?: string;
  initials: string;
}

const notificationSamples: DemoNotification[] = [
  {
    id: 1,
    actorName: "寒蝉",
    actionText: "评论了你的文章",
    quoteTitle: "《React Aria Toast 接入记录》",
    quoteText: "这段自定义渲染终于能放头像和摘要了，看起来顺眼很多。",
    initials: "寒",
  },
  {
    id: 2,
    actorName: "萨",
    actionText: "赞了你的碎语",
    quoteText: "雨停之后，窗台的光像被重新擦亮了一遍。",
    initials: "萨",
  },
  {
    id: 3,
    actorName: "系统通知",
    actionText: "发布了系统通知",
    quoteText: "消息中心已完成实时通知弹窗升级，欢迎测试堆叠与关闭效果。",
    initials: "系",
  },
];

// 每个位置一条独立的演示队列，互不干扰，也不影响生产环境用的全局 toastQueue
const positionQueues: Record<ToastPosition, ToastQueue<ToastContent>> = {
  "top-left": new ToastQueue({ maxVisibleToasts: 5 }),
  "top-center": new ToastQueue({ maxVisibleToasts: 5 }),
  "top-right": new ToastQueue({ maxVisibleToasts: 5 }),
  "bottom-left": new ToastQueue({ maxVisibleToasts: 5 }),
  "bottom-center": new ToastQueue({ maxVisibleToasts: 5 }),
  "bottom-right": new ToastQueue({ maxVisibleToasts: 5 }),
};

export const demoNotificationQueue = new ToastQueue<DemoNotification>({ maxVisibleToasts: 3 });

function showDemoNotification(item: DemoNotification) {
  demoNotificationQueue.add(item, { timeout: 6000 });
}

export default function ToastDemoPage() {
  return (
    <div className="mx-auto flex max-w-md flex-col gap-8 p-6">
      <div className="flex flex-col gap-3">
        <h1 className="text-lg font-medium text-foreground">
          Toast 样式测试（临时调试页，测完可删）
        </h1>
        {samples.map((s) => (
          <Button key={s.label} onPress={() => addToast(s.message, s.type)}>
            {s.label}
          </Button>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-base font-medium text-foreground">
          弹出位置测试（六个角各一条独立队列）
        </h2>
        <div className="grid grid-cols-3 gap-2">
          {positions.map((p) => (
            <Button
              key={p.position}
              onPress={() =>
                positionQueues[p.position].add({ message: `${p.label}通知`, type: "info" })
              }
            >
              {p.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-base font-medium text-foreground">通知弹窗 mock（右上角业务样式）</h2>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {notificationSamples.map((item) => (
            <Button key={item.id} onPress={() => showDemoNotification(item)}>
              {item.actorName} · {item.actionText}
            </Button>
          ))}
          <Button
            onPress={() => {
              notificationSamples.forEach(showDemoNotification);
            }}
          >
            一次弹三条
          </Button>
        </div>
      </div>

      {positions.map((p) => (
        <ToastRegion key={p.position} queue={positionQueues[p.position]} position={p.position} />
      ))}
      <ToastRegion
        queue={demoNotificationQueue}
        position="top-right"
        className="top-20"
        itemClassName="w-[340px] max-w-[calc(100vw-2rem)] items-start"
        renderToast={(toast, { close }) => {
          const item = toast.content;
          return (
            <>
              <Avatar initials={item.initials} alt={item.actorName} size="sm" className="mt-0.5" />
              <button
                type="button"
                className="min-w-0 flex-1 cursor-pointer text-left"
                onClick={close}
              >
                <span role="alert" aria-atomic="true" className="block">
                  <p className="truncate text-[13px] text-foreground">
                    <span className="font-semibold">{item.actorName}</span>{" "}
                    <span className="text-muted-foreground">{item.actionText}</span>
                  </p>
                  {item.quoteText ? (
                    <p className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-muted-foreground">
                      {item.quoteTitle ? `${item.quoteTitle} ` : ""}
                      {item.quoteText}
                    </p>
                  ) : null}
                </span>
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
    </div>
  );
}
