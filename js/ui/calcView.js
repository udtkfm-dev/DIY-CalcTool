// calcView.js — 計算画面（図形 → 入力 → 結果 → 式 → 過程 → 注意書き）
//
// REQUIREMENTS 第5章の手順6・7（表示単位への逆換算、図形への反映、
// 算出値を入力欄へアクセント色で流し込む）を担当する。
// 計算そのものは必ず solver.js 経由で行い、この画面に式を直書きしない。

import { solve, makeStepContext } from '../core/solver.js';
import { formatValue, formatRawForDisplay, parseNumber, toRawString } from '../core/format.js';
import { toBase, fromBase, unitLabel, unitList, hasPicker } from '../core/units.js';
import { getSettings, saveHistory, isFavorite, toggleFavorite, available as storeAvailable } from '../core/store.js';
import { termFor, explain } from '../calcs/glossary.js';
import { useDeviceKeyboard } from '../core/input.js';
import { openNumpad, update as updateNumpad, closeNumpad, isOpen as numpadOpen } from './numpad.js';
import { createUnitChips } from './unitPicker.js';
import { showToast } from './toast.js';
import { refitLabels } from '../shapes/engine.js';
import { backButton } from './icons.js';
import * as rightTriangle from '../shapes/rightTriangle.js';
import * as triangle from '../shapes/triangle.js';
import * as rectangle from '../shapes/rectangle.js';
import * as circle from '../shapes/circle.js';
import * as triangleBH from '../shapes/triangleBH.js';
import * as trapezoid from '../shapes/trapezoid.js';
import * as parallelogram from '../shapes/parallelogram.js';
import * as sector from '../shapes/sector.js';
import * as ellipse from '../shapes/ellipse.js';
import * as lineSegment from '../shapes/lineSegment.js';
import * as centerLine from '../shapes/centerLine.js';
import * as miterAngle from '../shapes/miterAngle.js';
import * as box3d from '../shapes/box3d.js';
import * as cylinder3d from '../shapes/cylinder3d.js';
import * as cone3d from '../shapes/cone3d.js';
import * as sphere3d from '../shapes/sphere3d.js';
import * as prism3d from '../shapes/prism3d.js';
import * as twoPoints from '../shapes/twoPoints.js';
import * as offsetPoint from '../shapes/offsetPoint.js';
import * as stairPath from '../shapes/stairPath.js';
import * as wallStrip from '../shapes/wallStrip.js';
import * as twoRects from '../shapes/twoRects.js';
import { beamUdl, beamPoint, beamCantilever } from '../shapes/beam.js';
import { pyramid3d, frustumCone, tankH, arcSegment } from '../shapes/solids.js';
import {
  pipe3d, bendSheet, weldFillet, wallLayers, column, pumpHead,
  ratioBar, barsMulti, scalePair, polygonPts
} from '../shapes/diagrams.js';

const SHAPES = {
  rightTriangle,
  triangle,
  rectangle,
  circle,
  triangleBH,
  trapezoid,
  parallelogram,
  sector,
  ellipse,
  lineSegment,
  centerLine,
  miterAngle,
  box3d,
  cylinder3d,
  cone3d,
  sphere3d,
  prism3d,
  twoPoints,
  offsetPoint,
  stairPath,
  wallStrip,
  twoRects,
  beamUdl,
  beamPoint,
  beamCantilever,
  pyramid3d,
  frustumCone,
  tankH,
  arcSegment,
  pipe3d,
  bendSheet,
  weldFillet,
  wallLayers,
  column,
  pumpHead,
  ratioBar,
  barsMulti,
  scalePair,
  polygonPts
};

/** 面積・体積で大きい桁になったときに出す「別単位で見る」チップの閾値 */
const SUGGEST_AREA = 1e6; // mm²
const SUGGEST_UNIT = { area: 'm2', volume: 'm3' };

function h(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  for (const k of Object.keys(props)) {
    if (k === 'class') node.className = props[k];
    else if (k === 'text') node.textContent = props[k];
    else if (k === 'html') node.innerHTML = props[k];
    else if (k.startsWith('on')) node.addEventListener(k.slice(2).toLowerCase(), props[k]);
    else if (k === 'dataset') Object.assign(node.dataset, props[k]);
    else node.setAttribute(k, props[k]);
  }
  for (const c of [].concat(children)) if (c) node.appendChild(c);
  return node;
}

/**
 * 「入力項目の説明」カードに出す行を組み立てる。
 * 用語集(glossary.js)の定義と、その欄固有の help（目安値・使い方）を1行にまとめる。
 *
 * 方針:
 * - 専門用語を1つも含まない計算では空配列を返し、カードごと出さない。
 *   「幅=横方向の長さ」のような自明な説明で画面を埋めないため。
 * - 説明文が同一になる欄（材料1〜3の熱伝導率など）は、見出しを「・」でつないで1行に畳む。
 * @param {object} def CalcDef
 * @returns {{label:string, text:string}[]}
 */
function buildTermRows(def) {
  if (!def.fields.some((f) => termFor(f.label))) return [];
  const rows = [];
  const byText = new Map();
  for (const f of def.fields) {
    const text = explain(f.label, f.help);
    if (!text) continue;
    const hit = byText.get(text);
    if (hit) {
      hit.labels.push(f.label);
      continue;
    }
    const row = { labels: [f.label], text };
    byText.set(text, row);
    rows.push(row);
  }
  return rows.map((r) => ({ label: r.labels.join('・'), text: r.text }));
}

