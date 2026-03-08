/**
 * 子供の教育費（年齢別・万円）
 * @param {number} childAge - 子供の年齢
 * @param {"private"|"public"} educationType - 教育タイプ（私立/公立）
 * @returns {number} 年間教育費（万円）
 */
export function childCostPerYear(childAge, educationType) {
  if (childAge < 0) return 0;
  if (childAge < 3) return 40; // 保育園
  if (childAge < 6) return 30; // 幼稚園（無償化あり）
  if (childAge < 12) return educationType === "private" ? 100 : 35; // 小学校
  if (childAge < 15) return educationType === "private" ? 140 : 50; // 中学校
  if (childAge < 18) return educationType === "private" ? 100 : 50; // 高校
  if (childAge < 22) return 150; // 大学
  return 0;
}
