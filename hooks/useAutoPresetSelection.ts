"use client";

import { useCallback, useSyncExternalStore } from "react";
import type { AutoPresetId } from "@/types/auto-preset";

const STORAGE_KEY = "smart-curtain:selected-auto-preset";

const AUTO_PRESET_IDS: readonly AutoPresetId[] = [
  "heat-protection",
  "natural-light",
  "balanced",
  "custom",
];

const listeners = new Set<() => void>();
let memorySelectedId: AutoPresetId = "balanced";

function isAutoPresetId(value: string | null): value is AutoPresetId {
  return AUTO_PRESET_IDS.some((id) => id === value);
}

function getStoredPreset(): AutoPresetId {
  try {
    const savedId = window.localStorage.getItem(STORAGE_KEY);

    if (isAutoPresetId(savedId)) {
      memorySelectedId = savedId;
    }
  } catch {
    // ใช้ค่าจากหน่วยความจำเมื่อเบราว์เซอร์ปิดกั้น storage
  }

  return memorySelectedId;
}

function subscribe(listener: () => void) {
  listeners.add(listener);

  function handleStorage(event: StorageEvent) {
    if (event.key === STORAGE_KEY) {
      listener();
    }
  }

  window.addEventListener("storage", handleStorage);

  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", handleStorage);
  };
}

export default function useAutoPresetSelection(
  initialId: AutoPresetId = "balanced",
) {
  const selectedId = useSyncExternalStore(
    subscribe,
    getStoredPreset,
    () => initialId,
  );

  const selectPreset = useCallback((id: AutoPresetId) => {
    memorySelectedId = id;

    try {
      window.localStorage.setItem(STORAGE_KEY, id);
    } catch {
      // การเลือกยังมีผลในหน้าปัจจุบันแม้บันทึกลง storage ไม่ได้
    }

    listeners.forEach((listener) => listener());
  }, []);

  return { selectedId, selectPreset };
}
