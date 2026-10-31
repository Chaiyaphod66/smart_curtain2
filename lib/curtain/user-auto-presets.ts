import { DEFAULT_AUTO_PRESETS } from "./auto-preset.ts";
import type { AutoPreset, AutoPresetId } from "../../types/auto-preset.ts";

export type UserAutoPresetOptionId =
  | "heat-gentle"
  | "heat-standard"
  | "heat-responsive"
  | "light-daylight"
  | "light-standard"
  | "light-shade"
  | "balanced-daylight"
  | "balanced-standard"
  | "balanced-cool";

export type UserAutoPresetOption = {
  id: UserAutoPresetOptionId;
  name: string;
  description: string;
  detail: string;
  recommended?: boolean;
  preset: AutoPreset;
};

export type UserAutoPresetFamily = {
  id: Exclude<AutoPresetId, "custom">;
  name: string;
  badge: string;
  description: string;
  tone: "temperature" | "light" | "balanced";
  options: readonly UserAutoPresetOption[];
};

function getDefaultPreset(id: AutoPresetId): AutoPreset {
  const preset = DEFAULT_AUTO_PRESETS.find((candidate) => candidate.id === id);

  if (!preset) {
    throw new Error(`Missing default Auto preset: ${id}`);
  }

  return {
    ...preset,
    temperature: { ...preset.temperature },
    light: {
      ...preset.light,
      ranges: preset.light.ranges.map((range) => ({ ...range })),
    },
  };
}

function createPreset(
  id: Exclude<AutoPresetId, "custom">,
  update: (preset: AutoPreset) => AutoPreset,
): AutoPreset {
  return update(getDefaultPreset(id));
}

