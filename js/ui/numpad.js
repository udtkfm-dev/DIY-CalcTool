// numpad.js — 独自テンキー（ボトムシート）
//
// OS標準キーボードは使わない（レイアウト崩れ・不正文字の混入・画面の圧迫を避けるため）。
// 値は呼び出し側（calcView）が持ち、ここは「打鍵を通知するだけ」にしている。
//
// シートの中に計算画面と同じ図を出し、いま入れている寸法を光らせる。
// 図が下から出るシートで隠れても「どこの寸法を入れているのか」が分かるようにするため
// （14回目セッションの運用者指摘）。図は打鍵のたびに引き直すので、
// 数字を打つそばから形が変わるのが見える。

import { createUnitChips, noteFor } from './unitPicker.js';
import { formatRawForDisplay } from '../core/format.js';
import { refitLabels } from '../shapes/engine.js';
import { icon } from './icons.js';

let state = null; // { opts, nodes }

// シートを開く前のスクロール位置。入力を終えたらここへ戻す。
// （シートを開くと、入力欄の寄せやブラウザのフォーカス移動でページが下へ動く。
//   閉じたあとそのままだと、画面の一番下に取り残されて元の場所を見失う）
let savedScroll = null;

// 押した瞬間の位置。click ハンドラが走る前にフォーカス移動でページが動くことがあるので、
// 「開く直前」ではなく「指を置いた時点」の位置を覚えておく。
let pointerScroll = null;
let pointerScrollAt = 0;
if (typeof document !== 'undefined') {
  document.addEventListener(
    'pointerdown',
    () => {
      pointerScroll = window.scrollY;
      pointerScrollAt = Date.now();
    },
    true
  );
}

/** 直前のタップ時点の位置を優先する。古すぎる記録（別の操作の残り）は使わない */
function scrollBeforeOpen() {
  if (pointerScroll !== null && Date.now() - pointerScrollAt < 1500) return pointerScroll;
  return window.scrollY;
}

// REQUIREMENTS.md 7-1: 既定は4×4固定レイアウト（00キー付き）。
// ただし符号（マイナス）を許容するフィールド（座標・オフセット等、
// Field.min が未設定＝負値を許可する設計のもの）では、「00」を「±」に
// 置き換える（09-04 運用者判断: 4×4のまま既存キーを符号キーに差し替える方式）。
// 00キーを多用する他の計算（mm入力）には影響しない。
const KEYS = [
  ['7', '7'], ['8', '8'], ['9', '9'], ['back', '⌫'],
  ['4', '4'], ['5', '5'], ['6', '6'], ['clear', 'C'],
  ['1', '1'], ['2', '2'], ['3', '3'], ['prev', '前へ'],
  ['0', '0'], ['00', '00'], ['.', '.'], ['next', '次へ']
];

const KEYS_SIGNED = [
  ['7', '7'], ['8', '8'], ['9', '9'], ['back', '⌫'],
  ['4', '4'], ['5', '5'], ['6', '6'], ['clear', 'C'],
  ['1', '1'], ['2', '2'], ['3', '3'], ['prev', '前へ'],
  ['0', '0'], ['sign', '±'], ['.', '.'], ['next', '次へ']
];

export function isOpen() {
  return !!state;
}

export function currentKey() {
  return state ? state.opts.fieldKey : null;
}

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
}

/**
 * @param {object} opts
 *   fieldKey, title, help, index, count, figure(), quantity, unit, raw, hint, anchorEl
 *   onInput(nextRaw), onUnitChange(unitId), onNext(), onPrev(), onClose()
 */
