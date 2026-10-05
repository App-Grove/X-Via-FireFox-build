// X via の設定(投稿元の表示・X 表記・秒の表示)を編集するポップアップ。
// 設定は chrome.storage.local に置き、開いている X のタブには bridge.js がすぐ写す
const enabled = document.getElementById('enabled');
const xName = document.getElementById('xName');
const seconds = document.getElementById('seconds');

const sync = () => { xName.disabled = !enabled.checked; };

chrome.storage.local.get(['enabled', 'xName', 'seconds']).then((data) => {
  enabled.checked = data.enabled !== false;
  xName.checked = data.xName === true;
  seconds.checked = data.seconds === true;
  sync();
});

enabled.addEventListener('change', () => {
  sync();
  chrome.storage.local.set({ enabled: enabled.checked });
});
xName.addEventListener('change', () => chrome.storage.local.set({ xName: xName.checked }));
seconds.addEventListener('change', () => chrome.storage.local.set({ seconds: seconds.checked }));
