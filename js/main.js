// main.js — 起動と hash ルーティング
//
// ルート: #/ , #/c/<calcId>[?h=<historyId>] , #/cat/<catId> , #/search?q= ,
//        #/history , #/settings , #/about

import { getCalc } from './calcs/index.js';
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

  if (parts.length === 0) {
    renderHome(appEl, barEl);
    return;
  }

  if (parts[0] === 'c' && parts[1]) {
    const def = getCalc(decodeURIComponent(parts[1]));
    if (!def) {
      renderNotYet(appEl, barEl, 'この計算は未実装です');
      return;
    }

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
    renderCategory(appEl, barEl, decodeURIComponent(parts[1]));
    return;
  }

  if (parts[0] === 'search') {
    renderSearch(appEl, barEl, query.q || '');
    return;
  }

  if (parts[0] === 'history') {
    renderHistory(appEl, barEl);
    return;
  }

  if (parts[0] === 'settings') {
    renderSettings(appEl, barEl);
    return;
  }

  if (parts[0] === 'about') {
    renderAbout(appEl, barEl);
    return;
  }

  renderNotYet(appEl, barEl, '見つかりません');
}

window.addEventListener('hashchange', route);

// type="module" は defer 相当なので、この時点で DOM は構築済み
applyTheme();
// 画面に貼り付く要素を「見えている範囲」に追従させる（ピンチ拡大・ソフトキーボード対策）
followVisualViewport(document.getElementById('sheet-root'), document.getElementById('toast-root'));
route();
maybeShowDisclaimer();
