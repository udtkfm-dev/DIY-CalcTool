// compound.js — CALC_SPEC.md「複合図形」（area.compound）
//
// 【設計メモ・2026-09-04 運用者判断】
// 他の計算はすべて「1 CalcDef = 固定フィールド集合」（js/ui/calcView.js が汎用的に描画する）
// という前提だが、area.compound は「任意個数の長方形を追加・穴として合成する」という
// 可変長の入力を要求するため、この前提と根本的に相性が悪い
// （HANDOFF_MVP_TO_NEXT.md 3-4・9-4参照）。
//
// 運用者の判断により、calcView.js の汎用エンジンを流用せず、専用画面
// （js/ui/compoundView.js）を新設した。CalcDef はホーム/検索/カテゴリ表示への
// 登録のためだけに存在し、fields/solvers/outputs は実際には calcView.js から
// 呼ばれない（main.js が `def.custom === 'compound'` を見て compoundView.js へ
// ルーティングする）。verify_edge.mjs 相当の構造整合性チェック（fields/solvers/
// outputs/notes が空でないこと）に合わせて、未使用のプレースホルダを1件ずつ持たせてある。

const NOTES = [
  '本アプリは寸法・数学の計算を支援するツールです。施工の可否や安全性は判断できません。',
  '構造や法規に関わる判断は、必ず専門家にご確認ください。',
  '合計面積は各長方形の面積を単純に足し引きしたものです（重なりの自動判定はしません）。図形の位置（X・Y）は見た目の確認用です。'
];

export const areaCompound = {
  id: 'area.compound',
  category: 'area',
  title: '複合図形（面積の合成）',
  subtitle: '長方形を追加・穴として組み合わせ、L字・コの字などの合計面積を計算',
  keywords: ['複合図形', 'L字', 'コの字', '凹凸', '穴', '間取り', '合成', '床面積'],
  shape: null,
  custom: 'compound',

  // 実際には使われない（compoundView.js が独自にUIを持つ）。構造整合性チェック用の最小プレースホルダ。
  fields: [{ key: 'note', label: '（このIDは専用画面を使用します）', quantity: 'number', defaultUnit: 'number', optional: true }],
  solvers: [{ requires: ['note'], provides: [], run: () => ({ values: {}, formulaName: '', steps: [] }) }],
  outputs: [{ key: 'note', label: '（未使用）', quantity: 'number' }],

  notes: NOTES
};

export default [areaCompound];