/** 計算ごとの画面状態（セッション内で保持する） */
export function createState(def) {
  const settings = getSettings();
  const units = {};
  // fixedUnit:true の欄は、設定の既定単位より欄自身の defaultUnit を優先する
  // （例: basic.unit系の「単位ごとに1行」表示で、各行を異なる単位で初期表示するため）。
  for (const f of def.fields) {
    units[f.key] = f.fixedUnit ? f.defaultUnit : defaultUnitFor(f.quantity, f.defaultUnit, settings);
  }
  const outUnits = {};
  for (const o of def.outputs) {
    // フィールドと同名キーがあればその単位を継承。無い場合、fixedUnit:true の出力は
    // 設定の既定単位より自身の defaultUnit を優先する（例: area.room が面積を
    // m²・坪・畳で同時表示するために、同じ内部値を3つの出力キーへ複製する場合）。
    outUnits[o.key] = units[o.key] || (o.fixedUnit ? o.defaultUnit : defaultUnitFor(o.quantity, o.defaultUnit, settings));
  }
  const raws = {};
  for (const f of def.fields) raws[f.key] = '';
  // exactBase: 単位を切り替えても内部値の精度を落とさないための保持先
  return { units, outUnits, raws, exactBase: {}, order: [], lastGood: null, focusKey: null };
}

/**
 * 履歴からの再計算用: createState() 直後の state に HistoryItem.inputs を流し込む。
 * changeFieldUnit() と同じ考え方（内部値は exactBase に保持し、raws は表示用の文字列に
 * するだけ）で精度を落とさない。存在しないフィールドキーは無視する。
 * @param {object} def CalcDef
 * @param {object} st createState() の戻り値
 * @param {Object<string,{v:number,u:string}>} inputs HistoryItem.inputs
 */
export function restoreInputs(def, st, inputs) {
  const settings = getSettings();
  for (const key of Object.keys(inputs || {})) {
    const f = def.fields.find((x) => x.key === key);
    const entry = inputs[key];
    if (!f || !entry || !Number.isFinite(entry.v)) continue;
    const unitId = entry.u || st.units[key];
    const internal = toBase(entry.v, f.quantity, unitId);
    if (!Number.isFinite(internal)) continue;
    st.units[key] = unitId;
    if (st.outUnits[key] !== undefined) st.outUnits[key] = unitId;
    st.exactBase[key] = internal;
    st.raws[key] = toRawString(internal, f.quantity, unitId, settings);
    st.order = st.order.filter((k) => k !== key);
    st.order.unshift(key);
  }
}

/**
 * このフィールドがマイナス値の入力を許すか（独自テンキーに符号キーを出すかの判定）。
 * `errors.js` の `validateFieldValue` と対応させる: `field.min` が未設定なら NEGATIVE
 * エラーが発生しない＝負値を許容する設計とみなす。ただし angle は min 未設定でも
 * 常に 0 未満を弾く特別扱いのため対象外（09-04 運用者判断: survey.js の coordField 等
 * `min` を意図的に付けていないフィールドで符号キーを表示する）。
 */
function allowsNegative(field) {
  if (field.quantity === 'angle') return false;
  return field.min === undefined || field.min === null;
}

function defaultUnitFor(quantity, fallback, settings) {
  if (quantity === 'length') return settings.defaultLengthUnit || fallback || 'mm';
  if (quantity === 'area') return settings.defaultAreaUnit || fallback || 'mm2';
  if (quantity === 'angle') return settings.defaultAngleUnit || fallback || 'deg';
  return fallback || quantity;
}

/**
 * @param {HTMLElement} appEl #app
 * @param {HTMLElement} barEl #appbar
 * @param {object} def CalcDef
 * @param {object} st createState() の戻り値（セッションをまたいで再利用する）
 * @returns {{destroy:Function}}
 */
