import { describe, it, expect } from "vitest";
import { propertyValue } from "./property.js";

describe("propertyValue", () => {
  it("購入直後は購入価格と同額", () => {
    expect(propertyValue(5000, 0, 2000, 35)).toBe(5000);
  });

  it("経年で価値が減少する", () => {
    const initial = propertyValue(5000, 0, 2000, 35);
    const after10 = propertyValue(5000, 10, 2000, 35);
    const after35 = propertyValue(5000, 35, 2000, 35);
    expect(after10).toBeLessThan(initial);
    expect(after35).toBeLessThan(after10);
  });

  it("最終価値40%の場合、35年後は約2000万（購入5000万）", () => {
    const result = propertyValue(5000, 35, 2000, 35);
    expect(result).toBeGreaterThan(1500);
    expect(result).toBeLessThanOrEqual(2000);
  });

  it("戻り値は整数", () => {
    const result = propertyValue(5000, 15, 2000, 35);
    expect(Number.isInteger(result)).toBe(true);
  });
});
