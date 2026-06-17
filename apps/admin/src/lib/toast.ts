import { ToastQueue } from "@repo/ui";
import type { ToastContent, ToastType } from "@repo/ui";

export const toastQueue = new ToastQueue<ToastContent>({ maxVisibleToasts: 5 });

export function addToast(message: string, type?: ToastType): void {
  toastQueue.add({ message, type }, { timeout: 4000 });
}
