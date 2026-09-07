// settings.js — 設定画面（S6）
//
// 桁数・丸め・既定単位・テーマ・履歴全削除。REQUIREMENTS 2-5(Settings) / 4章 S6。

import { getSettings, saveSettings, clearHistory, getHistory, saveHistory, available as storeAvailable } from '../core/store.js';
import { unitList, unitLabel } from '../core/units.js';
import { showToast } from './toast.js';
import { backButton } from './icons.js';

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

/** main.js の適用ロジックと同じ（設定変更を即座に画面へ反映する） */
function applyThemeNow(theme) {
  if (theme === 'light' || theme === 'dark') document.documentElement.dataset.theme = theme;
  else delete document.documentElement.dataset.theme;
}

function chipRow(options, current, onPick) {
  const wrap = h('div', { class: 'chips' });
  for (const opt of options) {
    wrap.appendChild(
      h('button', {
        class: 'chip' + (opt.value === current ? ' is-active' : ''),
        type: 'button',
        'aria-pressed': String(opt.value === current),
        text: opt.label,
        onclick: () => onPick(opt.value)
      })
    );
  }
  return wrap;
}

export function renderSettings(appEl, barEl) {
  barEl.innerHTML = '';
  barEl.appendChild(
    backButton()
  );
  barEl.appendChild(h('div', { class: 'appbar__title', text: '設定' }));

  appEl.innerHTML = '';
  appEl.className = 'app';

  if (!storeAvailable()) {
    appEl.appendChild(
      h('div', { class: 'empty', text: 'この環境では設定を保存できません（変更してもこの画面を離れると元に戻ります）' })
    );
  }

  const body = h('div', {});
  appEl.appendChild(body);

  function render() {
    body.innerHTML = '';
    const s = getSettings();

    body.appendChild(section('表示', [
      field('小数点以下の桁数', chipRow(
        [0, 1, 2, 3].map((n) => ({ label: String(n) + '桁', value: n })),
        s.decimals,
        (v) => { saveSettings({ decimals: v }); render(); }
      )),
      field('丸め方', chipRow(
        [
          { label: 'きっちり表示', value: 'exact' },
          { label: '約（概算）表示', value: 'approx' }
        ],
        s.roundMode,
        (v) => { saveSettings({ roundMode: v }); render(); }
      ))
    ]));

    body.appendChild(section('数値の入力方法', [
      field(null, chipRow(
        [
          { label: '自動', value: 'auto' },
          { label: '端末のキーボード', value: 'keyboard' },
          { label: 'アプリの電卓', value: 'keypad' }
        ],
        s.numberInput,
        (v) => { saveSettings({ numberInput: v }); render(); }
      ))
    ], '「自動」はスマホ・タブレットでは端末のキーボード、パソコンではアプリの電卓を使います。'
      + '画面を拡大して使うときは端末のキーボードのほうが確実です。新しく開く計算画面から反映されます'));

    body.appendChild(section('既定の単位', [
      field('長さ', chipRow(
        unitList('length').map((u) => ({ label: u.label, value: u.id })),
        s.defaultLengthUnit,
        (v) => { saveSettings({ defaultLengthUnit: v }); render(); }
      )),
      field('面積', chipRow(
        unitList('area').map((u) => ({ label: u.label, value: u.id })),
        s.defaultAreaUnit,
        (v) => { saveSettings({ defaultAreaUnit: v }); render(); }
      )),
      field('角度', chipRow(
        unitList('angle').map((u) => ({ label: u.label, value: u.id })),
        s.defaultAngleUnit,
        (v) => { saveSettings({ defaultAngleUnit: v }); render(); }
      ))
    ], '新しく開く計算画面から反映されます（表示中の画面は単位チップから切り替えてください）'));

    body.appendChild(section('テーマ', [
      field(null, chipRow(
        [
          { label: '端末に合わせる', value: 'system' },
          { label: 'ライト', value: 'light' },
          { label: 'ダーク', value: 'dark' }
        ],
        s.theme,
        (v) => { saveSettings({ theme: v }); applyThemeNow(v); render(); }
      ))
    ]));

    const histCount = getHistory().length;
    body.appendChild(section('履歴', [
      h('div', { class: 'field-row__label', text: `保存件数: ${histCount}件（最大200件）` }),
      h('button', {
        class: 'btn btn--ghost',
        type: 'button',
        text: '履歴をすべて削除',
        onclick: () => {
          const snapshot = getHistory();
          if (!snapshot.length) {
            showToast('履歴はありません');
            return;
          }
          clearHistory();
          render();
          showToast('履歴をすべて削除しました', {
            duration: 5000,
            actionLabel: '元に戻す',
            onAction: () => {
              for (const item of snapshot.slice().reverse()) saveHistory(item);
              render();
            }
          });
        }
      })
    ]));

    body.appendChild(
      h('div', { class: 'empty' }, [
        h('a', { href: '#/about', text: 'このアプリについて（免責事項）' })
      ])
    );
  }

  function section(title, children, note) {
    const card = h('div', { class: 'card' }, [h('div', { class: 'card__head' }, [h('span', { text: title })])]);
    const cbody = h('div', { class: 'card__body' });
    for (const c of children) cbody.appendChild(c);
    if (note) cbody.appendChild(h('div', { class: 'list-item__sub', text: note }));
    card.appendChild(cbody);
    return card;
  }

  function field(label, control) {
    const wrap = h('div', { class: 'settings-field' });
    if (label) wrap.appendChild(h('div', { class: 'settings-field__label', text: label }));
    wrap.appendChild(control);
    return wrap;
  }

  render();
}
