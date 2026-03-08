import { describe, it, expect } from "vitest";
import { monthlyPayment, loanBalance } from "./loan.js";

describe("monthlyPayment", () => {
  it("元本0または年数0の場合は0を返す", () => {
    expect(monthlyPayment(0, 0.01, 35)).toBe(0);
    expect(monthlyPayment(45000000, 0.01, 0)).toBe(0);
  });

  it("金利0%の場合、元本/月数で返済", () => {
    const principal = 36000000; // 3600万円
    const years = 30;
    const result = monthlyPayment(principal, 0, years);
    expect(result).toBe(principal / (years * 12)); // 10万円/月
  });

  it("金利1%・35年・4500万円の場合、月額は約12-13万円", () => {
    const result = monthlyPayment(45_000_000, 0.01, 35);
    expect(result).toBeGreaterThan(120_000);
    expect(result).toBeLessThan(140_000);
  });
});

describe("loanBalance", () => {
  it("経過年数がローン年数以上なら0", () => {
    expect(loanBalance(45_000_000, 0.01, 35, 35)).toBe(0);
    expect(loanBalance(45_000_000, 0.01, 35, 40)).toBe(0);
  });

  it("経過0年なら元本と同額", () => {
    const principal = 45_000_000;
    const balance = loanBalance(principal, 0.01, 35, 0);
    expect(balance).toBeCloseTo(principal, -5);
  });

  it("経過年数が進むと残高が減る", () => {
    const principal = 45_000_000;
    const b0 = loanBalance(principal, 0.01, 35, 0);
    const b10 = loanBalance(principal, 0.01, 35, 10);
    const b20 = loanBalance(principal, 0.01, 35, 20);
    expect(b10).toBeLessThan(b0);
    expect(b20).toBeLessThan(b10);
  });
});
