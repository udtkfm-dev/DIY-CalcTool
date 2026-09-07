// index.js — 全計算定義の登録と検索インデックス
//
// 計算を増やすときは、js/calcs/<new>.js に CalcDef を書き、
// 下の import と ALL_DEFS に1行足すだけで済むようにしている。

import triangleDefs from './triangle.js';
import basicDefs from './basic.js';
import slopeDefs from './slope.js';
import areaDefs from './area.js';
import volumeDefs from './volume.js';
import woodDefs from './wood.js';
import layoutDefs from './layout.js';
import stairDefs from './stair.js';
import roofDefs from './roof.js';
import roomDefs from './room.js';
import concreteDefs from './concrete.js';
import tileDefs from './tile.js';
import paintDefs from './paint.js';
import pipeDefs from './pipe.js';
import elecDefs from './elec.js';
import earthDefs from './earth.js';
import surveyDefs from './survey.js';
import compoundDefs from './compound.js';
import structDefs from './struct.js';
import hvacDefs from './hvac.js';
import lightDefs from './light.js';
import metalDefs from './metal.js';
import estimateDefs from './estimate.js';
import furnitureDefs from './furniture.js';
import gardenDefs from './garden.js';
import solidDefs from './solid.js';

/**
 * カテゴリ（未実装カテゴリのタイルは表示しない）
 *
 * color: 一覧での識別色。tokens.css の --c-<name> に対応する。
 * 24分野を1画面に並べるため、近い分野は同じ色にまとめて「系統」が見えるようにしている
 * （寸法・幾何=blue、建築の構成要素=violet、木=amber、水=cyan など）。
 * icon は home.js が js/ui/icons.js のラインアイコンを使うため、
 * 対応するアイコンを持たない新カテゴリが増えたときのフォールバックとして残している。
 */
export const CATEGORIES = [
  { id: 'triangle', name: '三角・角度', icon: '📐', color: 'blue' },
  { id: 'length', name: '長さ・単位', icon: '📏', color: 'blue' },
  { id: 'area', name: '面積', icon: '⬛', color: 'blue' },
  { id: 'volume', name: '体積', icon: '🧊', color: 'blue' },
  { id: 'solid', name: '立体・3D', icon: '📦', color: 'indigo' },
  { id: 'slope', name: '勾配', icon: '📈', color: 'blue' },
  { id: 'wood', name: '木工・DIY寸法', icon: '🪚', color: 'amber' },
  { id: 'layout', name: '等分・配置', icon: '📍', color: 'teal' },
  { id: 'stair', name: '階段', icon: '🪜', color: 'violet' },
  { id: 'roof', name: '屋根', icon: '🏠', color: 'violet' },
  { id: 'room', name: '建築・リフォーム', icon: '🧱', color: 'violet' },
  { id: 'concrete', name: 'コンクリート', icon: '🧊', color: 'slate' },
  { id: 'tile', name: 'タイル・床材', icon: '🀫', color: 'teal' },
  { id: 'paint', name: '塗装・壁紙', icon: '🎨', color: 'pink' },
  { id: 'pipe', name: '配管・排水', icon: '🚿', color: 'cyan' },
  { id: 'elec', name: '電気', icon: '🔌', color: 'orange' },
  { id: 'earth', name: '土木・外構', icon: '🚧', color: 'yellow' },
  { id: 'survey', name: '測量・位置', icon: '📐', color: 'indigo' },
  { id: 'struct', name: '構造・強度', icon: '🏗', color: 'violet' },
  { id: 'furniture', name: '家具・木工', icon: '🪑', color: 'amber' },
  { id: 'estimate', name: '材料・積算', icon: '🧮', color: 'emerald' },
  { id: 'metal', name: '金属加工・機械', icon: '⚙', color: 'steel' },
  { id: 'hvac', name: '空調・断熱', icon: '🌡', color: 'red' },
  { id: 'light', name: '照明', icon: '💡', color: 'gold' },
  { id: 'garden', name: '庭・外構', icon: '🌱', color: 'green' }
];

