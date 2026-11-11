# One Post – Calm X Timeline

<img src="icons/icon128.png" width="64" alt="One Post">

X（旧Twitter）のホームと検索結果を **1投稿ずつ** 表示する Chrome 拡張。
スクロールを無効にして、**↑↓キーでだけ** 次の投稿へ進む。スクロールで出るドーパミンに釣られて、だらだら見続けるのを防ぐための道具です。

*Show X (Twitter) home and search results one post at a time. Scrolling is disabled; move with ↑ / ↓ only. A small tool against doomscrolling.*

## 動き

- ホームのタイムラインと、検索結果の投稿（話題・最新タブ）を1件だけ表示。↑↓キーで前後の投稿へ切り替え（次の投稿は常に同じ位置に出る）
- ホイール・トラックパッド・スペース・PageUp/Down・j/k でのスクロールは無効
- 画面に収まらない長い投稿だけ、ホイール／トラックパッドでその投稿の中をスクロールできる（↑↓は常に投稿の切り替え）
- 上の投稿フォームは固定表示、右のサイドバーは単独でスクロールできる
- 文字入力中・ダイアログ（投稿画面など）では邪魔しない
- **それ以外のページ**（検索のアカウント・メディア・リストタブ、プロフィール・通知・ブックマーク・いいね・投稿の詳細など）では機能オフ。ふつうに全部表示される

## インストール

### ストア版
[Chrome ウェブストア](https://chromewebstore.google.com/detail/aahbobjdpfahogkbghpnnoggjghmllho) からインストールできます。

公開から日が浅いため、Chrome の「セーフ ブラウジング保護強化」をオンにしていると「この拡張機能は信頼されていません」という確認が出ます。そのまま「インストールに進む」で大丈夫です。

### 手動インストール（今すぐ使う）
1. [最新のリリース](https://github.com/yamaguchidesign/one-post/releases/latest)から `one-post.zip` をダウンロードして展開
   （または `git clone https://github.com/yamaguchidesign/one-post`）
2. Chrome で `chrome://extensions` を開く
3. 右上の「デベロッパーモード」をON
4. 「パッケージ化されていない拡張機能を読み込む」→ 展開したフォルダを選ぶ
5. x.com を開き直す

止めたいときは `chrome://extensions` でOFFにしてください。

## 注意

- 埋め込み動画やカード（iframe）の中をクリックすると、キー入力がそちらに入って↑↓が効かなくなります。外側をクリックし直してください。
- タッチ操作のみの端末（スマホ）は対象外です。パソコンの Chrome 向けです。
- 画面の高さが極端に小さいウィンドウでは、投稿が見えなくなることがあります。

- X の画面構造に依存して動いています。X が表示の作りを変えると動かなくなることがあります。見つけたら [Issues](https://github.com/yamaguchidesign/one-post/issues) へ。
- 利用者の情報は一切収集しません。通信もしません（[プライバシーポリシー](PRIVACY.md)）。
- X Corp. とは無関係の非公式ツールです。

## ライセンス

MIT
