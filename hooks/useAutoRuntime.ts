"use client";

import { useCallback, useEffect, useReducer } from "react";
import {
  INITIAL_AUTO_RUNTIME_STATE,
  advanceAutoRuntime,
  beginAutoCommand,
  failAutoCommand,
  getCooldownRemainingSeconds,
  observeAutoMotor,
  resetAutoRuntime,
  restoreAutoCooldown,
  stopAutoCommand,
  tickAutoRuntime,
} from "@/lib/curtain/auto-runtime";
import type { AutoRuntimeState } from "@/types/auto-runtime";

type UseAutoRuntimeOptions = {
  sampleId: string | null;
  candidateKey: string | null;
  targetPercent: number | null;
  confirmationReadings: number;
  cooldownSeconds: number;
  isMotorRunning: boolean;
  currentPositionPercent: number | null;
};

const COOLDOWN_STORAGE_KEY = "smart-curtain:auto-cooldown-until";

type AutoRuntimeAction =
  | {
      type: "sample";
      sampleId: string | null;
      candidateKey: string | null;
      targetPercent: number | null;
      confirmationReadings: number;
      nowMs: number;
    }
  | { type: "begin-command"; targetPercent: number; nowMs: number }
  | {
      type: "observe-motor";
      isMotorRunning: boolean;
      currentPositionPercent: number | null;
      cooldownSeconds: number;
      nowMs: number;
    }
  | { type: "tick"; nowMs: number }
  | { type: "restore-cooldown"; cooldownUntilMs: number; nowMs: number }
  | { type: "failed"; message: string; nowMs: number }
  | { type: "stopped"; nowMs: number; cooldownSeconds: number }
  | { type: "reset"; nowMs: number };

function autoRuntimeReducer(
  state: AutoRuntimeState,
  action: AutoRuntimeAction,
): AutoRuntimeState {
  switch (action.type) {
    case "sample":
      return advanceAutoRuntime(state, action);
    case "begin-command":
      return beginAutoCommand(
        state,
        action.targetPercent,
        action.nowMs,
      );
    case "observe-motor":
      return observeAutoMotor(state, action);
    case "tick":
      return tickAutoRuntime(state, action.nowMs);
    case "restore-cooldown":
      return restoreAutoCooldown(
        state,
        action.cooldownUntilMs,
        action.nowMs,
      );
    case "failed":
      return failAutoCommand(state, action.message, action.nowMs);
    case "stopped":
      return stopAutoCommand(
        state,
        action.nowMs,
        action.cooldownSeconds,
      );
    case "reset":
      return resetAutoRuntime(state, action.nowMs);
  }
}

export default function useAutoRuntime({
  sampleId,
  candidateKey,
  targetPercent,
  confirmationReadings,
  cooldownSeconds,
  isMotorRunning,
  currentPositionPercent,
}: UseAutoRuntimeOptions) {
  const [state, dispatch] = useReducer(
    autoRuntimeReducer,
    INITIAL_AUTO_RUNTIME_STATE,
  );

  useEffect(() => {
    try {
      const storedCooldown = Number(
        window.localStorage.getItem(COOLDOWN_STORAGE_KEY),
      );

      if (Number.isFinite(storedCooldown)) {
        dispatch({
          type: "restore-cooldown",
          cooldownUntilMs: storedCooldown,
          nowMs: Date.now(),
        });
      }
    } catch {
      // Auto Runtime ยังทำงานในหน่วยความจำได้เมื่อ storage ถูกปิดกั้น
    }
  }, []);

  useEffect(() => {
    if (
      state.phase === "cooldown" &&
      state.cooldownUntilMs !== null
    ) {
      try {
        window.localStorage.setItem(
          COOLDOWN_STORAGE_KEY,
          String(state.cooldownUntilMs),
        );
      } catch {
        // ไม่ให้ข้อจำกัดของ storage ทำให้หน้าควบคุมหยุดทำงาน
      }
    }
  }, [state.phase, state.cooldownUntilMs]);

  useEffect(() => {
    dispatch({
      type: "sample",
      sampleId,
      candidateKey,
      targetPercent,
      confirmationReadings,
      nowMs: Date.now(),
    });
  }, [
    sampleId,
    candidateKey,
    targetPercent,
    confirmationReadings,
  ]);

  useEffect(() => {
    if (state.phase !== "commanding" && state.phase !== "moving") {
      return;
    }

    const timer = window.setInterval(() => {
      dispatch({
        type: "observe-motor",
        isMotorRunning,
        currentPositionPercent,
        cooldownSeconds,
        nowMs: Date.now(),
      });
    }, 250);

    return () => window.clearInterval(timer);
  }, [
    state.phase,
    isMotorRunning,
    currentPositionPercent,
    cooldownSeconds,
  ]);

  useEffect(() => {
    if (state.phase !== "cooldown") {
      return;
    }

    const timer = window.setInterval(() => {
      dispatch({ type: "tick", nowMs: Date.now() });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [state.phase]);

  const startCommand = useCallback((nextTargetPercent: number) => {
    dispatch({
      type: "begin-command",
      targetPercent: nextTargetPercent,
      nowMs: Date.now(),
    });
  }, []);

  const commandFailed = useCallback((message: string) => {
    dispatch({ type: "failed", message, nowMs: Date.now() });
  }, []);

  const commandStopped = useCallback(() => {
    dispatch({
      type: "stopped",
      nowMs: Date.now(),
      cooldownSeconds,
    });
  }, [cooldownSeconds]);

  const reset = useCallback(() => {
    dispatch({ type: "reset", nowMs: Date.now() });
  }, []);

  return {
    ...state,
    isReady: state.phase === "ready",
    cooldownRemainingSeconds: getCooldownRemainingSeconds(state),
    startCommand,
    commandFailed,
    commandStopped,
    reset,
  };
}
