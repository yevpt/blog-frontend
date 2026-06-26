"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { DEFAULT_FLOAT_DOCK_CONFIG, type FloatDockConfig, type FloatDockItem } from "./types";

interface FloatDockContextValue {
  config: Required<FloatDockConfig>;
  register: (id: string, patch: FloatDockConfig) => void;
  unregister: (id: string) => void;
}

const FloatDockContext = createContext<FloatDockContextValue | null>(null);

function sortItems(items: FloatDockItem[]): FloatDockItem[] {
  return [...items].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

function mergeRegistrations(
  registrations: Map<string, FloatDockConfig>,
): Required<FloatDockConfig> {
  let enabled = DEFAULT_FLOAT_DOCK_CONFIG.enabled;
  let position = DEFAULT_FLOAT_DOCK_CONFIG.position;
  const itemsById = new Map<string, FloatDockItem>();

  for (const reg of registrations.values()) {
    if (reg.enabled !== undefined) enabled = reg.enabled;
    if (reg.position !== undefined) position = reg.position;
    if (reg.items !== undefined) {
      for (const item of reg.items) {
        itemsById.set(item.id, item);
      }
    }
  }

  return {
    enabled,
    position,
    items: sortItems([...itemsById.values()]),
  };
}

export function FloatDockProvider({ children }: { children: ReactNode }) {
  const registrationsRef = useRef(new Map<string, FloatDockConfig>());
  const [config, setConfigState] = useState(DEFAULT_FLOAT_DOCK_CONFIG);

  const recomputeConfig = useCallback(() => {
    setConfigState(mergeRegistrations(registrationsRef.current));
  }, []);

  const register = useCallback(
    (id: string, patch: FloatDockConfig) => {
      registrationsRef.current.set(id, patch);
      recomputeConfig();
    },
    [recomputeConfig],
  );

  const unregister = useCallback(
    (id: string) => {
      registrationsRef.current.delete(id);
      recomputeConfig();
    },
    [recomputeConfig],
  );

  const value = useMemo(
    () => ({
      config,
      register,
      unregister,
    }),
    [config, register, unregister],
  );

  return <FloatDockContext.Provider value={value}>{children}</FloatDockContext.Provider>;
}

export function useFloatDockContext(): FloatDockContextValue {
  const context = useContext(FloatDockContext);
  if (!context) {
    throw new Error("useFloatDockContext must be used within FloatDockProvider");
  }
  return context;
}

function getPositionKey(config: FloatDockConfig): string | undefined {
  if (config.position === undefined) return undefined;
  const { position } = config;
  if (position.variant === "viewport") return "viewport";
  return `${position.layout.pageMaxWidth}:${position.layout.pagePaddingX}:${position.layout.contentMaxWidth}:${position.hasSidebar ?? false}`;
}

/**
 * 页面挂载时注册 Dock 配置片段，多注册源会合并（定位与 items 互不覆盖）。
 */
export function useFloatDockConfig(config: FloatDockConfig, registrationId?: string): void {
  const autoId = useId();
  const id = registrationId ?? autoId;
  const { register, unregister } = useFloatDockContext();
  const configRef = useRef(config);
  configRef.current = config;

  const enabled = config.enabled;
  const positionKey = getPositionKey(config);
  const itemIds = config.items?.map((item) => item.id).join(",") ?? "";

  useEffect(() => {
    register(id, configRef.current);
    return () => unregister(id);
  }, [id, register, unregister, enabled, positionKey, itemIds]);
}