export function openNumpad(opts) {
  // 「次へ / 前へ」で開き直すときは最初に開いた位置を保つ（都度上書きしない）
  const wasOpen = !!state;
  closeNumpad({ silent: true });
  if (!wasOpen) savedScroll = scrollBeforeOpen();

  const root = document.getElementById('sheet-root') || document.body;

  const backdrop = el('div', 'sheet-backdrop');
  backdrop.addEventListener('click', () => closeNumpad());

  const sheet = el('div', 'sheet');
  sheet.setAttribute('role', 'dialog');
  sheet.setAttribute('aria-modal', 'false');
  sheet.setAttribute('aria-label', opts.title + ' の入力');

  // つまみ（下に引っぱって閉じられることを示す）
  sheet.appendChild(el('div', 'sheet__grip'));

  // 画面の低い端末（横持ち・iPhone SE・URLバー表示中のAndroid）では、シート全体が
  // 画面に入りきらない。キーパッドと完了ボタンは常に見える位置へ固定し、それより上
  // （図・見出し・値・単位）はこの箱に入れて、縮小とスクロールで不足を吸収させる。
  // 箱が無いと上端が画面外へ出たまま到達不能になる——シートは position:fixed なので
  // ページをスクロールしても出てこない（19-9 検証で実測）。
  const top = el('div', 'sheet__top');
  sheet.appendChild(top);

  /* ---- 図（いま入れている寸法を光らせる） ---- */
  const figure = el('div', 'sheet__figure');
  figure.setAttribute('aria-hidden', 'true'); // 同じ情報は下のテキストで読み上げる
  top.appendChild(figure);

  /* ---- 「何を入れているか」 ---- */
  const head = el('div', 'sheet__head');
  const titleWrap = el('div', 'sheet__titles');
  const title = el('div', 'sheet__title');
  const help = el('div', 'sheet__help');
  titleWrap.appendChild(title);
  titleWrap.appendChild(help);
  const step = el('div', 'sheet__step');
  const close = el('button', 'sheet__close', '✕');
  close.type = 'button';
  close.setAttribute('aria-label', '閉じる');
  close.addEventListener('click', () => closeNumpad());
  head.appendChild(titleWrap);
  head.appendChild(step);
  head.appendChild(close);
  top.appendChild(head);

  /* ---- 値 ＋ 単位 ---- */
  const valueRow = el('div', 'sheet__valuerow');
  const value = el('div', 'sheet__value');
  value.setAttribute('aria-live', 'polite');
  const unitBtn = el('div', 'sheet__unit');
  valueRow.appendChild(value);
  valueRow.appendChild(unitBtn);
  top.appendChild(valueRow);

  const chips = createUnitChips(opts.quantity, opts.unit, (u) => {
    if (state) state.opts.unit = u;
    opts.onUnitChange(u);
  });
  if (chips) top.appendChild(chips);

  const note = el('div', 'sheet__note');
  top.appendChild(note);

  const hint = el('div', 'sheet__hint');
  top.appendChild(hint);

  // 値表示の左右スワイプで前後の欄へ移動
  let touchX = null;
  value.addEventListener('touchstart', (e) => {
    touchX = e.touches[0].clientX;
  }, { passive: true });
  value.addEventListener('touchend', (e) => {
    if (touchX === null) return;
    const dx = e.changedTouches[0].clientX - touchX;
    touchX = null;
    if (Math.abs(dx) < 48) return;
    if (dx < 0) opts.onNext();
    else opts.onPrev();
  });

  /* ---- キーパッド ---- */
  const pad = el('div', 'keypad');
  const keys = opts.allowNegative ? KEYS_SIGNED : KEYS;
  for (const [code, label] of keys) {
    const b = el('button', '', label);
    b.type = 'button';
    b.dataset.k = code;
    if (code === 'next') {
      b.className = 'k-fn k-next';
      b.innerHTML = `<span>次へ</span>${icon('chevron', 15)}`;
      b.setAttribute('aria-label', '次の欄へ');
    } else if (code === 'prev') {
      b.className = 'k-fn k-prev';
      b.innerHTML = `${icon('chevronLeft', 15)}<span>前へ</span>`;
      b.setAttribute('aria-label', '前の欄へ');
    } else if (code === 'back') {
      // 記号だけだと意味が伝わらない層がいるので、短い言葉を添える
      b.className = 'k-fn k-back';
      b.innerHTML = '<span class="k-glyph">⌫</span><span class="k-sub">1字消す</span>';
      b.setAttribute('aria-label', '1文字消す');
    } else if (code === 'clear') {
      b.className = 'k-fn k-clear';
      b.innerHTML = '<span class="k-glyph">C</span><span class="k-sub">全部消す</span>';
      b.setAttribute('aria-label', 'すべて消す');
    } else if (code === 'sign') {
      b.className = 'k-fn';
      b.setAttribute('aria-label', 'プラスとマイナスを切り替える');
    }
    b.addEventListener('click', () => press(code));
    pad.appendChild(b);
  }
  sheet.appendChild(pad);

  // 完了は横幅いっぱいの独立ボタン（押し間違いを減らし、終わりを分かりやすくする）
  const done = el('button', 'sheet__done', '入力を終わる');
  done.type = 'button';
  done.addEventListener('click', () => closeNumpad());
  sheet.appendChild(done);

  root.appendChild(backdrop);
  root.appendChild(sheet);

  state = { opts, nodes: { backdrop, sheet, figure, title, help, step, value, unitBtn, hint, note, chips } };

  document.addEventListener('keydown', onKeyDown);
  update(opts, true);

  // シート内に図を出せた場合、ページ側を動かす必要はない
  // （むしろ背の高いシートに合わせてスクロールすると、画面が大きく飛んで面食らう）。
  // 図を持たない計算のときだけ、対象の入力欄がシートに隠れないよう寄せる。
  // 寄せるのは最初に開いたときだけ——「次へ」で開き直すたびに寄せると、
  // 押した回数ぶん下へ進んでページの一番下に張り付いてしまう。
  requestAnimationFrame(() => {
    if (!figure.hidden || wasOpen) return;
    scrollAnchorIntoView(opts.anchorEl, sheet);
  });
  return closeNumpad;
}

