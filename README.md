# X via

昔の Twitter は、投稿の時刻の横に「via Twitter for iPhone」のように、どのアプリから投稿したかを出していました。X via は、それを X に取り戻す Chrome 拡張です。投稿のページで、日付の横に「Twitter for iPhone」などの投稿元をもう一度表示します。時刻を秒まで出すこともできます。

```
午後7:30:12 · 2026年10月4日 · Twitter for iPhone · 55.5万 件の表示
```

> **非公式の拡張です。** X Corp. とは関係ありません。X の作りが変わると、知らないうちに効かなくなることがあります。

## 入れ方

1. このリポジトリをダウンロードする(緑の **Code** → **Download ZIP** で落として展開するか、`git clone`)
2. `chrome://extensions` を開き、右上の **デベロッパーモード** をオンにする
3. **パッケージ化されていない拡張機能を読み込む** を押し、`manifest.json` が入っているフォルダを選ぶ
4. 開いていた X のタブは読み込み直す

Chrome 111 以降が必要です。

## 設定

ツールバーの拡張アイコンを押すと切り替えられます。変更は開いている X のタブにすぐ反映されます。

| 設定 | 最初 | 中身 |
| --- | --- | --- |
| 投稿元を表示する | ON | 日付の横に投稿元を出す。OFF の間は X への問い合わせもしない |
| 「Twitter」を「X」と表示する | OFF | 「Twitter for iPhone」→「X for iPhone」、「Twitter Web App」→「X Web App」のように、表示だけを書き換える |
| 時刻に秒を出す | OFF | 「午後7:30」→「午後7:30:12」のように、投稿した時刻を秒まで出す |

- 「X」表記は見た目だけの書き換えです。X から届く投稿元の名前は、2026 年 10 月時点でも「Twitter for iPhone」などのままです。書き換えるのは名前が「Twitter 」で始まるもの(X 公式のアプリ)だけで、ほかのアプリの名前はそのまま出します
- 秒は、X の画面にもともと入っている投稿時刻(`<time datetime="…">`)から読みます。秒を出すための通信はしません

どれも、投稿のページの主役の投稿だけに出します(タイムラインの投稿には出しません)。

## なぜ必要か

- X は 2022 年 12 月に、投稿元のラベルを画面から消しました。それでも X の内部の通信には投稿元が入っていたので、拡張で表示し直せました
- **2026 年 9 月 21 日の夕方(日本時間 17〜19 時ごろ)から、今の画面が使う通信(GraphQL)は、新しい投稿に投稿元を付けなくなりました。** これまでの拡張が使えなくなったのはこのためです
- ただ、昔からある別の窓口 `/i/api/2/timeline/conversation/<投稿ID>.json` は、今も新しい投稿に投稿元を付けて返します。この拡張はそこから読みます

## 通信と保存

- 投稿のページを開いた時に、**その投稿について 1 回だけ** X(x.com)に問い合わせます。同じ投稿は、ページを読み込み直すまで問い合わせません
- X の画面がもともと受け取るデータに投稿元が入っていた時(9 月 21 日より前の投稿の多く)は、問い合わせません
- 問い合わせには、X の画面が自分の通信に付けている認証のヘッダーを写して使います。値はページの中だけで使い、保存も外部への送信もしません
- X 以外のサーバーへの送信は一切しません
- X のこの窓口には、15 分あたり 180 回の上限があります。投稿を 1 つ開くごとに最大 1 回なので、普通に見ている分には届きません
- **古い窓口なので、X が塞げば使えなくなります**
- 設定は、拡張の保存場所(`chrome.storage.local`)と、X のページの localStorage(`xVia.enabled`・`xVia.xName`・`xVia.seconds`)に置きます

## 自分の拡張に取り込むには

MIT ライセンスなので、コードはそのまま使ってかまいません。中心は [`content/source-label.js`](content/source-label.js) の 1 ファイルで、ほかのファイルに頼らずに動きます(設定を読まない時は、すべて最初の値で動きます)。

仕組みだけ使いたい人向けに、取り方を書いておきます。どれも X が公開していない内部の窓口なので、予告なく変わることがあります。

### 投稿元の取り方

x.com のページの中から、次の窓口に GET で問い合わせます。

```
GET https://x.com/i/api/2/timeline/conversation/<投稿ID>.json?tweet_mode=extended&count=1
```

| ヘッダー | 値 |
| --- | --- |
| `authorization` | X の画面が自分の通信(`/i/api/` 宛て)に付けている `Bearer …` を写して使う |
| `x-csrf-token` | クッキー `ct0` の値(途中で変わることがあるので、送る直前に読む) |
| `x-twitter-auth-type` | ログインしている時は `OAuth2Session`(これも X の画面の通信から写すのが確実) |

クッキーも要るので `credentials: 'include'` を付けます。拡張の content script から送るなら、`"world": "MAIN"` でページの中で動かすのがいちばん簡単です。

答えの `globalObjects.tweets["<投稿ID>"].source` に、投稿元が HTML の形で入っています。

```json
"source": "<a href=\"http://twitter.com/download/iphone\" rel=\"nofollow\">Twitter for iPhone</a>"
```

```js
// x.com のページの中(MAIN world)で動かす。authorization は X の画面の通信から写した値
async function fetchSource(tweetId, authorization) {
  const ct0 = /(?:^|;\s*)ct0=([^;]+)/.exec(document.cookie)?.[1];
  const res = await fetch(`/i/api/2/timeline/conversation/${tweetId}.json?tweet_mode=extended&count=1`, {
    credentials: 'include',
    headers: { authorization, 'x-csrf-token': ct0, 'x-twitter-auth-type': 'OAuth2Session' },
  });
  if (!res.ok) return null;
  const tweet = (await res.json())?.globalObjects?.tweets?.[tweetId];
  const m = /<a href="([^"]*)"[^>]*>([^<]*)<\/a>/.exec(tweet?.source || '');
  return m ? { name: m[2], url: m[1] } : null; // name は &amp; などを戻してから使う
}
```

`authorization` の写し方は、`source-label.js` の `XMLHttpRequest.prototype.setRequestHeader` を包んでいるところを見てください。X の画面は起動してすぐ `/i/api/` に通信するので、ページのスクリプトより先に(`"run_at": "document_start"`)包んでおけば拾えます。値をコードに書き込むのはやめてください。

9 月 21 日より前の投稿なら、X の画面が受け取る GraphQL(`TweetDetail` など)の答えの中の、`__typename: "Tweet"` のものにも `source` が入っています。こちらで取れた時は、問い合わせずに済みます。

### 秒の取り方

どちらも通信は要りません。

```js
// 1. 画面の <time> から(X の画面が出している時刻。ISO 8601 の形で秒まで入っている)
const time = article.querySelector('time'); // <time datetime="2026-10-04T10:30:12.000Z">
const seconds = new Date(time.getAttribute('datetime')).getSeconds();

// 2. 投稿 ID から(2010 年 11 月より後の投稿。ID の上の方に、投稿した時刻がミリ秒で入っている)
const ms = Number((BigInt(tweetId) >> 22n) + 1288834974657n);
const date = new Date(ms);
```

## ファイルの構成

```
manifest.json
content/
  source-label.js  ページのスクリプトより先に走り、投稿元を問い合わせて日付の横に出す。時刻に秒を足す
  bridge.js        拡張に保存した設定を、ページの localStorage に写して source-label.js に知らせる
popup/             設定の画面
```

## ライセンス

[MIT](LICENSE)
