// store.js — localStorage（履歴 / お気に入り / 設定）
//
// localStorage が使えない環境（Safari プライベートなど）でも計算自体は動かす。
// 保存だけを無効化し、available() で UI 側から通知できるようにする。

const KEY_HISTORY = 'diycalc.history';
const KEY_FAVORITES = 'diycalc.favorites';
const KEY_SETTINGS = 'diycalc.settings';

export const HISTORY_LIMIT = 200;

export const DEFAULT_SETTINGS = {
  decimals: 2,
  roundMode: 'exact',
  defaultLengthUnit: 'mm',
  defaultAreaUnit: 'mm2',
  defaultAngleUnit: 'deg',
  theme: 'system',
  agreedDisclaimer: false,
  adFree: false
};

let storageOk = null;

/** localStorage が読み書きできるか（1度だけ実測する） */
export function available() {
  if (storageOk !== null) return storageOk;
  try {
    const probe = '__diycalc_probe__';
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    storageOk = true;
  } catch (e) {
    storageOk = false;
  }
  return storageOk;
}

function read(key, fallback) {
  if (!available()) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return fallback;
    const parsed = JSON.parse(raw);
    return parsed === null || parsed === undefined ? fallback : parsed;
  } catch (e) {
    return fallback;
  }
}

function write(key, value) {
  if (!available()) return false;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    return false;
  }
}

/* ---------- 設定 ---------- */

export function getSettings() {
  return Object.assign({}, DEFAULT_SETTINGS, read(KEY_SETTINGS, {}));
}

export function saveSettings(patch) {
  const next = Object.assign(getSettings(), patch);
  write(KEY_SETTINGS, next);
  return next;
}

/* ---------- お気に入り ---------- */

export function getFavorites() {
  const list = read(KEY_FAVORITES, []);
  return Array.isArray(list) ? list : [];
}

export function isFavorite(calcId) {
  return getFavorites().some((f) => f.calcId === calcId);
}

export function toggleFavorite(calcId) {
  const list = getFavorites();
  const i = list.findIndex((f) => f.calcId === calcId);
  if (i >= 0) list.splice(i, 1);
  else list.unshift({ calcId, at: Date.now() });
  write(KEY_FAVORITES, list);
  return i < 0;
}

/* ---------- 履歴 ---------- */

export function getHistory() {
  const list = read(KEY_HISTORY, []);
  return Array.isArray(list) ? list : [];
}

function sameInputs(a, b) {
  const ka = Object.keys(a || {});
  const kb = Object.keys(b || {});
  if (ka.length !== kb.length) return false;
  return ka.every((k) => b[k] && a[k].v === b[k].v && a[k].u === b[k].u);
}

/**
 * 履歴を保存する。同じ calcId かつ入力値が完全一致なら時刻だけ更新する。
 * @returns {object} 保存された HistoryItem
 */
export function saveHistory(item) {
  const list = getHistory();
  const dup = list.find((h) => h.calcId === item.calcId && sameInputs(h.inputs, item.inputs));
  if (dup) {
    dup.at = Date.now();
    dup.summary = item.summary;
    list.sort((a, b) => b.at - a.at);
    write(KEY_HISTORY, list);
    return dup;
  }
  const rec = Object.assign(
    { id: 'h_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6), at: Date.now(), note: '' },
    item
  );
  list.unshift(rec);
  list.sort((a, b) => b.at - a.at);
  // 上限を超えた分は古い順に削除する
  if (list.length > HISTORY_LIMIT) list.length = HISTORY_LIMIT;
  write(KEY_HISTORY, list);
  return rec;
}

export function removeHistory(id) {
  const list = getHistory().filter((h) => h.id !== id);
  write(KEY_HISTORY, list);
}

export function clearHistory() {
  write(KEY_HISTORY, []);
}