function scrollAnchorIntoView(anchorEl, sheet) {
  if (!anchorEl) return;
  const sheetTop = window.innerHeight - sheet.getBoundingClientRect().height;
  const rect = anchorEl.getBoundingClientRect();
  const overlap = rect.bottom - sheetTop + 12;
  if (overlap > 0) window.scrollBy({ top: overlap, behavior: 'smooth' });
}

/** シート内のミニ図を引き直す */
function drawFigure() {
  if (!state) return;
  const { figure } = state.nodes;
  const make = state.opts.figure;
  if (typeof make !== 'function') {
    figure.hidden = true;
    return;
  }
  const svg = make();
  figure.innerHTML = '';
  if (!svg) {
    figure.hidden = true;
    return;
  }
  figure.hidden = false;
  figure.appendChild(svg);
  // ピル幅の実測は DOM に載ってから（engine.js の規約）
  refitLabels(svg);
}

/**
 * 表示だけを更新する（値の保持は呼び出し側）。
 * opts.refreshFigure が真なら図も引き直す。
 */
export function update(opts, initial) {
  if (!state) return;
  const refresh = initial || (opts && opts.refreshFigure);
  if (opts) delete opts.refreshFigure;
  state.opts = Object.assign(state.opts, opts);
  const o = state.opts;
  const n = state.nodes;

  n.title.textContent = o.title || '';
  n.help.textContent = o.help || '';
  n.help.hidden = !o.help;

  if (Number.isFinite(o.index) && Number.isFinite(o.count) && o.count > 1) {
    n.step.textContent = `${o.index + 1} / ${o.count}`;
    n.step.hidden = false;
  } else {
    n.step.hidden = true;
  }

  const shown = formatRawForDisplay(o.raw);
  const empty = shown === '';
  n.value.textContent = empty ? '0' : shown;
  n.value.classList.toggle('is-empty', empty);

  const unitText = n.chips ? currentUnitLabel(n.chips, o.unit) : '';
  n.unitBtn.textContent = unitText;
  n.unitBtn.hidden = !unitText;

  n.hint.textContent = o.hint || '';
  n.hint.hidden = !o.hint;
  const noteText = noteFor(o.quantity, o.unit) || '';
  n.note.textContent = noteText;
  n.note.hidden = !noteText;

  if (n.chips) {
    n.chips.querySelectorAll('.chip').forEach((c) => {
      c.setAttribute('aria-pressed', String(c.dataset.unit === o.unit));
    });
  }

  if (refresh) drawFigure();
}

