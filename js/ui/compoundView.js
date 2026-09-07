// compoundView.js — 複合図形（area.compound）専用画面
//
// 【設計メモ・2026-09-04 運用者判断】js/calcs/compound.js 冒頭コメント参照。
// 他の計算は js/ui/calcView.js が「固定フィールド集合」を汎用描画するが、
// この画面は「任意個数の長方形を追加・穴として合成する」ための専用UIを持つ。
// solver.js の LRU逆算エンジンは使わない（可変長入力とは設計思想が合わないため）。
// 図形の合計面積 = Σ(追加した長方形の面積) − Σ(穴とした長方形の面積) の単純な
// 足し引きで計算する（長方形どうしの重なりを幾何学的に判定・クリップはしない。
// notes にその旨を明記している）。

import { openNumpad, closeNumpad, update as updateNumpad, isOpen as numpadOpen } from './numpad.js';
import { parseNumber, formatRawForDisplay, toRawString, formatValue } from '../core/format.js';
import { toBase, unitLabel, unitList, hasPicker } from '../core/units.js';
import { getSettings, saveHistory, isFavorite, toggleFavorite, available as storeAvailable } from '../core/store.js';
import { backButton } from './icons.js';
import { ERROR_MESSAGES, MAX_ABS } from '../core/errors.js';
import { createScene, refitLabels } from '../shapes/engine.js';
import { showToast } from './toast.js';

const KEYS = ['w', 'h', 'x', 'y'];

const FIELD_DEFS = {
  w: { key: 'w', label: '幅', quantity: 'length', defaultUnit: 'mm', min: 0, exclusiveMin: true },
  h: { key: 'h', label: '高さ', quantity: 'length', defaultUnit: 'mm', min: 0, exclusiveMin: true },
  x: { key: 'x', label: 'X位置', quantity: 'length', defaultUnit: 'mm', help: '基準点からの左右位置（負の値で逆方向）' },
  y: { key: 'y', label: 'Y位置', quantity: 'length', defaultUnit: 'mm', help: '基準点からの上下位置（負の値で逆方向）' }
};

function allowsNegative(key) {
  const f = FIELD_DEFS[key];
  return f.min === undefined || f.min === null;
}

function newShape(n) {
  const zeroDefault = n === 1; // 最初の1枚だけ x=0,y=0 を初期値にしておく（毎回0入力させないため）
  return {
    mode: 'add',
    units: { w: 'mm', h: 'mm', x: 'mm', y: 'mm' },
    raws: { w: '', h: '', x: zeroDefault ? '0' : '', y: zeroDefault ? '0' : '' },
    exactBase: {}
  };
}

export function createCompoundState() {
  return { shapes: [newShape(1)], outUnit: 'm2', focus: null };
}

/**
 * 履歴からの再計算用。保存済みの shapes 配列（buildShapesPayload() が作った形）から state を作り直す。
 */
export function restoreCompoundInputs(st, savedShapes) {
  if (!Array.isArray(savedShapes) || !savedShapes.length) return;
  const settings = getSettings();
  st.shapes = savedShapes.map((s, i) => {
    const shape = newShape(i + 1);
    shape.mode = s.mode === 'sub' ? 'sub' : 'add';
    for (const key of KEYS) {
      const v = s[key];
      const u = (s.units && s.units[key]) || 'mm';
      if (Number.isFinite(v)) {
        shape.units[key] = u;
        shape.exactBase[key] = v;
        shape.raws[key] = toRawString(v, 'length', u, settings);
      }
    }
    return shape;
  });
}

function numOf(shape, key, defaultZero) {
  const exact = shape.exactBase[key];
  if (Number.isFinite(exact)) return exact;
  const raw = shape.raws[key];
  if (raw === '' || raw === null || raw === undefined) return defaultZero ? 0 : NaN;
  const n = parseNumber(raw);
  if (!Number.isFinite(n)) return NaN;
  return toBase(n, 'length', shape.units[key]);
}

