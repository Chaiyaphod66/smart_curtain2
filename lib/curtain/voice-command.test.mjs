import test from "node:test";
import assert from "node:assert/strict";
import {
  getCustomVoicePhraseError,
  parseVoiceCommand,
} from "./voice-command.ts";

test("แปลงคำสั่งหยุดแบบสุภาพเป็น STOP", () => {
  assert.deepEqual(parseVoiceCommand("หยุดม่านให้ทีครับ"), {
    type: "stop",
    label: "หยุดม่านทันที",
  });
});

test("แปลงคำสั่งตำแหน่งเป็นเปอร์เซ็นต์ที่กำหนดไว้", () => {
  assert.deepEqual(parseVoiceCommand("เปิดม่าน 50% ค่ะ"), {
    type: "position",
    percent: 50,
    label: "เลื่อนม่านไปที่ 50%",
  });
});

test("รับตัวเลขเปอร์เซ็นต์ที่พูดหรือแปลงเสียงเป็นเลข โดยไม่จำกัดแค่ปุ่ม preset", () => {
  for (const transcript of ["เปิดม่าน 75%", "เปิดม่าน 75 เปอร์เซ็น", "เลื่อนม่าน ๗๕ เปอร์เซ็นต์"]) {
    assert.deepEqual(parseVoiceCommand(transcript), {
      type: "position",
      percent: 75,
      label: "เลื่อนม่านไปที่ 75%",
    });
  }

  assert.deepEqual(parseVoiceCommand("ตั้งม่าน 43%"), {
    type: "position",
    percent: 43,
    label: "เลื่อนม่านไปที่ 43%",
  });

  for (const [transcript, expectedPercent] of [
    ["ช่วยเปิดม่าน 75% หน่อยครับ", 75],
    ["ปรับม่านไว้ที่ 40% ค่ะ", 40],
  ]) {
    assert.deepEqual(parseVoiceCommand(transcript), {
      type: "position",
      percent: expectedPercent,
      label: `เลื่อนม่านไปที่ ${expectedPercent}%`,
    });
  }
});

test("กรองตัวเลขกำกวม คำสั่งปฏิเสธ และคำสั่งที่ไม่ได้กำหนด", () => {
  for (const transcript of ["เปิดม่าน 101%", "เปิดม่าน -5%", "เปิดม่าน 7.5%", "เปิดม่านหลายเปอร์เซ็นต์", "ปิดม่าน 75%", "เปิดม่าน 75% แล้วปิด", "75%", "ไม่ต้องเปิดม่าน", "อย่าปิดม่าน"] ) {
    assert.equal(parseVoiceCommand(transcript), null, transcript);
  }
});

test("แปลงคำสั่ง Auto เป็น preset สำเร็จรูป", () => {
  assert.deepEqual(parseVoiceCommand("ออโต้ตามแสง"), {
    type: "auto-preset",
    optionId: "light-standard",
    label: "ใช้ Auto ตามแสงแบบมาตรฐาน",
  });
});

test("ไม่เดาคำสั่งที่ไม่ได้กำหนดไว้", () => {
  assert.equal(parseVoiceCommand("ช่วยทำให้ห้องสบายหน่อย"), null);
});

test("ใช้วลีที่ผู้ใช้เพิ่มเองได้โดยยังคืนคำสั่งแบบปลอดภัย", () => {
  const aliases = [
    {
      id: "alias-1",
      phrase: "รับแสงอ่านหนังสือ",
      command: {
        type: "position",
        percent: 65,
        label: "เลื่อนม่านไปที่ 65%",
      },
    },
  ];

  assert.deepEqual(parseVoiceCommand("รับแสงอ่านหนังสือครับ", aliases), {
    type: "position",
    percent: 65,
    label: "เลื่อนม่านไปที่ 65%",
  });
  assert.equal(parseVoiceCommand("ไม่ต้องรับแสงอ่านหนังสือ", aliases), null);
});

test("ไม่ให้วลีที่เพิ่มเองชนกับคำสั่งมาตรฐานหรือวลีเดิม", () => {
  const aliases = [
    {
      id: "alias-1",
      phrase: "รับแสงอ่านหนังสือ",
      command: { type: "position", percent: 65, label: "เลื่อนม่านไปที่ 65%" },
    },
  ];

  assert.match(getCustomVoicePhraseError("เปิดม่าน", aliases), /มาตรฐาน/);
  assert.match(getCustomVoicePhraseError("รับแสงอ่านหนังสือครับ", aliases), /เพิ่มไว้แล้ว/);
  assert.match(getCustomVoicePhraseError("อย่าเปิดม่าน", aliases), /ปฏิเสธ/);
  assert.equal(getCustomVoicePhraseError("รับแดดยามเช้า", aliases), null);
});
