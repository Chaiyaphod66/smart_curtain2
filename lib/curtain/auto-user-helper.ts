import type { DeviceAutoStatus } from "@/types/device";
import {
  findUserAutoPresetOption,
  type UserAutoPresetOptionId,
} from "./user-auto-presets.ts";

export type AutoPhaseDetails = {
  key: string;
  badgeLabel: string;
  title: string;
  description: string;
  tone:
    | "active"
    | "confirming"
    | "cooldown"
    | "holding"
    | "waiting"
    | "blocked"
    | "fault"
    | "disabled";
};

export function translateAutoReason(
  reason: string | null | undefined,
): string {
  if (!reason || !reason.trim()) {
    return "ประเมินตามค่าเซ็นเซอร์ปัจจุบัน";
  }

  const r = reason.toLowerCase();

  if (r.includes("wi-fi disconnected; manual mode required")) {
    return "Wi-Fi ของ ESP32 หลุด ระบบหยุดและกลับ Manual เพื่อความปลอดภัย";
  }
  if (r.includes("esp32 restarted; manual mode required")) {
    return "ESP32 เริ่มทำงานใหม่ ระบบจึงกลับ Manual และรอให้ผู้ใช้เปิด Auto อีกครั้ง";
  }

  if (r.includes("model a holds because the room is hot but dark")) {
    return "ห้องร้อนแต่แสงน้อย Model A จึงคงตำแหน่งม่าน";
  }
  if (r.includes("model a light level is inside the acceptable band")) {
    return "แสงอยู่ในช่วงที่ Model A ยอมรับได้ จึงคงตำแหน่งเดิม";
  }
  if (r.includes("model a opens one step")) {
    return "แสงน้อย Model A เตรียมเปิดม่านทีละขั้น";
  }
  if (r.includes("model a closes one step")) {
    return "แสงเกินเกณฑ์ของอุณหภูมิ Model A เตรียมปิดม่านทีละขั้น";
  }
  if (r.includes("model a requires homing")) {
    return "ต้อง Homing หลังเปิดเครื่องก่อนให้ Model A ขยับม่าน";
  }
  if (r.includes("waiting for model a cooldown")) {
    return "Model A กำลังพักก่อนประเมินรอบใหม่";
  }

  if (r.includes("not been saved")) {
    return "ยังไม่ได้บันทึกการตั้งค่า Auto";
  }
  if (r.includes("waiting for a fresh sensor reading")) {
    return "กำลังรอข้อมูลเซ็นเซอร์รอบใหม่";
  }
  if (r.includes("waiting for temperature data")) {
    return "กำลังรอข้อมูลอุณหภูมิจากเซ็นเซอร์";
  }
  if (r.includes("waiting for light data")) {
    return "กำลังรอข้อมูลความเข้มแสงจากเซ็นเซอร์";
  }
  if (r.includes("reached the close threshold")) {
    return "อุณหภูมิสูงถึงเกณฑ์ จึงเตรียมปิดม่าน";
  }
  if (r.includes("reached the reopen threshold")) {
    return "อุณหภูมิลดลงถึงเกณฑ์ จึงเตรียมเปิดม่านกลับ";
  }
  if (r.includes("inside the hold band")) {
    return "อุณหภูมิอยู่ในเกณฑ์ปกติ คงตำแหน่งเดิม";
  }
  if (r.includes("matched configured range")) {
    return "ระดับแสงตรงตามช่วงที่กำหนดไว้";
  }
  if (r.includes("no configured light range matched")) {
    return "ระดับแสงไม่อยู่ในเงื่อนไขที่กำหนด";
  }
  if (
    r.includes("movement completed; cooldown started") ||
    r.includes("waiting for auto cooldown")
  ) {
    return "ขยับม่านเสร็จแล้ว กำลังพักคำสั่งก่อนอ่านค่าใหม่";
  }
  if (r.includes("position command is active")) {
    return "กำลังสั่งม่านไปยังตำแหน่งเป้าหมาย";
  }
  if (r.includes("motor fault")) {
    return "ตรวจพบข้อผิดพลาดที่มอเตอร์ ระบบจึงหยุดชั่วคราว";
  }
  if (
    r.includes("minimum resolution") ||
    r.includes("stopped after reversing at minimum step")
  ) {
    return "ขยับแบบนุ่มนวลถึงระยะต่ำสุดแล้ว หยุดพักเพื่อลดการแกว่ง";
  }
  if (r.includes("gentle response requires an encoder")) {
    return "ต้องคาลิเบรต Encoder ก่อนใช้การขยับแบบนุ่มนวล";
  }

  return reason;
}

