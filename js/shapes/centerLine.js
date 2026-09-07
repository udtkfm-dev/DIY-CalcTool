// centerLine.js — 中央配置・左右均等の作図（layout.center 用）
//
// 全幅 total の中に対象幅 obj を中央配置し、左右の余白 margin を示す。
// タップ可能ラベル: 全幅 total / 対象の幅 obj / 左右の余白 margin。

import { createScene } from './engine.js';

const FALLBACK_TOTAL = 240;
const FALLBACK_OBJ = 100;
const H = 30;

export function render(model) {
  const scene = createScene({ ariaLabel: '中央配置の図' });

  const v = model.values || {};
  let total = Number(v.total);
  let obj = Number(v.obj);
  if (!(Number.isFinite(total) && total > 0)) total = FALLBACK_TOTAL;
  if (!(Number.isFinite(obj) && obj > 0 && obj < total)) obj = Math.min(FALLBACK_OBJ, total * 0.5);

  const margin = (total - obj) / 2;

  scene.fit(0, 0, total, H);

  const outerPts = [scene.pt(0, 0), scene.pt(total, 0), scene.pt(total, H), scene.pt(0, H)];
  scene.polygon(outerPts, 'aux');

  const objL = margin;
  const objR = margin + obj;
  const objPts = [scene.pt(objL, 0), scene.pt(objR, 0), scene.pt(objR, H), scene.pt(objL, H)];
  scene.polygon(objPts, 'body');

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

  const l0 = scene.pt(0, H);
  const l1 = scene.pt(total, H);
  scene.dim(l0, l1, opt('total', { offset: 20, labelGap: 14, flip: true }));

  const o0 = scene.pt(objL, 0);
  const o1 = scene.pt(objR, 0);
  scene.dim(o0, o1, opt('obj', { offset: 18, labelGap: 12 }));

  const m0 = scene.pt(0, H / 2);
  const m1 = scene.pt(objL, H / 2);
  scene.dim(m0, m1, opt('margin', { offset: 14, labelGap: 10 }));

  scene.note();

  if (focus) {
    const g = scene.el.querySelector(`.dim[data-key="${focus}"]`);
    if (g) g.classList.add('is-focus');
  }

  return scene.el;
}

export default { render };
