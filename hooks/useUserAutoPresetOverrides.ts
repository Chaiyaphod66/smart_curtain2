"use client";

import { useCallback, useSyncExternalStore } from "react";
import { getAutoPresetValidationErrors } from "@/lib/curtain/auto-preset";
import {
  findUserAutoPresetOption,
  type UserAutoPresetOptionId,
} from "@/lib/curtain/user-auto-presets";
import type { AutoPreset } from "@/types/auto-preset";

type PresetOverrides = Partial<Record<UserAutoPresetOptionId, AutoPreset>>;

const STORAGE_KEY = "smart-curtain:user-auto-preset-overrides:v1";
const EMPTY_OVERRIDES: PresetOverrides = Object.freeze({});
const listeners = new Set<() => void>();
let memoryOverrides: PresetOverrides = EMPTY_OVERRIDES;
let hasLoadedStorage = false;

function clonePreset(preset: AutoPreset): AutoPreset {
  return {
    ...preset,
    temperature: { ...preset.temperature },
    light: {
      ...preset.light,
      ranges: preset.light.ranges.map((range) => ({ ...range })),
    },
  };
}

function isUsablePreset(value: unknown, optionId: UserAutoPresetOptionId): value is AutoPreset {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Partial<AutoPreset>;
  const baseOption = findUserAutoPresetOption(optionId);

  if (
    !baseOption ||
    candidate.id !== baseOption.preset.id ||
    !candidate.temperature ||
    !candidate.light ||
    !Array.isArray(candidate.light.ranges) ||
    candidate.light.ranges.length < 2
  ) {
    return false;
  }

  try {
    return getAutoPresetValidationErrors(candidate as AutoPreset).length === 0;
  } catch {
    return false;
  }
}

function readStoredOverrides(): PresetOverrides {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_OVERRIDES;

    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const next: PresetOverrides = {};

    for (const [optionId, value] of Object.entries(parsed)) {
      if (
        findUserAutoPresetOption(optionId) &&
        isUsablePreset(value, optionId as UserAutoPresetOptionId)
      ) {
        next[optionId as UserAutoPresetOptionId] = clonePreset(value);
      }
    }

    return Object.keys(next).length > 0 ? next : EMPTY_OVERRIDES;
  } catch {
    return EMPTY_OVERRIDES;
  }
}

function getSnapshot(): PresetOverrides {
  if (!hasLoadedStorage) {
    memoryOverrides = readStoredOverrides();
    hasLoadedStorage = true;
  }

  return memoryOverrides;
}

function subscribe(listener: () => void) {
  listeners.add(listener);

  function handleStorage(event: StorageEvent) {
    if (event.key !== STORAGE_KEY) return;
    hasLoadedStorage = false;
    memoryOverrides = readStoredOverrides();
    hasLoadedStorage = true;
    listeners.forEach((currentListener) => currentListener());
  }

  window.addEventListener("storage", handleStorage);

  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", handleStorage);
  };
}

function persist(next: PresetOverrides) {
  memoryOverrides = Object.keys(next).length > 0 ? next : EMPTY_OVERRIDES;
  hasLoadedStorage = true;

  try {
    if (memoryOverrides === EMPTY_OVERRIDES) {
      window.localStorage.removeItem(STORAGE_KEY);
    } else {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(memoryOverrides));
    }
  } catch {
    // ค่าที่แก้ยังใช้งานได้ในแท็บปัจจุบัน แม้ browser storage ไม่พร้อม
  }

  listeners.forEach((listener) => listener());
}

export default function useUserAutoPresetOverrides() {
  const presetOverrides = useSyncExternalStore(
    subscribe,
    getSnapshot,
    () => EMPTY_OVERRIDES,
  );

  const savePresetOverride = useCallback(
    (optionId: UserAutoPresetOptionId, preset: AutoPreset) => {
      if (!isUsablePreset(preset, optionId)) return false;

      persist({
        ...memoryOverrides,
        [optionId]: clonePreset(preset),
      });
      return true;
    },
    [],
  );

  const resetPresetOverride = useCallback((optionId: UserAutoPresetOptionId) => {
    const next = { ...memoryOverrides };
    delete next[optionId];
    persist(next);
  }, []);

  return { presetOverrides, savePresetOverride, resetPresetOverride };
}