export function getAutoPhaseDetails(
  phase: DeviceAutoStatus["phase"] | undefined,
  status: DeviceAutoStatus | null,
): AutoPhaseDetails {
  switch (phase) {
    case "confirming": {
      const current = status?.confirmationCount ?? 0;
      const required = status?.confirmationRequired ?? 3;
      return {
        key: "confirming",
        badgeLabel: `ยืนยันค่า (${current}/${required})`,
        title: "กำลังยืนยันอ่านค่าเซ็นเซอร์",
        description: `อ่านค่าตรงเกณฑ์แล้ว ${current}/${required} ครั้ง เพื่อความแม่นยำก่อนขยับม่าน`,
        tone: "confirming",
      };
    }

    case "moving": {
      const target =
        typeof status?.candidateTargetPercent === "number"
          ? status.candidateTargetPercent
          : status?.lastCommandTargetPercent;
      return {
        key: "moving",
        badgeLabel: "กำลังขยับม่าน",
        title: "ม่านกำลังเคลื่อนที่",
        description:
          typeof target === "number"
            ? `กำลังเลื่อนม่านไปยังเป้าหมาย ${Math.round(target)}%`
            : "มอเตอร์กำลังปรับตำแหน่งม่านอัตโนมัติ",
        tone: "active",
      };
    }

    case "cooldown": {
      const seconds = status?.cooldownRemainingSeconds ?? 0;
      return {
        key: "cooldown",
        badgeLabel: `พักคำสั่ง (${seconds}s)`,
        title: "กำลังพักรอรอบถัดไป",
        description:
          seconds > 0
            ? `ม่านขยับเสร็จแล้ว พักอีก ${seconds} วินาทีก่อนอ่านค่าใหม่เพื่อถนอมมอเตอร์`
            : "ม่านขยับเสร็จแล้ว กำลังเตรียมพร้อมอ่านค่ารอบใหม่",
        tone: "cooldown",
      };
    }

    case "holding":
      return {
        key: "holding",
        badgeLabel: "คงตำแหน่ง",
        title: "ตำแหน่งม่านเหมาะสมแล้ว",
        description: "สภาวะแสงและอุณหภูมิอยู่ในเกณฑ์ที่กำหนด ม่านจึงคงอยู่ที่เดิม",
        tone: "holding",
      };

    case "waiting":
      return {
        key: "waiting",
        badgeLabel: "พร้อมตรวจวัด",
        title: "พร้อมประเมินสถานการณ์",
        description: "กำลังรอข้อมูลเซ็นเซอร์รอบใหม่จากภายในห้อง",
        tone: "waiting",
      };

    case "blocked":
      return {
        key: "blocked",
        badgeLabel: "ติดเซฟตี้",
        title: "ระงับคำสั่งชั่วคราว",
        description: "ระบบความปลอดภัย ลิมิตสวิตช์ หรือมอเตอร์กำลังระงับการทำงาน",
        tone: "blocked",
      };

    case "fault":
      return {
        key: "fault",
        badgeLabel: "ผิดปกติ",
        title: "หยุดทำงานเพราะข้อผิดพลาด",
        description: "พบข้อผิดพลาดที่มอเตอร์ กรุณาตรวจสอบหรือกดปุ่ม STOP",
        tone: "fault",
      };

    case "resolution-limited":
      return {
        key: "resolution-limited",
        badgeLabel: "หยุดเพื่อความปลอดภัย",
        title: "Model A หยุดหลังกลับทิศถึง Step ต่ำสุด",
        description: "ตรวจตำแหน่งและสภาพแวดล้อมก่อนเปิด Auto ใหม่",
        tone: "blocked",
      };

    case "dry-run":
    case "dry-run-ready":
      return {
        key: "dry-run",
        badgeLabel: "ทดสอบอ่านค่า",
        title: "โหมดทดสอบอ่านค่า (Dry Run)",
        description: "กำลังประเมินสถานการณ์เซ็นเซอร์โดยยังไม่สั่งหมุนมอเตอร์จริง",
        tone: "waiting",
      };

    case "disabled":
    case "not-configured":
    default:
      return {
        key: "disabled",
        badgeLabel: "ปิดอยู่",
        title: "ระบบ Auto ปิดอยู่",
        description: "ควบคุมม่านแบบ Manual ด้วยตัวคุณเอง",
        tone: "disabled",
      };
  }
}

export function getAutoPresetDisplayName(
  presetId: string | null | undefined,
  optionId?: UserAutoPresetOptionId | string | null,
): string {
  if (optionId) {
    const opt = findUserAutoPresetOption(optionId);
    if (opt) {
      if (!presetId || opt.preset.id === presetId) {
        return opt.name;
      }
    }
  }

  if (!presetId) return "อัตโนมัติ";
  if (presetId === "heat-protection") return "ตามอุณหภูมิ";
  if (presetId === "natural-light") return "ตามแสงธรรมชาติ";
  if (presetId === "balanced") return "สมดุลแสงและความร้อน";
  if (presetId === "custom") return "ชุดกำหนดเอง (Dev)";
  if (presetId === "model-a") return "Model A ฉบับเต็ม";
  return presetId;
}

export function getAutoResponseStyleLabel(
  style: "standard" | "gentle" | undefined | null,
): string {
  return style === "gentle" ? "นุ่มนวล" : "มาตรฐาน";
}
