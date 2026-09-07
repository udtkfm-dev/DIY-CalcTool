// solver.js — 入力充足判定 → 解法選択 → 実行
//
// REQUIREMENTS.md 第5章の手順1〜7のうち、1〜5をこのモジュールが担う
// （6・7の表示単位への逆換算と描画は calcView.js 側）。
//
// 【設計の要】逆算は専用モードではない。
//   ユーザーが直接入力した欄を「最後に触った順」に並べ、先頭から1つずつ増やしながら
//   いずれかの Solver.requires を満たした時点で確定する。採用されなかった古い入力は
//   算出値へ戻る。これが「3つ目を入力すると最古の入力が答えに変わる」挙動になる。
//
// 【禁止】このファイルでは一切丸めない。丸めは format.js（表示層）のみ。

import { validateFieldValue, checkFinite, calcError } from './errors.js';
import { fromBase, unitLabel, isAttachedUnit, SQUARE_OF_LENGTH } from './units.js';
import { formatNumber, clampDecimals } from './format.js';

/**
 * 計算過程（steps）の文字列を、現在の表示単位・表示桁数で組み立てるための道具箱。
 * run(v, ctx) に渡す。solver 側はこれ経由でしか文字列を作らない
 * （＝丸めの責務を format.js に閉じ込めるため）。
 *
 * @param {object} def CalcDef
 * @param {object} unitsByQuantity { length:'mm', angle:'deg', ... } 表示単位
 * @param {object} settings
 */
export function makeStepContext(def, unitsByQuantity, settings = {}) {
  const decimals = clampDecimals(settings.decimals);

  const unitOf = (quantity) => unitsByQuantity[quantity] || defaultUnitOf(def, quantity);

  /** 内部値 → 表示単位の数値 */
  const d = (value, quantity, unitId) => fromBase(value, quantity, unitId || unitOf(quantity));

  /** 素の数値 → 文字列（桁区切りあり） */
  const f = (n) => formatNumber(n, { decimals, grouping: true });

  /** 内部値 → 表示単位の数値文字列（単位なし） */
  const n = (value, quantity, unitId) => f(d(value, quantity, unitId));

  /** 内部値 → 単位付き文字列 */
  const u = (value, quantity, unitId) => {
    const uid = unitId || unitOf(quantity);
    const label = unitLabel(quantity, uid);
    const num = n(value, quantity, uid);
    if (!label) return num;
    return isAttachedUnit(quantity, uid) ? num + label : num + ' ' + label;
  };

  /**
   * 面積の計算過程で使う単位の組。
   * 長さの表示単位が mm/cm/m なら、その2乗の単位で書く（例: m と m²）。
   * inch/ft/尺/寸 には対応する面積単位を持たないので、その場合は mm と mm² に揃える。
   */
  const areaUnits = () => {
    const lu = unitOf('length');
    const au = SQUARE_OF_LENGTH[lu];
    return au ? { lengthUnit: lu, areaUnit: au } : { lengthUnit: 'mm', areaUnit: 'mm2' };
  };

  return { unitOf, d, f, n, u, areaUnits, decimals };
}

function defaultUnitOf(def, quantity) {
  const field = (def.fields || []).find((x) => x.quantity === quantity);
  if (field) return field.defaultUnit;
  const out = (def.outputs || []).find((x) => x.quantity === quantity);
  if (out && out.defaultUnit) return out.defaultUnit;
  return quantity === 'length' ? 'mm' : quantity === 'angle' ? 'deg' : quantity === 'area' ? 'mm2' : quantity;
}

function fieldOf(def, key) {
  return (def.fields || []).find((f) => f.key === key) || null;
}

/**
 * @typedef {object} SolveState
 * @property {Object<string,number>} entered ユーザーが直接入力した欄の内部単位の値
 * @property {string[]} order 入力した欄のキーを「最後に触った順（新しい順）」に並べたもの
 */

/**
 * @param {object} def CalcDef
 * @param {SolveState} state
 * @param {object} ctx makeStepContext() の戻り値
 * @returns {{
 *   status:'ok'|'incomplete'|'error',
 *   locked:string[], derivedKeys:string[],
 *   values:Object<string,number>,
 *   formulaName:string|null, steps:Array, solver:object|null,
 *   error:import('./errors.js').CalcError|null,
 *   missing:string[]
 * }}
 */
