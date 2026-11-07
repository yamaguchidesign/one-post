// One Post: X(Twitter)を1投稿ずつ、↑↓キーだけで見るための content script
(() => {
  "use strict";

  const LOG = (...a) => console.debug("[OnePost]", ...a);

  let current = null; // 今見ている article 要素
  let hud = null;
  let expectTop = null; // 今の投稿があるべき画面上のY（Xの差し込みでずれたら戻す）
  const remember = () => { expectTop = current ? current.getBoundingClientRect().top : null; };
  const anchors = new Map(); // ページごとの「一番上の投稿があった位置」(viewport上のY)

  // この機能を効かせるのはホームのタイムラインだけ。
  // プロフィール・ブックマーク・いいね・投稿の詳細などは、ふつうに全部表示してスクロールできる。
  const ACTIVE_PATHS = ["/home"];
  const isActivePage = () => ACTIVE_PATHS.includes(location.pathname);
  let active = false;
  const applyActive = () => {
    const on = isActivePage();
    if (on === active) return;
    active = on;
    document.documentElement.classList.toggle("op-active", on);
    current = null;
    expectTop = null;
    if (!on) {
      document.querySelectorAll("[data-op-focus]").forEach((c) => c.removeAttribute("data-op-focus"));
      if (hud) hud.style.display = "none";
    }
    LOG(on ? "on" : "off", location.pathname);
  };

  // ---- 入力中・ダイアログ内は邪魔しない --------------------------------
  const isTyping = (el) =>
    !!el &&
    (el.isContentEditable ||
      /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) ||
      !!el.closest?.('[contenteditable="true"]'));

  const inOverlay = (el) =>
    !!el?.closest?.('[role="dialog"], [role="menu"], [role="listbox"], [data-testid="Dropdown"], [data-testid="HoverCard"]');

  // ---- タイムラインの投稿一覧（高さ0の折りたたみ投稿は除外） ----------
  const getArticles = () => {
    const col = document.querySelector('[data-testid="primaryColumn"]');
    if (!col) return [];
    return [...col.querySelectorAll('article[data-testid="tweet"]')].filter(
      (a) => a.closest('[data-testid="cellInnerDiv"]') && a.getBoundingClientRect().height > 10
    );
  };

  const cellOf = (a) => a?.closest('[data-testid="cellInnerDiv"]');

  // 固定ヘッダーの下端（基準位置がまだ取れていないときの代わり）
  const headerBottom = () => {
    const col = document.querySelector('[data-testid="primaryColumn"]');
    let b = 0;
    if (col) {
      for (const el of col.querySelectorAll("div")) {
        const cs = getComputedStyle(el);
        if (cs.position !== "sticky" && cs.position !== "fixed") continue;
        const r = el.getBoundingClientRect();
        if (r.top <= 1 + b && r.height < 200) b = Math.max(b, r.bottom);
      }
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
    return anchors.get(location.pathname) ?? headerBottom();
  };

  // ページ最上部にいる間は、一番上の投稿の位置を基準として記録し続ける
  const recordAnchor = (list) => {
    if (window.scrollY !== 0 || !list.length) return;
    const top = list[0].getBoundingClientRect().top;
    if (top > 0 && top < window.innerHeight * 0.8) anchors.set(location.pathname, Math.round(top));
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

  // 投稿の上端を基準位置にそろえる（アニメーションなしで即座に）
  const scrollToCurrent = () => {
    if (!current) return;
    const top = window.scrollY + current.getBoundingClientRect().top - anchorY();
    window.scrollTo({ top: Math.max(0, top), behavior: "instant" });
    remember();
  };

  const setCurrent = (a) => {
    current = a;
    markFocus();
    scrollToCurrent();
    updateHud();
  };

  const updateHud = () => {
    if (!hud) {
      hud = document.createElement("div");
      hud.id = "op-hud";
      hud.textContent = "↑ ↓ で次の投稿へ";
      (document.body || document.documentElement).appendChild(hud);
    }
    hud.style.display = active && current ? "" : "none";
  };

  // ---- 移動 -----------------------------------------------------------
  const move = (dir) => {
    const list = getArticles();
    if (!list.length) return;
    if (!current || !list.includes(current)) current = nearestToAnchor(list);

    // ↑↓は常に投稿の切り替え（長い投稿の中を読むのはホイール／トラックパッドで）
    const next = list[list.indexOf(current) + dir];
    if (next) {
      setCurrent(next);
    } else if (dir > 0) {
      // 末尾：少し下へ送って続きの読み込みを促す
      expectTop = null; // 読み込み待ちの間は位置の戻しを止める
      window.scrollBy({ top: 600, behavior: "instant" });
      setTimeout(() => {
        const l2 = getArticles();
        const n2 = l2[l2.indexOf(current) + 1];
        if (n2) setCurrent(n2);
        else scrollToCurrent();
      }, 500);
    }
  };

  // ---- スクロール系の入力を止める（サイドバーは除く） ------------------
  const blockScroll = (e) => {
    if (!active) return;
    if (inOverlay(e.target) || e.target.closest?.("[data-op-sidebar]")) return;
    e.preventDefault();
    e.stopPropagation();
  };
  // 画面に収まらない投稿だけは、ホイール／トラックパッドでその投稿の範囲内に限って動かせる
  const onWheel = (e) => {
    blockScroll(e);
    if (!e.defaultPrevented || !current || !current.isConnected) return;
    if (e.ctrlKey) return; // ピンチズームは無視
    const r = current.getBoundingClientRect();
    const vh = window.innerHeight;
    const maxDown = Math.max(0, r.bottom - vh + 16); // 投稿の下端が見えるところまで
    const maxUp = Math.max(0, anchorY() - r.top); // 投稿の上端が基準位置に戻るところまで
    if (!maxDown && !maxUp) return;
    const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? vh : 1;
    const delta = Math.max(-maxUp, Math.min(maxDown, e.deltaY * unit));
    if (Math.abs(delta) < 0.5) return;
    window.scrollBy({ top: delta, behavior: "instant" });
    remember();
  };
  window.addEventListener("wheel", onWheel, { capture: true, passive: false });
  window.addEventListener("touchmove", blockScroll, { capture: true, passive: false });

  const SCROLL_KEYS = new Set([" ", "PageUp", "PageDown", "Home", "End", "j", "k", "J", "K", "."]);
  let repeatLock = false;

  window.addEventListener(
    "keydown",
    (e) => {
      if (!active) return;
      if (isTyping(e.target) || inOverlay(e.target) || document.querySelector('[role="dialog"]')) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
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
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    },
    true
  );

  // ---- サイドバーを独立してスクロールできるようにする ------------------
  const setupSidebar = () => {
    const sb = document.querySelector('[data-testid="sidebarColumn"]');
    if (!sb || sb.querySelector("[data-op-sidebar]")) return;
    for (const el of sb.querySelectorAll(":scope > div > div")) {
      if (getComputedStyle(el).position === "sticky") {
        el.setAttribute("data-op-sidebar", ""); // classはXの再描画で消されるので属性で印を付ける
        LOG("sidebar ready");
        return;
      }
    }
  };

  // ---- 上の「いまどうしてる？」投稿フォームを、元の位置に固定して残す ----
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
    if (!box.hasAttribute("data-op-compose")) {
      box.setAttribute("data-op-compose", "");
      // フォームの高さが変わったら（入力で広がる・投稿後に縮む）すぐ位置を合わせ直す
      resizeObs.observe(box);
    }
    // ページ最上部にいる間に、フォーム本来の位置と背景色を覚える
    if (window.scrollY === 0) {
      const root = document.documentElement.style;
      root.setProperty("--op-compose-top", `${Math.round(box.getBoundingClientRect().top)}px`);
      root.setProperty("--op-bg", getComputedStyle(document.body).backgroundColor);
      // 罫線はXのカラムの線と同じ色にする（ライト/ダークどちらでも馴染む）
      const cs = getComputedStyle(col);
      const line = [cs.borderRightColor, cs.borderLeftColor].find((c) => c && !/rgba\(0, 0, 0, 0\)|transparent/.test(c));
      if (line) root.setProperty("--op-line", line);
    }
  };

  // ---- X側の再描画（仮想リスト・ページ遷移）に追従 --------------------
  let pending = false;
  let lastPath = location.pathname;
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

    if (location.pathname !== lastPath) {
      lastPath = location.pathname;
      current = null;
    }

    // フォームの高さが変わった分だけ、投稿のあるべき位置もずらす
    const cb = composeBox();
    const ch = cb ? cb.getBoundingClientRect().height : null;
    if (expectTop !== null && lastComposeH !== null && ch !== null) expectTop += ch - lastComposeH;
    lastComposeH = ch;

    const list = getArticles();
    recordAnchor(list);
    if (!list.length) { current = null; updateHud(); return; }

    if (!current || !list.includes(current)) {
      // 初回・ページ遷移・今の投稿が消えたとき
      const pick = window.scrollY === 0 ? list[0] : nearestToAnchor(list);
      LOG("focus reacquired");
      setCurrent(pick);
      return;
    }
    markFocus();
    // 上に投稿が差し込まれる等で位置がずれたら、見ている投稿を元の位置へ戻す
    if (expectTop !== null) {
      const d = current.getBoundingClientRect().top - expectTop;
      if (Math.abs(d) > 1) window.scrollBy({ top: d, behavior: "instant" });
    }
  };

  const start = () => {
    new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });
    window.addEventListener("popstate", schedule); // 戻る/進むでのページ切り替えにも反応
    sync();
  };

  if (document.body) start();
  else document.addEventListener("DOMContentLoaded", start, { once: true });
})();
