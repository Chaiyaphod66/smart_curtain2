import test from "node:test";
import assert from "node:assert/strict";
import { getAutoTarget } from "./get-auto-target.ts";

test("แสงน้อย 300 lux ต้องเปิดม่าน", () => {
    const actual = getAutoTarget(300);

    assert.equal(actual, 100);
});

test ("แสงมาก 1200 lux ต้องปิดม่าน", () => {
    assert.equal(getAutoTarget(1200), 0);
});

test("แสงปานกลาง 720 lux ต้องไม่เปลี่ยนเป้าหมาย", () => {
    assert.equal(getAutoTarget(720), null);
});

test("600 lux พอดี ต้องไม่เปลี่ยนเป้าหมาย", () => {
    assert.equal(getAutoTarget(600), null);
});

test("900 lux พอดี ต้องไม่เปลี่ยนเป้าหมาย", () => {
    assert.equal(getAutoTarget(900), null);
});

test("ค่าผิดปกติต้องไม่สร้างคำสั่ง", () => {
    assert.equal(getAutoTarget(-1), null);
    assert.equal(getAutoTarget(NaN), null);
    assert.equal(getAutoTarget(Infinity), null);
});

test("ไม่มีค่าแสงต้องไม่สร้างคำสั่ง", () => {
  assert.equal(getAutoTarget(null), null);
});