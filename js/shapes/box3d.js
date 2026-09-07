// box3d.js — 直方体（vol.box）の擬似3D作図
//
// engine.js は2D専用（16-2で見送った制約）だが、モデル座標を「奥行きを右上へ
// 斜めに逃がす」投影（キャビネット図法に近い）で事前に2次元化してから scene.fit/pt
// に渡すことで、既存の2D専用プリミティブのまま立体感のある図を作れる。
// vol.cube（立方体）は shapeMap で w=h=d='a' として同じ図形を流用する。

import { createScene } from './engine.js';

const FALLBACK_W = 100;
const FALLBACK_H = 70;
const FALLBACK_D = 60;

const DEPTH_ANGLE = Math.PI / 6.5; // 奥行きを逃がす角度
const DEPTH_SCALE = 0.55; // 奥行きの見かけの縮み

/** 3D(X:幅, Y:高さ, Z:奥行き) → 2D(モデル座標)。Zを右上へ斜めに逃がす */
function proj(X, Y, Z) {
  return [X + Z * Math.cos(DEPTH_ANGLE) * DEPTH_SCALE, Y + Z * Math.sin(DEPTH_ANGLE) * DEPTH_SCALE];
}

/**
 * @param {object} model
 *   values: { w, h, d } 内部単位（mm）
 *   labels: { w, h, d } state/text/name
 */
export function render(model) {
  const scene = createScene({ ariaLabel: '直方体の図', pad: { bottom: 66 } });

  const v = model.values || {};
  let w = Number(v.w);
  let h = Number(v.h);
  let d = Number(v.d);
  if (!(Number.isFinite(w) && w > 0)) w = FALLBACK_W;
  if (!(Number.isFinite(h) && h > 0)) h = FALLBACK_H;
  if (!(Number.isFinite(d) && d > 0)) d = FALLBACK_D;

  // 8頂点（前面 A-D、奥面 A'-D'）
  const A = proj(0, 0, 0);
  const B = proj(w, 0, 0);
  const C = proj(w, h, 0);
  const D = proj(0, h, 0);
  const A2 = proj(0, 0, d);
  const B2 = proj(w, 0, d);
  const C2 = proj(w, h, d);
  const D2 = proj(0, h, d);

  const all = [A, B, C, D, A2, B2, C2, D2];
  const minX = Math.min(...all.map((p) => p[0]));
  const maxX = Math.max(...all.map((p) => p[0]));
  const minY = Math.min(...all.map((p) => p[1]));
  const maxY = Math.max(...all.map((p) => p[1]));
  scene.fit(minX, minY, maxX, maxY);

  const pA = scene.pt(...A);
  const pB = scene.pt(...B);
  const pC = scene.pt(...C);
  const pD = scene.pt(...D);
  const pB2 = scene.pt(...B2);
  const pC2 = scene.pt(...C2);
  const pD2 = scene.pt(...D2);

  // 右面・上面（奥行きを示す）を先に描き、正面を最後に重ねて隠れ線を隠す
  scene.polygon([pB, pB2, pC2, pC], 'body');
  scene.polygon([pD, pC, pC2, pD2], 'body');
  scene.polygon([pA, pB, pC, pD], 'body');

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

  scene.dim(pA, pB, opt('w', { offset: 22, labelGap: 12 }));
  scene.dim(pB, pC, opt('h', { offset: 22, labelGap: 12 }));
  scene.dim(pD, pD2, opt('d', { offset: 14, labelGap: 12, flip: true }));

  scene.note();

  if (focus) {
    const g = scene.el.querySelector(`.dim[data-key="${focus}"]`);
    if (g) g.classList.add('is-focus');
  }

  return scene.el;
}

export default { render };
