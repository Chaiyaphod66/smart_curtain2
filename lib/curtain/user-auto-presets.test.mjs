import test from "node:test";
import assert from "node:assert/strict";
import { getAutoPresetValidationErrors } from "./auto-preset.ts";
import {
  USER_AUTO_PRESET_FAMILIES,
  USER_AUTO_PRESET_OPTIONS,
} from "./user-auto-presets.ts";

test("แต่ละแนวทางมีชุดย่อย 3 ชุด", () => {
  assert.equal(USER_AUTO_PRESET_FAMILIES.length, 3);

  for (const family of USER_AUTO_PRESET_FAMILIES) {
    assert.equal(family.options.length, 3, family.name);
  }
});

test("รหัสชุดย่อยไม่ซ้ำกัน", () => {
  const ids = USER_AUTO_PRESET_OPTIONS.map((option) => option.id);
  assert.equal(new Set(ids).size, ids.length);
});

test("ทุกชุดย่อยผ่านกฎตรวจสอบ Auto", () => {
  for (const option of USER_AUTO_PRESET_OPTIONS) {
    assert.deepEqual(
      getAutoPresetValidationErrors(option.preset),
      [],
      option.id,
    );
  }
});
