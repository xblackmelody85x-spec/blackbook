/* 블랙북 서비스 계층: 로그인(구글·이메일), 계정 저장소(Supabase), 체험·이용권 상태, 이용권 결제(토스페이먼츠: 카카오페이·토스페이), 읽기 전용 전환.
   앱 본체(index.html)는 이 파일이 만든 window.BB_PROVIDER 와 window.BB_APP 만 사용합니다. */
(function () {
  "use strict";
  var C = window.BB_CONFIG || {};
  var configured = C.SUPABASE_URL && C.SUPABASE_ANON_KEY && !/YOUR_/.test(C.SUPABASE_URL + C.SUPABASE_ANON_KEY);
  if (!configured || !window.supabase) { return; } // 설정 전에는 이 브라우저에만 저장하는 모드로 동작

  // 사이트가 하위 경로(예: github.io/저장소이름/)에 올라가도 약관 링크가 맞도록, 이 파일이 있는 폴더를 기준으로 계산해요.
  var SITE_BASE = (function () { try { return new URL("./", document.currentScript.src).href; } catch (e) { return "/"; } })();
  var LANG_KEY = "blackbook.lang";
  function lang() { try { return localStorage.getItem(LANG_KEY) === "en" ? "en" : "ko"; } catch (e) { return "ko"; } }
  var S = {
    ko: {
      title: "블랙북", sub: "나만의 책을 쓰는 곳", google: "Google로 계속하기", or: "또는", email: "이메일 주소", send: "로그인 링크 받기",
      sent: "메일을 보냈어요. 메일의 링크를 누르면 로그인돼요.", bad: "이메일 주소를 확인해 주세요.", err: "문제가 생겼어요. 잠시 뒤에 다시 해 주세요.",
      agree: "계속하면 이용약관과 개인정보처리방침에 동의한 것으로 봅니다.", terms: "이용약관", privacy: "개인정보처리방침", refund: "환불 안내",
      trial: "무료 체험 {0}일 남았어요", trialLast: "무료 체험이 오늘 끝나요", expired: "무료 체험이 끝났어요. 읽기와 내려받기는 계속 돼요.", activeEnd: "이용 중 · {0}까지",
      buy: "이용권 구매", extend: "기간 연장", payTitle: "결제 방법을 고르세요", payNote: "자동 결제 없이 한 번만 결제돼요. 남은 기간이 있으면 그 뒤로 이어져요.",
      kakao: "카카오페이로 결제", toss: "토스페이로 결제", cancel: "닫기", payNotReady: "결제 준비 중이에요. 잠시 뒤에 다시 해 주세요.",
      payCanceled: "결제를 취소했어요.", payFailed: "결제하지 못했어요: {0}", paidOk: "결제가 완료됐어요. {0}까지 쓸 수 있어요.", logout: "로그아웃", del: "계정 삭제", delSure: "한 번 더 누르면 계정과 모든 책이 지워져요",
      unsavedLogout: "저장 안 된 변경이 있어요. 한 번 더 누르면 로그아웃하고 이 기기의 임시 글이 지워져요", loading: "불러오는 중…", paid: "결제를 확인하고 있어요…",
      deleted: "계정을 삭제했어요.", failed: "요청에 실패했어요. 잠시 뒤에 다시 해 주세요."
    },
    en: {
      title: "Blackbook", sub: "A place to write your own book", google: "Continue with Google", or: "or", email: "Email address", send: "Email me a sign-in link",
      sent: "We sent an email. Open the link in it to sign in.", bad: "Please check the email address.", err: "Something went wrong. Please try again in a moment.",
      agree: "By continuing you agree to the Terms of Service and the Privacy Policy.", terms: "Terms", privacy: "Privacy", refund: "Refunds",
      trial: "{0} days left in your free trial", trialLast: "Your free trial ends today", expired: "Your free trial has ended. Reading and downloading still work.", activeEnd: "Active · until {0}",
      buy: "Buy a pass", extend: "Extend", payTitle: "Choose how to pay", payNote: "One-time payment, no auto-renewal. Any remaining days carry over.",
      kakao: "Pay with KakaoPay", toss: "Pay with TossPay", cancel: "Close", payNotReady: "Payments are not ready yet. Please try again later.",
      payCanceled: "Payment canceled.", payFailed: "Payment failed: {0}", paidOk: "Payment complete. You can write until {0}.", logout: "Log out", del: "Delete account", delSure: "Press again to delete your account and all books",
      unsavedLogout: "You have unsaved changes. Press again to log out and erase this device's draft", loading: "Loading…", paid: "Confirming your payment…",
      deleted: "Your account was deleted.", failed: "The request failed. Please try again in a moment."
    }
  };
  function T(k) { var s = (S[lang()] || S.ko)[k] || S.ko[k] || k; for (var i = 1; i < arguments.length; i++) s = s.replace("{" + (i - 1) + "}", arguments[i]); return s; }

  var sb = window.supabase.createClient(C.SUPABASE_URL, C.SUPABASE_ANON_KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
  var state = { session: null, ent: null };

  // 이 기기의 임시 글은 사용자별로 따로 보관합니다. (앱 본체가 시작되기 전에 동기적으로 정해야 해서 저장된 세션에서 읽어요.)
  (function pickSuffix() {
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (/^sb-.*-auth-token$/.test(k)) { var v = JSON.parse(localStorage.getItem(k) || "null"); var u = v && (v.user || (v.currentSession && v.currentSession.user)); if (u && u.id) { window.BB_SUFFIX = u.id; return; } }
      }
    } catch (e) {}
  })();

  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function fmtDate(d) { try { return new Date(d).toLocaleDateString(lang() === "en" ? "en-US" : "ko-KR", { year: "numeric", month: "long", day: "numeric" }); } catch (e) { return ""; } }

  var css = document.createElement("style");
  css.textContent = [
    "#bbAuth{position:fixed;inset:0;z-index:100;display:flex;align-items:center;justify-content:center;padding:20px;background:var(--desk-bg,#1c1814);background-color:#15110d;color:var(--desk-text,#f3eadf);font-family:var(--sans,sans-serif);overflow:auto}",
    "#bbAuth .bb-card{width:min(400px,100%);display:flex;flex-direction:column;gap:14px;text-align:center;padding:30px 24px;border:1px solid var(--chip-border,rgba(230,197,106,.3));border-radius:16px;background:var(--chip-bg,rgba(0,0,0,.25))}",
    "#bbAuth h1{margin:0;font-family:var(--serif,serif);font-size:30px;letter-spacing:.14em;color:var(--accent,#e6c56a)}",
    "#bbAuth p{margin:0;font-size:13px;opacity:.75;line-height:1.6}",
    "#bbAuth button,#bbAuth input{font:inherit;color:inherit;border-radius:10px;min-height:44px;padding:0 14px;border:1px solid var(--chip-border,rgba(230,197,106,.3));background:transparent}",
    "#bbAuth button{cursor:pointer}#bbAuth button.bb-main{background:var(--accent,#e6c56a);color:var(--on-accent,#1a140c);border-color:transparent;font-weight:600}",
    "#bbAuth input{text-align:left}#bbAuth .bb-msg{min-height:18px;font-size:13px}#bbAuth a{color:inherit}",
    "#bbBar{display:flex;flex-wrap:wrap;gap:6px 14px;justify-content:center;align-items:center;padding:8px 14px;font-size:13px;background:var(--chip-bg,rgba(0,0,0,.25));border-bottom:1px solid var(--chip-border,rgba(230,197,106,.3));color:var(--desk-text,#f3eadf);font-family:var(--sans,sans-serif)}",
    "#bbBar button{font:inherit;color:inherit;cursor:pointer;border:1px solid var(--chip-border,rgba(230,197,106,.3));background:transparent;border-radius:999px;padding:4px 12px;min-height:30px}",
    "#bbBar button.bb-main{background:var(--accent,#e6c56a);color:var(--on-accent,#1a140c);border-color:transparent;font-weight:600}",
    "#bbPay{position:fixed;inset:0;z-index:110;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(0,0,0,.55)}",
    "#bbPay .bb-card{width:min(360px,100%);display:flex;flex-direction:column;gap:10px;padding:24px 20px;border-radius:16px;background:#1d1812;color:#f3eadf;border:1px solid rgba(230,197,106,.3);font-family:var(--sans,sans-serif);text-align:center}",
    "#bbPay h2{margin:0;font-size:17px}#bbPay p{margin:0 0 4px;font-size:13px;opacity:.75;line-height:1.6}",
    "#bbPay button{font:inherit;min-height:46px;border-radius:10px;cursor:pointer;border:1px solid rgba(230,197,106,.3);background:transparent;color:inherit}",
    "#bbPay .bb-kakao{background:#fee500;color:#191919;border-color:transparent;font-weight:600}#bbPay .bb-toss{background:#0064ff;color:#fff;border-color:transparent;font-weight:600}",
    "#bbBar button.armed{border-color:var(--danger,#ff9d88);color:var(--danger,#ff9d88)}#bbBar .bb-mail{opacity:.7}#bbBar[data-plan=expired]{border-bottom-color:var(--danger,#ff9d88)}"
  ].join("\n");
  document.head.appendChild(css);

  // ---------- login screen ----------
  var authEl = null;
  function showAuth() {
    if (authEl) return;
    authEl = el("div"); authEl.id = "bbAuth";
    var card = el("div", "bb-card");
    var g = el("button", "bb-main", T("google")); g.type = "button";
    var form = el("form"); form.noValidate = true; form.style.cssText = "display:flex;flex-direction:column;gap:10px";
    var inp = el("input"); inp.type = "email"; inp.placeholder = T("email"); inp.autocomplete = "email"; inp.required = true; inp.id = "bbEmail";
    var go = el("button", null, T("send")); go.type = "submit";
    var msg = el("div", "bb-msg"); msg.setAttribute("aria-live", "polite");
    form.append(inp, go);
    var legal = el("p"); legal.append(T("agree") + " ");
    [[SITE_BASE + "legal/terms.html", "terms"], [SITE_BASE + "legal/privacy.html", "privacy"], [SITE_BASE + "legal/refund.html", "refund"]].forEach(function (x, i) { if (i) legal.append(" · "); var a = el("a", null, T(x[1])); a.href = x[0]; a.target = "_blank"; a.rel = "noopener"; legal.appendChild(a); });
    card.append(el("h1", null, T("title")), el("p", null, T("sub")), g, el("p", null, T("or")), form, msg, legal);
    authEl.appendChild(card); document.body.appendChild(authEl);
    g.addEventListener("click", function () { sb.auth.signInWithOAuth({ provider: "google", options: { redirectTo: location.origin + location.pathname } }); });
    form.addEventListener("submit", function (ev) {
      ev.preventDefault(); var v = inp.value.trim();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) { msg.textContent = T("bad"); return; }
      go.disabled = true; msg.textContent = T("loading");
      sb.auth.signInWithOtp({ email: v, options: { emailRedirectTo: location.origin + location.pathname } }).then(function (r) {
        go.disabled = false; msg.textContent = r.error ? T("err") : T("sent");
      });
    });
  }
  function hideAuth() { if (authEl) { authEl.remove(); authEl = null; } }

  // ---------- entitlement (trial / pass) ----------
  function compute(profile) {
    var now = Date.now(), trialEnd = profile && profile.trial_ends_at ? new Date(profile.trial_ends_at).getTime() : 0;
    var paidEnd = profile && profile.paid_until ? new Date(profile.paid_until).getTime() : 0;
    if (paidEnd > now && paidEnd > trialEnd) return { plan: "active", canWrite: true, periodEnd: profile.paid_until };
    if (trialEnd > now) return { plan: "trial", canWrite: true, daysLeft: Math.max(1, Math.ceil((trialEnd - now) / 86400000)) };
    return { plan: "expired", canWrite: false };
  }
  function loadEnt() {
    return sb.from("profiles").select("trial_ends_at,paid_until").eq("user_id", state.session.user.id).maybeSingle()
      .then(function (r) { state.ent = compute(r.data); applyEnt(); return state.ent; }).catch(function () { return state.ent; });
  }
  var barEl = null, armedDel = false, armedOut = false, armTimer = 0;
  function call(fn, body) {
    return sb.auth.getSession().then(function (r) {
      var tok = r.data.session && r.data.session.access_token;
      return fetch(C.SUPABASE_URL + "/functions/v1/" + fn, { method: "POST", headers: { Authorization: "Bearer " + tok, apikey: C.SUPABASE_ANON_KEY, "Content-Type": "application/json" }, body: JSON.stringify(body || {}) });
    }).then(function (res) { return res.json().then(function (j) { if (!res.ok) { var e = new Error(j && j.error || "fail"); e.detail = j; throw e; } return j; }); });
  }

  // ---------- pass purchase (Toss Payments: KakaoPay / TossPay, one-time) ----------
  var TOSS_SDK = "https://js.tosspayments.com/v2/standard";
  var tossReady = null;
  function loadToss() {
    if (window.TossPayments) return Promise.resolve(window.TossPayments);
    if (!tossReady) tossReady = new Promise(function (res, rej) { var s = document.createElement("script"); s.src = TOSS_SDK; s.onload = function () { res(window.TossPayments); }; s.onerror = function () { tossReady = null; rej(new Error("sdk")); }; document.head.appendChild(s); });
    return tossReady;
  }
  var payEl = null;
  function closePay() { if (payEl) { payEl.remove(); payEl = null; } }
  function openPay() {
    if (!C.TOSS_CLIENT_KEY || /YOUR_/.test(C.TOSS_CLIENT_KEY)) { toast(T("payNotReady")); return; }
    closePay();
    payEl = el("div"); payEl.id = "bbPay"; payEl.setAttribute("role", "dialog"); payEl.setAttribute("aria-modal", "true");
    var card = el("div", "bb-card");
    card.append(el("h2", null, T("payTitle") + " · " + priceLabel()), el("p", null, T("payNote")));
    [["KAKAOPAY", "bb-kakao", "kakao"], ["TOSSPAY", "bb-toss", "toss"]].forEach(function (x) {
      var b = el("button", x[1], T(x[2])); b.type = "button";
      b.addEventListener("click", function () { startPay(x[0], card); });
      card.appendChild(b);
    });
    var c = el("button", null, T("cancel")); c.type = "button"; c.addEventListener("click", closePay); card.appendChild(c);
    payEl.appendChild(card); document.body.appendChild(payEl);
    payEl.addEventListener("click", function (ev) { if (ev.target === payEl) closePay(); });
  }
  function startPay(easyPay, card) {
    Array.prototype.forEach.call(card.querySelectorAll("button"), function (b) { b.disabled = true; });
    var back = location.origin + location.pathname;
    Promise.all([call("create-order", { plan: "month" }), loadToss()]).then(function (r) {
      var o = r[0], payment = r[1](C.TOSS_CLIENT_KEY).payment({ customerKey: o.customerKey });
      return payment.requestPayment({
        method: "CARD", amount: { currency: "KRW", value: o.amount }, orderId: o.orderId, orderName: o.orderName,
        customerEmail: o.email || undefined, successUrl: back + "?pay=ok", failUrl: back + "?pay=fail",
        card: { flowMode: "DIRECT", easyPay: easyPay }
      });
    }).catch(function (e) {
      closePay();
      toast(e && /CANCEL/.test(e.code || "") ? T("payCanceled") : T("payFailed", (e && e.message) || ""));
    });
  }
  // 결제창에서 돌아왔을 때: 성공이면 서버에 승인을 요청하고, 실패면 이유를 알려줘요.
  function handlePayReturn() {
    var q = new URLSearchParams(location.search), pay = q.get("pay");
    if (!pay) return;
    history.replaceState(null, "", location.pathname);
    if (pay === "fail") { toast(/CANCEL/.test(q.get("code") || "") ? T("payCanceled") : T("payFailed", q.get("message") || "")); return; }
    toast(T("paid"));
    call("confirm-payment", { paymentKey: q.get("paymentKey"), orderId: q.get("orderId"), amount: Number(q.get("amount")) })
      .then(function (j) { loadEnt(); toast(T("paidOk", fmtDate(j.paidUntil))); })
      .catch(function (e) { loadEnt(); toast(T("payFailed", (e.detail && e.detail.message) || T("failed"))); });
  }
  function priceLabel() { return lang() === "en" ? C.PRICE_LABEL_EN : C.PRICE_LABEL_KO; }
  function toast(m) { if (window.BB_APP) window.BB_APP.toast(m); }
  function renderBar() {
    if (!state.session) return;
    if (!barEl) { barEl = el("div"); barEl.id = "bbBar"; document.body.insertBefore(barEl, document.body.firstChild); }
    var e = state.ent; barEl.textContent = ""; barEl.dataset.plan = e ? e.plan : "";
    var label = !e ? T("loading") : e.plan === "trial" ? (e.daysLeft <= 1 ? T("trialLast") : T("trial", e.daysLeft)) : e.plan === "expired" ? T("expired") : T("activeEnd", fmtDate(e.periodEnd));
    barEl.appendChild(el("span", null, label));
    if (e) { var s = el("button", e.plan === "active" ? null : "bb-main", (e.plan === "active" ? T("extend") : T("buy")) + " · " + priceLabel()); s.type = "button"; s.addEventListener("click", openPay); barEl.appendChild(s); }
    barEl.appendChild(el("span", "bb-mail", state.session.user.email || ""));
    var out = el("button", null, T("logout")); out.type = "button"; out.addEventListener("click", function () {
      if (window.BB_APP && window.BB_APP.hasUnsaved() && !armedOut) { armedOut = true; out.textContent = T("unsavedLogout"); out.classList.add("armed"); clearTimeout(armTimer); armTimer = setTimeout(renderBar, 5000); return; }
      logout();
    });
    var del = el("button", null, T("del")); del.type = "button"; del.addEventListener("click", function () {
      if (!armedDel) { armedDel = true; del.textContent = T("delSure"); del.classList.add("armed"); clearTimeout(armTimer); armTimer = setTimeout(function () { armedDel = false; renderBar(); }, 5000); return; }
      call("delete-account").then(function () { clearLocal(); sb.auth.signOut().then(function () { alert(T("deleted")); location.reload(); }); }).catch(function () { toast(T("failed")); });
    });
    barEl.append(out, del); armedDel = false; armedOut = false;
  }
  function clearLocal() { window.BB_NOSAVE = true; try { var suf = window.BB_SUFFIX; if (suf) { for (var i = localStorage.length - 1; i >= 0; i--) { var k = localStorage.key(i); if (k && k.indexOf(":" + suf) > 0) localStorage.removeItem(k); } } } catch (e) {} }
  function logout() { clearLocal(); sb.auth.signOut().then(function () { location.reload(); }); }
  function applyEnt() { renderBar(); if (window.BB_APP && state.ent) window.BB_APP.setReadOnly(!state.ent.canWrite); }
  window.addEventListener("bb-app-ready", function () { if (state.ent) applyEnt(); });
  window.addEventListener("bb-lang", function () { if (authEl) { authEl.remove(); authEl = null; showAuth(); } closePay(); renderBar(); });

  // ---------- storage provider: same shape the app expects ----------
  var docsApi = {
    col: function () {
      var uid = state.session.user.id;
      function toDocs(rows) { return rows.map(function (r) { return { id: r.id, exists: true, data: function () { return JSON.parse(JSON.stringify(r.data)); } }; }); }
      function all() { return sb.from("docs").select("id,data").eq("user_id", uid).then(function (r) { if (r.error) throw r.error; return { docs: toDocs(r.data || []) }; }); }
      return {
        get: all,
        doc: function (id) {
          return {
            set: function (data) { return sb.from("docs").upsert({ user_id: uid, id: id, data: data, updated_at: new Date().toISOString() }).then(function (r) { if (r.error) { var e = new Error(r.error.message); e.code = /row-level|policy/i.test(r.error.message) ? "permission_denied" : r.error.code === "54000" || /too large/i.test(r.error.message) ? "invalid_argument" : "unavailable"; throw e; } }); },
            delete: function () { return sb.from("docs").delete().eq("user_id", uid).eq("id", id).then(function (r) { if (r.error) throw r.error; }); }
          };
        },
        onSnapshot: function (cb) {
          var timer = 0;
          function fire() { clearTimeout(timer); timer = setTimeout(function () { all().then(function (snap) { snap.metadata = { hasPendingWrites: false, fromCache: false }; cb(snap); }).catch(function () {}); }, 400); }
          var ch = sb.channel("docs-" + uid).on("postgres_changes", { event: "*", schema: "public", table: "docs", filter: "user_id=eq." + uid }, fire).subscribe();
          return function () { sb.removeChannel(ch); };
        }
      };
    }
  };
  var connectResolvers = [];
  window.BB_PROVIDER = { connect: function () { return new Promise(function (res) { if (state.session) res(docsApi.col()); else connectResolvers.push(res); }); } };

  function onSession(session) {
    var had = !!state.session;
    state.session = session;
    if (!session) { showAuth(); return; }
    hideAuth();
    if (!had) {
      if (window.BB_SUFFIX !== session.user.id) { window.BB_SUFFIX = session.user.id; location.reload(); return; } // 앱을 이 사용자의 보관함으로 다시 시작
      connectResolvers.splice(0).forEach(function (r) { r(docsApi.col()); });
      loadEnt().then(handlePayReturn);
      setInterval(loadEnt, 5 * 60 * 1000);
      window.addEventListener("focus", loadEnt);
    }
  }
  sb.auth.getSession().then(function (r) { onSession(r.data.session); });
  sb.auth.onAuthStateChange(function (ev, session) { if (ev === "SIGNED_OUT") { state.session = null; showAuth(); } else if (session && !state.session) onSession(session); else if (session) state.session = session; });
  // 앱 화면은 로그인 전에는 가려 둡니다.
  showAuth();
})();
