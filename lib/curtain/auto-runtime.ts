import type { AutoRuntimeState } from "../../types/auto-runtime.ts";

const COMMAND_START_TIMEOUT_MS = 15_000;
const COMMAND_FINISH_TIMEOUT_MS = 30_000;

export const INITIAL_AUTO_RUNTIME_STATE: AutoRuntimeState = {
  phase: "waiting",
  candidateKey: null,
  confirmationCount: 0,
  lastSampleId: null,
  targetPercent: null,
  commandStartedAtMs: null,
  commandTargetPercent: null,
  cooldownUntilMs: null,
  clockMs: 0,
  faultMessage: null,
};

type AdvanceAutoRuntimeInput = {
  sampleId: string | null;
  candidateKey: string | null;
  targetPercent: number | null;
  confirmationReadings: number;
  nowMs: number;
};

type ObserveAutoMotorInput = {
  isMotorRunning: boolean;
  currentPositionPercent: number | null;
  cooldownSeconds: number;
  nowMs: number;
  targetTolerancePercent?: number;
};

function normalizeConfirmationReadings(value: number): number {
  if (!Number.isFinite(value)) {
    return 1;
  }

  return Math.min(10, Math.max(1, Math.round(value)));
}

function normalizeCooldownSeconds(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(3600, Math.max(0, value));
}

function beginCooldown(
  state: AutoRuntimeState,
  nowMs: number,
  cooldownSeconds: number,
): AutoRuntimeState {
  const durationMs = normalizeCooldownSeconds(cooldownSeconds) * 1000;

  return {
    ...state,
    phase: durationMs > 0 ? "cooldown" : "waiting",
    candidateKey: null,
    confirmationCount: 0,
    targetPercent: null,
    commandStartedAtMs: null,
    commandTargetPercent: null,
    cooldownUntilMs: durationMs > 0 ? nowMs + durationMs : null,
    clockMs: nowMs,
    faultMessage: null,
  };
}

export function tickAutoRuntime(
  state: AutoRuntimeState,
  nowMs: number,
): AutoRuntimeState {
  if (state.phase !== "cooldown") {
    return state;
  }

  if (
    state.cooldownUntilMs !== null &&
    nowMs < state.cooldownUntilMs
  ) {
    return { ...state, clockMs: nowMs };
  }

  return {
    ...INITIAL_AUTO_RUNTIME_STATE,
    lastSampleId: state.lastSampleId,
    clockMs: nowMs,
  };
}

export function restoreAutoCooldown(
  state: AutoRuntimeState,
  cooldownUntilMs: number,
  nowMs: number,
): AutoRuntimeState {
  if (
    !Number.isFinite(cooldownUntilMs) ||
    cooldownUntilMs <= nowMs
  ) {
    return state;
  }

  return {
    ...INITIAL_AUTO_RUNTIME_STATE,
    phase: "cooldown",
    lastSampleId: state.lastSampleId,
    cooldownUntilMs,
    clockMs: nowMs,
  };
}

export function advanceAutoRuntime(
  state: AutoRuntimeState,
  input: AdvanceAutoRuntimeInput,
): AutoRuntimeState {
  const current = tickAutoRuntime(state, input.nowMs);

  if (
    current.phase === "commanding" ||
    current.phase === "moving" ||
    current.phase === "cooldown" ||
    current.phase === "fault"
  ) {
    return current;
  }

  if (
    input.sampleId === null ||
    input.candidateKey === null ||
    input.targetPercent === null
  ) {
    return {
      ...current,
      phase: "waiting",
      candidateKey: null,
      confirmationCount: 0,
      targetPercent: null,
      lastSampleId: input.sampleId ?? current.lastSampleId,
      clockMs: input.nowMs,
    };
  }

  const required = normalizeConfirmationReadings(
    input.confirmationReadings,
  );

  if (input.sampleId === current.lastSampleId) {
    if (input.candidateKey === current.candidateKey) {
      return {
        ...current,
        phase:
          current.confirmationCount >= required
            ? "ready"
            : "confirming",
        clockMs: input.nowMs,
      };
    }

    return {
      ...current,
      phase: "confirming",
      candidateKey: input.candidateKey,
      confirmationCount: 0,
      targetPercent: input.targetPercent,
      clockMs: input.nowMs,
    };
  }

  const confirmationCount =
    input.candidateKey === current.candidateKey
      ? current.confirmationCount + 1
      : 1;

  return {
    ...current,
    phase: confirmationCount >= required ? "ready" : "confirming",
    candidateKey: input.candidateKey,
    confirmationCount,
    lastSampleId: input.sampleId,
    targetPercent: input.targetPercent,
    clockMs: input.nowMs,
    faultMessage: null,
  };
}

