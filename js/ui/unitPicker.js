// unitPicker.js — 単位選択（横スクロールのチップ列）

import { unitList, hasPicker, unitNote } from '../core/units.js';

/**
 * 単位チップ列を作る。
 * @param {string} quantity
 * @param {string} current 現在の単位ID
 * @param {(unitId:string)=>void} onChange
 * @returns {HTMLElement|null} 単位ピッカーを出さない quantity なら null
 */
export function createUnitChips(quantity, current, onChange) {
  if (!hasPicker(quantity)) return null;

  const wrap = document.createElement('div');
  wrap.className = 'chips';
  wrap.setAttribute('role', 'group');
  wrap.setAttribute('aria-label', '単位を選ぶ');

  for (const u of unitList(quantity)) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'chip';
    btn.dataset.unit = u.id;
    btn.textContent = u.label || u.id;
    btn.setAttribute('aria-pressed', String(u.id === current));
    if (u.note) btn.title = u.note;
    btn.addEventListener('click', () => onChange(u.id));
    wrap.appendChild(btn);
  }
  return wrap;
}

/** 地域差などの注記（あれば文字列、無ければ空文字） */
export function noteFor(quantity, unitId) {
  return unitNote(quantity, unitId);
}
