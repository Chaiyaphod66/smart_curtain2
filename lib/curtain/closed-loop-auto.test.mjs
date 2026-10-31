import test from "node:test";
import assert from "node:assert/strict";
import {
  INITIAL_CLOSED_LOOP_AUTO_STATE,
  advanceClosedLoopAuto,
  getTemperatureBandWithHysteresis,
  resetClosedLoopAutoState,
} from "./closed-loop-auto.ts";

function reading(temperatureCelsius, lightLux, recordedAt = "sample-1") {
  return {
    temperatureCelsius,
    humidityPercent: 60,
    lightLux,
    recordedAt,
  };
}

function advance(
  state,
  temperatureCelsius,
  lightLux,
  currentPositionPercent = 50,
) {
  return advanceClosedLoopAuto(state, {
    reading: reading(temperatureCelsius, lightLux),
    currentPositionPercent,
  });
}

test("temperature band hysteresis จำสถานะข้ามการอ่าน", () => {
  let band = getTemperatureBandWithHysteresis(25.9, null);
  assert.equal(band, 0);

  band = getTemperatureBandWithHysteresis(26.2, band);
  assert.equal(band, 0, "ยังไม่ข้าม 26.5°C");

  band = getTemperatureBandWithHysteresis(26.6, band);
  assert.equal(band, 1);

  band = getTemperatureBandWithHysteresis(25.8, band);
  assert.equal(band, 1, "ยังไม่ต่ำกว่า 25.5°C");

  band = getTemperatureBandWithHysteresis(25.4, band);
  assert.equal(band, 0);
});

test("อากาศร้อนและแสงเกินงบต้องเสนอปิดทีละ 15%", () => {
  const result = advance(
    INITIAL_CLOSED_LOOP_AUTO_STATE,
    32,
    1200,
    80,
  );

  assert.equal(result.action, "close-step");
  assert.equal(result.highLux, 600);
  assert.equal(result.stepPercent, 15);
  assert.equal(result.targetPercent, 65);
});

test("ร้อนแต่มืดต้องคงตำแหน่ง ไม่ปิดจากอุณหภูมิเพียงอย่างเดียว", () => {
  const result = advance(
    INITIAL_CLOSED_LOOP_AUTO_STATE,
    32,
    100,
    80,
  );

  assert.equal(result.action, "hold");
  assert.equal(result.targetPercent, null);
  assert.match(result.reasons.join(" "), /ร้อน \+ มืด/);
});

test("แสงน้อยในอุณหภูมิปกติต้องเสนอเปิดทีละหนึ่ง step", () => {
  const result = advance(
    INITIAL_CLOSED_LOOP_AUTO_STATE,
    27,
    100,
    50,
  );

  assert.equal(result.action, "open-step");
  assert.equal(result.targetPercent, 65);
});

test("แสงอยู่ในงบต้องคงตำแหน่ง", () => {
  const result = advance(
    INITIAL_CLOSED_LOOP_AUTO_STATE,
    29,
    800,
    50,
  );

  assert.equal(result.action, "hold");
  assert.equal(result.highLux, 1500);
});

test("เซ็นเซอร์ที่จำเป็นหายต้องไม่สร้างเป้าหมาย", () => {
  const missingTemperature = advance(
    INITIAL_CLOSED_LOOP_AUTO_STATE,
    null,
    800,
  );
  assert.equal(missingTemperature.action, "waiting");
  assert.equal(missingTemperature.targetPercent, null);

  const missingLight = advance(
    INITIAL_CLOSED_LOOP_AUTO_STATE,
    29,
    null,
  );
  assert.equal(missingLight.action, "waiting");
  assert.equal(missingLight.targetPercent, null);
});

test("มีทิศทางแต่ไม่มี Encoder ต้องไม่สร้างตำแหน่งเป้าหมาย", () => {
  const result = advance(
    INITIAL_CLOSED_LOOP_AUTO_STATE,
    32,
    1200,
    null,
  );

  assert.equal(result.action, "waiting");
  assert.equal(result.targetPercent, null);
  assert.match(result.reasons.join(" "), /Encoder/);
});

test("กลับทิศต้องลด step และหยุดเมื่อถึง resolution limit", () => {
  let result = advance(
    INITIAL_CLOSED_LOOP_AUTO_STATE,
    27,
    3000,
    80,
  );
  assert.equal(result.action, "close-step");
  assert.equal(result.stepPercent, 15);

  result = advance(result.state, 27, 100, 65);
  assert.equal(result.action, "open-step");
  assert.equal(result.stepPercent, 7);

  result = advance(result.state, 27, 3000, 72);
  assert.equal(result.action, "close-step");
  assert.equal(result.stepPercent, 5);

  result = advance(result.state, 27, 100, 67);
  assert.equal(result.action, "hold");
  assert.equal(result.state.resolutionLimited, true);

  const latched = advance(result.state, 27, 3000, 67);
  assert.equal(latched.action, "hold");
  assert.equal(latched.state.resolutionLimited, true);
});

test("reset ล้าง hysteresis ทิศทาง และ resolution limit", () => {
  const reset = resetClosedLoopAutoState();

  assert.deepEqual(reset, INITIAL_CLOSED_LOOP_AUTO_STATE);
});

test("ตำแหน่งเป้าหมายต้องไม่เกินช่วง 0–100%", () => {
  const atOpenLimit = advance(
    INITIAL_CLOSED_LOOP_AUTO_STATE,
    27,
    100,
    100,
  );
  assert.equal(atOpenLimit.action, "hold");

  const atClosedLimit = advance(
    INITIAL_CLOSED_LOOP_AUTO_STATE,
    32,
    1200,
    0,
  );
  assert.equal(atClosedLimit.action, "hold");
});
