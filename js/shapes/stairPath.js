// stairPath.js — 踊り場を含む階段経路の作図（stair.landing 用）
//
// run1 = run1(第1区間)・landing = 踊り場・run2 = 第2区間・total = 全長。
// CALC_SPEC.md の式（total = run1 + landing + run2）どおり、実際には全区間が
// 一直線の水平距離の合計として扱われる計算のため、1本の水平線を3区間に
// 分けて描く（踊り場区間だけ破線・別クラスで視覚的に区別する）。
// タップ可能ラベル: run1 / landing / run2（任意=0許容） / total（結果ラベル）。

import { createScene } from './engine.js';

const FALLBACK = { run1: 100, landing: 40, run2: 100 };

export function render(model) {
  const scene = createScene({ ariaLabel: '踊り場を含む階段経路の図' });

  const v = model.values || {};
  let run1 = Number(v.run1);
  let landing = Number(v.landing);
  let run2 = Number(v.run2);
  if (!(Number.isFinite(run1) && run1 > 0)) run1 = FALLBACK.run1;
  if (!(Number.isFinite(landing) && landing > 0)) landing = FALLBACK.landing;
  if (!(Number.isFinite(run2) && run2 >= 0)) run2 = FALLBACK.run2;

  const total = run1 + landing + run2;
  scene.fit(0, -14, total, 14);

  const p0 = scene.pt(0, 0);
  const p1 = scene.pt(run1, 0);
  const p2 = scene.pt(run1 + landing, 0);
  const p3 = scene.pt(total, 0);

  scene.line(p0, p1, 'body');
  scene.line(p1, p2, 'body-sub');
  if (run2 > 0) scene.line(p2, p3, 'body');

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

  scene.dim(p0, p1, opt('run1', { offset: 22, labelGap: 12 }));
  scene.dim(p1, p2, opt('landing', { offset: 22, labelGap: 12 }));
  scene.dim(p2, p3, opt('run2', { offset: 22, labelGap: 12 }));
  scene.dim(p0, p3, opt('total', { offset: 46, labelGap: 14, flip: true }));

  scene.note();

  if (focus) {
    const g = scene.el.querySelector(`.dim[data-key="${focus}"]`);
    if (g) g.classList.add('is-focus');
  }

  return scene.el;
}

export default { render };
