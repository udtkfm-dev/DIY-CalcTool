// ellipse.js — 楕円の作図（area.ellipse 用）
//
// 長半径 a・短半径 b から楕円を描く。circle.js と同様、正多角形近似の
// 頂点列で描く（64角形）。
// タップ可能ラベル: 長半径 a / 短半径 b / 面積（結果ラベル S）。

import { createScene } from './engine.js';

const FALLBACK_A = 100;
const FALLBACK_B = 60;
const SEGMENTS = 64;

export function render(model) {
  const scene = createScene({ ariaLabel: '楕円の図' });

  const v = model.values || {};
  let a = Number(v.a);
  let b = Number(v.b);
  if (!(Number.isFinite(a) && a > 0)) a = FALLBACK_A;
  if (!(Number.isFinite(b) && b > 0)) b = FALLBACK_B;

  scene.fit(-a, -b, a, b);

  const pts = [];
  for (let i = 0; i < SEGMENTS; i++) {
    const ang = (i / SEGMENTS) * Math.PI * 2;
    pts.push(scene.pt(a * Math.cos(ang), b * Math.sin(ang)));
  }
  scene.polygon(pts, 'body');

  const center = scene.pt(0, 0);
  const right = scene.pt(a, 0);
  const top = scene.pt(0, b);
  const bottom = scene.pt(0, -b);

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

  scene.dim(center, right, opt('a', { offset: 16, labelGap: 12 }));
  scene.dim(center, top, opt('b', { offset: 16, labelGap: 12, flip: true }));

  if (L.S) scene.tapLabel([bottom[0], bottom[1] + 24], opt('S', {}));

  scene.note();

  if (focus) {
    const g = scene.el.querySelector(`.dim[data-key="${focus}"]`);
    if (g) g.classList.add('is-focus');
  }

  return scene.el;
}

export default { render };
