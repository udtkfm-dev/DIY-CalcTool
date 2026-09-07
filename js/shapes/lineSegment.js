// lineSegment.js — 線分上の等間隔配置の作図
// （layout.divide / layout.pitch / layout.holes / fence.posts 共通）
//
// 全長 total・間隔 pitch（・端部余白 edge）を持つ計算の共通図形。
// 実際の点の数（分割数・穴数・本数など）はここでは表示用の目盛りとして
// 概略的に示すのみで、正確な位置一覧は計算過程（steps）に表示される。
// タップ可能ラベル: 全長 total / 間隔 pitch（・端部余白 edge）。

import { createScene } from './engine.js';

const FALLBACK_TOTAL = 240;
const TICK_COUNT = 5; // 表示用の目盛り数（実際のn・穴数・本数とは無関係）

export function render(model) {
  const scene = createScene({ ariaLabel: '線分上の配置の図' });

  const v = model.values || {};
  let total = Number(v.total);
  if (!(Number.isFinite(total) && total > 0)) total = FALLBACK_TOTAL;

  scene.fit(0, -10, total, 10);

  const left = scene.pt(0, 0);
  const right = scene.pt(total, 0);
  scene.line(left, right, 'body');

  for (let i = 0; i <= TICK_COUNT; i++) {
    const x = (total * i) / TICK_COUNT;
    const top = scene.pt(x, 5);
    const bottom = scene.pt(x, -5);
    scene.line(top, bottom, 'body');
  }

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

  // 19-5の規約: labels に無いキーの寸法線は描かない（「—」の空ラベルを残さない）
  const has = (key) => Object.prototype.hasOwnProperty.call(L, key);

  if (has('total')) scene.dim(left, right, opt('total', { offset: 22, labelGap: 14 }));

  // pitch は左端寄りの代表区間、edge は反対側（上）に置いて total・pitch と重ならないようにする
  if (has('pitch')) {
    const p0 = scene.pt(0, 0);
    const p1 = scene.pt(total / TICK_COUNT, 0);
    scene.dim(p0, p1, opt('pitch', { offset: 40, labelGap: 12 }));
  }

  if ('edge' in L) {
    const e0 = scene.pt(0, 0);
    const e1 = scene.pt(total / (TICK_COUNT * 2), 0);
    scene.dim(e0, e1, opt('edge', { offset: 18, labelGap: 12, flip: true }));
  }

  scene.note();

  if (focus) {
    const g = scene.el.querySelector(`.dim[data-key="${focus}"]`);
    if (g) g.classList.add('is-focus');
  }

  return scene.el;
}

export default { render };
