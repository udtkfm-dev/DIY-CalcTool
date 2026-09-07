// twoRects.js — 2つの長方形の合成（L字型）の作図（room.multiRect 用）
//
// 位置情報（x,y）を持たない計算のため、正確な間取りではなく「長方形1の右に
// 長方形2を並べたL字型」の模式図として描く（面積の合計自体は w1×d1 + w2×d2 の
// 単純な足し算で、図の配置は視覚的な目安）。
// タップ可能ラベル: w1 / d1 / w2 / d2 / area（結果ラベル）。

import { createScene } from './engine.js';

const FALLBACK = { w1: 120, d1: 70, w2: 60, d2: 40 };

export function render(model) {
  const scene = createScene({ ariaLabel: '2つの長方形を合成した図', pad: { bottom: 104 } });

  const v = model.values || {};
  let w1 = Number(v.w1);
  let d1 = Number(v.d1);
  let w2 = Number(v.w2);
  let d2 = Number(v.d2);
  if (!(Number.isFinite(w1) && w1 > 0)) w1 = FALLBACK.w1;
  if (!(Number.isFinite(d1) && d1 > 0)) d1 = FALLBACK.d1;
  if (!(Number.isFinite(w2) && w2 > 0)) w2 = FALLBACK.w2;
  if (!(Number.isFinite(d2) && d2 > 0)) d2 = FALLBACK.d2;

  const totalW = w1 + w2;
  const totalH = Math.max(d1, d2);
  scene.fit(0, 0, totalW, totalH);

  const A1 = scene.pt(0, 0);
  const B1 = scene.pt(w1, 0);
  const C1 = scene.pt(w1, d1);
  const D1 = scene.pt(0, d1);
  scene.polygon([A1, B1, C1, D1], 'body');

  const A2 = scene.pt(w1, 0);
  const B2 = scene.pt(w1 + w2, 0);
  const C2 = scene.pt(w1 + w2, d2);
  const D2 = scene.pt(w1, d2);
  scene.polygon([A2, B2, C2, D2], 'body');

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

  scene.dim(A1, B1, opt('w1', { offset: 22, labelGap: 12 }));
  scene.dim(D1, A1, opt('d1', { offset: 22, labelGap: 12, flip: true }));
  scene.dim(A2, B2, opt('w2', { offset: 22, labelGap: 12 }));
  scene.dim(B2, C2, opt('d2', { offset: 22, labelGap: 12 }));

  // 合計面積（結果）は w1/w2 の寸法ラベル行とぶつからないよう、さらに外側（下）に置く
  const areaPos = [(A1[0] + B2[0]) / 2, Math.max(A1[1], A2[1]) + 72];
  if (L.area) scene.tapLabel(areaPos, opt('area', {}));

  scene.note();

  if (focus) {
    const g = scene.el.querySelector(`.dim[data-key="${focus}"]`);
    if (g) g.classList.add('is-focus');
  }

  return scene.el;
}

export default { render };
