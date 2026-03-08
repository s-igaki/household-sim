/**
 * 金額フォーマット（万円単位、大きい場合は億）
 */
export function fmt(v) {
  if (Math.abs(v) >= 10000) return `${(v / 10000).toFixed(1)}億`;
  return `${Math.round(v)}万`;
}

/**
 * 円フォーマット（万円表示）
 */
export function fmtYen(v) {
  return `${Math.round(v).toLocaleString()}万円`;
}
