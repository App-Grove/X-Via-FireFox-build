// X の投稿のページで、日付の横に投稿元(「Twitter for iPhone」など)を表示する。時刻に秒を足すこともできる。
// 今の画面が使う GraphQL は、2026 年 9 月 21 日より後の投稿に投稿元(source)を付けなくなった。
// 昔の窓口 /i/api/2/timeline/conversation/<ID>.json はまだ付けて返すので、投稿のページを開いた時にそこへ 1 回だけ問い合わせる。
// ページのスクリプトより先に走る必要がある(X が送る通信から、問い合わせに使う認証のヘッダーを拾うため)。
(() => {
  // 設定はポップアップで変え、bridge.js が localStorage に写して知らせてくる
  const readSettings = () => {
    try {
      return {
        enabled: localStorage.getItem('xVia.enabled') !== 'off',
        xName: localStorage.getItem('xVia.xName') === 'on',
        seconds: localStorage.getItem('xVia.seconds') === 'on',
      };
    } catch (e) {
      return { enabled: true, xName: false, seconds: false };
    }
  };
  const sameSettings = (a, b) => a.enabled === b.enabled && a.xName === b.xName && a.seconds === b.seconds;
  let settings = readSettings();
  // 「Twitter for iPhone」→「X for iPhone」。X 公式のアプリ(名前が「Twitter 」で始まるもの)だけを書き換える
  const displayName = (name) => (settings.xName ? name.replace(/^Twitter(?= )/, 'X') : name);
  const STATUS_PATH = /^\/(?:i\/web|i|[^/]+)\/status\/(\d+)/;
  const CONVERSATION = (id) => `/i/api/2/timeline/conversation/${id}.json?tweet_mode=extended&count=1`;
  // X 自身の通信から写すヘッダー。値はこのページの中だけで使い、保存も外への送信もしない
  const KEEP = new Set(['authorization', 'x-csrf-token', 'x-guest-token', 'x-twitter-auth-type', 'x-twitter-client-language']);

  const sources = new Map(); // 投稿 ID → { name, url }。投稿元が無いと分かったものは null
  const asked = new Set(); // 問い合わせ済み(失敗も含む)の投稿 ID。同じ投稿に何度も問い合わせない
  let auth = null;
  let authWaiters = [];

  // source は `<a href="http://twitter.com/download/iphone" rel="nofollow">Twitter for iPhone</a>` の形
  const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'", apos: "'" };
  const decode = (s) => s.replace(/&(amp|lt|gt|quot|#39|apos);/g, (_, e) => ENTITIES[e]);
  const parseSource = (html) => {
    const m = /<a href="([^"]*)"[^>]*>([^<]*)<\/a>/.exec(html || '');
    if (!m || !m[2].trim()) return null;
    const url = decode(m[1]);
    return { name: decode(m[2]).trim(), url: /^https?:\/\//.test(url) ? url : '' };
  };

  // GraphQL の答えにも、9 月 21 日より前の投稿には source が入っている。入っていれば問い合わせずに済む
  const collect = (o) => {
    if (!o || typeof o !== 'object') return;
    if (o.__typename === 'Tweet' && o.rest_id && o.source && !sources.get(o.rest_id)) {
      const s = parseSource(o.source);
      if (s) sources.set(o.rest_id, s);
    }
    for (const k in o) collect(o[k]);
  };

  const proto = XMLHttpRequest.prototype;
  const { open, setRequestHeader, send } = proto;
  proto.open = function (method, url, ...rest) {
    this.__slUrl = String(url);
    return open.call(this, method, url, ...rest);
  };
  proto.setRequestHeader = function (name, value) {
    const k = String(name).toLowerCase();
    if (KEEP.has(k) && this.__slUrl && this.__slUrl.includes('/i/api/')) (this.__slHeaders ??= {})[k] = value;
    return setRequestHeader.call(this, name, value);
  };
  proto.send = function (...args) {
    if (this.__slHeaders?.authorization) {
      auth = this.__slHeaders;
      authWaiters.forEach((f) => f());
      authWaiters = [];
    }
    if (settings.enabled && /\/graphql\/[^/]+\/(TweetDetail|TweetResultByRestId)\b/.test(this.__slUrl || '')) {
      this.addEventListener('load', () => {
        try { collect(JSON.parse(this.responseText)); schedule(); } catch (e) {}
      });
    }
    return send.apply(this, args);
  };

  const waitForAuth = () => (auth ? Promise.resolve() : new Promise((resolve) => {
    authWaiters.push(resolve);
    setTimeout(resolve, 10000);
  }));

  const ask = async (id) => {
    if (asked.has(id)) return;
    asked.add(id);
    await waitForAuth();
    if (!auth || sources.has(id)) return;
    const headers = { ...auth };
    // ct0(CSRF の合言葉)は途中で変わることがあるので、送る時に読み直す
    const ct0 = /(?:^|;\s*)ct0=([^;]+)/.exec(document.cookie);
    if (ct0) headers['x-csrf-token'] = ct0[1];
    try {
      const res = await fetch(CONVERSATION(id), { headers, credentials: 'include' });
      if (!res.ok) return;
      const tweets = (await res.json())?.globalObjects?.tweets || {};
      for (const t of Object.values(tweets)) {
        if (t?.id_str && !sources.get(t.id_str)) sources.set(t.id_str, parseSource(t.source));
      }
      if (!sources.has(id)) sources.set(id, null);
      schedule();
    } catch (e) {}
  };

  // 時刻に秒を足す(「午後7:30」→「午後7:30:12」)。秒は <time datetime="2026-10-04T10:30:12.000Z"> から読む。
  // 「7:30」「19:30」「7:30 PM」のどの書き方でも、分が datetime と合う「時:分」の後ろにだけ足す
  const CLOCK = /(?<![\d:])(\d{1,2}):(\d{2})(?![:\d])/;
  const WITH_SECONDS = /(?<![\d:])(\d{1,2}:\d{2}):\d{2}(?![:\d])/;
  const pad = (n) => String(n).padStart(2, '0');
  const eachText = (el, f) => {
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    for (let node; (node = walker.nextNode());) if (f(node)) return;
  };
  const addSeconds = (time) => {
    const date = new Date(time?.getAttribute('datetime') || '');
    if (isNaN(date)) return;
    const mm = pad(date.getMinutes());
    eachText(time, (node) => {
      if (WITH_SECONDS.test(node.nodeValue)) return true; // 足し済み
      const text = node.nodeValue.replace(CLOCK, (all, h, m) => (m === mm ? `${all}:${pad(date.getSeconds())}` : all));
      if (text === node.nodeValue) return false;
      node.nodeValue = text;
      time.dataset.sourceLabelSeconds = '';
      return true;
    });
  };
  const removeSeconds = () => document.querySelectorAll('time[data-source-label-seconds]').forEach((time) => {
    eachText(time, (node) => { node.nodeValue = node.nodeValue.replace(WITH_SECONDS, '$1'); });
    delete time.dataset.sourceLabelSeconds;
  });

  // 開いている投稿(ページの主役の投稿)の「午後7:30 · 2026年10月4日」の後ろに「 · Twitter for iPhone」を足す
  const render = () => {
    const m = STATUS_PATH.exec(location.pathname);
    if (!m) return;
    const id = m[1];
    // 画面の部品が別の投稿に使い回された時のために、今の投稿のものでないラベルは外す
    document.querySelectorAll('[data-source-label]').forEach((el) => { if (el.dataset.sourceLabel !== id) el.remove(); });
    const articles = [...document.querySelectorAll('article[data-testid="tweet"][tabindex="-1"]')]
      .filter((a) => a.querySelector(`a[href$="/status/${id}"] time`));
    // 投稿が画面に出るのは X が GraphQL の答えを受け取った後。それまで待てば、古い投稿は問い合わせずに済む
    if (!articles.length) return;
    if (settings.seconds) for (const a of articles) addSeconds(a.querySelector(`a[href$="/status/${id}"] time`));
    if (!settings.enabled) return;
    if (!sources.has(id)) { ask(id); return; }
    const src = sources.get(id);
    if (!src) return;
    for (const article of articles) {
      const timeLink = article.querySelector(`a[href$="/status/${id}"] time`)?.closest('a');
      const timeBox = timeLink?.parentElement;
      const row = timeBox?.parentElement;
      if (!row || row.querySelector('[data-source-label]')) continue;
      // 見た目は隣の部品をまねる(区切りの「·」は表示回数の前にあるものを写し、無ければ自分で作る)
      const next = timeBox.nextElementSibling;
      const sep = next?.getAttribute('aria-hidden') === 'true' ? next.cloneNode(true) : document.createElement('span');
      if (sep.tagName === 'SPAN') { sep.textContent = ' · '; sep.style.color = timeLink.style.color; }
      const box = timeBox.cloneNode(false);
      box.removeAttribute('id');
      const label = document.createElement(src.url ? 'a' : 'span');
      label.className = timeLink.className;
      label.style.color = timeLink.style.color;
      label.textContent = displayName(src.name);
      if (src.url) {
        label.href = src.url;
        label.target = '_blank';
        label.rel = 'noopener noreferrer nofollow';
      }
      box.append(label);
      sep.dataset.sourceLabel = box.dataset.sourceLabel = id;
      timeBox.after(sep, box);
    }
  };

  let queued = false;
  const schedule = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; render(); });
  };
  // 設定が変わったら、出しているラベルを外して描き直す(読み込み直しは要らない)
  document.addEventListener('x-via:settings', () => {
    const next = readSettings();
    if (sameSettings(next, settings)) return;
    settings = next;
    document.querySelectorAll('[data-source-label]').forEach((el) => el.remove());
    removeSeconds();
    schedule();
  });
  const start = () => {
    new MutationObserver(schedule).observe(document.documentElement, { childList: true, characterData: true, subtree: true });
    schedule();
  };
  if (document.documentElement) start();
  else document.addEventListener('readystatechange', start, { once: true });
})();
