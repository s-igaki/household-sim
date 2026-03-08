const STORAGE_KEY = "household-sim-saved";

/**
 * 保存一覧を取得
 */
export function loadSavedList() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * 保存一覧に追加
 */
export function addToSavedList(item) {
  const list = loadSavedList();
  const next = [item, ...list].slice(0, 50); // 最大50件
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

/**
 * 保存一覧から削除
 */
export function removeFromSavedList(id) {
  const list = loadSavedList().filter((x) => x.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}
