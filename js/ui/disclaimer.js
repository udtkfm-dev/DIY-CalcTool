// disclaimer.js — 初回起動時の免責事項確認ダイアログ（REQUIREMENTS 11章）
//
// settings.agreedDisclaimer が false のときだけ、1度だけ表示する。
// 同意ボタン以外に閉じる手段は用意しない（正しく読んで同意したことにするため）。

import { getSettings, saveSettings } from '../core/store.js';

function h(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  for (const k of Object.keys(props)) {
    if (k === 'class') node.className = props[k];
    else if (k === 'text') node.textContent = props[k];
    else if (k.startsWith('on')) node.addEventListener(k.slice(2).toLowerCase(), props[k]);
    else node.setAttribute(k, props[k]);
  }
  for (const c of [].concat(children)) if (c) node.appendChild(c);
  return node;
}

export function maybeShowDisclaimer() {
  if (getSettings().agreedDisclaimer) return;

  const root = document.getElementById('sheet-root') || document.body;

  const backdrop = h('div', { class: 'sheet-backdrop' });
  const sheet = h('div', {
    class: 'sheet sheet--center',
    role: 'dialog',
    'aria-modal': 'true',
    'aria-label': 'はじめにお読みください'
  });

  sheet.appendChild(h('div', { class: 'sheet__head' }, [h('div', { class: 'sheet__title', text: 'はじめにお読みください' })]));

  const body = h('ul', { class: 'notes', style: 'margin-bottom:16px' });
  for (const text of [
    '本アプリは寸法・数学の計算を支援するツールです。施工の可否や安全性は判断できません。',
    '構造や法規に関わる判断は、必ず専門家にご確認ください。',
    '入力・履歴・設定はこの端末の中だけに保存され、外部への送信は行いません。'
  ]) {
    body.appendChild(h('li', { text }));
  }
  sheet.appendChild(body);

  const agree = h('button', { class: 'btn btn--primary', type: 'button', text: '同意して始める' });
  agree.style.width = '100%';
  agree.addEventListener('click', () => {
    saveSettings({ agreedDisclaimer: true });
    backdrop.remove();
    sheet.remove();
  });
  sheet.appendChild(agree);

  root.appendChild(backdrop);
  root.appendChild(sheet);
}
