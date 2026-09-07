// circle.js — 円の作図
//
// 半径 r（内部単位）から円を描く。円弧は Canvas ではなく、正多角形近似の <polygon>
// で描く（engine.js に円プリミティブを増やさずに済ませるため。64角形なので見た目上は
// 円と区別できない）。
// タップ可能ラベル: 半径 r / 直径 d / 円周・面積（結果ラベル L, S）。CALC_SPEC の area.circle 準拠。

import { createScene } from './engine.js';

const FALLBACK_R = 80;
const SEGMENTS = 64;

/**
 * @param {object} model
 *   values: { r } 内部単位（mm）
 *   labels: { r, d, L, S } state/text/name
 */
export function render(model) {
  const scene = createScene({ ariaLabel: '円の図' });

  const v = model.values || {};
  let r = Number(v.r);
  if (!(Number.isFinite(r) && r > 0)) r = FALLBACK_R;

  scene.fit(-r, -r, r, r);

  const pts = [];
  for (let i = 0; i < SEGMENTS; i++) {
    const ang = (i / SEGMENTS) * Math.PI * 2;
    pts.push(scene.pt(r * Math.cos(ang), r * Math.sin(ang)));
  }
  scene.polygon(pts, 'body');

  const center = scene.pt(0, 0);
  // 半径線は斜め45°に置く（直径の水平線・結果ラベルの縦軸と重ならない向き）
  const radiusEnd = scene.pt(r * Math.cos(Math.PI / 4), r * Math.sin(Math.PI / 4));
  const left = scene.pt(-r, 0);
  const right = scene.pt(r, 0);
  const bottom = scene.pt(0, -r);

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

  // 対応する値を持たないラベル（concrete.pier に直径は無い等）は描かずに飛ばす
  const has = (key) => Object.prototype.hasOwnProperty.call(L, key);

  // 半径: 中心 → 斜め45°の点
  if (has('r')) scene.dim(center, radiusEnd, opt('r', { offset: 16, labelGap: 12 }));
  // 直径: 左端 → 右端（横方向）。ラベルは中心より下側に出し、半径線の斜め上とぶつからないようにする
  if (has('d')) scene.dim(left, right, opt('d', { offset: 20, labelGap: 12, flip: false }));

  // 円周・面積は寸法線を引かない「結果ラベル」。円の下の余白に並べて置く
  if (L.L) scene.tapLabel([bottom[0] - 40, bottom[1] + 24], opt('L', {}));
  if (L.S) scene.tapLabel([bottom[0] + 40, bottom[1] + 24], opt('S', {}));

  scene.note();

  if (focus) {
    const g = scene.el.querySelector(`.dim[data-key="${focus}"]`);
    if (g) g.classList.add('is-focus');
  }

  return scene.el;
}

export default { render };
