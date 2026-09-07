// sphere3d.js — 球（vol.sphere）の作図
//
// circle.js と同じ多角形近似の円に、赤道を示す横長の楕円（線のみ）を重ねて
// 立体の球であることを示す。タップ可能ラベルは半径 r のみ（体積は結果カードで表示）。

import { createScene } from './engine.js';

const FALLBACK_R = 80;
const SEGMENTS = 64;
const EQUATOR_RY_RATIO = 0.28;

/**
 * @param {object} model
 *   values: { r } 内部単位（mm）
 *   labels: { r } state/text/name
 */
export function render(model) {
  const scene = createScene({ ariaLabel: '球の図' });

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

  // 赤道（横長の楕円、線のみ）
  const ry = r * EQUATOR_RY_RATIO;
  const eqPts = [];
  for (let i = 0; i <= SEGMENTS; i++) {
    const ang = (i / SEGMENTS) * Math.PI * 2;
    eqPts.push(scene.pt(r * Math.cos(ang), ry * Math.sin(ang)));
  }
  for (let i = 0; i < eqPts.length - 1; i++) {
    scene.line(eqPts[i], eqPts[i + 1], 'aux');
  }

  const center = scene.pt(0, 0);
  const radiusEnd = scene.pt(r * Math.cos(Math.PI / 4), r * Math.sin(Math.PI / 4));

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

  scene.dim(center, radiusEnd, opt('r', { offset: 16, labelGap: 12 }));

  scene.note();

  if (focus) {
    const g = scene.el.querySelector(`.dim[data-key="${focus}"]`);
    if (g) g.classList.add('is-focus');
  }

  return scene.el;
}

export default { render };
