// home.js — ホーム / 検索結果 / カテゴリ一覧

import { allCalcs, search, activeCategories, calcsInCategory, categoryName, categoryColor, getCalc } from '../calcs/index.js';
import { getFavorites, getHistory } from '../core/store.js';
import { icon, categoryIcon, calcIcon, backButton } from './icons.js';
import { createAdSlot } from './ads.js';

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

/** アイコン（icons.js が返す静的なSVG文字列）を包む span。ユーザー入力は通さない */
function glyph(svg, cls) {
  const span = h('span', { class: cls });
  span.innerHTML = svg;
  return span;
}

function chevron() {
  return glyph(icon('chevron', 16), 'row__chev');
}

const QUICK_CHIPS = [
  { label: '直角三角形', id: 'tri.right' },
  { label: '勾配', id: 'slope.convert' },
  { label: '長方形の面積', id: 'area.rect' },
  { label: '単位変換', id: 'basic.unit.length' },
  { label: '円', id: 'area.circle' }
];

/**
 * 1行のリンク行。複数並べるときは rows() でまとめて枠に入れる。
 * 左にその計算の図形アイコンを置き、分野の色で塗る（一覧の中で見分けやすくするため）。
 */
function calcRow(def, sub) {
  const gi = calcIcon(def, 20);
  return h('a', { class: 'row', href: `#/c/${def.id}`, 'data-color': categoryColor(def.category) }, [
    gi ? glyph(gi, 'row__icon') : null,
    h('div', { class: 'row__main' }, [
      h('div', { class: 'row__title', text: def.title }),
      sub === '' ? null : h('div', { class: 'row__sub', text: sub || def.subtitle || '' })
    ]),
    chevron()
  ]);
}

function rows(children) {
  return h('div', { class: 'rows' }, children);
}

/** セクション見出し（右側に件数などの補足を置ける） */
function sectionHead(label, note) {
  return h('div', { class: 'sec' }, [
    h('span', { class: 'sec__label', text: label }),
    note ? h('span', { class: 'sec__n', text: note }) : null
  ]);
}

/** ホームのロゴマーク。計算画面の線画と同じ語彙（細線・幾何形状）で描く */
const BRAND_MARK =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" ' +
  'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
  '<path d="M4.5 5.5v13h15"/>' +
  '<path d="M4.5 18.5L19.5 5.5"/>' +
  '<path d="M4.5 15.6h2.9v2.9"/>' +
  '<path d="M8.4 18.5v-2M12.2 18.5v-2M16 18.5v-2" opacity=".55"/>' +
  '</svg>';

function appbarHome(barEl) {
  barEl.innerHTML = '';
  const brand = h('div', { class: 'appbar__title appbar__brand' });
  // 静的なマークアップのみ（ユーザー入力は通さない）
  brand.innerHTML =
    `<span class="brand__mark">${BRAND_MARK}</span>` +
    '<span class="brand__word"><em>DIY</em><span class="brand__word2">計算ツール</span></span>';
  barEl.appendChild(brand);
  const gear = h('a', { class: 'appbar__btn', href: '#/settings', 'aria-label': '設定' });
  gear.innerHTML = icon('gear', 19);
  barEl.appendChild(gear);
}

export function renderHome(appEl, barEl) {
  appbarHome(barEl);
  appEl.innerHTML = '';
  appEl.className = 'app app--home';

  // 1. 検索バー
  const input = h('input', {
    type: 'search',
    'aria-label': '計算を検索',
    placeholder: '計算を検索（斜め・勾配・面積…）'
  });
  input.addEventListener('input', () => {
    const q = input.value.trim();
    renderSearchInline(q);
  });
  appEl.appendChild(h('div', { class: 'search' }, [glyph(icon('search', 18), 'search__icon'), input]));

  // 2. クイックリンク（横スクロールの小さなピル）
  const quick = h('div', { class: 'quick' });
  for (const c of QUICK_CHIPS) {
    const def = getCalc(c.id);
    if (!def) continue; // 未実装のものは出さない
    const gi = calcIcon(def, 15);
    quick.appendChild(
      h('a', { class: 'quick__item', href: `#/c/${c.id}` }, [
        gi ? glyph(gi, 'quick__icon') : null,
        h('span', { text: c.label })
      ])
    );
  }
  if (quick.childElementCount) appEl.appendChild(quick);

  const dynamic = h('div', {});
  appEl.appendChild(dynamic);

  function renderSearchInline(q) {
    dynamic.innerHTML = '';
    if (!q) {
      renderDefault(dynamic);
      return;
    }
    const hits = search(q);
    dynamic.appendChild(sectionHead('検索結果', `${hits.length}件`));
    if (!hits.length) {
      dynamic.appendChild(h('div', { class: 'empty', text: '見つかりませんでした。カテゴリから探せます' }));
      dynamic.appendChild(categoryTiles());
      return;
    }
    dynamic.appendChild(rows(hits.map((hit) => calcRow(hit.def))));
  }

  renderDefault(dynamic);

  // 広告枠（ホーム最下部に1枠だけ。計算画面には置かない＝誤タップ防止）。
  // 中身の出し分けは ads.js が持つ（今はダミー、AdMob可否は運用者判断）
  const ad = createAdSlot('home-bottom');
  if (ad) appEl.appendChild(ad);
}