export const USER_AUTO_PRESET_FAMILIES: readonly UserAutoPresetFamily[] = [
  {
    id: "heat-protection",
    name: "ตามอุณหภูมิ",
    badge: "ไม่ใช้ค่าแสง",
    description: "เลือกความไวในการป้องกันความร้อน",
    tone: "temperature",
    options: [
      {
        id: "heat-gentle",
        name: "นุ่มนวล",
        description: "ขยับม่านไม่บ่อย เหมาะกับห้องที่อุณหภูมิเปลี่ยนขึ้นลงเล็กน้อย",
        detail: "เริ่มปิด 31°C · เปิดกลับ 28°C · ยืนยัน 4 ค่า",
        preset: createPreset("heat-protection", (preset) => ({
          ...preset,
          name: "อุณหภูมิ · นุ่มนวล",
          temperature: {
            ...preset.temperature,
            closeAtOrAboveCelsius: 31,
            reopenAtOrBelowCelsius: 28,
          },
          confirmationReadings: 4,
          cooldownSeconds: 180,
        })),
      },
      {
        id: "heat-standard",
        name: "มาตรฐาน",
        description: "ค่ากลางสำหรับเริ่มใช้งาน ช่วยลดความร้อนโดยไม่ตอบสนองไวเกินไป",
        detail: "เริ่มปิด 30°C · เปิดกลับ 28°C · ยืนยัน 3 ค่า",
        recommended: true,
        preset: createPreset("heat-protection", (preset) => ({
          ...preset,
          name: "อุณหภูมิ · มาตรฐาน",
        })),
      },
      {
        id: "heat-responsive",
        name: "ตอบสนองไว",
        description: "เริ่มปิดม่านเร็วขึ้น เหมาะกับห้องที่ร้อนง่ายหรือโดนแดดมาก",
        detail: "เริ่มปิด 29°C · เปิดกลับ 27°C · ยืนยัน 3 ค่า",
        preset: createPreset("heat-protection", (preset) => ({
          ...preset,
          name: "อุณหภูมิ · ตอบสนองไว",
          temperature: {
            ...preset.temperature,
            closeAtOrAboveCelsius: 29,
            reopenAtOrBelowCelsius: 27,
          },
          closedTargetPercent: 10,
          cooldownSeconds: 120,
        })),
      },
    ],
  },
  {
    id: "natural-light",
    name: "ตามแสงธรรมชาติ",
    badge: "ไม่ใช้ค่าอุณหภูมิ",
    description: "เลือกว่าจะรับแสงหรือบังแสงมากแค่ไหน",
    tone: "light",
    options: [
      {
        id: "light-daylight",
        name: "รับแสงมาก",
        description: "เปิดม่านกว้างกว่า เหมาะกับห้องที่ต้องการแสงธรรมชาติเป็นหลัก",
        detail: "เริ่มลดม่านเมื่อแสงเกิน 600 lux · ต่ำสุดยังเปิด 30%",
        preset: createPreset("natural-light", (preset) => ({
          ...preset,
          name: "แสง · รับแสงมาก",
          light: {
            ...preset.light,
            ranges: [
              { minLux: 0, maxLux: 600, targetPercent: 100 },
              { minLux: 600, maxLux: 1000, targetPercent: 80 },
              { minLux: 1000, maxLux: 1500, targetPercent: 55 },
              { minLux: 1500, maxLux: null, targetPercent: 30 },
            ],
          },
          closedTargetPercent: 30,
        })),
      },
      {
        id: "light-standard",
        name: "มาตรฐาน",
        description: "รับแสงเมื่อแสงน้อย แล้วค่อยลดระดับม่านเมื่อแสงเพิ่มขึ้น",
        detail: "เริ่มลดม่านที่ 500 lux · แสงจ้ามากเหลือ 20%",
        recommended: true,
        preset: createPreset("natural-light", (preset) => ({
          ...preset,
          name: "แสง · มาตรฐาน",
        })),
      },
      {
        id: "light-shade",
        name: "ลดแสงจ้า",
        description: "บังแสงเร็วขึ้น เหมาะกับห้องทำงานที่มีแสงสะท้อนบนหน้าจอ",
        detail: "เริ่มลดม่านที่ 400 lux · แสงจ้ามากเหลือ 15%",
        preset: createPreset("natural-light", (preset) => ({
          ...preset,
          name: "แสง · ลดแสงจ้า",
          light: {
            ...preset.light,
            ranges: [
              { minLux: 0, maxLux: 400, targetPercent: 90 },
              { minLux: 400, maxLux: 700, targetPercent: 65 },
              { minLux: 700, maxLux: 900, targetPercent: 40 },
              { minLux: 900, maxLux: null, targetPercent: 15 },
            ],
          },
          openTargetPercent: 90,
          closedTargetPercent: 15,
        })),
      },
    ],
  },
  {
    id: "balanced",
    name: "สมดุลอัตโนมัติ",
    badge: "ใช้แสงและอุณหภูมิ",
    description: "เลือกสมดุลระหว่างรับแสงกับลดความร้อน",
    tone: "balanced",
    options: [
      {
        id: "balanced-daylight",
        name: "เน้นรับแสง",
        description: "รับแสงธรรมชาติให้มากก่อน และลดม่านเมื่อห้องเริ่มร้อนจริง ๆ",
        detail: "กันร้อนที่ 31°C · ถ้าไม่ร้อนจะปรับตามแสง",
        preset: createPreset("balanced", (preset) => ({
          ...preset,
          name: "สมดุล · เน้นรับแสง",
          temperature: {
            ...preset.temperature,
            closeAtOrAboveCelsius: 31,
            reopenAtOrBelowCelsius: 28,
          },
          light: {
            ...preset.light,
            ranges: [
              { minLux: 0, maxLux: 600, targetPercent: 100 },
              { minLux: 600, maxLux: 900, targetPercent: 75 },
              { minLux: 900, maxLux: 1200, targetPercent: 50 },
              { minLux: 1200, maxLux: null, targetPercent: 25 },
            ],
          },
          openTargetPercent: 100,
          closedTargetPercent: 20,
        })),
      },
      {
        id: "balanced-standard",
        name: "มาตรฐาน",
        description: "ดูทั้งแสงและอุณหภูมิ โดยให้การลดความร้อนมีความสำคัญก่อน",
        detail: "กันร้อนที่ 30°C · ถ้าไม่ร้อนจะปรับตามแสง",
        recommended: true,
        preset: createPreset("balanced", (preset) => ({
          ...preset,
          name: "สมดุล · มาตรฐาน",
        })),
      },
      {
        id: "balanced-cool",
        name: "เน้นลดร้อน",
        description: "ลดม่านเร็วขึ้นเมื่อร้อนหรือแสงจ้า เหมาะกับห้องรับแดดโดยตรง",
        detail: "กันร้อนที่ 29°C · แสงจ้ามากเหลือ 10%",
        preset: createPreset("balanced", (preset) => ({
          ...preset,
          name: "สมดุล · เน้นลดร้อน",
          temperature: {
            ...preset.temperature,
            closeAtOrAboveCelsius: 29,
            reopenAtOrBelowCelsius: 27,
          },
          light: {
            ...preset.light,
            ranges: [
              { minLux: 0, maxLux: 450, targetPercent: 85 },
              { minLux: 450, maxLux: 700, targetPercent: 60 },
              { minLux: 700, maxLux: 900, targetPercent: 35 },
              { minLux: 900, maxLux: null, targetPercent: 10 },
            ],
          },
          openTargetPercent: 85,
          closedTargetPercent: 10,
        })),
      },
    ],
  },
];

export const DEFAULT_USER_AUTO_PRESET_OPTION_ID: UserAutoPresetOptionId =
  "balanced-standard";

export const USER_AUTO_PRESET_OPTIONS = USER_AUTO_PRESET_FAMILIES.flatMap(
  (family) => family.options,
);

export function findUserAutoPresetOption(
  id: UserAutoPresetOptionId | string | null,
): UserAutoPresetOption | null {
  return USER_AUTO_PRESET_OPTIONS.find((option) => option.id === id) ?? null;
}

export function findUserAutoPresetFamilyByOption(
  optionId: UserAutoPresetOptionId,
): UserAutoPresetFamily {
  return (
    USER_AUTO_PRESET_FAMILIES.find((family) =>
      family.options.some((option) => option.id === optionId),
    ) ?? USER_AUTO_PRESET_FAMILIES[2]
  );
}
