// parallelogram.js — 平行四辺形の作図（area.parallelogram 用）
//
// 底辺 b・高さ h から、右上へ傾けた平行四辺形として描く（傾き自体は表示上の演出で
// 数値には関係しない。高さの寸法線が示す垂直距離だけが数値として正しい）。
// タップ可能ラベル: 底辺 b / 高さ h / 面積（結果ラベル S）。

import { createScene } from './engine.js';

const FALLBACK_B = 140;
const FALLBACK_H = 80;

export function render(model) {
  const scene = createScene({ ariaLabel: '平行四辺形の図' });

  const v = model.values || {};
  let b = Number(v.b);
  let h = Number(v.h);
  if (!(Number.isFinite(b) && b > 0)) b = FALLBACK_B;
  if (!(Number.isFinite(h) && h > 0)) h = FALLBACK_H;

  const shift = Math.min(b * 0.35, h * 0.9, 60);

  const blM = [0, 0];
  const brM = [b, 0];
  const trM = [b + shift, h];
  const tlM = [shift, h];
  const hFootM = [shift, 0];

  const xs = [blM[0], brM[0], trM[0], tlM[0]];
  scene.fit(Math.min(...xs), 0, Math.max(...xs), h);

  const bl = scene.pt(blM[0], blM[1]);
  const br = scene.pt(brM[0], brM[1]);
  const tr = scene.pt(trM[0], trM[1]);
  const tl = scene.pt(tlM[0], tlM[1]);
  const hFoot = scene.pt(hFootM[0], hFootM[1]);

  scene.polygon([bl, br, tr, tl], 'body');

  const hLine = scene.line(hFoot, tl, 'aux');
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

  scene.dim(bl, br, opt('b', { offset: 22, labelGap: 12, flip: true }));
  scene.dim(hFoot, tl, opt('h', { offset: 30, labelGap: 12, flip: true }));

  // 面積は寸法線を引かない「結果ラベル」。底辺の外側（さらに下）に置き、b の寸法線と重ならないようにする
  const sPos = [(bl[0] + br[0]) / 2, bl[1] + 24];
  if (L.S) scene.tapLabel(sPos, opt('S', {}));

  scene.note();

  if (focus) {
    const g = scene.el.querySelector(`.dim[data-key="${focus}"]`);
    if (g) g.classList.add('is-focus');
  }

  return scene.el;
}

export default { render };
