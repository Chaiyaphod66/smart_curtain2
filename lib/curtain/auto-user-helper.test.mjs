import test from "node:test";
import assert from "node:assert/strict";
import {
  translateAutoReason,
  getAutoPhaseDetails,
  getAutoPresetDisplayName,
  getAutoResponseStyleLabel,
} from "./auto-user-helper.ts";

test("translateAutoReason แปลเหตุผลทางเทคนิคเป็นภาษาไทยเข้าใจง่าย", () => {
  assert.equal(
    translateAutoReason("Waiting for a fresh sensor reading"),
    "กำลังรอข้อมูลเซ็นเซอร์รอบใหม่",
  );
  assert.equal(
    translateAutoReason("Temperature reached the close threshold"),
    "อุณหภูมิสูงถึงเกณฑ์ จึงเตรียมปิดม่าน",
  );
  assert.equal(
    translateAutoReason("Temperature reached the reopen threshold"),
    "อุณหภูมิลดลงถึงเกณฑ์ จึงเตรียมเปิดม่านกลับ",
  );
  assert.equal(
    translateAutoReason("Temperature is inside the hold band"),
    "อุณหภูมิอยู่ในเกณฑ์ปกติ คงตำแหน่งเดิม",
  );
  assert.equal(
    translateAutoReason("Auto movement completed; cooldown started"),
    "ขยับม่านเสร็จแล้ว กำลังพักคำสั่งก่อนอ่านค่าใหม่",
  );
  assert.equal(
    translateAutoReason("Gentle response is paused at minimum resolution"),
    "ขยับแบบนุ่มนวลถึงระยะต่ำสุดแล้ว หยุดพักเพื่อลดการแกว่ง",
  );
  assert.equal(
    translateAutoReason("Wi-Fi disconnected; Manual mode required"),
    "Wi-Fi ของ ESP32 หลุด ระบบหยุดและกลับ Manual เพื่อความปลอดภัย",
  );
  assert.equal(
    translateAutoReason("ESP32 restarted; Manual mode required"),
    "ESP32 เริ่มทำงานใหม่ ระบบจึงกลับ Manual และรอให้ผู้ใช้เปิด Auto อีกครั้ง",
  );
  assert.equal(
    translateAutoReason(null),
    "ประเมินตามค่าเซ็นเซอร์ปัจจุบัน",
  );
});

test("getAutoPhaseDetails แปลง phase และข้อมูล status ให้เข้าใจง่าย", () => {
  const confirming = getAutoPhaseDetails("confirming", {
    confirmationCount: 2,
    confirmationRequired: 3,
  });
  assert.equal(confirming.title, "กำลังยืนยันอ่านค่าเซ็นเซอร์");
  assert.equal(confirming.badgeLabel, "ยืนยันค่า (2/3)");
  assert.equal(confirming.tone, "confirming");

  const cooldown = getAutoPhaseDetails("cooldown", {
    cooldownRemainingSeconds: 45,
  });
  assert.equal(cooldown.title, "กำลังพักรอรอบถัดไป");
  assert.equal(cooldown.badgeLabel, "พักคำสั่ง (45s)");
  assert.equal(cooldown.tone, "cooldown");

  const moving = getAutoPhaseDetails("moving", {
    candidateTargetPercent: 70,
  });
  assert.equal(moving.title, "ม่านกำลังเคลื่อนที่");
  assert.equal(moving.tone, "active");

  const disabled = getAutoPhaseDetails("disabled", null);
  assert.equal(disabled.title, "ระบบ Auto ปิดอยู่");
  assert.equal(disabled.tone, "disabled");
});

test("getAutoPresetDisplayName และ getAutoResponseStyleLabel แสดงชื่อพรีเซ็ตและสไตล์ถูกต้อง", () => {
  assert.equal(getAutoPresetDisplayName("heat-protection"), "ตามอุณหภูมิ");
  assert.equal(getAutoPresetDisplayName("natural-light"), "ตามแสงธรรมชาติ");
  assert.equal(getAutoPresetDisplayName("balanced"), "สมดุลแสงและความร้อน");
  assert.equal(getAutoPresetDisplayName("model-a"), "Model A ฉบับเต็ม");
  assert.equal(getAutoResponseStyleLabel("gentle"), "นุ่มนวล");
  assert.equal(getAutoResponseStyleLabel("standard"), "มาตรฐาน");
});
