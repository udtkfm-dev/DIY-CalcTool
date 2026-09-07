// triangleBH.js — 底辺・高さの三角形の作図（area.triangle 用）
//
// 3辺の長さではなく「底辺・高さ」だけが確定する計算のため、頂点位置は
// 底辺の中央に置いた二等辺三角形として描く（実際の頂点位置は不定。高さの
// 寸法線が示す垂線の長さだけが数値として正しい）。
// タップ可能ラベル: 底辺 b / 高さ h / 面積（結果ラベル S）。CALC_SPEC の area.triangle 準拠。

import { createScene } from './engine.js';

const FALLBACK_B = 120;
const FALLBACK_H = 80;

export function render(model) {
  const scene = createScene({ ariaLabel: '三角形（底辺・高さ）の図' });

  const v = model.values || {};
  let b = Number(v.b);
  let h = Number(v.h);
  if (!(Number.isFinite(b) && b > 0)) b = FALLBACK_B;
  if (!(Number.isFinite(h) && h > 0)) h = FALLBACK_H;

  const Am = [0, 0];
  const Bm = [b, 0];
  const Cm = [b / 2, h];
  const Fm = [b / 2, 0]; // 高さの足

  scene.fit(0, 0, b, h);

  const A = scene.pt(Am[0], Am[1]);
  const B = scene.pt(Bm[0], Bm[1]);
  const C = scene.pt(Cm[0], Cm[1]);
  const F = scene.pt(Fm[0], Fm[1]);

  scene.polygon([A, B, C], 'body');

  const hLine = scene.line(F, C, 'aux');
  hLine.setAttribute('stroke-dasharray', '3 3');

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

  scene.dim(A, B, opt('b', { offset: 22, labelGap: 12, flip: true }));
  scene.dim(F, C, opt('h', { offset: 60, labelGap: 16 }));

  // 面積は寸法線を引かない「結果ラベル」。底辺の外側（さらに下）に置き、b の寸法線と重ならないようにする
  const sPos = [(A[0] + B[0]) / 2, A[1] + 24];
  if (L.S) scene.tapLabel(sPos, opt('S', {}));

  scene.note();

  if (focus) {
    const g = scene.el.querySelector(`.dim[data-key="${focus}"]`);
    if (g) g.classList.add('is-focus');
  }

  return scene.el;
}

export default { render };
