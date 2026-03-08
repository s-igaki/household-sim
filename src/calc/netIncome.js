/**
 * 日本の税金計算（所得税・住民税・社会保険料の概算）
 * @param {number} grossIncome - 年収（円）
 * @returns {number} 手取り額（円）
 */
export function calcNetIncome(grossIncome) {
  if (grossIncome <= 0) return 0;
  const socialInsurance = grossIncome * 0.15; // 社会保険料約15%
  const taxableBase = grossIncome - socialInsurance;

  // 給与所得控除
  let deduction = 0;
  if (taxableBase <= 1625000) deduction = 550000;
  else if (taxableBase <= 1800000) deduction = taxableBase * 0.4 - 100000;
  else if (taxableBase <= 3600000) deduction = taxableBase * 0.3 + 80000;
  else if (taxableBase <= 6600000) deduction = taxableBase * 0.2 + 440000;
  else if (taxableBase <= 8500000) deduction = taxableBase * 0.1 + 1100000;
  else deduction = 1950000;

  const taxableIncome = Math.max(0, taxableBase - deduction - 480000); // 基礎控除48万

  // 所得税（累進課税）
  let incomeTax = 0;
  const brackets = [
    [1950000, 0.05],
    [3300000, 0.1],
    [6950000, 0.2],
    [9000000, 0.23],
    [18000000, 0.33],
    [40000000, 0.4],
    [Infinity, 0.45],
  ];
  let prev = 0;
  for (const [limit, rate] of brackets) {
    if (taxableIncome <= limit) {
      incomeTax += (taxableIncome - prev) * rate;
      break;
    }
    incomeTax += (limit - prev) * rate;
    prev = limit;
  }
  incomeTax *= 1.021; // 復興特別所得税

  // 住民税（約10%）
  const residentTax = taxableIncome * 0.1 + 5000;

  return Math.round(grossIncome - socialInsurance - incomeTax - residentTax);
}
