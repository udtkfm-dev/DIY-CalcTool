// trapezoid.js — 台形の作図（area.trapezoid 用）
//
// 上底 a・下底 b・高さ h から、上底を中央にそろえた等脚台形として描く
// （実際の傾きは不定なため、高さの寸法線が示す垂直距離だけが数値として正しい）。
// タップ可能ラベル: 上底 a / 下底 b / 高さ h / 面積（結果ラベル S）。

import { createScene } from './engine.js';

const FALLBACK_A = 80;
const FALLBACK_B = 140;
const FALLBACK_H = 70;

export function render(model) {
  const scene = createScene({ ariaLabel: '台形の図' });

  const v = model.values || {};
  let a = Number(v.a);
  let b = Number(v.b);
  let h = Number(v.h);
  if (!(Number.isFinite(a) && a > 0)) a = FALLBACK_A;
  if (!(Number.isFinite(b) && b > 0)) b = FALLBACK_B;
  if (!(Number.isFinite(h) && h > 0)) h = FALLBACK_H;

  const offsetX = (b - a) / 2;
  const blM = [0, 0];
  const brM = [b, 0];
  const trM = [offsetX + a, h];
  const tlM = [offsetX, h];
  const midBotM = [b / 2, 0];
  const midTopM = [b / 2, h];

  const xs = [blM[0], brM[0], trM[0], tlM[0]];
  scene.fit(Math.min(...xs), 0, Math.max(...xs), h);

  const bl = scene.pt(blM[0], blM[1]);
  const br = scene.pt(brM[0], brM[1]);
  const tr = scene.pt(trM[0], trM[1]);
  const tl = scene.pt(tlM[0], tlM[1]);
  const midBot = scene.pt(midBotM[0], midBotM[1]);
  const midTop = scene.pt(midTopM[0], midTopM[1]);

  scene.polygon([bl, br, tr, tl], 'body');

  const hLine = scene.line(midBot, midTop, 'aux');
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

  scene.dim(tl, tr, opt('a', { offset: 18, labelGap: 12, flip: true }));
  scene.dim(bl, br, opt('b', { offset: 22, labelGap: 12, flip: true }));
  scene.dim(midBot, midTop, opt('h', { offset: 60, labelGap: 16 }));

  // 面積は寸法線を引かない「結果ラベル」。下底の外側（さらに下）に置き、b の寸法線と重ならないようにする
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
