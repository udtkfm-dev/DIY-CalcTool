// cylinder3d.js — 円柱（vol.cylinder）の擬似3D作図
//
// 上面を全周の楕円（本体色で塗って重ねることで「ふた」に見せる）、側面を
// 手前の弧＋左右の垂直線で構成する。engine.js の polygon プリミティブのみで組む。

import { createScene } from './engine.js';

const FALLBACK_R = 55;
const FALLBACK_H = 100;
const SEGMENTS = 48;
const RY_RATIO = 0.32; // 楕円の縦横比（奥行き感）

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
  const scene = createScene({ ariaLabel: '円柱の図' });

  const v = model.values || {};
  let r = Number(v.r);
  let h = Number(v.h);
  if (!(Number.isFinite(r) && r > 0)) r = FALLBACK_R;
  if (!(Number.isFinite(h) && h > 0)) h = FALLBACK_H;
  const ry = r * RY_RATIO;

  scene.fit(-r, -ry, r, h + ry);

  // 本体（左右の垂直線＋手前の底の弧で作る輪郭。上端は直線でよい＝上に楕円を重ねて隠す）
  const bodyModel = [
    [-r, h],
    [-r, 0],
    ...ellipsePts(0, 0, r, ry, Math.PI, Math.PI * 2, SEGMENTS / 2), // 手前(front)の底の弧: 左→右、下へ膨らむ
    [r, h]
  ];
  scene.polygon(bodyModel.map((p) => scene.pt(p[0], p[1])), 'body');

  // 上面の楕円（全周）を本体の上に重ねて「ふた」に見せる
  const topModel = ellipsePts(0, h, r, ry, 0, Math.PI * 2, SEGMENTS);
  scene.polygon(topModel.map((p) => scene.pt(p[0], p[1])), 'body');

  const center = scene.pt(0, h);
  // 半径線は左下方向へ逃がし、高さの寸法線（右側）と重ならないようにする
  const rEnd = scene.pt(r * Math.cos((Math.PI * 5) / 4), h + ry * Math.sin((Math.PI * 5) / 4));
  const hTop = scene.pt(r, h);
  const hBottom = scene.pt(r, 0);

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

  scene.dim(center, rEnd, opt('r', { offset: 12, labelGap: 12 }));
  scene.dim(hTop, hBottom, opt('h', { offset: 20, labelGap: 12 }));

  scene.note();

  if (focus) {
    const g = scene.el.querySelector(`.dim[data-key="${focus}"]`);
    if (g) g.classList.add('is-focus');
  }

  return scene.el;
}

export default { render };