export function solve(def, state, ctx) {
  const entered = state.entered || {};
  // 手順1: 正規化済みの入力のうち、値が有効なものだけを対象にする
  const order = (state.order || []).filter(
    (k) => Object.prototype.hasOwnProperty.call(entered, k) && entered[k] !== null && entered[k] !== undefined
  );

  const base = {
    status: 'incomplete',
    locked: order.slice(),
    derivedKeys: [],
    values: pick(entered, order),
    formulaName: null,
    steps: [],
    solver: null,
    error: null,
    missing: []
  };

  // 手順4の前半: 欄単位のバリデーション（範囲・桁）
  for (const key of order) {
    const field = fieldOf(def, key);
    if (!field) continue;
    const err = validateFieldValue(field, entered[key]);
    if (err) return Object.assign(base, { status: 'error', error: err });
  }

  // 手順2 + 手順3: 入力ロック集合の決定と解法の選択
  //
  // 【注意】locked は「マッチした時点の cand（直近 n 件）」ではなく、必ず
  // 「選ばれた解法が実際に requires する欄」に絞る。requires が3つ以上の解法
  // （tri.any の SSS/SSA 等）では、cand が requires ちょうどの大きさで一致する
  // とは限らない（例: a,b,c,angA の4つが触られていて、直近3件 {c,b,angA} では
  // どの解法にも一致せず、4件目まで広げて初めて SSS(a,b,c) に一致するケース）。
  // このとき cand=[angA,c,b,a] をそのまま locked にすると、解法が使っていない
  // angA が「入力のまま」表示に残り、result 側は再計算後の値を出すため
  // 同じ欄が入力欄と結果欄で違う数値を示す不整合が起きる（実運用で発見・修正）。
  // requires に絞れば、使われなかった欄は自動的に「算出値」へ戻る。
  let chosen = null;
  let locked = null;
  for (let n = 1; n <= order.length; n++) {
    const cand = order.slice(0, n);
    const set = new Set(cand);
    const hit = (def.solvers || []).find((s) => s.requires.every((r) => set.has(r)));
    if (hit) {
      chosen = hit;
      locked = hit.requires.slice();
      break;
    }
  }

  if (!chosen) {
    // まだ解けない。「あと何を入れれば解けるか」を案内する。
    const missing = missingCandidates(def, order);
    const err = notEnoughError(def, order, missing);
    return Object.assign(base, { status: 'incomplete', error: err, missing });
  }

  const v = pick(entered, locked);

  // 手順4の後半: 解法ごとの事前バリデーション
  if (typeof chosen.validate === 'function') {
    const err = chosen.validate(v);
    if (err) {
      return Object.assign(base, { status: 'error', locked, values: v, error: err, solver: chosen });
    }
  }

  // 手順5: 実行（無丸め）
  let out;
  try {
    out = chosen.run(v, ctx);
  } catch (e) {
    return Object.assign(base, { status: 'error', locked, values: v, error: calcError('DOMAIN'), solver: chosen });
  }

  // NaN / Infinity を画面に出さない
  const finiteErr = checkFinite(out.values || {});
  if (finiteErr) {
    return Object.assign(base, { status: 'error', locked, values: v, error: finiteErr, solver: chosen });
  }

  const values = Object.assign({}, v, out.values);

  return {
    status: 'ok',
    locked,
    derivedKeys: Object.keys(out.values || {}),
    values,
    formulaName: out.formulaName || null,
    steps: out.steps || [],
    solver: chosen,
    error: null,
    missing: []
  };
}

function pick(src, keys) {
  const o = {};
  for (const k of keys) o[k] = src[k];
  return o;
}

/**
 * いまの入力に「あと1つ」足せば解ける欄のキー一覧。
 * どの解法も1つ足りでは届かない場合は空配列を返す。
 */
export function missingCandidates(def, enteredKeys) {
  const set = new Set(enteredKeys);
  const out = [];
  for (const s of def.solvers || []) {
    const miss = s.requires.filter((r) => !set.has(r));
    if (miss.length === 1 && !out.includes(miss[0])) out.push(miss[0]);
  }
  return out;
}

function notEnoughError(def, enteredKeys, missing) {
  // 計算ごとの特別な案内（例: 角度だけでは大きさが決まらない）
  if (typeof def.notEnoughHint === 'function') {
    const msg = def.notEnoughHint(enteredKeys, def);
    if (msg) return calcError('NOT_ENOUGH', null, msg);
  }
  if (missing.length) {
    const names = missing
      .map((k) => {
        const f = fieldOf(def, k);
        return f ? f.label : k;
      })
      .join(' / ');
    return calcError('NOT_ENOUGH', null, `あと1つ入力すると計算できます（残り: ${names}）`);
  }
  return calcError('NOT_ENOUGH', null, 'あと2つ入力すると計算できます');
}