/** 1枚の長方形を評価する。status: empty | incomplete | error | ok */
function evaluateShape(shape) {
  const raw = shape.raws;
  if (KEYS.every((k) => raw[k] === '')) return { status: 'empty' };

  for (const key of ['w', 'h', 'x', 'y']) {
    if (raw[key] === '') continue;
    const n = parseNumber(raw[key]);
    if (!Number.isFinite(n)) return { status: 'error', error: { key, msg: ERROR_MESSAGES.BAD_NUMBER } };
  }

  const w = numOf(shape, 'w');
  const h = numOf(shape, 'h');
  const x = numOf(shape, 'x', true);
  const y = numOf(shape, 'y', true);

  if (!Number.isFinite(w) || !Number.isFinite(h)) return { status: 'incomplete', w, h, x, y };

  for (const [key, val] of [['w', w], ['h', h], ['x', x], ['y', y]]) {
    if (Math.abs(val) > MAX_ABS) return { status: 'error', error: { key, msg: ERROR_MESSAGES.TOO_LARGE }, w, h, x, y };
  }
  if (w <= 0) return { status: 'error', error: { key: 'w', msg: w < 0 ? ERROR_MESSAGES.NEGATIVE : ERROR_MESSAGES.ZERO }, w, h, x, y };
  if (h <= 0) return { status: 'error', error: { key: 'h', msg: h < 0 ? ERROR_MESSAGES.NEGATIVE : ERROR_MESSAGES.ZERO }, w, h, x, y };

  const area = w * h;
  return { status: 'ok', mode: shape.mode, w, h, x, y, area, signedArea: shape.mode === 'sub' ? -area : area };
}

function evaluateAll(shapes) {
  const results = shapes.map(evaluateShape);
  let total = 0;
  for (const r of results) if (r.status === 'ok') total += r.signedArea;
  const okCount = results.filter((r) => r.status === 'ok').length;
  const hasError = results.some((r) => r.status === 'error');
  return { results, total, okCount, hasError };
}

function buildShapesPayload(shapes) {
  return shapes
    .filter((s) => !KEYS.every((k) => s.raws[k] === ''))
    .map((s) => {
      const out = { mode: s.mode, units: Object.assign({}, s.units) };
      for (const key of KEYS) {
        const v = numOf(s, key, key === 'x' || key === 'y');
        out[key] = Number.isFinite(v) ? v : null;
      }
      return out;
    });
}

function h(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  for (const k of Object.keys(props)) {
    if (k === 'class') node.className = props[k];
    else if (k === 'text') node.textContent = props[k];
    else if (k.startsWith('on')) node.addEventListener(k.slice(2).toLowerCase(), props[k]);
    else node.setAttribute(k, props[k]);
  }
  for (const c of [].concat(children)) if (c) node.appendChild(c);
  return node;
}

