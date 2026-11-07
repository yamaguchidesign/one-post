// One Post: X(Twitter)を1投稿ずつ、↑↓キーだけで見るための content script
(() => {
  "use strict";

  const root = document.documentElement;

  let current = null; // 今見ている article 要素
  let hud = null;
  let expectTop = null; // 今の投稿があるべき画面上のY（Xの差し込みでずれたら戻す）
  let lastSelfScroll = 0; // 拡張自身がスクロールした時刻（X側のスクロールと見分ける）
  let headerCache = null;
  const anchors = new Map(); // ページごとの「一番上の投稿があった位置」(viewport上のY)

  // ---- 自分でスクロールするときは必ずここを通す -------------------------
  const selfScrollTo = (top) => {
    lastSelfScroll = performance.now();
    window.scrollTo({ top: Math.max(0, top), behavior: "instant" });
  };
  const selfScrollBy = (dy) => {
    lastSelfScroll = performance.now();
    window.scrollBy({ top: dy, behavior: "instant" });
  };
  const remember = () => {
    expectTop = current ? current.getBoundingClientRect().top : null;
  };

  // ---- どのページで効かせるか ------------------------------------------
  // 効かせるのはホームのタイムラインだけ。
  // プロフィール・通知・ブックマーク・いいね・投稿の詳細などは、ふつうに全部表示してスクロールできる。
  const normPath = () => location.pathname.replace(/\/+$/, "") || "/";
  // 投稿画面・画像ビューアなどはURLが変わるが、背景はホームのまま。機能の状態を保つ。
  const isModalPath = (p) =>
    /^\/compose\//.test(p) || /\/(photo|video)\/\d+$/.test(p) || /^\/i\/flow\//.test(p);

  let active = false;
  const applyActive = () => {
    const p = normPath();
    if (active && isModalPath(p)) return; // ホームの上に重なったモーダル：状態を保つ
    const on = p === "/home";
    if (on === active) return;
    active = on;
    root.classList.toggle("op-active", on);
    current = null;
    expectTop = null;
    if (!on) {
      root.classList.remove("op-empty");
      document.querySelectorAll("[data-op-focus]").forEach((c) => c.removeAttribute("data-op-focus"));
      if (hud) hud.style.display = "none";
    }
  };

  // ---- 入力中・ダイアログ内は邪魔しない --------------------------------
  const isTyping = (el) =>
    !!el &&
    (el.isContentEditable ||
      /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) ||
      !!el.closest?.('[contenteditable="true"]'));

  const inOverlay = (el) =>
    !!el?.closest?.('[role="dialog"], [role="menu"], [role="listbox"], [data-testid="Dropdown"], [data-testid="HoverCard"]');

  // 押す・操作する部品の上では、Spaceなどを奪わない（記事そのものは除く）
  const INTERACTIVE =
    'button, a[href], video, audio, summary, input, select, textarea, [role="button"], [role="link"], [role="slider"], [role="menuitem"], [role="tab"], [role="checkbox"], [role="switch"], [role="option"], [role="textbox"], [tabindex="0"]:not(article)';
  const isInteractive = (el) => !!el?.closest?.(INTERACTIVE);

  // 中でスクロールできる要素（横スクロールの画像列・コードブロック等）か
  const scrollableAncestor = (el, axis) => {
    const col = document.querySelector('[data-testid="primaryColumn"]');
    for (let e = el; e && e !== col && e !== document.body; e = e.parentElement) {
      const cs = getComputedStyle(e);
      if (axis === "y") {
        if (/(auto|scroll)/.test(cs.overflowY) && e.scrollHeight > e.clientHeight + 1) return true;
      } else if (/(auto|scroll)/.test(cs.overflowX) && e.scrollWidth > e.clientWidth + 1) return true;
    }
    return false;
  };

  // ---- タイムラインの投稿一覧（高さ0の折りたたみ投稿は除外） ----------
  const getArticles = () => {
    const col = document.querySelector('[data-testid="primaryColumn"]');
    if (!col) return [];
    return [...col.querySelectorAll('article[data-testid="tweet"]')].filter(
      (a) => a.closest('[data-testid="cellInnerDiv"]') && a.getBoundingClientRect().height > 10
    );
  };

  const cellOf = (a) => a?.closest('[data-testid="cellInnerDiv"]');

  // 固定ヘッダーの下端（基準位置がまだ取れていないときの代わり。結果は覚えておく）
  const headerBottom = () => {
    if (headerCache !== null) return headerCache;
    const col = document.querySelector('[data-testid="primaryColumn"]');
    let b = 0;
    if (col) {
      for (const el of col.querySelectorAll("div")) {
        const cs = getComputedStyle(el);
        if (cs.position !== "sticky" && cs.position !== "fixed") continue;
        const r = el.getBoundingClientRect();
        if (r.top <= 1 + b && r.height < 200) b = Math.max(b, r.bottom);
      }
      if (b) headerCache = b;
    }
    return b || 60;
  };

  // 投稿フォームがあるページでは、フォームの下端が基準（文字を打って広がっても追従する）
  const composeBox = () => {
    const b = document.querySelector("[data-op-compose]");
    return b && b.isConnected ? b : null;
  };
  const anchorY = () => {
    const b = composeBox();
    if (b) return Math.round(b.getBoundingClientRect().bottom);
    return anchors.get(normPath()) ?? headerBottom();
  };

  // ページ最上部にいる間は、一番上の投稿の位置を基準として記録し続ける
  const recordAnchor = (list) => {
    if (window.scrollY !== 0 || !list.length) return;
    const top = list[0].getBoundingClientRect().top;
    if (top > 0 && top < window.innerHeight * 0.8) anchors.set(normPath(), Math.round(top));
  };

  // 画面上で基準位置に一番近い投稿（今の投稿が消えたときの拾い直し用）
  const nearestToAnchor = (list) => {
    const y = anchorY();
    let best = null, bestD = Infinity;
    for (const a of list) {
      const d = Math.abs(a.getBoundingClientRect().top - y);
      if (d < bestD) { bestD = d; best = a; }
    }
    return best;
  };

  // ---- 表示 -----------------------------------------------------------
  const markFocus = () => {
    const cell = cellOf(current);
    // classはXの再描画で消されるので属性で印を付ける
    document.querySelectorAll("[data-op-focus]").forEach((c) => {
      if (c !== cell) c.removeAttribute("data-op-focus");
    });
    if (cell && !cell.hasAttribute("data-op-focus")) cell.setAttribute("data-op-focus", "");
  };

  // 見えていない投稿の動画が裏で再生され続けないようにする
  const pauseHiddenVideos = () => {
    const col = document.querySelector('[data-testid="primaryColumn"]');
    if (!col) return;
    const keep = cellOf(current);
    col.querySelectorAll("video").forEach((v) => {
      if (!v.paused && !(keep && keep.contains(v))) v.pause();
    });
  };

  // 投稿の上端を基準位置にそろえる（アニメーションなしで即座に）
  const scrollToCurrent = () => {
    if (!current) return;
    selfScrollTo(window.scrollY + current.getBoundingClientRect().top - anchorY());
    remember();
  };

  // キーボード・スクリーンリーダーの位置も、今の投稿に合わせる
  const focusCurrent = () => {
    if (!current || isTyping(document.activeElement)) return;
    if (current.tabIndex >= 0 && document.activeElement !== current) {
      try { current.focus({ preventScroll: true }); } catch (_) { /* 何もしない */ }
    }
  };

  const setCurrent = (a) => {
    current = a;
    markFocus();
    scrollToCurrent();
    focusCurrent();
    updateHud();
  };

  const updateHud = () => {
    if (!hud) {
      hud = document.createElement("div");
      hud.id = "op-hud";
      hud.textContent = "↑ ↓ で次の投稿へ";
      (document.body || root).appendChild(hud);
    }
    hud.style.display = active && current ? "" : "none";
  };

  // ---- 移動 -----------------------------------------------------------
  let loading = false; // 末尾で続きを読み込み待ちの間は、新しい↓を受け付けない
  const move = (dir) => {
    const list = getArticles();
    if (!list.length) return;
    if (!current || !list.includes(current)) current = nearestToAnchor(list);

    // ↑↓は常に投稿の切り替え（長い投稿の中を読むのはホイール／トラックパッドで）
    const next = list[list.indexOf(current) + dir];
    if (next) {
      setCurrent(next);
      return;
    }
    if (dir < 0 || loading) return;

    // 末尾：少し下へ送って続きの読み込みを促し、次の投稿が出たら切り替える
    loading = true;
    const base = current;
    expectTop = null; // 読み込み待ちの間は位置の戻しを止める
    selfScrollBy(600);
    let tries = 0;
    const poll = () => {
      tries += 1;
      const l2 = getArticles();
      const i = l2.indexOf(base);
      const n2 = i >= 0 ? l2[i + 1] : null;
      if (n2) {
        loading = false;
        setCurrent(n2);
      } else if (tries < 15) {
        setTimeout(poll, 100);
      } else {
        loading = false;
        if (base.isConnected) { current = base; scrollToCurrent(); } else schedule();
      }
    };
    setTimeout(poll, 100);
  };

  // ---- スクロール系の入力を止める（サイドバー・フォーム・内側のスクロールは除く） --
  const shouldPass = (e) =>
    inOverlay(e.target) ||
    isTyping(e.target) ||
    !!e.target.closest?.("[data-op-sidebar], [data-op-compose]");

  const blockScroll = (e) => {
    if (!active || shouldPass(e)) return;
    e.preventDefault();
    e.stopPropagation();
  };

  // 画面に収まらない投稿だけは、ホイール／トラックパッドでその投稿の範囲内に限って動かせる
  const onWheel = (e) => {
    if (!active) return;
    if (e.ctrlKey) return; // ピンチ・Ctrl+ホイールの拡大縮小は止めない
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return; // 横方向（横スワイプ・横スクロール）は止めない
    if (shouldPass(e) || scrollableAncestor(e.target, "y")) return;
    e.preventDefault();
    e.stopPropagation();
    if (!current || !current.isConnected) return;
    const r = current.getBoundingClientRect();
    const vh = window.innerHeight;
    const maxDown = Math.max(0, r.bottom - vh + 16); // 投稿の下端が見えるところまで
    const maxUp = Math.max(0, anchorY() - r.top); // 投稿の上端が基準位置に戻るところまで
    if (!maxDown && !maxUp) return;
    const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? vh : 1;
    const delta = Math.max(-maxUp, Math.min(maxDown, e.deltaY * unit));
    if (Math.abs(delta) < 0.5) return;
    selfScrollBy(delta);
    remember();
  };
  window.addEventListener("wheel", onWheel, { capture: true, passive: false });
  window.addEventListener(
    "touchmove",
    (e) => {
      if (!active || shouldPass(e) || scrollableAncestor(e.target, "y")) return;
      e.preventDefault();
      e.stopPropagation();
    },
    { capture: true, passive: false }
  );

  const SCROLL_KEYS = new Set([" ", "PageUp", "PageDown", "Home", "End", "j", "k", "J", "K", "."]);
  let repeatLock = false;

  window.addEventListener(
    "keydown",
    (e) => {
      if (!active || e.isComposing) return;
      if (isTyping(e.target) || inOverlay(e.target) || document.querySelector('[role="dialog"][aria-modal="true"]')) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        // 動画の音量・シークバーなど、矢印キーで操作する部品の上では奪わない
        if (e.target.closest?.('video, audio, [role="slider"]')) return;
        e.preventDefault();
        e.stopImmediatePropagation();
        // 1回押しは即反応。押しっぱなしの連打だけ間引く（高速スクロール化を防ぐ）
        if (e.repeat) {
          if (repeatLock) return;
          repeatLock = true;
          setTimeout(() => (repeatLock = false), 250);
        }
        move(e.key === "ArrowDown" ? 1 : -1);
        return;
      }
      if (SCROLL_KEYS.has(e.key)) {
        // ボタン・動画・リンクなど、操作できる部品にフォーカスがあるときは通す
        if (isInteractive(e.target)) return;
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    },
    true
  );

  // Xが自分でページ先頭へ戻したとき（ホームボタン・投稿後）は、補正で押し戻さず先頭の投稿から始める
  let prevY = 0;
  window.addEventListener(
    "scroll",
    () => {
      const y = window.scrollY;
      if (active && y === 0 && prevY > 200 && performance.now() - lastSelfScroll > 150) {
        current = null;
        expectTop = null;
        schedule();
      }
      prevY = y;
    },
    { passive: true }
  );

  // ---- サイドバーを独立してスクロールできるようにする ------------------
  const setupSidebar = () => {
    const sb = document.querySelector('[data-testid="sidebarColumn"]');
    if (!sb || sb.querySelector("[data-op-sidebar]")) return;
    for (const el of sb.querySelectorAll(":scope > div > div")) {
      if (getComputedStyle(el).position === "sticky") {
        el.setAttribute("data-op-sidebar", ""); // classはXの再描画で消されるので属性で印を付ける
        return;
      }
    }
  };

  // ---- 上の「いまどうしてる？」投稿フォームを、元の位置に固定して残す ----
  let observedBox = null;
  const setupCompose = () => {
    const col = document.querySelector('[data-testid="primaryColumn"]');
    const ta = col?.querySelector('[data-testid="tweetTextarea_0"]');
    if (!ta) return;
    // 投稿一覧と同じ親を持つところまで上がった要素が、フォームのまとまり
    let box = ta;
    while (box.parentElement && box.parentElement !== col &&
           !box.parentElement.querySelector(':scope > * [data-testid="cellInnerDiv"]')) {
      box = box.parentElement;
    }
    if (!box.parentElement || box.parentElement === col) return;
    if (box !== observedBox) {
      // Xがフォームを作り直したら、古い要素の監視と印を外して新しい方に付ける
      if (observedBox) {
        resizeObs.unobserve(observedBox);
        observedBox.removeAttribute("data-op-compose");
      }
      observedBox = box;
      box.setAttribute("data-op-compose", "");
      // フォームの高さが変わったら（入力で広がる・投稿後に縮む）すぐ位置を合わせ直す
      resizeObs.observe(box);
    }
    // ページ最上部にいる間に、フォーム本来の位置と背景色を覚える
    if (window.scrollY === 0) {
      const st = root.style;
      st.setProperty("--op-compose-top", `${Math.round(box.getBoundingClientRect().top)}px`);
      st.setProperty("--op-bg", getComputedStyle(document.body).backgroundColor);
      // 罫線はXのカラムの線と同じ色にする（ライト/ダークどちらでも馴染む）
      const cs = getComputedStyle(col);
      const line = [cs.borderRightColor, cs.borderLeftColor].find((c) => c && !/rgba\(0, 0, 0, 0\)|transparent/.test(c));
      if (line) st.setProperty("--op-line", line);
    }
  };

  // ---- X側の再描画（仮想リスト・ページ遷移）に追従 --------------------
  let pending = false;
  let lastPath = normPath();
  let lastComposeH = null;
  const resizeObs = new ResizeObserver(() => schedule());
  const schedule = () => {
    if (!pending) { pending = true; requestAnimationFrame(sync); }
  };

  const sync = () => {
    pending = false;
    applyActive();
    if (!active) return;
    setupSidebar();
    setupCompose();

    const p = normPath();
    if (p !== lastPath && !isModalPath(p)) {
      lastPath = p;
      current = null;
      headerCache = null;
    }

    // フォームの高さが変わった分だけ、投稿のあるべき位置もずらす
    const cb = composeBox();
    const ch = cb ? cb.getBoundingClientRect().height : null;
    if (expectTop !== null && lastComposeH !== null && ch !== null) expectTop += ch - lastComposeH;
    lastComposeH = ch;

    const list = getArticles();
    recordAnchor(list);
    // 投稿が1件も無い（空のタイムライン・読み込み失敗）ときは、何も隠さない
    root.classList.toggle("op-empty", !list.length);
    if (!list.length) { current = null; updateHud(); return; }

    if (!current || !list.includes(current)) {
      // 初回・ページ遷移・今の投稿が消えたとき
      setCurrent(window.scrollY === 0 ? list[0] : nearestToAnchor(list));
      pauseHiddenVideos();
      return;
    }
    markFocus();
    pauseHiddenVideos();
    // 上に投稿が差し込まれる等で位置がずれたら、見ている投稿を元の位置へ戻す
    if (expectTop !== null) {
      const d = current.getBoundingClientRect().top - expectTop;
      if (Math.abs(d) > 1) selfScrollBy(d);
    }
  };

  const start = () => {
    new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });
    window.addEventListener("popstate", schedule); // 戻る/進むでのページ切り替えにも反応
    window.addEventListener("resize", () => {
      // 画面サイズや拡大率が変わったら、覚えていた位置を捨てて測り直す
      headerCache = null;
      anchors.clear();
      schedule();
    });
    sync();
  };

  if (document.body) start();
  else document.addEventListener("DOMContentLoaded", start, { once: true });
})();
