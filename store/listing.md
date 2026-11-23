# Chrome ウェブストア掲載文（コピペ用）

## 名前
One Post – Calm X Timeline

## 概要（132文字以内）※manifestのdescriptionと同じ
Show X (Twitter) one post at a time. Scrolling is disabled; use ↑↓ keys to move. Curb doomscrolling. / Xを1投稿ずつ表示、↑↓←→キーだけで移動。

## 詳細な説明（日本語）
X（旧Twitter）のホームと検索結果を1投稿ずつ表示する拡張機能です。

スクロールは無効になり、↑↓←→キーでだけ次の投稿へ進めます。スクロールで次々に新しい刺激が出てくると、ついだらだら見続けてしまう。それを防ぐための小さな道具です。

【できること】
・ホームのタイムラインと検索結果の投稿（話題・最新タブ）を1件だけ表示。↑↓←→キーで前後の投稿へ切り替え
・ホイール／トラックパッド／スペース／PageUp・PageDown／j・k でのスクロールを無効化
・画面に収まらない長い投稿は、その投稿の中だけスクロール可能
・投稿フォームは上に固定、右のサイドバーは単独でスクロール可能
・それ以外（検索のアカウント・メディア・リストタブ、プロフィール・通知・ブックマーク・いいね・投稿の詳細）ではオフ。ふつうに全部表示
・ボタン・動画・文字入力の上では、Space や矢印キーを奪わない

【プライバシー】
利用者の情報を一切収集せず、通信もしません。動作はすべてブラウザの中で完結します。

【ご注意】
X Corp. とは無関係の非公式ツールです。Xの画面構造に依存して動くため、Xの仕様変更で動かなくなることがあります。

## Detailed description (English)
Shows your X (Twitter) home timeline and search results one post at a time.

Scrolling is disabled; you move to the next post only with the ↑ ↓ ← → keys. A small tool to break the doomscrolling habit.

Features:
- One post on screen at a time on Home and in search results (Top / Latest tabs); ↑ / ↓ switch posts
- Mouse wheel, trackpad, Space, PageUp/PageDown and j/k scrolling are disabled
- Posts taller than the window can be scrolled inside that post only
- The compose box stays pinned; the right sidebar scrolls on its own
- Off everywhere else (search People / Media / Lists tabs, profile, notifications, bookmarks, likes, post detail), where everything shows normally

Privacy: collects no data and makes no network requests. Everything runs locally in your browser.

Notice: unofficial, not affiliated with X Corp. It relies on X's page structure and may break when X changes it.

## カテゴリ
生産性（Productivity）

## 言語
日本語（デフォルト）／English

## 権限の説明（審査で聞かれる）
- ホスト権限 x.com / twitter.com：タイムラインの表示を1投稿ずつに切り替えるため、これらのページ上でのみコンテンツスクリプトを動かす。
- それ以外の権限（storage / tabs / webRequest 等）は使用しない。
- リモートコードは使用しない。

## プライバシーポリシーURL
https://github.com/yamaguchidesign/one-post/blob/main/PRIVACY.md

## 単一目的の説明
X(Twitter)のタイムラインを1投稿ずつ表示し、スクロールを抑制して見すぎを防ぐこと。

## 提出手順（Claudeがやる）
新しい版を作るたびに、Claude が GitHub リリースのあとで Chrome ウェブストアにも提出する（山口さん指定 2026-11-23）。

1. `manifest.json` の version をストアに出ている版より上げ、`dist/one-post.zip` を作り直す
2. `node ~/Developer/yamaguchidesign/cws-publish/cws.js status .` で今のストアの版を確認する
3. `node ~/Developer/yamaguchidesign/cws-publish/cws.js publish .` でアップロードして審査に提出する（`.cws.json` に itemId 設定済み）
4. 審査の状態は review-watch-board が見張り、変わると Mac に通知が来る

掲載文・カテゴリ・プライバシーポリシーURL・アイコン・スクリーンショットの変更は、ストアのダッシュボード側（https://chrome.google.com/webstore/devconsole ）での作業になる。ここは API では変えられないので、変えたいときだけ山口さんに頼む。
- ショップアイコン: `store/shop-icon-128.png`（128x128・透明の余白つき）
- スクリーンショット: `store/screenshot-1.png` と `store/screenshot-2.png`（1280x800・架空の投稿。実画面を撮り直すときは個人の投稿が写らないように）