export function renderCompoundView(appEl, barEl, def, st) {
  const settings = getSettings();
  let idleTimer = null;
  let lastItem = null;

  /* ---------- ヘッダ ---------- */
  barEl.innerHTML = '';
  barEl.appendChild(backButton());
  barEl.appendChild(h('div', { class: 'appbar__title', text: def.title }));
  // calcView.js と同じく、星の右に「お気に入り」の文字を添える
  const favStar = h('span', { class: 'fav__star', text: isFavorite(def.id) ? '★' : '☆' });
  const favBtn = h(
    'button',
    {
      class: 'appbar__btn appbar__btn--fav', type: 'button', 'aria-label': 'お気に入り',
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
  const listCard = h('div', { class: 'card' }, [h('div', { class: 'card__head' }, [h('span', { text: '長方形の一覧' })])]);
  const listBody = h('div', {});
  listCard.appendChild(listBody);
  const addRow = h('div', { class: 'result-actions' });
  const addBtn = h('button', { class: 'btn btn--primary', type: 'button', text: '＋ 長方形を追加', onclick: addShape });
  addRow.appendChild(addBtn);

  const resultCard = h('div', { class: 'card' }, [h('div', { class: 'card__head' }, [h('span', { text: '結果' })])]);
  const resultBody = h('div', { class: 'card__body' });
  resultCard.appendChild(resultBody);

  const stepsCard = h('div', { class: 'card' }, [h('div', { class: 'card__head' }, [h('span', { text: '内訳' })])]);
  const stepsBody = h('div', { class: 'card__body' });
  stepsCard.appendChild(stepsBody);

  const notesCard = h('div', { class: 'card' }, [h('div', { class: 'card__head' }, [h('span', { text: '注意書き' })])]);
  const notesBody = h('ul', { class: 'card__body notes' });
  for (const n of def.notes || []) notesBody.appendChild(h('li', { text: n }));
  notesCard.appendChild(notesBody);

  colLeft.appendChild(shapeWrap);
  colLeft.appendChild(listCard);
  colLeft.appendChild(addRow);
  colRight.appendChild(resultCard);
  colRight.appendChild(stepsCard);
  colRight.appendChild(notesCard);

  if (!storeAvailable()) {
    showToast('この環境では履歴・お気に入りを保存できません。計算はそのまま使えます', { duration: 5000 });
  }

  /* ---------- 計算・描画 ---------- */

  function recompute() {
    const evalResult = evaluateAll(st.shapes);
    render(evalResult);
    if (numpadOpen() && st.focus) {
      const shape = st.shapes[st.focus.index];
      if (shape) updateNumpad({ hint: hintFor(evaluateShape(shape)) });
    }

    const payload = buildShapesPayload(st.shapes);
    if (payload.length && !evalResult.hasError) {
      const totalText = formatValue(evalResult.total, 'area', st.outUnit, settings).text;
      lastItem = {
        calcId: def.id,
        title: def.title,
        inputs: { shapes: { v: JSON.stringify(payload), u: 'json' } },
        summary: `合計面積 ${totalText}（図形${payload.length}件）`
      };
      scheduleIdleSave();
    } else {
      lastItem = null;
    }
    return evalResult;
  }

  function hintFor(r) {
    if (r.status === 'error') return r.error.msg;
    if (r.status === 'incomplete') return '幅と高さを入力してください';
    return '';
  }

  function render(evalResult) {
    renderShape(evalResult);
    renderList(evalResult);
    renderResult(evalResult);
    renderSteps(evalResult);
  }

  function renderShape(evalResult) {
    const drawable = evalResult.results.filter((r) => r.status === 'ok');
    shapeWrap.innerHTML = '';
    if (!drawable.length) {
      shapeWrap.appendChild(h('div', { class: 'empty', text: '長方形を入力すると図が表示されます' }));
      return;
    }
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const r of drawable) {
      minX = Math.min(minX, r.x);
      minY = Math.min(minY, r.y);
      maxX = Math.max(maxX, r.x + r.w);
      maxY = Math.max(maxY, r.y + r.h);
    }
    const scene = createScene({ ariaLabel: '複合図形の図' });
    scene.fit(minX, minY, maxX, maxY);
    // 追加分を先に描き、穴を上から重ねる（穴が確実に見えるように）
    const ordered = drawable.slice().sort((a, b) => (a.mode === 'sub' ? 1 : 0) - (b.mode === 'sub' ? 1 : 0));
    for (const r of ordered) {
      const A = scene.pt(r.x, r.y);
      const B = scene.pt(r.x + r.w, r.y);
      const C = scene.pt(r.x + r.w, r.y + r.h);
      const D = scene.pt(r.x, r.y + r.h);
      scene.polygon([A, B, C, D], r.mode === 'sub' ? 'body body-sub' : 'body');
    }
    scene.note();
    shapeWrap.appendChild(scene.el);
    refitLabels(scene.el);
  }

  function renderList(evalResult) {
    listBody.innerHTML = '';
    st.shapes.forEach((shape, index) => {
      const r = evalResult.results[index];
      const card = h('div', { class: 'card compound-shape' });
      const head = h('div', { class: 'compound-shape__head' });
      const modeBtn = h('button', {
        class: 'chip' + (shape.mode === 'sub' ? ' chip--sub' : ''),
        type: 'button',
        'aria-label': shape.mode === 'sub' ? '穴として設定中（押すと追加に戻す）' : '追加として設定中（押すと穴にする）',
        text: shape.mode === 'sub' ? '－ 穴' : '＋ 追加',
        onclick: () => {
          shape.mode = shape.mode === 'sub' ? 'add' : 'sub';
          recompute();
        }
      });
      head.appendChild(modeBtn);
      head.appendChild(h('span', { class: 'compound-shape__title', text: `図形${index + 1}` }));
      if (st.shapes.length > 1) {
        head.appendChild(h('button', {
          class: 'field-row__clear', type: 'button', 'aria-label': `図形${index + 1} を削除`, text: '✕',
          onclick: () => removeShape(index)
        }));
      }
      card.appendChild(head);

      const body = h('div', {});
      for (const key of KEYS) {
        body.appendChild(fieldRow(shape, index, key, r));
      }
      card.appendChild(body);
      listBody.appendChild(card);
    });
  }

  function fieldRow(shape, index, key, r) {
    const f = FIELD_DEFS[key];
    const raw = shape.raws[key];
    const text = raw === '' ? '—' : formatRawForDisplay(raw);
    const row = h('div', { class: 'field-row' + (raw === '' ? ' is-empty' : '') + (st.focus && st.focus.index === index && st.focus.key === key ? ' is-focus' : '') });

    const tap = h('button', {
      class: 'field-row__tap', type: 'button', 'aria-label': `${f.label} を入力`,
      onclick: () => openField(index, key)
    }, [
      h('span', { class: 'field-row__label', text: f.label }),
      h('span', { class: 'field-row__value', text: text === '—' ? '—' : text + unitLabel(f.quantity, shape.units[key]) })
    ]);
    row.appendChild(tap);

    row.appendChild(makeUnitChip(f.quantity, shape.units[key], (u) => changeUnit(index, key, u)));
    row.appendChild(h('button', {
      class: 'field-row__clear', type: 'button', 'aria-label': `${f.label} をクリア`, text: '✕',
      onclick: () => clearField(index, key)
    }));

    const rowWrap = h('div', {}, [row]);
    if (r && r.status === 'error' && r.error.key === key) {
      rowWrap.appendChild(h('div', { class: 'field-error', text: r.error.msg }));
    }
    return rowWrap;
  }

  function makeUnitChip(quantity, current, onChange) {
    if (!hasPicker(quantity)) return h('span', { class: 'field-row__unit', text: unitLabel(quantity, current) || '—' });
    return h('button', {
      class: 'field-row__unit', type: 'button',
      'aria-label': '単位を切り替える（現在: ' + (unitLabel(quantity, current) || current) + '）',
      text: unitLabel(quantity, current) || current,
      onclick: () => {
        const list = unitList(quantity);
        const i = list.findIndex((u) => u.id === current);
        onChange(list[(i + 1) % list.length].id);
      }
    });
  }

  function renderResult(evalResult) {
    resultBody.innerHTML = '';
    const payload = buildShapesPayload(st.shapes);

    if (evalResult.hasError) {
      resultBody.appendChild(h('div', { class: 'field-error', text: '入力にエラーがある行があります。各行の下の案内をご確認ください' }));
    }

    if (!payload.length || evalResult.hasError) {
      resultBody.appendChild(h('div', { class: 'empty', text: '長方形を入力すると合計面積が出ます' }));
      resultBody.appendChild(actionRow(false));
      return;
    }

    const fv = formatValue(evalResult.total, 'area', st.outUnit, settings);
    const box = h('div', {});
    const primary = h('div', { class: 'result-primary' }, [
      h('span', { class: 'result-primary__label', text: '合計面積' }),
      h('button', {
        class: 'result-primary__value', type: 'button',
        'aria-label': `合計面積 ${fv.text}（押すとコピー）`, text: fv.text,
        onclick: () => copyText(fv.text)
      }),
      makeUnitChip('area', st.outUnit, (u) => {
        st.outUnit = u;
        recompute();
      })
    ]);
    box.appendChild(primary);

    if (evalResult.total < 0) {
      box.appendChild(h('div', { class: 'field-error is-info', text: '穴の面積が追加分より大きく、合計がマイナスになっています' }));
    }

    resultBody.appendChild(box);
    resultBody.appendChild(actionRow(true));
  }

  function actionRow(enabled) {
    const save = h('button', {
      class: 'btn btn--primary', type: 'button', text: '履歴に保存',
      onclick: () => {
        if (!lastItem) return;
        if (!storeAvailable()) {
          showToast('この環境では保存できません');
          return;
        }
        saveHistory(lastItem);
        showToast('履歴に保存しました');
      }
    });
    if (!enabled) save.setAttribute('disabled', 'disabled');
    const reset = h('button', { class: 'btn btn--ghost', type: 'button', text: 'やり直す', onclick: clearAll });
    return h('div', { class: 'result-actions' }, [save, reset]);
  }

  function renderSteps(evalResult) {
    stepsBody.innerHTML = '';
    const rows = [];
    evalResult.results.forEach((r, i) => {
      if (r.status === 'ok') rows.push({ r, i });
    });
    if (!rows.length) {
      stepsBody.appendChild(h('div', { class: 'empty', text: '長方形が成立すると内訳が出ます' }));
      return;
    }
    const list = h('div', { class: 'steps' });
    rows.forEach(({ r, i }) => {
      const areaText = formatValue(r.area, 'area', st.outUnit, settings).text;
      const sign = r.mode === 'sub' ? '−' : '+';
      const box = h('div', { class: 'step' });
      box.appendChild(h('div', {}, [h('span', { class: 'step__no', text: sign }), h('span', { text: `図形${i + 1}（${r.mode === 'sub' ? '穴' : '追加'}） = ${areaText}` })]));
      list.appendChild(box);
    });
    const total = h('div', { class: 'step' }, [h('div', {}, [h('span', { class: 'step__no', text: '=' }), h('span', { text: `合計 ${formatValue(evalResult.total, 'area', st.outUnit, settings).text}` })])]);
    list.appendChild(total);
    stepsBody.appendChild(list);
  }

  /* ---------- 操作 ---------- */

  function openField(index, key) {
    const shape = st.shapes[index];
    const f = FIELD_DEFS[key];
    st.focus = { index, key };

    openNumpad({
      fieldKey: key,
      title: `図形${index + 1}: ${f.label}` + (f.help ? `（${f.help}）` : ''),
      quantity: f.quantity,
      unit: shape.units[key],
      allowNegative: allowsNegative(key),
      raw: shape.raws[key],
      hint: '',
      anchorEl: shapeWrap,
      onInput: (raw) => setRaw(index, key, raw),
      onUnitChange: (u) => {
        changeUnit(index, key, u);
        updateNumpad({ unit: u, raw: shape.raws[key] });
      },
      onNext: () => {
        const next = nextField(index, key);
        openField(next.index, next.key);
      },
      onPrev: () => {
        const prev = prevField(index, key);
        openField(prev.index, prev.key);
      },
      onClose: () => {
        st.focus = null;
        recompute();
      }
    });
    recompute();
  }

  function setRaw(index, key, raw) {
    const shape = st.shapes[index];
    shape.raws[key] = raw;
    delete shape.exactBase[key];
    recompute();
  }

  function changeUnit(index, key, unitId) {
    const shape = st.shapes[index];
    const old = shape.units[key];
    if (old === unitId) return;
    const raw = shape.raws[key];
    const n = parseNumber(raw);
    if (raw !== '' && Number.isFinite(n)) {
      const exact = shape.exactBase[key];
      const internal = Number.isFinite(exact) ? exact : toBase(n, 'length', old);
      shape.units[key] = unitId;
      shape.exactBase[key] = internal;
      shape.raws[key] = toRawString(internal, 'length', unitId, settings);
    } else {
      shape.units[key] = unitId;
    }
    recompute();
  }

  function clearField(index, key) {
    const shape = st.shapes[index];
    shape.raws[key] = '';
    delete shape.exactBase[key];
    recompute();
  }

  function addShape() {
    st.shapes.push(newShape(st.shapes.length + 1));
    recompute();
  }

  function removeShape(index) {
    if (st.shapes.length <= 1) return;
    st.shapes.splice(index, 1);
    recompute();
  }

  function clearAll() {
    const snapshot = st.shapes.map((s) => ({ mode: s.mode, units: Object.assign({}, s.units), raws: Object.assign({}, s.raws), exactBase: Object.assign({}, s.exactBase) }));
    st.shapes = [newShape(1)];
    recompute();
    showToast('すべてクリアしました', {
      duration: 5000,
      actionLabel: '元に戻す',
      onAction: () => {
        st.shapes = snapshot;
        recompute();
      }
    });
  }

  function nextField(index, key) {
    const ki = KEYS.indexOf(key);
    if (ki < KEYS.length - 1) return { index, key: KEYS[ki + 1] };
    if (index < st.shapes.length - 1) return { index: index + 1, key: KEYS[0] };
    return { index: 0, key: KEYS[0] };
  }

  function prevField(index, key) {
    const ki = KEYS.indexOf(key);
    if (ki > 0) return { index, key: KEYS[ki - 1] };
    if (index > 0) return { index: index - 1, key: KEYS[KEYS.length - 1] };
    return { index: st.shapes.length - 1, key: KEYS[KEYS.length - 1] };
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

  function saveItem() {
    if (!lastItem || !storeAvailable()) return false;
    saveHistory(lastItem);
    return true;
  }

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
      saveItem();
      closeNumpad({ silent: true });
    }
  };
}
