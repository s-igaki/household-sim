import { describe, it, expect } from "vitest";
import { childCostPerYear } from "./childCost.js";

describe("childCostPerYear", () => {
  it("0歳未満は0を返す", () => {
    expect(childCostPerYear(-1, "public")).toBe(0);
  });

  it("0-2歳は保育園費用40万円", () => {
    expect(childCostPerYear(0, "public")).toBe(40);
    expect(childCostPerYear(2, "public")).toBe(40);
  });

  it("3-5歳は幼稚園30万円（無償化）", () => {
    expect(childCostPerYear(3, "public")).toBe(30);
    expect(childCostPerYear(5, "public")).toBe(30);
  });

  it("小学校（6-11歳）公立35万円、私立100万円", () => {
    expect(childCostPerYear(6, "public")).toBe(35);
    expect(childCostPerYear(6, "private")).toBe(100);
    expect(childCostPerYear(11, "public")).toBe(35);
  });

  it("中学校（12-14歳）公立50万円、私立140万円", () => {
    expect(childCostPerYear(12, "public")).toBe(50);
    expect(childCostPerYear(12, "private")).toBe(140);
  });

  it("高校（15-17歳）公立50万円、私立100万円", () => {
    expect(childCostPerYear(15, "public")).toBe(50);
    expect(childCostPerYear(15, "private")).toBe(100);
  });

  it("大学（18-21歳）150万円", () => {
    expect(childCostPerYear(18, "public")).toBe(150);
    expect(childCostPerYear(21, "private")).toBe(150);
  });

  it("22歳以上は0", () => {
    expect(childCostPerYear(22, "public")).toBe(0);
    expect(childCostPerYear(30, "private")).toBe(0);
  });
});
