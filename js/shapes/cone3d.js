// cone3d.js — 円錐（vol.cone）の擬似3D作図
//
// 頂点＋底面の楕円（手前の弧のみ）で輪郭を作り、cylinder3d.js と同じ考え方で
// 立体感を出す。底面の奥側は頂点からの2直線に隠れるため描かない。

import { createScene } from './engine.js';

const FALLBACK_R = 60;
const FALLBACK_H = 100;
const SEGMENTS = 48;
const RY_RATIO = 0.32;

function ellipsePts(cx, cy, rx, ry, fromT, toT, n) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const t = fromT + ((toT - fromT) * i) / n;
    pts.push([cx + rx * Math.cos(t), cy + ry * Math.sin(t)]);
  }
  return pts;
}

/**
 * @param {object} model
 *   values: { r, h } 内部単位（mm）
 *   labels: { r, h } state/text/name
 */
export function render(model) {
  const scene = createScene({ ariaLabel: '円錐の図' });

  const v = model.values || {};
  let r = Number(v.r);
  let h = Number(v.h);
  if (!(Number.isFinite(r) && r > 0)) r = FALLBACK_R;
  if (!(Number.isFinite(h) && h > 0)) h = FALLBACK_H;
  const ry = r * RY_RATIO;

  scene.fit(-r, -ry, r, h);

  const apex = [0, h];
  const bodyModel = [apex, [r, 0], ...ellipsePts(0, 0, r, ry, 0, Math.PI, SEGMENTS / 2), [-r, 0]];
  scene.polygon(bodyModel.map((p) => scene.pt(p[0], p[1])), 'body');

  // 底面の手前の弧を輪郭線として重ね描き（奥は頂点への2辺に隠れる想定で省略）
  const frontArc = ellipsePts(0, 0, r, ry, Math.PI, Math.PI * 2, SEGMENTS / 2);
  for (let i = 0; i < frontArc.length - 1; i++) {
    scene.line(scene.pt(...frontArc[i]), scene.pt(...frontArc[i + 1]), 'aux');
  }

  const pApex = scene.pt(...apex);
  const pBaseR = scene.pt(r, 0);
  const pBaseL = scene.pt(-r, 0);
  const centerBottom = scene.pt(0, 0);

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

  scene.dim(pBaseL, centerBottom, opt('r', { offset: 22, labelGap: 12, flip: false }));
  scene.dim(pApex, centerBottom, opt('h', { offset: 20, labelGap: 12 }));

  scene.note();

  if (focus) {
    const g = scene.el.querySelector(`.dim[data-key="${focus}"]`);
    if (g) g.classList.add('is-focus');
  }

  return scene.el;
}

export default { render };
