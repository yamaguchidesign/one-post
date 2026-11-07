# One Post – Calm X Timeline

<img src="icons/icon128.png" width="64" alt="One Post">

X（旧Twitter）のホームを **1投稿ずつ** 表示する Chrome 拡張。
スクロールを無効にして、**↑↓キーでだけ** 次の投稿へ進む。スクロールで出るドーパミンに釣られて、だらだら見続けるのを防ぐための道具です。

*Show X (Twitter) home one post at a time. Scrolling is disabled; move with ↑ / ↓ only. A small tool against doomscrolling.*

## 動き

- ホームのタイムラインを1件だけ表示。↑↓キーで前後の投稿へ切り替え（次の投稿は常に同じ位置に出る）
- ホイール・トラックパッド・スペース・PageUp/Down・j/k でのスクロールは無効
- 画面に収まらない長い投稿だけ、ホイール／トラックパッドでその投稿の中をスクロールできる（↑↓は常に投稿の切り替え）
- 上の投稿フォームは固定表示、右のサイドバーは単独でスクロールできる
- 文字入力中・ダイアログ（投稿画面など）では邪魔しない
- **ホーム以外のページ**（プロフィール・通知・ブックマーク・いいね・投稿の詳細など）では機能オフ。ふつうに全部表示される

## インストール

### ストア版
Chrome ウェブストアでの公開準備中です。公開されたらここにリンクを載せます。

### 手動インストール（今すぐ使う）
1. [最新のリリース](https://github.com/yamaguchidesign/one-post/releases/latest)から `one-post.zip` をダウンロードして展開
   （または `git clone https://github.com/yamaguchidesign/one-post`）
2. Chrome で `chrome://extensions` を開く
3. 右上の「デベロッパーモード」をON
4. 「パッケージ化されていない拡張機能を読み込む」→ 展開したフォルダを選ぶ
5. x.com を開き直す

止めたいときは `chrome://extensions` でOFFにしてください。

## 注意

- X の画面構造に依存して動いています。X が表示の作りを変えると動かなくなることがあります。見つけたら [Issues](https://github.com/yamaguchidesign/one-post/issues) へ。
- 利用者の情報は一切収集しません。通信もしません（[プライバシーポリシー](PRIVACY.md)）。
- X Corp. とは無関係の非公式ツールです。

## ライセンス

MIT
