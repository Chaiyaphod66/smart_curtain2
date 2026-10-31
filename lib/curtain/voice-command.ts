import type { UserAutoPresetOptionId } from "./user-auto-presets.ts";

export type VoiceCommand =
  | { type: "stop"; label: string }
  | { type: "manual-mode"; label: string }
  | { type: "position"; percent: number; label: string }
  | { type: "model-a"; label: string }
  | {
      type: "auto-preset";
      optionId: UserAutoPresetOptionId;
      label: string;
    };

export type CustomVoiceCommandAlias = {
  id: string;
  phrase: string;
  command: VoiceCommand;
};

type VoiceCommandDefinition = {
  command: VoiceCommand;
  phrases: readonly string[];
};

export const VOICE_COMMAND_DEFINITIONS: readonly VoiceCommandDefinition[] = [
  {
    command: { type: "stop", label: "หยุดม่านทันที" },
    phrases: ["หยุด", "หยุดม่าน", "หยุดฉุกเฉิน", "พอแล้ว"],
  },
  {
    command: { type: "manual-mode", label: "เปลี่ยนเป็นโหมด Manual" },
    phrases: ["โหมดแมนนวล", "แมนนวล", "manual"],
  },
  {
    command: { type: "position", percent: 100, label: "เปิดม่าน 100%" },
    phrases: ["เปิดม่าน", "เปิดม่านสุด", "เปิดม่าน 100%"],
  },
  {
    command: { type: "position", percent: 75, label: "เปิดม่าน 75%" },
    phrases: ["เปิดม่าน 75%", "ม่าน 75%"],
  },
  {
    command: { type: "position", percent: 50, label: "เปิดม่าน 50%" },
    phrases: ["เปิดม่าน 50%", "ม่าน 50%"],
  },
  {
    command: { type: "position", percent: 25, label: "เปิดม่าน 25%" },
    phrases: ["เปิดม่าน 25%", "ม่าน 25%"],
  },
  {
    command: { type: "position", percent: 0, label: "ปิดม่าน 0%" },
    phrases: ["ปิดม่าน", "ปิดม่านสุด", "ปิดม่าน 0%"],
  },
  {
    command: {
      type: "auto-preset",
      optionId: "heat-standard",
      label: "ใช้ Auto ตามอุณหภูมิแบบมาตรฐาน",
    },
    phrases: ["ออโต้ตามอุณหภูมิ", "ออโต้กันร้อน", "auto ตามอุณหภูมิ"],
  },
  {
    command: {
      type: "auto-preset",
      optionId: "light-standard",
      label: "ใช้ Auto ตามแสงแบบมาตรฐาน",
    },
    phrases: ["ออโต้ตามแสง", "auto ตามแสง"],
  },
  {
    command: {
      type: "auto-preset",
      optionId: "balanced-standard",
      label: "ใช้ Auto สมดุลแบบมาตรฐาน",
    },
    phrases: ["ออโต้สมดุล", "เปิดออโต้", "auto สมดุล"],
  },
  {
    command: { type: "model-a", label: "ใช้ Auto แบบ Model A" },
    phrases: ["เปิดโมเดลเอ", "ใช้โมเดลเอ", "ออโต้โมเดลเอ", "model a"],
  },
];

function normalizeThaiDigits(value: string): string {
  return value.replace(/[๐-๙]/g, (digit) =>
    String(digit.charCodeAt(0) - "๐".charCodeAt(0)),
  );
}

function stripSpokenFillers(value: string): string {
  let normalized = value;
  const prefix = /^(?:ช่วย|กรุณา|รบกวน|ขอ|อยากให้)/;
  const suffix = /(?:ครับ|ค่ะ|คะ|หน่อย|ให้ที|ได้ไหม|ด้วย|นะ|จ้า|จ๊ะ|ที|สิ|ซิ|เลย|ตอนนี้|ทันที)$/;

  while (prefix.test(normalized)) normalized = normalized.replace(prefix, "");
  while (suffix.test(normalized)) normalized = normalized.replace(suffix, "");

  return normalized;
}