function currentUnitLabel(chips, unitId) {
  const hit = chips.querySelector(`.chip[data-unit="${unitId}"]`);
  return hit ? hit.textContent : '';
}

/** 単位チップの押下状態を単位IDで更新する */
export function setUnit(unitId) {
  if (!state) return;
  update({ unit: unitId });
}

function press(code) {
  if (!state) return;
  const o = state.opts;
  let raw = o.raw || '';

  switch (code) {
    case 'back':
      raw = raw.slice(0, -1);
      break;
    case 'clear':
      raw = '';
      break;
    case 'next':
      o.onNext();
      return;
    case 'prev':
      o.onPrev();
      return;
    case '.':
      if (raw.includes('.')) return;
      raw = raw === '' ? '0.' : raw + '.';
      break;
    case '00':
      if (raw === '' || raw === '0') return;
      raw = raw + '00';
      break;
    case 'sign':
      if (!o.allowNegative) return;
      raw = raw.startsWith('-') ? raw.slice(1) : raw === '' ? '-' : '-' + raw;
      break;
    default:
      if (raw === '0') raw = code;
      else raw = raw + code;
      break;
  }

  if (raw.replace('.', '').length > 15) return; // 桁あふれを防ぐ
  o.raw = raw;
  update({ raw });
  o.onInput(raw);
}

function onKeyDown(e) {
  if (!state) return;
  if (e.key.length === 1 && e.key >= '0' && e.key <= '9') {
    press(e.key);
    e.preventDefault();
  } else if (e.key === '.') {
    press('.');
    e.preventDefault();
  } else if (e.key === '-') {
    press('sign');
    e.preventDefault();
  } else if (e.key === 'Backspace') {
    press('back');
    e.preventDefault();
  } else if (e.key === 'Escape') {
    closeNumpad();
    e.preventDefault();
  } else if (e.key === 'Enter') {
    state.opts.onNext();
    e.preventDefault();
  }
}

export function closeNumpad(opts = {}) {
  if (!state) return;
  const { backdrop, sheet } = state.nodes;
  const onClose = state.opts.onClose;
  document.removeEventListener('keydown', onKeyDown);
  if (backdrop.parentNode) backdrop.parentNode.removeChild(backdrop);
  if (sheet.parentNode) sheet.parentNode.removeChild(sheet);
  state = null;

  if (opts.silent) return; // 開き直しの途中・画面離脱。位置は保持したまま次に引き継ぐ
  // 先に onClose（＝再計算・再描画）を通してから戻す。結果欄が伸び縮みしたあとの
  // 高さで scrollTo しないと、目的の位置が範囲外に丸められることがある。
  if (typeof onClose === 'function') onClose();
  restoreScroll();
}

/**
 * 入力を終えたら、シートを開く前に見ていた位置へ戻す。
 * requestAnimationFrame は使わない——ページが非表示のあいだ発火せず、
 * 戻し損ねることがあるため（19-8 と同種の落とし穴）。
 */
function restoreScroll() {
  const y = savedScroll;
  savedScroll = null;
  if (y === null || Math.abs(window.scrollY - y) < 2) return;
  // behavior:'smooth' は使わない。アニメーションは描画ループに依存するため
  // 画面が描かれていない状況では動かず、位置が戻らないことがある。
  window.scrollTo(0, y);
}
