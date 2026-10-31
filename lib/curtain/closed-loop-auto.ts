import type { SensorReading } from "../../types/sensor.ts";

export type ClosedLoopDirection = "open" | "close" | null;

export type ClosedLoopTemperatureBand = {
  label: string;
  highLux: number;
};

export type ClosedLoopAutoProfile = {
  lowLux: number;
  hotAndDarkHoldAtCelsius: number;
  temperatureThresholdsCelsius: readonly number[];
  temperatureBands: readonly ClosedLoopTemperatureBand[];
  temperatureHysteresisCelsius: number;
  maxStepPercent: number;
  minStepPercent: number;
};

export type ClosedLoopAutoState = {
  temperatureBandIndex: number | null;
  stepPercent: number;
  lastDirection: ClosedLoopDirection;
  resolutionLimited: boolean;
};

export type ClosedLoopAutoAction =
  | "open-step"
  | "close-step"
  | "hold"
  | "waiting";

export type ClosedLoopAutoResult = {
  action: ClosedLoopAutoAction;
  targetPercent: number | null;
  bandIndex: number | null;
  bandLabel: string | null;
  lowLux: number;
  highLux: number | null;
  stepPercent: number;
  reasons: string[];
  state: ClosedLoopAutoState;
};

export type ClosedLoopAutoInput = {
  reading: SensorReading | null;
  currentPositionPercent: number | null;
};

export const DEFAULT_CLOSED_LOOP_AUTO_PROFILE: ClosedLoopAutoProfile = {
  lowLux: 200,
  hotAndDarkHoldAtCelsius: 30,
  temperatureThresholdsCelsius: [26, 28, 30, 31],
  temperatureBands: [
    { label: "ต่ำกว่า 26°C", highLux: 3000 },
    { label: "26–ต่ำกว่า 28°C", highLux: 2500 },
    { label: "28–ต่ำกว่า 30°C", highLux: 1500 },
    { label: "30–ต่ำกว่า 31°C", highLux: 900 },
    { label: "ตั้งแต่ 31°C", highLux: 600 },
  ],
  temperatureHysteresisCelsius: 0.5,
  maxStepPercent: 15,
  minStepPercent: 5,
};

export const INITIAL_CLOSED_LOOP_AUTO_STATE: ClosedLoopAutoState = {
  temperatureBandIndex: null,
  stepPercent: DEFAULT_CLOSED_LOOP_AUTO_PROFILE.maxStepPercent,
  lastDirection: null,
  resolutionLimited: false,
};

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function isUsableReading(value: number | null): value is number {
  return value !== null && Number.isFinite(value);
}

function getRawTemperatureBand(
  temperatureCelsius: number,
  profile: ClosedLoopAutoProfile,
): number {
  const index = profile.temperatureThresholdsCelsius.findIndex(
    (threshold) => temperatureCelsius < threshold,
  );

  return index === -1
    ? profile.temperatureBands.length - 1
    : index;
}

export function getTemperatureBandWithHysteresis(
  temperatureCelsius: number,
  previousBandIndex: number | null,
  profile: ClosedLoopAutoProfile = DEFAULT_CLOSED_LOOP_AUTO_PROFILE,
): number {
  if (previousBandIndex === null) {
    return getRawTemperatureBand(temperatureCelsius, profile);
  }

  const lastBandIndex = profile.temperatureBands.length - 1;
  let bandIndex = clamp(
    Math.round(previousBandIndex),
    0,
    lastBandIndex,
  );

  while (
    bandIndex < lastBandIndex &&
    temperatureCelsius >=
      profile.temperatureThresholdsCelsius[bandIndex] +
        profile.temperatureHysteresisCelsius
  ) {
    bandIndex += 1;
  }

  while (
    bandIndex > 0 &&
    temperatureCelsius <
      profile.temperatureThresholdsCelsius[bandIndex - 1] -
        profile.temperatureHysteresisCelsius
  ) {
    bandIndex -= 1;
  }

  return bandIndex;
}

function waitingResult(
  state: ClosedLoopAutoState,
  profile: ClosedLoopAutoProfile,
  reasons: string[],
  bandIndex: number | null = state.temperatureBandIndex,
): ClosedLoopAutoResult {
  const band =
    bandIndex === null ? null : profile.temperatureBands[bandIndex];

  return {
    action: "waiting",
    targetPercent: null,
    bandIndex,
    bandLabel: band?.label ?? null,
    lowLux: profile.lowLux,
    highLux: band?.highLux ?? null,
    stepPercent: state.stepPercent,
    reasons,
    state: { ...state, temperatureBandIndex: bandIndex },
  };
}

function holdResult(
  state: ClosedLoopAutoState,
  profile: ClosedLoopAutoProfile,
  bandIndex: number,
  reasons: string[],
): ClosedLoopAutoResult {
  const band = profile.temperatureBands[bandIndex];

  return {
    action: "hold",
    targetPercent: null,
    bandIndex,
    bandLabel: band.label,
    lowLux: profile.lowLux,
    highLux: band.highLux,
    stepPercent: state.stepPercent,
    reasons,
    state: { ...state, temperatureBandIndex: bandIndex },
  };
}