export function normalizeVoiceTranscript(value: string): string {
  const normalized = normalizeThaiDigits(value)
    .normalize("NFKC")
    .toLocaleLowerCase("th-TH")
    .replace(/%/g, "เปอร์เซ็นต์")
    .replace(/เปอร์เซ็นต์|เปอร์เซ็นท์|เปอร์เซ็น|เปอร์เซนต์|เปอร์เซน/g, "เปอร์เซ็นต์")
    .replace(/โหมดอัตโนมัติ/g, "ออโต้")
    .replace(/[,.!?;:()\[\]{}'"ๆ]/g, " ")
    .replace(/\s+/g, "")
    .trim();

  return stripSpokenFillers(normalized);
}

function containsNegation(value: string): boolean {
  const normalized = normalizeThaiDigits(value)
    .normalize("NFKC")
    .toLocaleLowerCase("th-TH")
    .replace(/\s+/g, "");

  return /(?:ไม่ต้อง|อย่า|ห้าม|ไม่ให้)/.test(normalized);
}

function parsePositionCommand(normalized: string): VoiceCommand | null {
  const withoutPercent = normalized.replace(/เปอร์เซ็นต์$/, "");
  const match = /^(?:เปิด|เลื่อน|ตั้ง|ปรับ)(?:ผ้า)?ม่าน(?:(?:ไป)?ที่|ไว้ที่|เป็น)?(.+)$/.exec(
    withoutPercent,
  );
  if (!match) return null;

  const rawPosition = match[1];
  if (!/^\d{1,3}$/.test(rawPosition)) return null;
  const percent = Number(rawPosition);

  if (percent < 0 || percent > 100) return null;

  return {
    type: "position",
    percent,
    label: `เลื่อนม่านไปที่ ${percent}%`,
  };
}

export function parseVoiceCommand(
  transcript: string,
  customAliases: readonly CustomVoiceCommandAlias[] = [],
): VoiceCommand | null {
  const withArabicDigits = normalizeThaiDigits(transcript);

  // Do not turn decimals into a different integer after punctuation cleanup.
  if (/\d\s*[.,]\s*\d/.test(withArabicDigits) || containsNegation(withArabicDigits)) {
    return null;
  }

  const normalized = normalizeVoiceTranscript(withArabicDigits);
  if (!normalized) return null;

  const positionCommand = parsePositionCommand(normalized);
  if (positionCommand) return positionCommand;

  for (const definition of VOICE_COMMAND_DEFINITIONS) {
    if (
      definition.phrases.some(
        (phrase) => normalizeVoiceTranscript(phrase) === normalized,
      )
    ) {
      return definition.command;
    }
  }

  const customAlias = customAliases.find(
    (alias) => normalizeVoiceTranscript(alias.phrase) === normalized,
  );
  return customAlias?.command ?? null;
}

export function getCustomVoicePhraseError(
  phrase: string,
  existingAliases: readonly CustomVoiceCommandAlias[],
): string | null {
  const normalized = normalizeVoiceTranscript(phrase);

  if (normalized.length < 2) return "กรุณาใส่วลีอย่างน้อย 2 ตัวอักษร";
  if (normalized.length > 60) return "วลียาวเกินไป กรุณาใช้ไม่เกิน 60 ตัวอักษร";
  if (containsNegation(phrase)) return "ไม่อนุญาตให้ใช้วลีปฏิเสธ เช่น “อย่า” หรือ “ไม่ต้อง”";
  if (parseVoiceCommand(phrase)) return "วลีนี้ตรงกับคำสั่งมาตรฐานที่มีอยู่แล้ว";
  if (
    existingAliases.some(
      (alias) => normalizeVoiceTranscript(alias.phrase) === normalized,
    )
  ) {
    return "วลีนี้ถูกเพิ่มไว้แล้ว";
  }

  return null;
}
