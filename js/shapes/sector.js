// sector.js — 扇形の作図（area.sector 用）
//
// 半径 r・中心角 theta から扇形を描く。円弧は circle.js と同様、正多角形近似の
// 頂点列で描く。
// タップ可能ラベル: 半径 r / 中心角 theta / 弧長・面積（結果ラベル L, S）。

import { createScene } from './engine.js';

const FALLBACK_R = 90;
const FALLBACK_THETA = 90;
const SEGMENTS = 48;

export function render(model) {
  const scene = createScene({ ariaLabel: '扇形の図' });

  const v = model.values || {};
  let r = Number(v.r);
  let theta = Number(v.theta);
  if (!(Number.isFinite(r) && r > 0)) r = FALLBACK_R;
  if (!(Number.isFinite(theta) && theta > 0 && theta <= 360)) theta = FALLBACK_THETA;

  const thetaRad = (theta * Math.PI) / 180;
  const segs = Math.max(2, Math.round((SEGMENTS * theta) / 360));

  const arcPtsM = [];
  for (let i = 0; i <= segs; i++) {
    const ang = (thetaRad * i) / segs;
    arcPtsM.push([r * Math.cos(ang), r * Math.sin(ang)]);
  }

  const xs = [0, ...arcPtsM.map((p) => p[0])];
  const ys = [0, ...arcPtsM.map((p) => p[1])];
  scene.fit(Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys));

  const Os = scene.pt(0, 0);
  const arcPts = arcPtsM.map((p) => scene.pt(p[0], p[1]));
  scene.polygon([Os, ...arcPts], 'body');

  const P0s = arcPts[0];
  const P1s = arcPts[arcPts.length - 1];

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

  scene.dim(Os, P0s, opt('r', { offset: 14, labelGap: 12 }));
  scene.angleArc(Os, P0s, P1s, opt('theta', { radius: 18, labelGap: 10 }));

  const midAng = thetaRad / 2;
  const arcMidOuterM = [r * 1.18 * Math.cos(midAng), r * 1.18 * Math.sin(midAng)];
  const arcMidOuter = scene.pt(arcMidOuterM[0], arcMidOuterM[1]);
  if (L.L) scene.tapLabel(arcMidOuter, opt('L', {}));

  const innerM = [r * 0.78 * Math.cos(midAng), r * 0.78 * Math.sin(midAng)];
  const inner = scene.pt(innerM[0], innerM[1]);
  if (L.S) scene.tapLabel(inner, opt('S', {}));

  scene.note();

  if (focus) {
    const g = scene.el.querySelector(`.dim[data-key="${focus}"]`);
    if (g) g.classList.add('is-focus');
  }

  return scene.el;
}

export default { render };
