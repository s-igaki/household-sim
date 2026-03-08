/**
 * マンション減価計算
 * @param {number} purchasePrice - 購入価格（万円）
 * @param {number} yearsOwned - 所有年数
 * @param {number} finalValue - 最終価値（万円）
 * @param {number} loanYears - ローン年数
 * @returns {number} 現在の資産価値（万円）
 */
export function propertyValue(purchasePrice, yearsOwned, finalValue, loanYears) {
  const totalYears = Math.max(loanYears, 35);
  const ratio = Math.max(
    0,
    1 - (1 - finalValue / purchasePrice) * (yearsOwned / totalYears)
  );
  return Math.round(purchasePrice * ratio);
}
