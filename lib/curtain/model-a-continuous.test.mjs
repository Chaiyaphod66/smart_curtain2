import test from "node:test";
import assert from "node:assert/strict";
import {
  getModelAContinuousCandidateKey,
  getModelAContinuousSafetyBlockers,
  getModelAContinuousTargetPercent,
} from "./model-a-continuous.ts";

const safeInput = {
  isAutoLabSelected: true,
  source: "esp32",
  isDeviceOnline: true,
  isPositionControlReady: true,
  limitSafetyEnabled: true,
  limitConflict: false,
  motorFault: null,
  deviceAutoEnabled: false,
};

function result(action, targetPercent) {
  return {
    action,
    targetPercent,
    bandIndex: 2,
    bandLabel: "28–ต่ำกว่า 30°C",
    lowLux: 200,
    highLux: 1500,
    stepPercent: 15,
    reasons: [],
    state: {
      temperatureBandIndex: 2,
      stepPercent: 15,
      lastDirection: action === "open-step" ? "open" : "close",
      resolutionLimited: false,
    },
  };
}

test("ระบบพร้อมเมื่ออยู่ Auto Lab และ safety ทุกส่วนพร้อม", () => {
  assert.deepEqual(getModelAContinuousSafetyBlockers(safeInput), []);
});

test("บล็อกข้อมูลจำลอง อุปกรณ์ออฟไลน์ ลิมิต และ Auto ที่ชนกัน", () => {
  const blockers = getModelAContinuousSafetyBlockers({
    ...safeInput,
    isAutoLabSelected: false,
    source: "mock",
    isDeviceOnline: false,
    limitSafetyEnabled: false,
    limitConflict: true,
    isPositionControlReady: false,
    motorFault: "position-timeout",
    deviceAutoEnabled: true,
  });

  assert.equal(blockers.length, 8);
  assert.ok(blockers.some((message) => message.includes("Auto Lab")));
  assert.ok(blockers.some((message) => message.includes("Always-on")));
  assert.ok(blockers.some((message) => message.includes("Motor fault")));
});

test("สร้างเป้าหมายจำนวนเต็มเฉพาะคำสั่ง open-step และ close-step", () => {
  assert.equal(
    getModelAContinuousTargetPercent(result("open-step", 65.6)),
    66,
  );
  assert.equal(
    getModelAContinuousTargetPercent(result("close-step", -2)),
    0,
  );
  assert.equal(getModelAContinuousTargetPercent(result("hold", null)), null);
});

test("candidate key ผูกกับทิศทางและเป้าหมายที่ปัดแล้ว", () => {
  assert.equal(
    getModelAContinuousCandidateKey(result("close-step", 34.7)),
    "model-a:close-step:35",
  );
  assert.equal(getModelAContinuousCandidateKey(result("waiting", null)), null);
});
