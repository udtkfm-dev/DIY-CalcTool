// format.js — 丸め・桁数・「約」表示
//
// 【重要】丸めはこの層でのみ行う。solver.js は常に無丸めの倍精度で計算する。

import { fromBase, unitLabel, isAttachedUnit } from './units.js';

export const DEFAULT_SETTINGS_DECIMALS = 2;

/** approx（約）表示のときに使う桁数 */
const APPROX_DECIMALS = { length: 0, area: 0, volume: 0, angle: 1 };

/** 入力文字列 → 数値。読み取れなければ NaN を返す */
export function parseNumber(raw) {
  if (raw === null || raw === undefined) return NaN;
  const s = String(raw)
    .replace(/[,\s]/g, '')
    .replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/．/g, '.')
    .replace(/[－ー−]/g, '-');
  if (s === '' || s === '.' || s === '-' || s === '-.') return NaN;
  if (!/^-?\d*\.?\d*$/.test(s)) return NaN;
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
}

/** 整数部に桁区切りを入れる */
function group(intPart) {
  const neg = intPart.startsWith('-');
  const digits = neg ? intPart.slice(1) : intPart;
  return (neg ? '-' : '') + digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * 数値を文字列にする。指数表記は使わない。末尾の 0 は落とす。
 * @param {number} n
 * @param {{decimals?:number, grouping?:boolean}} opts
 */
export function formatNumber(n, opts = {}) {
  // ここでは桁数を丸めない（0..3 への制限は「表示設定」の話であり、
  // 単位換算のように内部精度を保ちたい呼び出し元まで縛ってはいけない）
  const decimals = Number.isFinite(opts.decimals)
    ? Math.min(20, Math.max(0, Math.round(opts.decimals)))
    : DEFAULT_SETTINGS_DECIMALS;
  const grouping = opts.grouping !== false;
  if (!Number.isFinite(n)) return '';

  let s;
  if (Math.abs(n) >= 1e21) {
    // toFixed が指数表記になる領域。桁を落とさずに整数化して出す。
    s = BigInt(Math.round(n)).toString();
  } else {
    s = n.toFixed(decimals);
  }
  // -0 を 0 にする
  if (/^-0(\.0*)?$/.test(s)) s = s.slice(1);

  if (s.includes('.')) s = s.replace(/0+$/, '').replace(/\.$/, '');

  const [i, f] = s.split('.');
  const head = grouping ? group(i) : i;
  return f ? head + '.' + f : head;
}

export function clampDecimals(d) {
  const n = Number.isFinite(d) ? Math.round(d) : DEFAULT_SETTINGS_DECIMALS;
  return Math.min(3, Math.max(0, n));
}

/**
 * 内部単位の値を、表示単位・表示桁数に合わせて整形する。
 * @param {number} internal 内部単位の値
 * @param {string} quantity
 * @param {string} unitId 表示単位
 * @param {object} settings { decimals, roundMode }
 * @param {{grouping?:boolean, withUnit?:boolean, approx?:boolean}} opts
 * @returns {{num:string, unit:string, text:string, approx:boolean, value:number}}
 */
export function formatValue(internal, quantity, unitId, settings = {}, opts = {}) {
  const value = fromBase(internal, quantity, unitId);
  const label = unitLabel(quantity, unitId);
  if (!Number.isFinite(value)) {
    return { num: '', unit: label, text: '', approx: false, value: NaN };
  }

  const useApprox = opts.approx !== undefined ? opts.approx : settings.roundMode === 'approx';
  const decimals = useApprox
    ? (APPROX_DECIMALS[quantity] !== undefined ? APPROX_DECIMALS[quantity] : clampDecimals(settings.decimals))
    : clampDecimals(settings.decimals);

  const num = formatNumber(value, { decimals, grouping: opts.grouping !== false });
  const attached = isAttachedUnit(quantity, unitId);
  const withUnit = opts.withUnit === false ? false : true;

  let text = num;
  if (withUnit && label) text = attached ? num + label : num + ' ' + label;
  if (useApprox) text = '約 ' + text;

  return { num, unit: label, text, approx: useApprox, value };
}

/** 単位付きの表示文字列だけが欲しいときの短縮形 */
export function formatWithUnit(internal, quantity, unitId, settings = {}) {
  return formatValue(internal, quantity, unitId, settings).text;
}

/**
 * テンキーで編集中の欄に表示する文字列。
 * 打鍵中の生文字列をそのまま見せたいので、桁区切りのみを付ける。
 */
export function formatRawForDisplay(raw) {
  if (raw === '' || raw === null || raw === undefined) return '';
  const s = String(raw);
  const [i, f] = s.split('.');
  const head = group(i === '' ? '0' : i);
  if (s.includes('.')) return head + '.' + (f || '');
  return head;
}

/**
 * 内部値を、その欄の表示単位での「生文字列」に戻す（単位切替時に使う）。
 * 桁区切りは付けない（編集対象の文字列として使うため）。
 *
 * ここで作る文字列は表示・編集用であり、計算には使わない。
 * 換算の精度は calcView 側が内部値（exactBase）をそのまま保持することで担保する。
 */
export function toRawString(internal, quantity, unitId, settings = {}) {
  const value = fromBase(internal, quantity, unitId);
  if (!Number.isFinite(value)) return '';
  const decimals = clampDecimals(settings.decimals) + 4;
  return formatNumber(value, { decimals, grouping: false });
}
