// miterAngle.js — 留め継ぎの角度の作図（wood.miter 用）
//
// 接合角度 jointAngle の頂点に、二等分線（カット角度 cutAngle）を破線で示す。
// タップ可能ラベル: 接合角度 jointAngle / カット角度 cutAngle。

import { createScene } from './engine.js';

const FALLBACK_JOINT = 90;
const ARM = 90;

export function render(model) {
  const scene = createScene({ ariaLabel: '留め継ぎの角度の図' });

  const v = model.values || {};
  let jointAngle = Number(v.jointAngle);
  if (!(Number.isFinite(jointAngle) && jointAngle > 0 && jointAngle < 180)) jointAngle = FALLBACK_JOINT;

  const half = jointAngle / 2;
  const halfRad = (half * Math.PI) / 180;

  const Vm = [0, 0];
  const P1m = [ARM * Math.cos(halfRad), ARM * Math.sin(halfRad)];
  const P2m = [ARM * Math.cos(-halfRad), ARM * Math.sin(-halfRad)];
  const Bim = [ARM * 0.7, 0];

  const xs = [Vm[0], P1m[0], P2m[0]];
  const ys = [P1m[1], P2m[1], Vm[1]];
  scene.fit(Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys));

  const V = scene.pt(Vm[0], Vm[1]);
  const P1 = scene.pt(P1m[0], P1m[1]);
  const P2 = scene.pt(P2m[0], P2m[1]);
  const Bi = scene.pt(Bim[0], Bim[1]);

  scene.line(V, P1, 'body');
  scene.line(V, P2, 'body');
  const biLine = scene.line(V, Bi, 'aux');
  biLine.setAttribute('stroke-dasharray', '3 3');

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

  scene.angleArc(V, P1, P2, opt('jointAngle', { radius: 52, labelGap: 22 }));
  scene.angleArc(V, P1, Bi, opt('cutAngle', { radius: 16, labelGap: 8 }));

  scene.note();

  if (focus) {
    const g = scene.el.querySelector(`.dim[data-key="${focus}"]`);
    if (g) g.classList.add('is-focus');
  }

  return scene.el;
}

export default { render };
