// light.js — 照明（必要灯数・器具の配置間隔）
//
// 設計注記: 照度計算は光束法（N = E×A ÷ (F×U×M)）を用いる。面積の内部単位は mm² なので、
// hvac.js と同じく run() の中で m² に直してから計算する。

import { calcError } from '../core/errors.js';

const MM2_PER_M2 = 1e6;

const NOTES = [
  '本アプリは寸法・数学の計算を支援するツールです。施工の可否や安全性は判断できません。',
  '必要な明るさは作業内容や好みで変わります。器具の選定・配置は製品資料や専門家の情報とあわせてご確認ください。'
];

const LUX_NOTE =
  '目安となる照度: 居間の全般照明 30〜75 lx / 読書・勉強 500〜1,000 lx / 台所の作業面 300〜500 lx / ' +
  '作業場・工作 500〜1,000 lx / 玄関・廊下 50〜100 lx';

/* ==================================================================== *
 * light.lux 必要灯数（光束法）
 * ==================================================================== */

export const lightLux = {
  id: 'light.lux',
  category: 'light',
  title: '必要な照明の数（光束法）',
  subtitle: '目標の明るさと部屋の広さから、必要な器具の数を計算',
  keywords: ['照度', 'ルクス', 'lx', 'ルーメン', 'lm', '照明', '明るさ', '灯数', '光束法'],
  shape: 'rectangle',
  shapeMap: { w: 'w', h: 'd', S: 'A' },

  fields: [
    { key: 'w', label: '部屋の幅', quantity: 'length', defaultUnit: 'mm', min: 0, exclusiveMin: true, optional: true },
    { key: 'd', label: '部屋の奥行き', quantity: 'length', defaultUnit: 'mm', min: 0, exclusiveMin: true, optional: true },
    { key: 'E', label: '目標の照度', quantity: 'illuminance', defaultUnit: 'lx', min: 0, exclusiveMin: true, optional: true, help: LUX_NOTE },
    { key: 'F', label: '器具1台の光束', quantity: 'luminous', defaultUnit: 'lm', min: 0, exclusiveMin: true, optional: true, help: '製品に「◯◯ lm」と表示されている値' },
    { key: 'U', label: '照明率', quantity: 'number', defaultUnit: 'number', min: 0, exclusiveMin: true, optional: true, help: '光のうち作業面に届く割合。一般的な居室で 0.6〜0.8 程度' },
    { key: 'M', label: '保守率', quantity: 'number', defaultUnit: 'number', min: 0, exclusiveMin: true, optional: true, help: '汚れや経年による低下を見込む係数。0.7〜0.8 程度' },
    // 下の「台数から照度を逆算」solver が要求するキー。入力欄が無いと solve() は
    // entered を fields からしか集めないため、その solver が到達不能になる
    { key: 'Nceil', label: '器具の台数', quantity: 'number', defaultUnit: 'number', min: 0, exclusiveMin: true, optional: true, help: '台数を先に決める場合はここに入れると、そのときの照度を計算します' }
  ],

  solvers: [
    {
      requires: ['w', 'd', 'E', 'F', 'U', 'M'],
      provides: ['A', 'N', 'Nceil'],
      validate(v) {
        if (v.F === 0 || v.U === 0 || v.M === 0) return calcError('ZERO', 'F');
        return null;
      },
      run(v, ctx) {
        const A = v.w * v.d;
        const aM2 = A / MM2_PER_M2;
        const N = (v.E * aM2) / (v.F * v.U * v.M);
        const Nceil = Math.ceil(N);
        return {
          values: { A, N, Nceil },
          formulaName: '光束法',
          steps: [
            { formula: '面積 = 幅 × 奥行き', substituted: `${ctx.n(v.w, 'length')} × ${ctx.n(v.d, 'length')}`, result: ctx.f(aM2) + ' m²' },
            {
              formula: '灯数 N = 目標照度 × 面積 ÷ (光束 × 照明率 × 保守率)',
              substituted: `${ctx.f(v.E)} × ${ctx.f(aM2)} ÷ (${ctx.f(v.F)} × ${ctx.f(v.U)} × ${ctx.f(v.M)})`,
              result: ctx.f(N) + ' 台'
            },
            { formula: '切り上げ', substituted: `${ctx.f(N)} → 切り上げ`, result: Nceil + ' 台' }
          ]
        };
      }
    },
    {
      // 台数を決めて、そのときの照度を求める向き
      requires: ['w', 'd', 'F', 'U', 'M', 'Nceil'],
      provides: ['A', 'E'],
      run(v, ctx) {
        const A = v.w * v.d;
        const aM2 = A / MM2_PER_M2;
        const E = (v.Nceil * v.F * v.U * v.M) / aM2;
        return {
          values: { A, E },
          formulaName: '台数から照度を逆算',
          steps: [
            {
              formula: '照度 E = 台数 × 光束 × 照明率 × 保守率 ÷ 面積',
              substituted: `${ctx.f(v.Nceil)} × ${ctx.f(v.F)} × ${ctx.f(v.U)} × ${ctx.f(v.M)} ÷ ${ctx.f(aM2)}`,
              result: ctx.u(E, 'illuminance')
            }
          ]
        };
      }
    }
  ],

  outputs: [
    { key: 'A', label: '部屋の面積', quantity: 'area', defaultUnit: 'm2', fixedUnit: true },
    { key: 'E', label: '照度', quantity: 'illuminance' },
    { key: 'N', label: '必要台数（計算値）', quantity: 'number' },
    { key: 'Nceil', label: '必要台数', quantity: 'number', primary: true }
  ],

  notes: NOTES.concat([LUX_NOTE])
};

