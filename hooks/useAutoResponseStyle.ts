"use client";

import { useCallback, useSyncExternalStore } from "react";
import type { AutoResponseStyle } from "@/types/auto-preset";

const STORAGE_KEY = "smart-curtain:auto-response-style";
const DEFAULT_STYLE: AutoResponseStyle = "standard";
const listeners = new Set<() => void>();
let memoryStyle: AutoResponseStyle = DEFAULT_STYLE;

function isResponseStyle(value: string | null): value is AutoResponseStyle {
  return value === "standard" || value === "gentle";
}

function getStoredStyle(): AutoResponseStyle {
  try {
    const savedStyle = window.localStorage.getItem(STORAGE_KEY);

    if (isResponseStyle(savedStyle)) {
      memoryStyle = savedStyle;
    }
  } catch {
    // ใช้ค่าจากหน่วยความจำเมื่อ browser storage ใช้งานไม่ได้
  }

  return memoryStyle;
}

function subscribe(listener: () => void) {
  listeners.add(listener);

  function handleStorage(event: StorageEvent) {
    if (event.key === STORAGE_KEY) listener();
  }

  window.addEventListener("storage", handleStorage);

  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", handleStorage);
  };
}

export default function useAutoResponseStyle() {
  const responseStyle = useSyncExternalStore(
    subscribe,
    getStoredStyle,
    () => DEFAULT_STYLE,
  );

  const selectResponseStyle = useCallback((style: AutoResponseStyle) => {
    memoryStyle = style;

    try {
      window.localStorage.setItem(STORAGE_KEY, style);
    } catch {
      // การเลือกยังใช้ได้ในแท็บปัจจุบัน
    }

    listeners.forEach((listener) => listener());
  }, []);

  return { responseStyle, selectResponseStyle };
}
