# プライバシーポリシー / Privacy Policy — X via

最終更新日 / Last updated: 2026-10-06

[日本語](#日本語) · [English](#english)

---

## 日本語

X via(以下「この拡張」)は、X(x.com)の投稿のページで、日付の横に投稿元(「Twitter for iPhone」など)を表示し、投稿時刻を秒まで表示する Chrome 拡張機能です。この拡張は X Corp. とは関係のない、非公式の拡張です。

### 1. 集める情報

この拡張は、利用者の個人情報・閲覧履歴・投稿の内容を**集めません**。開発者が運営するサーバーは無く、開発者が利用者のデータを受け取ることはありません。

### 2. 保存する情報

利用者の端末の中にだけ、次の 3 つの設定(ON / OFF)を保存します。

| 設定 | 保存場所 |
| --- | --- |
| 投稿元を表示する | 拡張の保存場所(`chrome.storage.local`)の `enabled`、x.com の localStorage の `xVia.enabled` |
| 「Twitter」を「X」と表示する | `chrome.storage.local` の `xName`、x.com の localStorage の `xVia.xName` |
| 時刻に秒を出す | `chrome.storage.local` の `seconds`、x.com の localStorage の `xVia.seconds` |

x.com の localStorage に写すのは、ページの中で動く部分が設定を読めるようにするためです。これ以外のものは保存しません。

### 3. 通信

- 投稿のページを開いた時に、その投稿の投稿元を知るため、**x.com にだけ** 1 回問い合わせます(`https://x.com/i/api/2/timeline/conversation/<投稿ID>.json`)。同じ投稿には、ページを読み込み直すまで問い合わせません
- X の画面がもともと受け取っているデータに投稿元が入っている時は、問い合わせません
- 問い合わせには、X の画面が自分の通信に付けている認証のヘッダー(`authorization` など)とクッキーを、ページの中でそのまま使います。これは X の画面自身が行う通信と同じもので、**値を保存したり、x.com 以外に送ったりはしません**
- 返ってきた答えから投稿元の名前とリンクだけを取り出し、ページを開いている間だけメモリーに置きます
- 開発者のサーバー・解析サービス・広告サービスなど、**x.com 以外への送信は一切ありません**

### 4. ページの中で読むもの

投稿元と時刻を表示するために、x.com のページの中で次のものを読みます。読んだものは表示に使うだけで、保存も送信もしません。

- X の画面が受け取る投稿のデータ(投稿元の名前を取り出すため)
- 画面に出ている投稿時刻(`<time>` 要素。秒を表示するため)

### 5. 第三者への提供

集めていないので、第三者に提供・販売することはありません。

### 6. 消し方

拡張を削除すると、`chrome.storage.local` の設定は消えます。x.com の localStorage に写した設定は、Chrome の設定から x.com のサイトデータを消すと消えます。

### 7. 変更

このポリシーを変える時は、このページを更新し、上の最終更新日を書き換えます。

### 8. 問い合わせ

GitHub の Issues で受け付けています: https://github.com/naikaku1/X-Via/issues

---

## English

X via ("the extension") is a Chrome extension that shows the source of a post (for example, "Twitter for iPhone") next to its date on X (x.com) post pages, and can show the post time down to the second. It is an unofficial extension and is not affiliated with X Corp.

### 1. Information we collect

The extension does **not** collect personal information, browsing history, or the content of posts. The developer runs no server and never receives any user data.

### 2. Information stored on your device

Only the following three on/off settings are stored, and only on your device:

| Setting | Where |
| --- | --- |
| Show source | `enabled` in `chrome.storage.local`, `xVia.enabled` in x.com localStorage |
| Show "Twitter" as "X" | `xName` in `chrome.storage.local`, `xVia.xName` in x.com localStorage |
| Show seconds | `seconds` in `chrome.storage.local`, `xVia.seconds` in x.com localStorage |

The settings are copied to x.com localStorage only so that the part of the extension running inside the page can read them. Nothing else is stored.

### 3. Network requests

- When you open a post page, the extension sends **one request to x.com only** (`https://x.com/i/api/2/timeline/conversation/<post ID>.json`) to look up the post's source. The same post is not requested again until the page is reloaded.
- No request is made when the data X's own page already received contains the source.
- The request reuses, inside the page, the authentication headers (such as `authorization`) and cookies that X's own page attaches to its requests. This is the same kind of request X's page makes itself. **These values are never stored and never sent anywhere other than x.com.**
- Only the source name and link are taken from the response and kept in memory while the page is open.
- There is **no transmission to any destination other than x.com** — no developer server, no analytics, no advertising.

### 4. What is read inside the page

To display the source and time, the extension reads the following inside x.com pages. It is used only for display and is neither stored nor transmitted.

- Post data received by X's page (to extract the source name)
- The post time shown on the page (the `<time>` element, to show seconds)

### 5. Sharing with third parties

Since no data is collected, nothing is shared with or sold to third parties.

### 6. Deleting data

Removing the extension deletes the settings in `chrome.storage.local`. The settings copied to x.com localStorage are deleted when you clear site data for x.com in Chrome's settings.

### 7. Changes

If this policy changes, this page will be updated along with the "Last updated" date above.

### 8. Contact

Please use GitHub Issues: https://github.com/naikaku1/X-Via/issues
