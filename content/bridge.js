// 拡張に保存した設定(chrome.storage.local)を、ページの localStorage に写して source-label.js に知らせる。
// source-label.js はページ側(MAIN world)で動くので chrome.storage を読めない。
// 知らせは document へのイベントで送る(DOM は拡張側とページ側で共通なので届く)
(() => {
  const ENABLED = 'xVia.enabled';
  const X_NAME = 'xVia.xName';
  const SECONDS = 'xVia.seconds';

  const write = ({ enabled, xName, seconds }) => {
    try {
      if (enabled === false) localStorage.setItem(ENABLED, 'off');
      else localStorage.removeItem(ENABLED);
      if (xName === true) localStorage.setItem(X_NAME, 'on');
      else localStorage.removeItem(X_NAME);
      if (seconds === true) localStorage.setItem(SECONDS, 'on');
      else localStorage.removeItem(SECONDS);
    } catch (e) {}
    document.dispatchEvent(new Event('x-via:settings'));
  };

  const load = () => chrome.storage.local.get(['enabled', 'xName', 'seconds']).then(write);
  load();
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && (changes.enabled || changes.xName || changes.seconds)) load();
  });
})();
