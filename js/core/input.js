// input.js — 数値をどう入力させるか（端末のキーボード / アプリ内テンキー）の判定
//
// アプリ内テンキーはボトムシート（position:fixed）で出る。fixed 要素はページを
// ピンチで拡大しているとレイアウト基準のまま置かれるため、拡大中のスマホでは
// 画面外に出て操作できなくなる。端末のキーボードならブラウザが入力欄を
// 見える位置へ送ってくれるので、タッチ端末では既定でそちらを使う。
//
// PC ではテンキーのほうが図と連動して分かりやすいため、従来どおりシートを出す。

/**
 * タッチ操作が主の端末か。
 * pointer:coarse（指などの粗いポインタ）かつ hover:none（ホバーできない）を
 * 満たすものをタッチ端末とみなす。タッチ対応のノートPCはマウスも持つため
 * hover:none にならず、ここでは PC 扱いになる。
 * @returns {boolean}
 */
export function isTouchDevice() {
  try {
    return (
      window.matchMedia('(pointer: coarse)').matches &&
      window.matchMedia('(hover: none)').matches
    );
  } catch (e) {
    return false;
  }
}

/**
 * 端末のキーボードで直接入力する画面にするか。
 * @param {object} settings getSettings() の戻り値
 * @returns {boolean} true なら入力欄に直接打つ / false ならアプリ内テンキー
 */
export function useDeviceKeyboard(settings) {
  const mode = (settings && settings.numberInput) || 'auto';
  if (mode === 'keyboard') return true;
  if (mode === 'keypad') return false;
  return isTouchDevice();
}