/* ==================================================================== *
 * light.spacing 器具の配置間隔
 * ==================================================================== */

export const lightSpacing = {
  id: 'light.spacing',
  category: 'light',
  title: '照明の配置間隔',
  subtitle: '器具の台数から、均等に配置する間隔と位置を計算',
  keywords: ['照明', '配置', '間隔', 'ダウンライト', '割付', 'ピッチ'],
  shape: 'lineSegment',
  shapeMap: { total: 'total', pitch: 'pitch', edge: 'edge' },

  fields: [
    { key: 'total', label: '配置する範囲の長さ', quantity: 'length', defaultUnit: 'mm', min: 0, exclusiveMin: true, optional: true },
    { key: 'n', label: '器具の台数', quantity: 'number', defaultUnit: 'number', min: 0, exclusiveMin: true, optional: true },
    { key: 'pitch', label: '器具どうしの間隔', quantity: 'length', defaultUnit: 'mm', min: 0, exclusiveMin: true, optional: true },
    { key: 'edge', label: '端からの距離', quantity: 'length', defaultUnit: 'mm', min: 0, exclusiveMin: true, optional: true }
  ],

  solvers: [
    {
      // 端の距離を間隔の半分にする、天井の一般的な均等配置
      requires: ['total', 'n'],
      provides: ['pitch', 'edge'],
      validate(v) { if (v.n < 1) return calcError('ZERO', 'n'); return null; },
      run(v, ctx) {
        const n = Math.round(v.n);
        const pitch = v.total / n;
        const edge = pitch / 2;
        const steps = [
          { formula: '間隔 = 全長 ÷ 台数', substituted: `${ctx.n(v.total, 'length')} ÷ ${n}`, result: ctx.u(pitch, 'length') },
          { formula: '端からの距離 = 間隔 ÷ 2', substituted: `${ctx.n(pitch, 'length')} ÷ 2`, result: ctx.u(edge, 'length') }
        ];
        const limit = Math.min(n, 30);
        for (let i = 0; i < limit; i++) {
          steps.push({ formula: `${i + 1}台目の位置`, substituted: `${ctx.n(edge, 'length')} + ${ctx.n(pitch, 'length')} × ${i}`, result: ctx.u(edge + pitch * i, 'length') });
        }
        if (n > limit) steps.push({ formula: '…', substituted: `残り ${n - limit} 台は省略`, result: '' });
        return { values: { pitch, edge }, formulaName: '均等配置', steps };
      }
    },
    {
      requires: ['total', 'pitch'],
      provides: ['n', 'edge'],
      validate(v) { if (v.pitch === 0) return calcError('ZERO', 'pitch'); return null; },
      run(v, ctx) {
        const n = Math.floor(v.total / v.pitch);
        const edge = (v.total - v.pitch * (n - 1)) / 2;
        return {
          values: { n, edge },
          formulaName: '間隔から台数を計算',
          steps: [
            { formula: '台数 = 全長 ÷ 間隔（切り捨て）', substituted: `${ctx.n(v.total, 'length')} ÷ ${ctx.n(v.pitch, 'length')}`, result: n + ' 台' },
            { formula: '端からの距離 = (全長 − 間隔 × (台数−1)) ÷ 2', substituted: `(${ctx.n(v.total, 'length')} − ${ctx.n(v.pitch, 'length')} × ${n - 1}) ÷ 2`, result: ctx.u(edge, 'length') }
          ]
        };
      }
    }
  ],

  outputs: [
    { key: 'total', label: '範囲の長さ', quantity: 'length' },
    { key: 'n', label: '台数', quantity: 'number', primary: true },
    { key: 'pitch', label: '器具どうしの間隔', quantity: 'length', primary: true },
    { key: 'edge', label: '端からの距離', quantity: 'length' }
  ],

  notes: NOTES
};

export default [lightLux, lightSpacing];
