"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { create } from "zustand";
import { useCommentModal } from "@/store/use-comment-modal";
import { useInlineEditorStore } from "@/store/use-inline-editor-store";
import { useFriendLinksPausedStore } from "@/store/use-friend-links-paused-store";

interface RestoreSlotStore {
  pathname: string | null;
}

/**
 * 全局单槽位：记着「最近一次前进导航离开的那个页面」，用于判断后退时是否应该恢复。
 * 只用 getState()/setState() 命令式读写，不作为 React hook 订阅——不会触发任何组件
 * 重渲染，用 Zustand 只是为了能像仓库里其他 store 一样在测试的 beforeEach 里 setState 复位。
 */
export const useNavigationRestoreSlot = create<RestoreSlotStore>(() => ({ pathname: null }));

function discardStaleState() {
  useCommentModal.getState().close();
  useInlineEditorStore.getState().discardAll();
  useFriendLinksPausedStore.getState().reset();
}

/** 全局挂载一次，不渲染任何内容 */
export function NavigationRestoreGuard() {
  const pathname = usePathname();
  const prevPathnameRef = useRef(pathname);
  const isFirstRenderRef = useRef(true);
  // popstate 处理函数里置位，pathname 变化的 effect 里读到即消费掉，
  // 避免同一次后退/前进导航被误判成一次新的前进导航
  const consumedByPopRef = useRef(false);

  useEffect(() => {
    function handlePopState() {
      consumedByPopRef.current = true;
      const currentPathname = window.location.pathname;
      const slotPathname = useNavigationRestoreSlot.getState().pathname;
      if (slotPathname !== null && slotPathname === currentPathname) {
        if (useCommentModal.getState().targetType !== null) {
          useCommentModal.getState().show();
        }
        useNavigationRestoreSlot.setState({ pathname: null });
      } else if (slotPathname !== null) {
        discardStaleState();
        useNavigationRestoreSlot.setState({ pathname: null });
      }
    }
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      prevPathnameRef.current = pathname;
      return;
    }
    if (consumedByPopRef.current) {
      consumedByPopRef.current = false;
      prevPathnameRef.current = pathname;
      return;
    }
    // 走到这里说明是一次前进导航（Link 点击、router.push 等）
    if (useNavigationRestoreSlot.getState().pathname !== null) {
      discardStaleState();
    }
    useNavigationRestoreSlot.setState({ pathname: prevPathnameRef.current });
    if (useCommentModal.getState().isVisible) {
      useCommentModal.getState().hide();
    }
    prevPathnameRef.current = pathname;
  }, [pathname]);

  return null;
}
