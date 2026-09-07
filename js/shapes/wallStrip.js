// wallStrip.js — 壁面積（周長×高さ − 開口部）の作図（room.wall 用）
//
// 実際の部屋の平面形状は不定（周長のみが入力のため）なので、
// 「周長を横に伸ばした帯」として壁をイメージ図化する。開口部（面積のみ入力）は
// 帯の中に、幅=開口部面積÷天井高・高さ=天井高の長方形として差し込む
// （この幅・高さで作った長方形の面積は常に入力された開口部面積と正確に一致する）。
// タップ可能ラベル: 周長 perimeter / 天井高 height / 開口部 openings（結果ラベル） /
// 壁面積 area（結果ラベル）。

import { createScene } from './engine.js';

const FALLBACK_P = 240;
const FALLBACK_H = 60;

export function render(model) {
  // 壁面積のラベルを帯の上へ出すぶん、上の余白を広く取る
  // （下は周長の寸法線が使うので、そこへ重ねられない）
  const scene = createScene({ ariaLabel: '壁面積の図', pad: { top: 54 } });

  const v = model.values || {};
  let perimeter = Number(v.perimeter);
  let height = Number(v.height);
  if (!(Number.isFinite(perimeter) && perimeter > 0)) perimeter = FALLBACK_P;
  if (!(Number.isFinite(height) && height > 0)) height = FALLBACK_H;

  scene.fit(0, 0, perimeter, height);

  const A = scene.pt(0, 0);
  const B = scene.pt(perimeter, 0);
  const C = scene.pt(perimeter, height);
  const D = scene.pt(0, height);
  scene.polygon([A, B, C, D], 'body');

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

  scene.dim(A, B, opt('perimeter', { offset: 22, labelGap: 12 }));
  scene.dim(B, C, opt('height', { offset: 22, labelGap: 12 }));

  // 開口部: 値が確定していれば「幅=開口部÷天井高」の長方形として実面積どおりに描く。
  // まだ確定していない場合はタップだけできるよう、帯の中央に仮の枠を薄く置く。
  const openings = Number(v.openings);
  let openingsCenter;
  if (Number.isFinite(openings) && openings > 0) {
    const holeW = Math.min(openings / height, perimeter * 0.85);
    const cx = perimeter / 2;
    const hx0 = Math.max(0, cx - holeW / 2);
    const hx1 = Math.min(perimeter, hx0 + holeW);
    const hA = scene.pt(hx0, 0);
    const hB = scene.pt(hx1, 0);
    const hC = scene.pt(hx1, height);
    const hD = scene.pt(hx0, height);
    scene.polygon([hA, hB, hC, hD], 'body-sub');
    openingsCenter = [(hA[0] + hB[0]) / 2, (hA[1] + hC[1]) / 2];
  } else {
    openingsCenter = [(A[0] + B[0]) / 2, (A[1] + C[1]) / 2];
  }
  if (L.openings) scene.tapLabel(openingsCenter, opt('openings', {}));

  // 壁面積（結果）は帯の外側の「上」に置く。
  // 下は周長の寸法線とラベルが占めており、そこへ出すと必ず重なる
  const areaPos = [(D[0] + C[0]) / 2, D[1] - 24];
  if (L.area) scene.tapLabel(areaPos, opt('area', {}));

  scene.note();

  if (focus) {
    const g = scene.el.querySelector(`.dim[data-key="${focus}"]`);
    if (g) g.classList.add('is-focus');
  }

  return scene.el;
}

export default { render };
