/**
 * ローン月額（元利均等）
 * @param {number} principal - 借入元本（円）
 * @param {number} annualRate - 年利（0.01 = 1%）
 * @param {number} years - ローン年数
 * @returns {number} 月額返済額（円）
 */
export function monthlyPayment(principal, annualRate, years) {
  if (principal <= 0 || years <= 0) return 0;
  const r = annualRate / 12;
  if (r === 0) return principal / (years * 12);
  return (
    (principal * r * Math.pow(1 + r, years * 12)) /
    (Math.pow(1 + r, years * 12) - 1)
  );
}

/**
 * ローン残高
 * @param {number} principal - 借入元本（円）
 * @param {number} annualRate - 年利（0.01 = 1%）
 * @param {number} totalYears - ローン年数
 * @param {number} elapsedYears - 経過年数
 * @returns {number} ローン残高（円）
 */
export function loanBalance(principal, annualRate, totalYears, elapsedYears) {
  if (elapsedYears >= totalYears) return 0;
  const r = annualRate / 12;
  const n = totalYears * 12;
  const k = elapsedYears * 12;
  if (r === 0) return principal * (1 - k / n);
  const pmt = monthlyPayment(principal, annualRate, totalYears);
  return (pmt * (1 - Math.pow(1 + r, -(n - k)))) / r;
}