function renderDefault(container) {
  // 3. お気に入り
  const favs = getFavorites()
    .map((f) => getCalc(f.calcId))
    .filter(Boolean);
  if (favs.length) {
    container.appendChild(sectionHead('お気に入り'));
    container.appendChild(rows(favs.map((def) => calcRow(def))));
  } else {
    container.appendChild(
      h('p', { class: 'hint', text: '図の寸法をタップして数字を入れると、残りの値が自動で出ます。' })
    );
  }

  // 4. カテゴリ（ホームの主役なので、検索・お気に入りのすぐ下に置く）
  const cats = activeCategories();
  const total = cats.reduce((n, c) => n + calcsInCategory(c.id).length, 0);
  container.appendChild(sectionHead('カテゴリ', `${cats.length}分野 ・ ${total}件`));
  container.appendChild(categoryTiles());

  // 5. 最近使った計算（最大5件）。ホームの最下部＝広告枠の直前に置く
  const recent = [];
  const seen = new Set();
  for (const item of getHistory()) {
    if (seen.has(item.calcId)) continue;
    const def = getCalc(item.calcId);
    if (!def) continue;
    seen.add(item.calcId);
    recent.push({ def, item });
    if (recent.length >= 5) break;
  }
  if (recent.length) {
    container.appendChild(sectionHead('最近使った計算'));
    const list = recent.map((r) => calcRow(r.def, r.item.summary || ''));
    list.push(
      h('a', { class: 'row row--more', href: '#/history' }, [
        h('div', { class: 'row__main' }, [h('div', { class: 'row__title', text: '履歴をすべて見る' })]),
        chevron()
      ])
    );
    container.appendChild(rows(list));
  }
}

function categoryTiles() {
  const tiles = h('div', { class: 'cat-grid' });
  for (const c of activeCategories()) {
    // タイル全面の下絵にするので大きめに描く（実寸はCSSで100%に伸ばす）
    const svg = categoryIcon(c.id, 72);
    tiles.appendChild(
      h('a', { class: 'cat', href: `#/cat/${c.id}`, 'data-color': c.color || 'blue' }, [
        svg ? glyph(svg, 'cat__icon') : h('span', { class: 'cat__icon cat__icon--emoji', text: c.icon }),
        h('span', { class: 'cat__name', text: c.name }),
        h('span', { class: 'cat__n', text: `${calcsInCategory(c.id).length}` })
      ])
    );
  }
  return tiles;
}

export function renderCategory(appEl, barEl, catId) {
  barEl.innerHTML = '';
  barEl.appendChild(backButton());
  barEl.appendChild(h('div', { class: 'appbar__title', text: categoryName(catId) || 'カテゴリ' }));

  appEl.innerHTML = '';
  appEl.className = 'app app--home';
  const list = calcsInCategory(catId);
  if (!list.length) {
    appEl.appendChild(h('div', { class: 'empty', text: 'このカテゴリの計算は今後追加します' }));
    return;
  }
  appEl.appendChild(sectionHead(categoryName(catId) || 'カテゴリ', `${list.length}件`));
  appEl.appendChild(rows(list.map((def) => calcRow(def))));
}

export function renderSearch(appEl, barEl, query) {
  barEl.innerHTML = '';
  barEl.appendChild(backButton());
  barEl.appendChild(h('div', { class: 'appbar__title', text: `「${query}」の検索結果` }));

  appEl.innerHTML = '';
  appEl.className = 'app app--home';
  const hits = search(query);
  if (!hits.length) {
    appEl.appendChild(h('div', { class: 'empty', text: '見つかりませんでした。カテゴリから探せます' }));
    appEl.appendChild(categoryTiles());
    return;
  }
  appEl.appendChild(sectionHead('検索結果', `${hits.length}件`));
  appEl.appendChild(rows(hits.map((hit) => calcRow(hit.def))));
}

export function renderNotYet(appEl, barEl, title) {
  barEl.innerHTML = '';
  barEl.appendChild(backButton());
  barEl.appendChild(h('div', { class: 'appbar__title', text: title }));
  appEl.innerHTML = '';
  appEl.className = 'app';
  appEl.appendChild(h('div', { class: 'empty', text: 'この画面は後のフェーズで実装します' }));
  appEl.appendChild(h('a', { class: 'list-item', href: '#/', text: 'ホームへ戻る' }));
}

export { allCalcs };
