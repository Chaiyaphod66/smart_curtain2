import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_AUTO_PRESETS,
  evaluateAutoPreset,
} from "./auto-preset.ts";

function getPreset(id) {
  const preset = DEFAULT_AUTO_PRESETS.find(
    (candidate) => candidate.id === id,
  );

  assert.ok(preset, `ไม่พบ preset: ${id}`);
  return structuredClone(preset);
}

function createReading({
  temperatureCelsius = 27,
  lightLux = 400,
} = {}) {
  return {
    temperatureCelsius,
    humidityPercent: 60,
    lightLux,
    recordedAt: new Date(0).toISOString(),
  };
}

test("preset กันความร้อนเสนอให้ปิดเมื่ออุณหภูมิถึงเกณฑ์", () => {
  const result = evaluateAutoPreset(
    getPreset("heat-protection"),
    createReading({ temperatureCelsius: 31 }),
  );

  assert.equal(result.action, "close");
  assert.equal(result.targetPercent, 10);
});

test("preset กันความร้อนเสนอให้เปิดเมื่ออุณหภูมิลดถึงเกณฑ์", () => {
  const result = evaluateAutoPreset(
    getPreset("heat-protection"),
    createReading({ temperatureCelsius: 27 }),
  );

  assert.equal(result.action, "open");
  assert.equal(result.targetPercent, 100);
});

test("อุณหภูมิระหว่างเกณฑ์ปิดและเปิดกลับต้องคงตำแหน่งเดิม", () => {
  const result = evaluateAutoPreset(
    getPreset("heat-protection"),
    createReading({ temperatureCelsius: 29 }),
  );

  assert.equal(result.action, "hold");
  assert.equal(result.targetPercent, null);
});

test("อุณหภูมิสูงต้องปิดเหนือกฎหลายช่วงแสง", () => {
  const result = evaluateAutoPreset(
    getPreset("balanced"),
    createReading({ temperatureCelsius: 31, lightLux: 200 }),
  );

  assert.equal(result.action, "close");
  assert.equal(result.targetPercent, 15);
  assert.match(result.reasons.join(" "), /เหนือกฎช่วงแสง/);
});

test("preset สมดุลเปิดเมื่อแสงอยู่ช่วงต่ำสุดและอุณหภูมิปลอดภัย", () => {
  const result = evaluateAutoPreset(
    getPreset("balanced"),
    createReading({ temperatureCelsius: 27, lightLux: 550 }),
  );

  assert.equal(result.action, "open");
  assert.equal(result.targetPercent, 90);
});

test("preset สมดุลปรับตำแหน่งกลางตามช่วงแสง", () => {
  const result = evaluateAutoPreset(
    getPreset("balanced"),
    createReading({ temperatureCelsius: 27, lightLux: 720 }),
  );

  assert.equal(result.action, "adjust");
  assert.equal(result.targetPercent, 65);
});

test("ค่าที่ขอบช่วงต้องเข้าช่วงถัดไปโดยไม่ซ้อนกัน", () => {
  const preset = getPreset("natural-light");
  const belowBoundary = evaluateAutoPreset(
    preset,
    createReading({ lightLux: 499 }),
  );
  const atBoundary = evaluateAutoPreset(
    preset,
    createReading({ lightLux: 500 }),
  );

  assert.equal(belowBoundary.targetPercent, 100);
  assert.equal(atBoundary.targetPercent, 75);
});

test("ช่วงแสงสุดท้ายต้องรองรับค่าที่สูงกว่าทั้งหมด", () => {
  const result = evaluateAutoPreset(
    getPreset("natural-light"),
    createReading({ lightLux: 50000 }),
  );

  assert.equal(result.action, "close");
  assert.equal(result.targetPercent, 20);
});

test("รอข้อมูลเมื่อเซ็นเซอร์ที่เปิดใช้ไม่มีค่า", () => {
  const result = evaluateAutoPreset(
    getPreset("balanced"),
    createReading({ lightLux: null }),
  );

  assert.equal(result.action, "waiting");
  assert.equal(result.targetPercent, null);
});

test("ช่วงแสงที่ไม่ต่อกันต้องไม่สร้างคำสั่ง", () => {
  const preset = getPreset("custom");
  preset.light.ranges[1].minLux = 500;

  const result = evaluateAutoPreset(preset, createReading());

  assert.equal(result.action, "waiting");
  assert.match(result.reasons.join(" "), /ต้องต่อกันพอดี/);
});

test("แสงมากขึ้นแต่ตั้งให้ม่านเปิดเพิ่มต้องไม่สร้างคำสั่ง", () => {
  const preset = getPreset("custom");
  preset.light.ranges[1].targetPercent = 90;

  const result = evaluateAutoPreset(preset, createReading());

  assert.equal(result.action, "waiting");
  assert.match(result.reasons.join(" "), /ต้องไม่เปิดเพิ่ม/);
});

test("จำนวนช่วงแสงเกินขีดจำกัดต้องไม่สร้างคำสั่ง", () => {
  const preset = getPreset("custom");
  preset.light.ranges.push(
    { minLux: 1500, maxLux: 1800, targetPercent: 20 },
    { minLux: 1800, maxLux: null, targetPercent: 10 },
  );

  const result = evaluateAutoPreset(preset, createReading());

  assert.equal(result.action, "waiting");
  assert.match(result.reasons.join(" "), /2–5 ช่วง/);
});
