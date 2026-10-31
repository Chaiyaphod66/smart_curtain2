"use client";

import { useCallback, useSyncExternalStore } from "react";
import {
  DEFAULT_USER_AUTO_PRESET_OPTION_ID,
  findUserAutoPresetOption,
  type UserAutoPresetOptionId,
} from "@/lib/curtain/user-auto-presets";

const STORAGE_KEY = "smart-curtain:user-auto-preset-option";
const listeners = new Set<() => void>();
let memorySelectedId = DEFAULT_USER_AUTO_PRESET_OPTION_ID;

function getStoredChoice(): UserAutoPresetOptionId {
  try {
    const savedId = window.localStorage.getItem(STORAGE_KEY);

    if (findUserAutoPresetOption(savedId)) {
      memorySelectedId = savedId as UserAutoPresetOptionId;
    }
  } catch {
    // ใช้ค่าจากหน่วยความจำเมื่อ browser storage ใช้งานไม่ได้
  }

  return memorySelectedId;
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

export default function useUserAutoPresetChoice() {
  const selectedOptionId = useSyncExternalStore(
    subscribe,
    getStoredChoice,
    () => DEFAULT_USER_AUTO_PRESET_OPTION_ID,
  );

  const selectOption = useCallback((id: UserAutoPresetOptionId) => {
    memorySelectedId = id;

    try {
      window.localStorage.setItem(STORAGE_KEY, id);
    } catch {
      // การเลือกยังใช้ได้ในแท็บปัจจุบัน
    }

    listeners.forEach((listener) => listener());
  }, []);

  return { selectedOptionId, selectOption };
}
