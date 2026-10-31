import type { AutoPresetId } from "@/types/auto-preset";

export type AutoPresetGuide = {
  badge: string;
  summary: string;
  highlights: readonly [string, string];
  tone: "temperature" | "light" | "balanced" | "custom";
};

export const AUTO_PRESET_GUIDES: Record<
  AutoPresetId,
  AutoPresetGuide
> = {
  "heat-protection": {
    badge: "ไม่ต้องใช้ค่าแสง",
    summary:
      "เหมาะเมื่ออยากให้ม่านตอบสนองตามความร้อนในห้องเป็นหลัก",
    highlights: [
      "ห้องเริ่มร้อน ระบบเสนอให้ปิดม่าน",
      "อากาศเย็นลง ระบบเสนอให้เปิดกลับ",
    ],
    tone: "temperature",
  },
  "natural-light": {
    badge: "ไม่ต้องรู้ค่า lux",
    summary:
      "เหมาะเมื่ออยากรับแสงธรรมชาติ และลดแสงจ้าโดยอัตโนมัติ",
    highlights: [
      "แสงน้อย เปิดม่านให้มากขึ้น",
      "แสงจ้า ค่อย ๆ ลดระดับม่าน",
    ],
    tone: "light",
  },
  balanced: {
    badge: "แนะนำสำหรับเริ่มต้น",
    summary:
      "ใช้ทั้งอุณหภูมิและแสง โดยให้การป้องกันความร้อนมาก่อน",
    highlights: [
      "ร้อนมาก ปิดม่านก่อนแม้แสงกำลังดี",
      "ถ้าไม่ร้อน ปรับม่านตามระดับแสง",
    ],
    tone: "balanced",
  },
  custom: {
    badge: "สำหรับผู้ใช้ขั้นสูง",
    summary:
      "ปรับอุณหภูมิ ช่วงแสง และตำแหน่งม่านได้ละเอียดในหน้า Dev",
    highlights: [
      "กำหนดพฤติกรรมให้ตรงกับห้องของคุณ",
      "คืนค่าแนะนำได้ทุกเมื่อ",
    ],
    tone: "custom",
  },
};
