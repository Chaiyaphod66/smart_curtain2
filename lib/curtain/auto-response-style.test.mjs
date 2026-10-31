import test from "node:test";
import assert from "node:assert/strict";
import {
  GENTLE_MAX_STEP_PERCENT,
  getAutoResponseTarget,
} from "./auto-response-style.ts";

test("standard ส่งเป้าหมายเต็มในครั้งเดียว", () => {
  assert.deepEqual(getAutoResponseTarget("standard", 80, 20), {
    targetPercent: 80,
    desiredTargetPercent: 80,
    stepPercent: null,
    limited: false,
  });
});

test("gentle จำกัดการเปิดไม่เกิน 15% ต่อรอบ", () => {
  const result = getAutoResponseTarget("gentle", 90, 20);

  assert.equal(result.targetPercent, 35);
  assert.equal(result.stepPercent, GENTLE_MAX_STEP_PERCENT);
  assert.equal(result.limited, true);
});

test("gentle จำกัดการปิดไม่เกิน 15% ต่อรอบ", () => {
  const result = getAutoResponseTarget("gentle", 10, 70);

  assert.equal(result.targetPercent, 55);
  assert.equal(result.limited, true);
});

test("gentle ไปถึงเป้าหมายตรง ๆ เมื่ออยู่ใกล้กว่า step", () => {
  const result = getAutoResponseTarget("gentle", 42, 35);

  assert.equal(result.targetPercent, 42);
  assert.equal(result.limited, false);
});

test("gentle ไม่สร้างคำสั่งเมื่อยังไม่มีตำแหน่ง Encoder", () => {
  const result = getAutoResponseTarget("gentle", 80, null);

  assert.equal(result.targetPercent, null);
  assert.equal(result.limited, true);
});
