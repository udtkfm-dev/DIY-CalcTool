// errors.js — CalcError と初心者向けメッセージ
//
// 文言は REQUIREMENTS.md 第9章の表のとおり。専門用語を使わない。
// 「安全」「問題ない」「基準を満たす」といった断定表現は使わない。

/** 入力として受け付ける上限（これを超えたら TOO_LARGE） */
export const MAX_ABS = 1e12;

export const ERROR_MESSAGES = {
  NEGATIVE: '長さにマイナスの値は使えません。0より大きい数を入れてください',
  ZERO: '0では計算できません。0より大きい数を入れてください',
  TRIANGLE_INEQ: 'この3つの長さでは三角形になりません。いちばん長い辺は、残り2辺を足した長さより短くしてください',
  ANGLE_RANGE: '角度は0°より大きく180°より小さい値にしてください',
  ANGLE_SUM: '2つの角度の合計が180°以上です。三角形になりません',
  RIGHT_HYP: '斜辺は他の2辺のどちらよりも長くなります。値を見直してください',
  DOMAIN: 'この長さの組み合わせでは角度を計算できません',
  NOT_ENOUGH: 'あと1つ入力すると計算できます',
  BAD_NUMBER: '数字として読み取れません',
  TOO_LARGE: '値が大きすぎます。単位（m など）を切り替えてみてください'
};

/** 赤ではなく案内色（青）で出すコード。未入力は失敗ではない。 */
export const INFO_CODES = new Set(['NOT_ENOUGH']);

export class CalcError extends Error {
  /**
   * @param {string} code REQUIREMENTS 第9章のコード
   * @param {string|null} field 該当する入力欄のキー（欄に紐づかない場合は null）
   * @param {string} [message] 既定文言を上書きしたい場合のみ
   */
  constructor(code, field = null, message = null) {
    const text = message || ERROR_MESSAGES[code] || ERROR_MESSAGES.BAD_NUMBER;
    super(text);
    this.name = 'CalcError';
    this.code = code;
    this.field = field;
    this.message = text;
  }

  get isInfo() {
    return INFO_CODES.has(this.code);
  }
}

export function calcError(code, field = null, message = null) {
  return new CalcError(code, field, message);
}

/**
 * 欄ごとの共通バリデーション（値は内部単位）。
 * @returns {CalcError|null}
 */
export function validateFieldValue(field, value) {
  if (!Number.isFinite(value)) return calcError('BAD_NUMBER', field.key);
  if (Math.abs(value) > MAX_ABS) return calcError('TOO_LARGE', field.key);

  if (field.quantity === 'angle') {
    const lo = field.min !== undefined && field.min !== null ? field.min : 0;
    const hi = field.max !== undefined && field.max !== null ? field.max : 180;
    const lowBad = field.exclusiveMin === false ? value < lo : value <= lo;
    const highBad = field.exclusiveMax === false ? value > hi : value >= hi;
    if (lowBad || highBad) {
      return calcError('ANGLE_RANGE', field.key, field.rangeMessage || null);
    }
    return null;
  }

  if (field.min !== undefined && field.min !== null) {
    if (value < field.min) {
      return calcError(value < 0 ? 'NEGATIVE' : 'ZERO', field.key);
    }
    if (field.exclusiveMin && value === field.min) {
      return calcError(field.min === 0 ? 'ZERO' : 'NEGATIVE', field.key);
    }
  }
  if (field.max !== undefined && field.max !== null && value > field.max) {
    return calcError('TOO_LARGE', field.key);
  }
  return null;
}

/**
 * 計算結果に NaN / Infinity が混ざっていないか調べる。
 * 画面に NaN を出さないための最終関門。
 */
export function checkFinite(values, field = null) {
  for (const key of Object.keys(values)) {
    if (!Number.isFinite(values[key])) return calcError('DOMAIN', field);
  }
  return null;
}