export function beginAutoCommand(
  state: AutoRuntimeState,
  targetPercent: number,
  nowMs: number,
): AutoRuntimeState {
  if (
    state.phase !== "ready" ||
    state.targetPercent !== targetPercent
  ) {
    return state;
  }

  return {
    ...state,
    phase: "commanding",
    commandStartedAtMs: nowMs,
    commandTargetPercent: targetPercent,
    clockMs: nowMs,
    faultMessage: null,
  };
}

export function observeAutoMotor(
  state: AutoRuntimeState,
  input: ObserveAutoMotorInput,
): AutoRuntimeState {
  if (
    state.phase !== "commanding" &&
    state.phase !== "moving"
  ) {
    return tickAutoRuntime(state, input.nowMs);
  }

  const target = state.commandTargetPercent;
  const tolerance = input.targetTolerancePercent ?? 2;
  const reachedTarget =
    target !== null &&
    input.currentPositionPercent !== null &&
    Math.abs(input.currentPositionPercent - target) <= tolerance;

  if (!input.isMotorRunning && reachedTarget) {
    return beginCooldown(
      state,
      input.nowMs,
      input.cooldownSeconds,
    );
  }

  if (state.phase === "commanding" && input.isMotorRunning) {
    return {
      ...state,
      phase: "moving",
      clockMs: input.nowMs,
    };
  }

  if (state.phase === "moving" && !input.isMotorRunning) {
    return beginCooldown(
      state,
      input.nowMs,
      input.cooldownSeconds,
    );
  }

  const elapsedMs =
    state.commandStartedAtMs === null
      ? 0
      : input.nowMs - state.commandStartedAtMs;
  const timeoutMs =
    state.phase === "commanding"
      ? COMMAND_START_TIMEOUT_MS
      : COMMAND_FINISH_TIMEOUT_MS;

  if (elapsedMs >= timeoutMs) {
    return {
      ...state,
      phase: "fault",
      clockMs: input.nowMs,
      faultMessage:
        state.phase === "commanding"
          ? "ESP32 ไม่ยืนยันว่ามอเตอร์เริ่มทำงานภายใน 15 วินาที"
          : "มอเตอร์ทำงานเกินเวลา 30 วินาที",
    };
  }

  return { ...state, clockMs: input.nowMs };
}

export function failAutoCommand(
  state: AutoRuntimeState,
  message: string,
  nowMs: number,
): AutoRuntimeState {
  return {
    ...state,
    phase: "fault",
    confirmationCount: 0,
    commandStartedAtMs: null,
    commandTargetPercent: null,
    clockMs: nowMs,
    faultMessage: message,
  };
}

export function stopAutoCommand(
  state: AutoRuntimeState,
  nowMs: number,
  cooldownSeconds: number,
): AutoRuntimeState {
  if (state.phase === "cooldown" || state.phase === "fault") {
    return { ...state, clockMs: nowMs };
  }

  if (state.phase === "commanding" || state.phase === "moving") {
    return beginCooldown(state, nowMs, cooldownSeconds);
  }

  return {
    ...INITIAL_AUTO_RUNTIME_STATE,
    lastSampleId: state.lastSampleId,
    clockMs: nowMs,
  };
}

export function resetAutoRuntime(
  state: AutoRuntimeState,
  nowMs: number,
): AutoRuntimeState {
  return {
    ...INITIAL_AUTO_RUNTIME_STATE,
    lastSampleId: state.lastSampleId,
    clockMs: nowMs,
  };
}

export function getCooldownRemainingSeconds(
  state: AutoRuntimeState,
): number {
  if (
    state.phase !== "cooldown" ||
    state.cooldownUntilMs === null
  ) {
    return 0;
  }

  return Math.max(
    0,
    Math.ceil((state.cooldownUntilMs - state.clockMs) / 1000),
  );
}
