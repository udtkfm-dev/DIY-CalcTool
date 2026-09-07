// prism3d.js — 三角柱（vol.prismTri）の擬似3D作図
//
// box3d.js と同じ「奥行きを右上へ逃がす投影」で、底辺 b・高さ h の二等辺三角形
// （triangleBH.js と同じ中央頂点の配置）を奥行き L だけ押し出して描く。

import { createScene } from './engine.js';

const FALLBACK_B = 100;
const FALLBACK_H = 70;
const FALLBACK_L = 90;

const DEPTH_ANGLE = Math.PI / 6.5;
const DEPTH_SCALE = 0.55;

function proj(X, Y, Z) {
  return [X + Z * Math.cos(DEPTH_ANGLE) * DEPTH_SCALE, Y + Z * Math.sin(DEPTH_ANGLE) * DEPTH_SCALE];
}

/**
 * @param {object} model
 *   values: { b, h, L } 内部単位（mm）
 *   labels: { b, h, L } state/text/name
 */
export function render(model) {
  const scene = createScene({ ariaLabel: '三角柱の図', pad: { bottom: 60 } });

  const v = model.values || {};
  let b = Number(v.b);
  let h = Number(v.h);
  let L = Number(v.L);
  if (!(Number.isFinite(b) && b > 0)) b = FALLBACK_B;
  if (!(Number.isFinite(h) && h > 0)) h = FALLBACK_H;
  if (!(Number.isFinite(L) && L > 0)) L = FALLBACK_L;

  const apex0 = proj(0, h, 0);
  const left0 = proj(-b / 2, 0, 0);
  const right0 = proj(b / 2, 0, 0);
  const apexL = proj(0, h, L);
  const rightL = proj(b / 2, 0, L);

  const all = [apex0, left0, right0, apexL, rightL];
  const minX = Math.min(...all.map((p) => p[0]));
  const maxX = Math.max(...all.map((p) => p[0]));
  const minY = Math.min(...all.map((p) => p[1]));
  const maxY = Math.max(...all.map((p) => p[1]));
  scene.fit(minX, minY, maxX, maxY);

  const pApex0 = scene.pt(...apex0);
  const pLeft0 = scene.pt(...left0);
  const pRight0 = scene.pt(...right0);
  const pApexL = scene.pt(...apexL);
  const pRightL = scene.pt(...rightL);

  // 右の傾斜面（奥行きを示す）を先に、正面の三角形を最後に重ねる
  scene.polygon([pRight0, pApex0, pApexL, pRightL], 'body');
  scene.polygon([pApex0, pLeft0, pRight0], 'body');

  const pFoot = scene.pt(...proj(0, 0, 0));

  const L_ = model.labels || {};
  const focus = model.focusKey;
  const opt = (key, extra) =>
    Object.assign(
      {
        key,
        text: L_[key] ? L_[key].text : '—',
        state: L_[key] ? L_[key].state : 'empty',
        name: L_[key] ? L_[key].name : key
      },
      extra
    );

  scene.dim(pLeft0, pRight0, opt('b', { offset: 22, labelGap: 12 }));
  scene.dim(pFoot, pApex0, opt('h', { offset: 18, labelGap: 12, flip: true }));
  scene.dim(pRight0, pRightL, opt('L', { offset: 16, labelGap: 12 }));

  scene.note();

  if (focus) {
    const g = scene.el.querySelector(`.dim[data-key="${focus}"]`);
    if (g) g.classList.add('is-focus');
  }

  return scene.el;
}

export default { render };
