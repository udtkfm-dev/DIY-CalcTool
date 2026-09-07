// rectangle.js — 長方形の作図
//
// 幅 w・高さ h の長方形。対角線 d は破線で表示（REQUIREMENTS 6-2）。
// タップ可能ラベル: 幅 / 高さ / 対角線 / 面積（結果ラベル）。
// area.square（正方形）も w=h として同じ図形を流用する（calcs 側で w,h に同値を渡す）。

import { createScene } from './engine.js';

const FALLBACK_W = 120;
const FALLBACK_RATIO = 0.62;

/**
 * @param {object} model
 *   values: { w, h } 内部単位（mm）
 *   labels: { w, h, d, S } state/text/name（S は面積の結果ラベル用キー。CALC_SPEC の area.rect 準拠）
 */
export function render(model) {
  // 既定の余白だと、幅のラベルが右下の注記に重なり、高さのラベルが右端で切れる。
  // rectangle は20件以上の計算が流用しているので、ここを直すと全部に効く。
  const scene = createScene({ ariaLabel: '長方形の図', pad: { bottom: 64, right: 64 } });

  const v = model.values || {};
  let w = Number(v.w);
  let h = Number(v.h);
  const okW = Number.isFinite(w) && w > 0;
  const okH = Number.isFinite(h) && h > 0;

  if (!okW && !okH) {
    w = FALLBACK_W;
    h = FALLBACK_W * FALLBACK_RATIO;
  } else if (!okW) {
    w = h / FALLBACK_RATIO;
  } else if (!okH) {
    h = w * FALLBACK_RATIO;
  }

  scene.fit(0, 0, w, h);

  const A = scene.pt(0, 0);
  const B = scene.pt(w, 0);
  const C = scene.pt(w, h);
  const D = scene.pt(0, h);

  scene.polygon([A, B, C, D], 'body');

  const diag = scene.line(A, C, 'aux');
  diag.setAttribute('stroke-dasharray', '4 3');

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

  // 対応する値を持たないラベル（room.ceiling に高さは無い等）は描かずに飛ばす
  const has = (key) => Object.prototype.hasOwnProperty.call(L, key);

  if (has('w')) scene.dim(A, B, opt('w', { offset: 20, labelGap: 11 }));
  if (has('h')) scene.dim(B, C, opt('h', { offset: 18, labelGap: 10 }));

  // 対角線ラベルは対角線の1/4点付近、面積ラベルは中心に置いて重ならないようにする
  const lerp = (p1, p2, t) => [p1[0] + (p2[0] - p1[0]) * t, p1[1] + (p2[1] - p1[1]) * t];
  const diagLabelPos = lerp(A, C, 0.25);
  const centerPos = lerp(A, C, 0.5);

  if (L.d) scene.tapLabel(diagLabelPos, opt('d', {}));
  if (L.S) scene.tapLabel(centerPos, opt('S', {}));

  scene.note();

  if (focus) {
    const g = scene.el.querySelector(`.dim[data-key="${focus}"]`);
    if (g) g.classList.add('is-focus');
  }

  return scene.el;
}

export default { render };