const ALL_DEFS = [].concat(
  triangleDefs, basicDefs, slopeDefs, areaDefs, volumeDefs, woodDefs,
  layoutDefs, stairDefs, roofDefs, roomDefs, concreteDefs, tileDefs,
  paintDefs, pipeDefs, elecDefs, earthDefs, surveyDefs, compoundDefs,
  structDefs, hvacDefs, lightDefs, metalDefs, estimateDefs, furnitureDefs, gardenDefs,
  solidDefs
);

const BY_ID = new Map(ALL_DEFS.map((d) => [d.id, d]));

export function allCalcs() {
  return ALL_DEFS.slice();
}

export function getCalc(id) {
  return BY_ID.get(id) || null;
}

export function categoryName(id) {
  const c = CATEGORIES.find((x) => x.id === id);
  return c ? c.name : '';
}

/** カテゴリの識別色（tokens.css の --c-<name>）。未定義なら 'blue' */
export function categoryColor(id) {
  const c = CATEGORIES.find((x) => x.id === id);
  return (c && c.color) || 'blue';
}

export function calcsInCategory(id) {
  return ALL_DEFS.filter((d) => d.category === id);
}

/** 実装済みの計算を1件でも持つカテゴリだけを返す */
export function activeCategories() {
  return CATEGORIES.filter((c) => calcsInCategory(c.id).length > 0);
}

/* ---------- 検索 ---------- */

/** 同義語辞書（REQUIREMENTS 5-1） */
const SYNONYMS = [
  { words: ['斜め', 'ななめ', '斜辺', '斜材', '筋交い', 'すじかい', 'ブレース'], ids: ['tri.right'] },
  { words: ['勾配', 'こうばい', '傾斜', 'スロープ', '水勾配'], prefix: 'slope.' },
  { words: ['面積', '広さ', '平米', '坪', '畳'], prefix: 'area.' },
  { words: ['丸', '円', '半径', '直径', '円周'], ids: ['area.circle', 'vol.cylinder'] },
  { words: ['長さ', 'センチ', 'メートル', 'インチ', '換算'], ids: ['basic.unit.length'] }
];

/** ひらがな/カタカナ同一視・全半角統一・小文字化 */
export function normalize(text) {
  return String(text || '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60))
    .replace(/\s+/g, '');
}

function haystack(def) {
  return normalize(
    [def.title, def.subtitle, (def.keywords || []).join(' '), categoryName(def.category)].join(' ')
  );
}

/**
 * 部分一致検索。スコアは 前方一致 > キーワード完全一致 > 部分一致。
 * @returns {{def:object, score:number}[]}
 */
export function search(query) {
  const q = normalize(query);
  if (!q) return [];

  const boosted = new Set();
  for (const syn of SYNONYMS) {
    if (syn.words.some((w) => normalize(w).includes(q) || q.includes(normalize(w)))) {
      for (const d of ALL_DEFS) {
        if (syn.ids && syn.ids.includes(d.id)) boosted.add(d.id);
        if (syn.prefix && d.id.startsWith(syn.prefix)) boosted.add(d.id);
      }
    }
  }

  const hits = [];
  for (const def of ALL_DEFS) {
    let score = 0;
    const title = normalize(def.title);
    const hay = haystack(def);
    const kws = (def.keywords || []).map(normalize);

    if (title.startsWith(q)) score = 100;
    else if (kws.includes(q)) score = 80;
    else if (kws.some((k) => k.startsWith(q))) score = 70;
    else if (hay.includes(q)) score = 50;

    if (boosted.has(def.id)) score = Math.max(score, 90);

    if (score > 0) hits.push({ def, score });
  }
  hits.sort((a, b) => b.score - a.score || a.def.title.localeCompare(b.def.title, 'ja'));
  return hits;
}

/** 0件のときに提示する近いカテゴリ */
export function suggestCategories() {
  return activeCategories();
}