export function advanceClosedLoopAuto(
  state: ClosedLoopAutoState,
  input: ClosedLoopAutoInput,
  profile: ClosedLoopAutoProfile = DEFAULT_CLOSED_LOOP_AUTO_PROFILE,
): ClosedLoopAutoResult {
  if (!input.reading) {
    return waitingResult(state, profile, ["กำลังรอข้อมูลเซ็นเซอร์"]);
  }

  const temperatureCelsius = input.reading.temperatureCelsius;
  const lightLux = input.reading.lightLux;

  if (!isUsableReading(temperatureCelsius)) {
    return waitingResult(state, profile, [
      "ไม่มีค่าอุณหภูมิ จึงยังไม่คำนวณ Model A",
    ]);
  }

  const bandIndex = getTemperatureBandWithHysteresis(
    temperatureCelsius,
    state.temperatureBandIndex,
    profile,
  );
  const band = profile.temperatureBands[bandIndex];
  const stateWithBand = {
    ...state,
    temperatureBandIndex: bandIndex,
  };

  if (!isUsableReading(lightLux) || lightLux < 0) {
    return waitingResult(
      stateWithBand,
      profile,
      ["ไม่มีค่าแสง จึงคงตำแหน่งและไม่สร้างคำสั่งใหม่"],
      bandIndex,
    );
  }

  if (state.resolutionLimited) {
    return holdResult(stateWithBand, profile, bandIndex, [
      "หยุดไว้เพราะกลับทิศจนถึงความละเอียดต่ำสุดของมอเตอร์",
      "กดรีเซ็ต Model A หลังตรวจตำแหน่งจริงก่อนเริ่มคำนวณใหม่",
    ]);
  }

  if (
    temperatureCelsius >= profile.hotAndDarkHoldAtCelsius &&
    lightLux < profile.lowLux
  ) {
    return holdResult(stateWithBand, profile, bandIndex, [
      `อุณหภูมิ ${temperatureCelsius.toFixed(1)}°C แต่แสงเพียง ${Math.round(lightLux)} lux`,
      "นโยบายร้อน + มืด: คงตำแหน่ง ไม่ปิดม่านจากอุณหภูมิเพียงอย่างเดียว",
    ]);
  }

  let direction: Exclude<ClosedLoopDirection, null> | null = null;

  if (lightLux > band.highLux) {
    direction = "close";
  } else if (lightLux < profile.lowLux) {
    direction = "open";
  }

  if (direction === null) {
    return holdResult(stateWithBand, profile, bandIndex, [
      `แสง ${Math.round(lightLux)} lux อยู่ในช่วง ${profile.lowLux}–${band.highLux} lux`,
      "ค่าปัจจุบันอยู่ในช่วงที่ยอมรับได้ จึงคงตำแหน่งเดิม",
    ]);
  }

  if (!isUsableReading(input.currentPositionPercent)) {
    return waitingResult(
      stateWithBand,
      profile,
      [
        direction === "open"
          ? "ควรขยับเปิด แต่ยังไม่มีตำแหน่งจาก Encoder"
          : "ควรขยับปิด แต่ยังไม่มีตำแหน่งจาก Encoder",
      ],
      bandIndex,
    );
  }

  let stepPercent = state.stepPercent;
  const isDirectionReversal =
    state.lastDirection !== null &&
    state.lastDirection !== direction;

  if (isDirectionReversal) {
    if (stepPercent <= profile.minStepPercent) {
      const limitedState: ClosedLoopAutoState = {
        ...stateWithBand,
        resolutionLimited: true,
      };

      return holdResult(limitedState, profile, bandIndex, [
        "ทิศทางสลับไปมาและ step ลดถึงค่าต่ำสุดแล้ว",
        "หยุดเพื่อป้องกันม่านแกว่งไปมาใกล้เส้นแบ่งค่าแสง",
      ]);
    }

    stepPercent = Math.max(
      profile.minStepPercent,
      Math.floor(stepPercent / 2),
    );
  }

  const signedStep = direction === "open" ? stepPercent : -stepPercent;
  const targetPercent = clamp(
    input.currentPositionPercent + signedStep,
    0,
    100,
  );

  if (targetPercent === input.currentPositionPercent) {
    return holdResult(stateWithBand, profile, bandIndex, [
      direction === "open"
        ? "ม่านอยู่ที่ขอบเปิดสุดแล้ว"
        : "ม่านอยู่ที่ขอบปิดสุดแล้ว",
      "ไม่สร้างคำสั่งเกินช่วง 0–100%",
    ]);
  }

  const nextState: ClosedLoopAutoState = {
    temperatureBandIndex: bandIndex,
    stepPercent,
    lastDirection: direction,
    resolutionLimited: false,
  };

  return {
    action: direction === "open" ? "open-step" : "close-step",
    targetPercent,
    bandIndex,
    bandLabel: band.label,
    lowLux: profile.lowLux,
    highLux: band.highLux,
    stepPercent,
    reasons: [
      `อุณหภูมิ ${temperatureCelsius.toFixed(1)}°C ใช้งบแสงสูงสุด ${band.highLux} lux`,
      direction === "open"
        ? `แสง ${Math.round(lightLux)} lux ต่ำกว่า ${profile.lowLux} lux จึงเสนอให้เปิดทีละ ${stepPercent}%`
        : `แสง ${Math.round(lightLux)} lux สูงกว่า ${band.highLux} lux จึงเสนอให้ปิดทีละ ${stepPercent}%`,
      ...(isDirectionReversal
        ? [`กลับทิศทาง จึงลด step เหลือ ${stepPercent}%`]
        : []),
    ],
    state: nextState,
  };
}

export function resetClosedLoopAutoState(
  profile: ClosedLoopAutoProfile = DEFAULT_CLOSED_LOOP_AUTO_PROFILE,
): ClosedLoopAutoState {
  return {
    temperatureBandIndex: null,
    stepPercent: profile.maxStepPercent,
    lastDirection: null,
    resolutionLimited: false,
  };
}
