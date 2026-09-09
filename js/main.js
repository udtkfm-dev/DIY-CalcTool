// main.js — 起動と hash ルーティング
//
// ルート: #/ , #/c/<calcId>[?h=<historyId>] , #/cat/<catId> , #/search?q= ,
//        #/history , #/settings , #/about

import { getCalc, categoryName } from './calcs/index.js';
import { getSettings, getHistory } from './core/store.js';
import { renderHome, renderCategory, renderSearch, renderNotYet } from './ui/home.js';
import { renderCalcView, createState, restoreInputs } from './ui/calcView.js';
import { renderCompoundView, createCompoundState, restoreCompoundInputs } from './ui/compoundView.js';
import { renderHistory } from './ui/history.js';
import { renderSettings } from './ui/settings.js';
import { renderAbout } from './ui/about.js';
import { maybeShowDisclaimer } from './ui/disclaimer.js';
import { followVisualViewport } from './core/viewport.js';

const appEl = document.getElementById('app');
const barEl = document.getElementById('appbar');

/** 計算画面の入力値をセッション内で保持する（戻ってきたら復元する） */
const sessions = new Map();

let current = null; // { destroy }

function parseHash() {
  const raw = location.hash.replace(/^#/, '');
  const [path, queryString] = raw.split('?');
  const parts = path.split('/').filter(Boolean);
  const query = {};
  if (queryString) {
    for (const pair of queryString.split('&')) {
      const [k, v] = pair.split('=');
      query[decodeURIComponent(k)] = decodeURIComponent(v || '');
    }
  }
  return { parts, query };
}

/* ---------- ページのタイトル・説明 ----------
 *
 * ハッシュより後ろは URL として区別されないので、これは検索順位そのものには
 * 効かない。目的は「ブラウザのタブ・履歴・ブックマーク・共有時に、今どの計算を
 * 見ているかが分かること」。検索エンジン向けの実体のあるページは
 * calc/<計算ID>/ に別途あり、scripts/build-seo.mjs が生成している。
 *
 * canonical は常にトップのままにする（各画面で書き換えると、クローラが
 * 素の URL を読んだときの状態と食い違うため）。 */

const SITE_TITLE = 'DIY計算ツール';
const HOME_TITLE = document.title;
const descEl = document.querySelector('meta[name="description"]');
const HOME_DESC = descEl ? descEl.getAttribute('content') : '';

function setPageMeta(title, description) {
  document.title = title || HOME_TITLE;
  const desc = description || HOME_DESC;
  if (descEl) descEl.setAttribute('content', desc);
  const ogT = document.querySelector('meta[property="og:title"]');
  if (ogT) ogT.setAttribute('content', title || HOME_TITLE);
  const ogD = document.querySelector('meta[property="og:description"]');
  if (ogD) ogD.setAttribute('content', desc);
}

/* ---------- 検索エンジン向けの静的な本文（index.html の #site-intro） ----------
 *
 * サイトの説明・分野一覧・使い方・FAQ を HTML に直接持っている領域
 * （scripts/build-seo.mjs が生成する。JavaScript 無しでも読める）。
 * ホーム以外の画面では、計算の下に長い説明文がぶら下がるのを避けるため隠す。
 * 中身は書き換えない——隠すだけなので、JavaScript が動かない環境で
 * クローラが読む内容と、利用者が読む内容は一致する。 */
const introEl = document.getElementById('site-intro');

function showIntro(visible) {
  if (introEl) introEl.hidden = !visible;
}

function applyTheme() {
  const theme = getSettings().theme;
  if (theme === 'light' || theme === 'dark') document.documentElement.dataset.theme = theme;
  else delete document.documentElement.dataset.theme;
}

function route() {
  if (current && typeof current.destroy === 'function') {
    try {
      current.destroy();
    } catch (e) {
      /* 画面の破棄で落ちても遷移は続ける */
    }
  }
  current = null;
  window.scrollTo(0, 0);

  const { parts, query } = parseHash();
  showIntro(parts.length === 0);

  if (parts.length === 0) {
    setPageMeta(null, null);
    renderHome(appEl, barEl);
    return;
  }

  if (parts[0] === 'c' && parts[1]) {
    const def = getCalc(decodeURIComponent(parts[1]));
    if (!def) {
      setPageMeta(`見つかりません | ${SITE_TITLE}`, null);
      renderNotYet(appEl, barEl, 'この計算は未実装です');
      return;
    }

    setPageMeta(
      `${def.title}の計算 | ${SITE_TITLE}`,
      `${def.title}｜${def.subtitle}。分かっている寸法を入れると残りの値が自動で求まります。`
    );

    // area.compound は「任意個数の長方形を追加・穴として合成する」ため、
    // calcView.js の固定フィールド集合の前提と合わず専用画面を使う
    // （09-04 運用者判断。js/calcs/compound.js 冒頭コメント参照）。
    if (def.custom === 'compound') {
      if (query.h) {
        const item = getHistory().find((x) => x.id === query.h);
        const st = createCompoundState();
        if (item && item.inputs && item.inputs.shapes && item.inputs.shapes.u === 'json') {
          try {
            restoreCompoundInputs(st, JSON.parse(item.inputs.shapes.v));
          } catch (e) {
            /* 壊れた履歴データは無視して初期状態のまま開く */
          }
        }
        sessions.set(def.id, st);
      } else if (!sessions.has(def.id)) {
        sessions.set(def.id, createCompoundState());
      }
      current = renderCompoundView(appEl, barEl, def, sessions.get(def.id));
      return;
    }

    // 履歴からの再計算（#/c/<id>?h=<historyId>）: 毎回その履歴の入力値で state を作り直す
    if (query.h) {
      const item = getHistory().find((x) => x.id === query.h);
      const st = createState(def);
      if (item) restoreInputs(def, st, item.inputs);
      sessions.set(def.id, st);
    } else if (!sessions.has(def.id)) {
      sessions.set(def.id, createState(def));
    }
    current = renderCalcView(appEl, barEl, def, sessions.get(def.id));
    return;
  }

  if (parts[0] === 'cat' && parts[1]) {
    const catId = decodeURIComponent(parts[1]);
    const name = categoryName(catId);
    setPageMeta(
      name ? `${name}の計算 | ${SITE_TITLE}` : null,
      name ? `${name}に関する計算の一覧。分かっている寸法を入れると残りの値が自動で求まります。` : null
    );
    renderCategory(appEl, barEl, catId);
    return;
  }

  if (parts[0] === 'search') {
    const q = query.q || '';
    setPageMeta(q ? `「${q}」の検索結果 | ${SITE_TITLE}` : null, null);
    renderSearch(appEl, barEl, q);
    return;
  }

  if (parts[0] === 'history') {
    setPageMeta(`計算の履歴 | ${SITE_TITLE}`, null);
    renderHistory(appEl, barEl);
    return;
  }

  if (parts[0] === 'settings') {
    setPageMeta(`設定 | ${SITE_TITLE}`, null);
    renderSettings(appEl, barEl);
    return;
  }

  if (parts[0] === 'about') {
    setPageMeta(`このアプリについて | ${SITE_TITLE}`, null);
    renderAbout(appEl, barEl);
    return;
  }

  setPageMeta(`見つかりません | ${SITE_TITLE}`, null);
  renderNotYet(appEl, barEl, '見つかりません');
}

window.addEventListener('hashchange', route);

// type="module" は defer 相当なので、この時点で DOM は構築済み
applyTheme();
// 画面に貼り付く要素を「見えている範囲」に追従させる（ピンチ拡大・ソフトキーボード対策）
followVisualViewport(document.getElementById('sheet-root'), document.getElementById('toast-root'));
route();
maybeShowDisclaimer();

/* Gmail・LINEなどアプリ内ブラウザ（Android WebView）向けの回避策。
 * 静的HTML（#site-intro）の幅を基準にズーム倍率を決めた後、JSが#appに
 * ボタン等を描画しても再計算されず、ボタンが縮小表示のままになることがある
 * （手動リロードすると直る＝再計算のタイミングの問題）。
 * viewport の content を書き換えて再計算を強制する。 */
window.addEventListener('load', () => {
  const vp = document.querySelector('meta[name="viewport"]');
  if (!vp) return;
  const original = vp.getAttribute('content');
  requestAnimationFrame(() => {
    vp.setAttribute('content', `${original}, shrink-to-fit=no`);
    requestAnimationFrame(() => vp.setAttribute('content', original));
  });
});