export function renderCalcView(appEl, barEl, def, st) {
  const settings = getSettings();
  // スマホは端末のキーボードで直接打つ（拡大中でもブラウザが入力欄を見える位置へ送るため）。
  // PCはアプリ内テンキーのまま。設定で固定もできる。
  const useKeyboard = useDeviceKeyboard(settings);
  /** fieldKey → 入力行のDOM。行は作り直さず中身だけ更新する */
  const rows = new Map();
  /** どの欄にも紐づかないエラー（「あと2つ入力すると計算できます」等） */
  const formError = h('div', { class: 'field-error' });
  formError.hidden = true;

  /* ---------- ヘッダ ---------- */
  barEl.innerHTML = '';
  barEl.appendChild(backButton());
  barEl.appendChild(h('div', { class: 'appbar__title', text: def.title }));
  // 星だけだと何のボタンか伝わりにくいので、右に「お気に入り」と文字でも出す
  const favStar = h('span', { class: 'fav__star', text: isFavorite(def.id) ? '★' : '☆' });
  const favBtn = h(
    'button',
    {
      class: 'appbar__btn appbar__btn--fav',
      type: 'button',
      'aria-label': 'お気に入り',
      'aria-pressed': String(isFavorite(def.id))
    },
    [favStar, h('span', { class: 'fav__label', text: 'お気に入り' })]
  );
  favBtn.addEventListener('click', () => {
    const on = toggleFavorite(def.id);
    favStar.textContent = on ? '★' : '☆';
    favBtn.setAttribute('aria-pressed', String(on));
    showToast(on ? 'お気に入りに追加しました' : 'お気に入りから外しました');
  });
  barEl.appendChild(favBtn);

  /* ---------- 骨組み ---------- */
  appEl.innerHTML = '';
  appEl.className = 'app two-col';

  const colLeft = h('div', { class: 'col-left' });
  const colRight = h('div', { class: 'col-right' });
  appEl.appendChild(colLeft);
  appEl.appendChild(colRight);

  const shapeWrap = h('div', { class: 'shape-wrap' });
  const inputCard = h('div', { class: 'card' }, [
    h('div', { class: 'card__head' }, [h('span', { text: '入力' })])
  ]);
  const inputBody = h('div', {});
  inputCard.appendChild(inputBody);

  const resultCard = h('div', { class: 'card' }, [
    h('div', { class: 'card__head' }, [h('span', { text: '結果' })])
  ]);
  const resultBody = h('div', { class: 'card__body' });
  resultCard.appendChild(resultBody);

  const formulaCard = h('div', { class: 'card' }, [
    h('div', { class: 'card__head' }, [h('span', { text: '計算式' })])
  ]);
  const formulaBody = h('div', { class: 'card__body' });
  formulaCard.appendChild(formulaBody);

  const stepsCard = h('div', { class: 'card' }, [
    h('div', { class: 'card__head' }, [h('span', { text: '計算過程' })])
  ]);
  const stepsBody = h('div', { class: 'card__body' });
  stepsCard.appendChild(stepsBody);

  // 入力項目の説明。専門用語を含む計算だけに出す（buildTermRows が空なら丸ごと省く）
  const termRows = buildTermRows(def);
  const termsCard = h('div', { class: 'card' }, [
    h('div', { class: 'card__head' }, [h('span', { text: '入力項目の説明' })])
  ]);
  const termsBody = h('dl', { class: 'card__body terms' });
  for (const row of termRows) {
    termsBody.appendChild(h('dt', { class: 'terms__name', text: row.label }));
    termsBody.appendChild(h('dd', { class: 'terms__desc', text: row.text }));
  }
  termsCard.appendChild(termsBody);

  const notesCard = h('div', { class: 'card' }, [
    h('div', { class: 'card__head' }, [h('span', { text: '注意書き' })])
  ]);
  const notesBody = h('ul', { class: 'card__body notes' });
  for (const n of def.notes || []) notesBody.appendChild(h('li', { text: n }));
  notesCard.appendChild(notesBody);

  if (def.shape) colLeft.appendChild(shapeWrap);
  colLeft.appendChild(inputCard);
  colRight.appendChild(resultCard);
  colRight.appendChild(formulaCard);
  colRight.appendChild(stepsCard);
  if (termRows.length) colRight.appendChild(termsCard);
  colRight.appendChild(notesCard);

  if (!storeAvailable()) {
    showToast('この環境では履歴・お気に入りを保存できません。計算はそのまま使えます', { duration: 5000 });
  }

  /* ---------- 計算 ---------- */

  let idleTimer = null;
  let lastItem = null; // 成立時点で作った履歴データ

  function unitsByQuantity() {
    const map = {};
    for (const f of def.fields) if (!map[f.quantity]) map[f.quantity] = st.units[f.key];
    for (const o of def.outputs) if (!map[o.quantity]) map[o.quantity] = st.outUnits[o.key];
    return map;
  }

  /** 手順1: 各欄の {value, unit} を内部単位へ正規化する */
  function collectEntered() {
    const entered = {};
    let badField = null;
    for (const f of def.fields) {
      const raw = st.raws[f.key];
      if (raw === '' || raw === null || raw === undefined) continue;
      const n = parseNumber(raw);
      if (!Number.isFinite(n)) {
        badField = f.key;
        continue;
      }
      // 単位を切り替えただけの欄は、丸めた表示文字列ではなく内部値をそのまま使う
      const exact = st.exactBase[f.key];
      entered[f.key] = Number.isFinite(exact) ? exact : toBase(n, f.quantity, st.units[f.key]);
    }
    return { entered, badField };
  }

  function recompute() {
    const { entered, badField } = collectEntered();
    st.entered = entered; // 図形が入力値そのものを描けるように保持する
    st.order = st.order.filter((k) => Object.prototype.hasOwnProperty.call(entered, k));
    const ctx = makeStepContext(def, unitsByQuantity(), settings);
    const res = solve(def, { entered, order: st.order }, ctx);

    if (res.status === 'ok') {
      // 採用されなかった古い入力は算出値へ戻す（LRU）
      for (const k of st.order.slice()) {
        if (!res.locked.includes(k)) {
          st.raws[k] = '';
          delete st.exactBase[k];
        }
      }
      st.order = st.order.filter((k) => res.locked.includes(k));
      st.lastGood = res;
      // 履歴データは「成立したその瞬間の入力」で作る。
      // 3秒後のタイマーで st を読み直すと、その間の編集とズレる。
      lastItem = buildHistoryItem(res);
      scheduleIdleSave();
    }

    render(res, badField);
    // 打鍵のたびにテンキー内のミニ図も引き直す（打つそばから形が変わるのが分かるように）
    if (numpadOpen()) updateNumpad({ hint: hintFor(res), refreshFigure: true });
    return res;
  }

  function hintFor(res) {
    if (res.status === 'incomplete' && res.error) return res.error.message;
    if (res.status === 'error' && res.error) return res.error.message;
    return '';
  }

  /* ---------- 表示 ---------- */

  /** フィールドとして見つからない場合、出力定義から探す（area.room の diagonal 等、
   *  ユーザーが直接入力しない「出力専用キー」を図形に渡すためのフォールバック）。 */
  function fieldOrOutput(key) {
    return def.fields.find((x) => x.key === key) || def.outputs.find((x) => x.key === key) || null;
  }

  /** そのキーが入力欄を持つか（＝図形ラベルをタップして編集できるか） */
  function isField(key) {
    return def.fields.some((x) => x.key === key);
  }

  function valueOfField(key, res) {
    const f = fieldOrOutput(key);
    if (!f) return { state: 'empty', text: '—', unit: undefined };
    const unit = st.units[key] !== undefined ? st.units[key] : st.outUnits[key];
    const raw = st.raws[key];
    if (raw !== '' && raw !== null && raw !== undefined) {
      return { state: 'input', text: formatRawForDisplay(raw), unit };
    }
    // res は null で呼ばれることがある（テンキー内のミニ図を計算成立前に描くとき）
    const source = res && res.status === 'ok' ? res : st.lastGood;
    const v = source && source.values ? source.values[key] : undefined;
    if (Number.isFinite(v)) {
      const fv = formatValue(v, f.quantity, unit, settings, { withUnit: false });
      return { state: 'derived', text: fv.num, unit };
    }
    return { state: 'empty', text: '—', unit };
  }

  function render(res, badField) {
    renderShape(res);
    renderInputs(res, badField);
    renderResult(res);
    renderFormula(res);
    renderSteps(res);
  }

  /**
   * 図形のSVGを組み立てて返す（DOMへの取り付けは呼び出し側）。
   * 計算画面の図とテンキー内のミニ図で同じ絵を使うため、描画をここに一本化している。
   * @param {object} res solve() の結果
   * @param {string|null} focusFieldKey 強調するフィールドキー（テンキーで編集中の欄）
   * @returns {{svg:SVGElement, toFieldKey:Function}|null}
   */
  function buildShapeSvg(res, focusFieldKey) {
    if (!def.shape) return null;
    const mod = SHAPES[def.shape];
    if (!mod) return null;

    const source = res && res.status === 'ok' ? res : st.lastGood;
    // 図には「入力した値」も渡す。solve() の values は provides に挙げたキーしか含まないため、
    // 座標や層の厚さのように「入力そのものを描きたい」図形が値を受け取れないことがある
    // （survey.polygon / hvac.uvalue / basic.stats など）。算出値のほうを優先して上書きする。
    const srcValues = Object.assign({}, st.entered || {}, source ? source.values : {});

    // shapeMap: 図形側の内部キー（a/b/c/angA/angC等）と CalcDef のフィールドキーが
    // 異なる場合の対応表（例: slope.length が rightTriangle を「水平距離/高低差/斜距離」の
    // ラベルで流用する場合）。無指定なら図形キー＝フィールドキーとして扱う（従来どおり）。
    const map = def.shapeMap || null;

    const values = {};
    const labels = {};
    if (map) {
      for (const shapeKey of Object.keys(map)) {
        const fieldKey = map[shapeKey];
        if (!fieldKey) continue;
        const f = fieldOrOutput(fieldKey);
        if (!f) continue;
        if (Number.isFinite(srcValues[fieldKey])) values[shapeKey] = srcValues[fieldKey];
        const v = valueOfField(fieldKey, res);
        const label = unitLabel(f.quantity, v.unit);
        const attached = f.quantity === 'angle' || f.quantity === 'percent';
        // 出力にしか対応キーが無いラベル（面積・対角線など）は入力できない。
        // ボタンに見せると押しても何も起きず壊れて見えるため readonly として描く。
        const editable = isField(fieldKey);
        labels[shapeKey] = {
          text: v.state === 'empty' ? `— ${label}` : attached ? v.text + label : `${v.text} ${label}`,
          state: editable ? v.state : 'readonly',
          name: f.label
        };
      }
    } else {
      Object.assign(values, srcValues);
      for (const f of def.fields) {
        const v = valueOfField(f.key, res);
        const label = unitLabel(f.quantity, v.unit);
        const attached = f.quantity === 'angle' || f.quantity === 'percent';
        labels[f.key] = {
          text: v.state === 'empty' ? `— ${label}` : attached ? v.text + label : `${v.text} ${label}`,
          state: v.state,
          name: f.label
        };
      }
    }

    // focusKey はフィールドキー基準。shapeMap 使用時は図形側キーへ変換して渡す。
    const focusShapeKey = map
      ? Object.keys(map).find((sk) => map[sk] === focusFieldKey) || null
      : focusFieldKey;

    const svg = mod.render({ values, labels, focusKey: focusShapeKey });
    // shapeMap 使用時、ラベルの data-key は図形側キー（a/b/c 等）なので
    // フィールドキーへ逆引きしてから openField する。
    const toFieldKey = (shapeKey) => (map ? map[shapeKey] : shapeKey);
    return { svg, toFieldKey };
  }

  /** テンキー内のミニ図。編集中の欄を強調した同じ図を返す（DOM取り付け後に refit する） */
  function figureForNumpad(fieldKey) {
    const built = buildShapeSvg(st.lastGood, fieldKey);
    return built ? built.svg : null;
  }

  function renderShape(res) {
    const built = buildShapeSvg(res, st.focusKey);
    if (!built) return;
    const { svg, toFieldKey } = built;

    shapeWrap.innerHTML = '';
    shapeWrap.appendChild(svg);
    // 文字幅の実測は DOM に載ってからでないとできないので、ここでピル幅を引き直す
    refitLabels(svg);

    svg.addEventListener('click', (e) => {
      const g = e.target.closest ? e.target.closest('.dim') : null;
      const fk = g && g.dataset.key ? toFieldKey(g.dataset.key) : null;
      if (!fk) return;
      if (isField(fk)) openField(fk);
      else tapResultLabel(fk);
    });
    svg.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const g = e.target.closest ? e.target.closest('.dim') : null;
      const fk = g && g.dataset.key ? toFieldKey(g.dataset.key) : null;
      if (fk && isField(fk)) {
        e.preventDefault();
        openField(fk);
      }
    });
  }

  /**
   * 入力欄の行を1度だけ作る。
   * 以後は updateRow() で中身だけ書き換える——端末キーボードで打っている最中に
   * <input> を作り直すと、フォーカスもカーソル位置も失われるため。
   */
  function buildRow(f) {
    // 端末キーボードのときは、長いラベルに押されて入力欄が潰れないよう
    // ラベル側を縮む・折り返す扱いにする（--edit）
    const label = h('span', {
      class: 'field-row__label' + (useKeyboard ? ' field-row__label--edit' : ''),
      text: f.label
    });
    const badge = h('span', { class: 'field-row__badge', text: '算出' });
    badge.hidden = true;
    const row = h('div', { class: 'field-row' });
    let valueEl = null;
    let input = null;

    if (useKeyboard) {
      const last = def.fields[def.fields.length - 1].key === f.key;
      input = h('input', {
        class: 'field-row__value field-row__input',
        type: 'text',
        // decimal のテンキーには符号キーが無い端末がある。負値を許す欄は text にして
        // 通常のキーボードを出す（座標のように「−」を打つ欄があるため）
        inputmode: allowsNegative(f) ? 'text' : 'decimal',
        enterkeyhint: last ? 'done' : 'next',
        autocomplete: 'off',
        placeholder: '—',
        'aria-label': f.label
      });
      input.addEventListener('focus', () => {
        st.focusKey = f.key;
        // 算出値が出ている欄は空にしてから打たせる（打った数字が算出値の後ろに続かないように）
        if (st.raws[f.key] === '') input.value = '';
        recompute();
      });
      input.addEventListener('blur', () => {
        if (st.focusKey === f.key) st.focusKey = null;
        recompute(); // 打たなかった場合は算出値の表示に戻る
      });
      input.addEventListener('input', () => setRaw(f.key, input.value));
      input.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter') return;
        e.preventDefault();
        const nextNode = rows.get(nextFieldKey(f.key));
        if (nextNode && nextNode.input) nextNode.input.focus();
        else input.blur();
      });
      row.appendChild(label);
      row.appendChild(input);
      row.appendChild(badge);
    } else {
      valueEl = h('span', { class: 'field-row__value' });
      row.appendChild(
        h('button', {
          class: 'field-row__tap',
          type: 'button',
          'aria-label': `${f.label} を入力`,
          onclick: () => openField(f.key)
        }, [label, valueEl, badge])
      );
    }

    // 単位。PCはチップを押すたびに次の単位へ送る（従来どおり）。
    // 端末キーボードのときはテンキー内の単位一覧が出せないので、
    // チップを押したら行の下に一覧を開く（7種類ある長さを送り送りで探させないため）。
    // チップは作り直さないので、現在の単位は押された時点で読む（作成時の値で固定しない）。
    const pickable = useKeyboard && hasPicker(f.quantity);
    const unitBox = pickable ? h('div', { class: 'field-units' }) : null;
    if (unitBox) unitBox.hidden = true;
    const chip = pickable
      ? h('button', {
          class: 'field-row__unit',
          type: 'button',
          'aria-expanded': 'false',
          text: unitLabel(f.quantity, st.units[f.key]) || st.units[f.key],
          onclick: () => toggleUnits(f)
        })
      : makeUnitChip(f.quantity, () => st.units[f.key], (u) => changeFieldUnit(f.key, u));
    row.appendChild(chip);
    row.appendChild(
      h('button', {
        class: 'field-row__clear',
        type: 'button',
        'aria-label': `${f.label} をクリア`,
        text: '✕',
        onclick: () => clearField(f.key)
      })
    );

    const error = h('div', { class: 'field-error' });
    error.hidden = true;
    return { row, valueEl, input, badge, chip, unitBox, error };
  }

  /** 端末キーボードのときの単位一覧。開いているのは常に1つだけにする */
  function toggleUnits(f) {
    const node = rows.get(f.key);
    if (!node || !node.unitBox) return;
    const open = node.unitBox.hidden;
    for (const other of rows.values()) {
      if (!other.unitBox) continue;
      other.unitBox.hidden = true;
      other.chip.setAttribute('aria-expanded', 'false');
    }
    if (!open) return;
    node.unitBox.innerHTML = '';
    node.unitBox.appendChild(
      createUnitChips(f.quantity, st.units[f.key], (u) => {
        changeFieldUnit(f.key, u);
        node.unitBox.hidden = true;
        node.chip.setAttribute('aria-expanded', 'false');
      })
    );
    node.unitBox.hidden = false;
    node.chip.setAttribute('aria-expanded', 'true');
  }

  function updateRow(f, res, badField) {
    const node = rows.get(f.key);
    if (!node) return;
    const v = valueOfField(f.key, res);

    node.row.className =
      'field-row' +
      (v.state === 'derived' ? ' is-derived' : '') +
      (v.state === 'empty' ? ' is-empty' : '') +
      (st.focusKey === f.key ? ' is-focus' : '');
    node.badge.hidden = v.state !== 'derived';

    if (node.input) {
      // 打鍵中の欄には触れない（カーソルが末尾へ飛ぶため）。
      // 入力済みの欄は生文字列をそのまま見せる（桁区切りを入れると編集しづらい）。
      if (document.activeElement !== node.input) {
        const shown = st.raws[f.key] !== '' ? st.raws[f.key] : v.state === 'derived' ? v.text : '';
        if (node.input.value !== shown) node.input.value = shown;
      }
    } else {
      node.valueEl.textContent = v.text;
    }

    const unitText = unitLabel(f.quantity, st.units[f.key]) || '—';
    node.chip.textContent = unitText;
    if (node.chip.tagName === 'BUTTON') {
      node.chip.setAttribute(
        'aria-label',
        (node.unitBox ? '単位を選ぶ（現在: ' : '単位を切り替える（現在: ') + unitText + '）'
      );
    }

    const message = res.error && res.error.field === f.key
      ? res.error.message
      : badField === f.key
        ? '数字として読み取れません'
        : '';
    node.error.textContent = message;
    node.error.hidden = !message;
  }

  function renderInputs(res, badField) {
    if (!rows.size) {
      for (const f of def.fields) {
        const node = buildRow(f);
        rows.set(f.key, node);
        inputBody.appendChild(node.row);
        if (node.unitBox) inputBody.appendChild(node.unitBox);
        inputBody.appendChild(node.error);
      }
      inputBody.appendChild(formError);
    }

    for (const f of def.fields) updateRow(f, res, badField);

    const whole = res.error && !res.error.field ? res.error.message : '';
    formError.textContent = whole;
    formError.className = 'field-error' + (res.error && res.error.isInfo ? ' is-info' : '');
    formError.hidden = !whole;
  }

  /**
   * 単位チップ。押すごとに次の単位へ切り替え、値は換算して引き継ぐ。
   * @param {string} quantity
   * @param {Function|string} current 現在の単位。関数なら押された時点で読む
   *   （チップを作り直さない入力欄では、作成時の値で固定すると切り替えが1回で止まる）
   * @param {Function} onChange
   */
  function makeUnitChip(quantity, current, onChange) {
    const unitNow = () => (typeof current === 'function' ? current() : current);
    if (!hasPicker(quantity)) {
      return h('span', { class: 'field-row__unit', text: unitLabel(quantity, unitNow()) || '—' });
    }
    return h('button', {
      class: 'field-row__unit',
      type: 'button',
      'aria-label': '単位を切り替える（現在: ' + (unitLabel(quantity, unitNow()) || unitNow()) + '）',
      text: unitLabel(quantity, unitNow()) || unitNow(),
      onclick: () => {
        const now = unitNow();
        const list = unitList(quantity);
        const i = list.findIndex((u) => u.id === now);
        onChange(list[(i + 1) % list.length].id);
      }
    });
  }

  function renderResult(res) {
    resultBody.innerHTML = '';
    const source = res.status === 'ok' ? res : st.lastGood;

    // エラー文言は該当入力欄の直下にだけ出す（第9章）。ここでは繰り返さない。
    if (!source) {
      resultBody.appendChild(h('div', { class: 'empty', text: '数値を入力すると結果が出ます' }));
      resultBody.appendChild(actionRow(false));
      return;
    }

    const box = h('div', { class: res.status === 'ok' ? '' : 'is-stale' });

    // いま何が算出値かを明示する
    const derivedFieldKeys = source.derivedKeys.filter((k) => def.fields.some((f) => f.key === k));
    const names = derivedFieldKeys.map((k) => def.fields.find((f) => f.key === k).label);
    if (names.length) {
      box.appendChild(h('div', { class: 'result-lead', text: '求めた値: ' + names.join('・') }));
    }

    // primary は「未入力だったもの」を最大2件、大きく表示する
    const primaryKeys = derivedFieldKeys.slice(0, 2);
    for (const key of primaryKeys) {
      const out = def.outputs.find((o) => o.key === key);
      if (!out) continue;
      box.appendChild(resultLine(out, source.values[key], true));
    }

    const grid = h('div', { class: 'result-grid' });
    for (const out of def.outputs) {
      if (primaryKeys.includes(out.key)) continue;
      const v = source.values[out.key];
      if (!Number.isFinite(v)) continue;
      grid.appendChild(resultLine(out, v, false));
    }
    box.appendChild(grid);

    resultBody.appendChild(box);
    resultBody.appendChild(actionRow(res.status === 'ok'));
  }

  function resultLine(out, value, primary) {
    const unit = st.outUnits[out.key];
    const fv = formatValue(value, out.quantity, unit, settings);

    const valueBtn = h('button', {
      class: primary ? 'result-primary__value' : 'result-cell__value',
      type: 'button',
      'aria-label': `${out.label} ${fv.text}（押すとコピー）`,
      text: fv.text,
      onclick: () => copyText(fv.text)
    });

    const chip = makeUnitChip(out.quantity, unit, (u) => {
      st.outUnits[out.key] = u;
      recompute();
    });

    const label = h('span', {
      class: primary ? 'result-primary__label' : 'result-cell__label',
      text: out.label
    });

    // 桁が大きいときは別単位のサジェストを出す（自動では切り替えない）。
    // fixedUnit な出力（例: V_mm3/V_m3/V_L のように同じ内部値を複数キーへ複製したもの）は
    // 表示単位が固定の設計なので対象外にする（内部値は常にmm系のため、mm³→L等でも
    // 常に閾値超えとみなされ、意図しない「m³で見る」チップが出てしまう不具合があった）
    const suggest = SUGGEST_UNIT[out.quantity];
    const suggestChip =
      !out.fixedUnit && suggest && suggest !== unit && Math.abs(value) >= SUGGEST_AREA
        ? h('button', {
            class: 'suggest-chip',
            type: 'button',
            text: `${unitLabel(out.quantity, suggest)} で見る`,
            onclick: () => {
              st.outUnits[out.key] = suggest;
              recompute();
            }
          })
        : null;

    if (primary) {
      return h('div', { class: 'result-primary' }, [label, valueBtn, chip, suggestChip]);
    }
    return h('div', { class: 'result-cell' }, [
      label,
      h('div', { class: 'result-cell__row' }, [valueBtn, chip, suggestChip])
    ]);
  }

  function actionRow(enabled) {
    const save = h('button', {
      class: 'btn btn--primary',
      type: 'button',
      text: '履歴に保存',
      onclick: () => {
        if (!lastItem) return;
        if (!storeAvailable()) {
          showToast('この環境では保存できません');
          return;
        }
        saveItem();
        showToast('履歴に保存しました');
      }
    });
    if (!enabled) save.setAttribute('disabled', 'disabled');

    const reset = h('button', {
      class: 'btn btn--ghost',
      type: 'button',
      text: 'やり直す',
      onclick: clearAll
    });
    return h('div', { class: 'result-actions' }, [save, reset]);
  }

  function renderFormula(res) {
    formulaBody.innerHTML = '';
    const source = res.status === 'ok' ? res : st.lastGood;
    if (!source || !source.formulaName) {
      formulaBody.appendChild(h('div', { class: 'empty', text: '計算が成立すると式が出ます' }));
      return;
    }
    const general = source.steps && source.steps[0] ? source.steps[0].formula : '';
    formulaBody.appendChild(
      h('div', { class: 'formula' }, [
        h('span', { class: 'formula__name', text: source.formulaName }),
        h('span', { text: general })
      ])
    );
  }

  const CIRCLED = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨'];

  function renderSteps(res) {
    stepsBody.innerHTML = '';
    const source = res.status === 'ok' ? res : st.lastGood;
    if (!source || !source.steps || !source.steps.length) {
      stepsBody.appendChild(h('div', { class: 'empty', text: '計算が成立すると過程が出ます' }));
      return;
    }
    const list = h('div', { class: 'steps' });
    source.steps.forEach((s, i) => {
      const box = h('div', { class: 'step' });
      box.appendChild(
        h('div', {}, [
          h('span', { class: 'step__no', text: CIRCLED[i] || `(${i + 1})` }),
          h('span', { text: s.formula })
        ])
      );
      if (s.substituted) box.appendChild(h('div', { class: 'step__line', text: '= ' + s.substituted }));
      if (s.mid) box.appendChild(h('div', { class: 'step__line', text: '= ' + s.mid }));
      if (s.result) box.appendChild(h('div', { class: 'step__line', text: '= ' + s.result }));
      list.appendChild(box);
    });
    stepsBody.appendChild(list);
  }

  /* ---------- 操作 ---------- */

  function openField(key) {
    const f = def.fields.find((x) => x.key === key);
    if (!f) return;

    // 端末キーボードのときはシートを出さず、その欄にカーソルを入れる
    // （図の寸法ラベルをタップしたときもここへ来る）
    if (useKeyboard) {
      const node = rows.get(key);
      if (!node || !node.input) return;
      node.row.scrollIntoView({ block: 'center' });
      node.input.focus();
      return;
    }

    st.focusKey = key;

    const idx = def.fields.findIndex((x) => x.key === key);

    openNumpad({
      fieldKey: key,
      title: f.label,
      // 欄固有の help が無い専門用語は、用語集の定義で代替する
      help: f.help || (termFor(f.label) ? termFor(f.label).desc : ''),
      index: idx,
      count: def.fields.length,
      // テンキーの中に同じ図を出し、いま入れている寸法を光らせる
      // （図が下のシートで隠れても「どこの寸法か」が分かるようにするため）
      figure: () => figureForNumpad(key),
      quantity: f.quantity,
      unit: st.units[key],
      allowNegative: allowsNegative(f),
      raw: st.raws[key],
      hint: '',
      anchorEl: def.shape ? shapeWrap : inputCard,
      onInput: (raw) => {
        setRaw(key, raw);
      },
      onUnitChange: (u) => {
        changeFieldUnit(key, u);
        updateNumpad({ unit: u, raw: st.raws[key] });
      },
      onNext: () => {
        const next = nextFieldKey(key);
        if (next) openField(next);
      },
      onPrev: () => {
        const prev = prevFieldKey(key);
        if (prev) openField(prev);
      },
      onClose: () => {
        st.focusKey = null;
        recompute();
      }
    });
    recompute();
  }

  /**
   * 図の「結果ラベル」（面積・対角線など、入力欄を持たない値）をタップしたとき。
   * 入力はできないので、結果カードの値と同じくコピーして理由を伝える。
   */
  function tapResultLabel(key) {
    const out = def.outputs.find((o) => o.key === key);
    const source = st.lastGood;
    const v = source && source.values ? source.values[key] : undefined;
    const name = out ? out.label : '';
    if (!out || !Number.isFinite(v)) {
      showToast(`${name}は計算結果です。ここには入力できません`);
      return;
    }
    const text = `${out.label} ${formatValue(v, out.quantity, st.outUnits[out.key], settings).text}`;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(
        () => showToast(`${text} をコピーしました（計算結果なので入力はできません）`),
        () => showToast(`${text} は計算結果です。ここには入力できません`)
      );
    } else {
      showToast(`${text} は計算結果です。ここには入力できません`);
    }
  }

  function setRaw(key, raw) {
    st.raws[key] = raw;
    delete st.exactBase[key]; // 打鍵したらその文字列が正になる
    // 触った欄を「最後に触った順」の先頭へ
    st.order = st.order.filter((k) => k !== key);
    if (raw !== '') st.order.unshift(key);
    recompute();
  }

  function changeFieldUnit(key, unitId) {
    const f = def.fields.find((x) => x.key === key);
    const old = st.units[key];
    if (!f || old === unitId) return;

    // 単位を切り替えても再入力させない。内部値を保って表示だけ換算する。
    const raw = st.raws[key];
    const n = parseNumber(raw);
    if (raw !== '' && raw !== null && Number.isFinite(n)) {
      const exact = st.exactBase[key];
      const internal = Number.isFinite(exact) ? exact : toBase(n, f.quantity, old);
      st.units[key] = unitId;
      // 表示は新しい単位へ換算した文字列にし、計算には内部値をそのまま使う
      st.exactBase[key] = internal;
      st.raws[key] = toRawString(internal, f.quantity, unitId, settings);
    } else {
      st.units[key] = unitId;
    }
    // 出力側で同じキーを持つものも合わせる
    if (st.outUnits[key] !== undefined) st.outUnits[key] = unitId;
    recompute();
  }

  function clearField(key) {
    st.raws[key] = '';
    delete st.exactBase[key];
    st.order = st.order.filter((k) => k !== key);
    recompute();
  }

  function clearAll() {
    const snapshot = { raws: Object.assign({}, st.raws), exactBase: Object.assign({}, st.exactBase), order: st.order.slice() };
    for (const f of def.fields) {
      st.raws[f.key] = '';
      delete st.exactBase[f.key];
    }
    st.order = [];
    st.lastGood = null;
    recompute();
    showToast('すべてクリアしました', {
      duration: 5000,
      actionLabel: '元に戻す',
      onAction: () => {
        st.raws = snapshot.raws;
        st.exactBase = snapshot.exactBase;
        st.order = snapshot.order;
        recompute();
      }
    });
  }

  function nextFieldKey(key) {
    const keys = def.fields.map((f) => f.key);
    const i = keys.indexOf(key);
    for (let n = 1; n <= keys.length; n++) {
      const k = keys[(i + n) % keys.length];
      if (st.raws[k] === '') return k;
    }
    return keys[(i + 1) % keys.length];
  }

  function prevFieldKey(key) {
    const keys = def.fields.map((f) => f.key);
    const i = keys.indexOf(key);
    return keys[(i - 1 + keys.length) % keys.length];
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(
        () => showToast('コピーしました: ' + text),
        () => showToast('この環境ではコピーできません')
      );
    } else {
      showToast('この環境ではコピーできません');
    }
  }

  /* ---------- 履歴 ---------- */

  function buildHistoryItem(res) {
    if (!res || res.status !== 'ok') return null;
    const inputs = {};
    for (const key of res.locked) {
      const f = def.fields.find((x) => x.key === key);
      // 単位切替で丸めた表示文字列ではなく、保持している内部値から復元する
      const exact = st.exactBase[key];
      const f2 = def.fields.find((x) => x.key === key);
      inputs[key] = {
        v: Number.isFinite(exact) && f2 ? fromBase(exact, f2.quantity, st.units[key]) : parseNumber(st.raws[key]),
        u: st.units[key]
      };
      if (!f) delete inputs[key];
    }
    const firstDerived = res.derivedKeys.find((k) => def.outputs.some((o) => o.key === k));
    const out = def.outputs.find((o) => o.key === firstDerived);
    const summary = out
      ? `${out.label} ${formatValue(res.values[out.key], out.quantity, st.outUnits[out.key], settings).text}`
      : '';
    return { calcId: def.id, title: def.title, inputs, summary };
  }

  function saveItem() {
    if (!lastItem || !storeAvailable()) return false;
    saveHistory(lastItem);
    return true;
  }

  // 「3秒間入力が止まったら保存」（REQUIREMENTS 2-5）
  function scheduleIdleSave() {
    if (!storeAvailable()) return;
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = setTimeout(saveItem, 3000);
  }

  /* ---------- 起動 ---------- */

  recompute();

  return {
    destroy() {
      if (idleTimer) clearTimeout(idleTimer);
      saveItem(); // 画面を離れるときに保存
      closeNumpad({ silent: true });
    }
  };
}
