// rightTriangle.js — 直角三角形の作図
//
// 頂点は A（左下）・B（右下・直角）・C（右上）。
// 比率が変わっても向きは保つ（常に 左下 → 右下 → 右上）。

import { createScene } from './engine.js';

/** 値が無いときの仮の形（図が消えて操作できなくなるのを避ける） */
const FALLBACK_A = 100;
const FALLBACK_RATIO = 0.5;

/**
 * @param {object} model
 *   values: { a, b } 内部単位（mm）。無い場合は仮の形を使う
 *   labels: { a:{text,state,name}, b:…, c:…, angA:…, angC:… }
 *     state は 'input' | 'derived' | 'empty'
 *   focusKey: いま編集中の欄のキー
 *   labelOverrides: 図形上の表示名の差し替え（slope.length などで流用するため）
 * @returns {SVGElement}
 */
export function render(model) {
  // 既定の余白だと、高さのラベルが右端で切れ、底辺のラベルが右下の注記に重なる
  // （桁数の多い値ほど顕著になる）。rightTriangle は10件以上の計算が流用している。
  const scene = createScene({ ariaLabel: '直角三角形の図', pad: { right: 62, bottom: 64 } });

  const v = model.values || {};
  let a = Number(v.a);
  let b = Number(v.b);
  const okA = Number.isFinite(a) && a > 0;
  const okB = Number.isFinite(b) && b > 0;

  if (!okA && !okB) {
    a = FALLBACK_A;
    b = FALLBACK_A * FALLBACK_RATIO;
  } else if (!okA) {
    a = b / FALLBACK_RATIO;
  } else if (!okB) {
    b = a * FALLBACK_RATIO;
  }

  scene.fit(0, 0, a, b);

  const A = scene.pt(0, 0);
  const B = scene.pt(a, 0);
  const C = scene.pt(a, b);

  scene.polygon([A, B, C], 'body');

  const L = model.labels || {};
  const focus = model.focusKey;

  const opt = (key, extra) =>
    Object.assign(
      {
        key,
        text: L[key] ? L[key].text : '—',
        state: L[key] ? L[key].state : 'empty',
        name: L[key] ? L[key].name : key
      },
      extra
    );

  // この図形を流用する計算では、対応する値を持たないラベルがある（例: tri.trig に斜辺は無い）。
  // そのキーは labels 自体に入ってこないので、描かずに飛ばす（描くと「—」の空ラベルが残る）。
  const has = (key) => Object.prototype.hasOwnProperty.call(L, key);

  // 底辺 a: 下側へ寸法線
  if (has('a')) scene.dim(A, B, opt('a', { offset: 20, labelGap: 11, flip: false }));
  // 高さ b: 右側へ寸法線
  if (has('b')) scene.dim(B, C, opt('b', { offset: 18, labelGap: 10, flip: false }));
  // 斜辺 c: 図形の外側（左上）へ寸法線
  if (has('c')) scene.dim(C, A, opt('c', { offset: 20, labelGap: 12, flip: false }));

  // 角A（底辺と斜辺のあいだ） / 角C（高さと斜辺のあいだ）
  if (has('angA')) scene.angleArc(A, B, C, opt('angA', { radius: 26, labelGap: 18 }));
  if (has('angC')) scene.angleArc(C, A, B, opt('angC', { radius: 26, labelGap: 18 }));

  // 直角記号は B
  scene.rightAngle(B, A, C, 11);

  scene.vertexLabel(A, 'A', -11, 12);
  scene.vertexLabel(B, 'B', 11, 12);
  scene.vertexLabel(C, 'C', 12, -6);

  scene.note();

  // フォーカス中のラベルを強調する
  if (focus) {
    const g = scene.el.querySelector(`.dim[data-key="${focus}"]`);
    if (g) g.classList.add('is-focus');
  }

  return scene.el;
}

export default { render };
