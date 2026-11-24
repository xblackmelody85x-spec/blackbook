/* 블랙북 서비스 계층: 로그인(구글·이메일), 계정 저장소(Supabase), 체험·구독 상태, 읽기 전용 전환.
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
      trial: "무료 체험 {0}일 남았어요", trialLast: "무료 체험이 오늘 끝나요", expired: "무료 체험이 끝났어요. 읽기와 내려받기는 계속 돼요.", active: "구독 중", activeEnd: "구독 중 · {0}까지",
      activeCancel: "해지 예정 · {0}까지 쓸 수 있어요", subscribe: "구독하기", manage: "구독 관리", logout: "로그아웃", del: "계정 삭제", delSure: "한 번 더 누르면 계정과 모든 책이 지워져요",
      price: "{0}", unsavedLogout: "저장 안 된 변경이 있어요. 한 번 더 누르면 로그아웃하고 이 기기의 임시 글이 지워져요", loading: "불러오는 중…", paid: "결제해 주셔서 고마워요. 반영 중이에요…",
      deleted: "계정을 삭제했어요.", failed: "요청에 실패했어요. 잠시 뒤에 다시 해 주세요."
    },
    en: {
      title: "Blackbook", sub: "A place to write your own book", google: "Continue with Google", or: "or", email: "Email address", send: "Email me a sign-in link",
      sent: "We sent an email. Open the link in it to sign in.", bad: "Please check the email address.", err: "Something went wrong. Please try again in a moment.",
      agree: "By continuing you agree to the Terms of Service and the Privacy Policy.", terms: "Terms", privacy: "Privacy", refund: "Refunds",
      trial: "{0} days left in your free trial", trialLast: "Your free trial ends today", expired: "Your free trial has ended. Reading and downloading still work.", active: "Subscribed", activeEnd: "Subscribed · until {0}",
      activeCancel: "Cancels on {0} · you can write until then", subscribe: "Subscribe", manage: "Manage subscription", logout: "Log out", del: "Delete account", delSure: "Press again to delete your account and all books",
      price: "{0}", unsavedLogout: "You have unsaved changes. Press again to log out and erase this device's draft", loading: "Loading…", paid: "Thank you. Applying your payment…",
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

  // ---------- entitlement (trial / subscription) ----------
  function compute(profile, sub) {
    var now = Date.now(), trialEnd = profile && profile.trial_ends_at ? new Date(profile.trial_ends_at).getTime() : 0;
    var subEnd = sub && sub.current_period_end ? new Date(sub.current_period_end).getTime() : 0;
    var subOk = !!sub && (sub.status === "active" || sub.status === "trialing") && subEnd + 86400000 > now;
    if (subOk) return { plan: "active", canWrite: true, periodEnd: sub.current_period_end, cancelAtEnd: !!sub.cancel_at_period_end };
    if (trialEnd > now) return { plan: "trial", canWrite: true, daysLeft: Math.max(1, Math.ceil((trialEnd - now) / 86400000)) };
    return { plan: "expired", canWrite: false };
  }
  function loadEnt() {
    var uid = state.session.user.id;
    return Promise.all([
      sb.from("profiles").select("trial_ends_at").eq("user_id", uid).maybeSingle(),
      sb.from("subscriptions").select("status,current_period_end,cancel_at_period_end").eq("user_id", uid).maybeSingle()
    ]).then(function (r) { state.ent = compute(r[0].data, r[1].data); applyEnt(); return state.ent; }).catch(function () { return state.ent; });
  }
  var barEl = null, armedDel = false, armedOut = false, armTimer = 0;
  function call(fn) {
    return sb.auth.getSession().then(function (r) {
      var tok = r.data.session && r.data.session.access_token;
      return fetch(C.SUPABASE_URL + "/functions/v1/" + fn, { method: "POST", headers: { Authorization: "Bearer " + tok, apikey: C.SUPABASE_ANON_KEY, "Content-Type": "application/json" }, body: JSON.stringify({ lang: lang(), returnTo: location.origin + location.pathname }) });
    }).then(function (res) { return res.json().then(function (j) { if (!res.ok) throw new Error(j && j.error || "fail"); return j; }); });
  }
  function toast(m) { if (window.BB_APP) window.BB_APP.toast(m); }
  function renderBar() {
    if (!state.session) return;
    if (!barEl) { barEl = el("div"); barEl.id = "bbBar"; document.body.insertBefore(barEl, document.body.firstChild); }
    var e = state.ent; barEl.textContent = ""; barEl.dataset.plan = e ? e.plan : "";
    var label = !e ? T("loading") : e.plan === "trial" ? (e.daysLeft <= 1 ? T("trialLast") : T("trial", e.daysLeft)) : e.plan === "expired" ? T("expired") : (e.cancelAtEnd ? T("activeCancel", fmtDate(e.periodEnd)) : T("activeEnd", fmtDate(e.periodEnd)));
    barEl.appendChild(el("span", null, label));
    if (e && e.plan !== "active") { var s = el("button", "bb-main", T("subscribe") + " · " + (lang() === "en" ? C.PRICE_LABEL_EN : C.PRICE_LABEL_KO)); s.type = "button"; s.addEventListener("click", function () { s.disabled = true; call("create-checkout").then(function (j) { location.href = j.url; }).catch(function () { s.disabled = false; toast(T("failed")); }); }); barEl.appendChild(s); }
    if (e && e.plan === "active") { var m = el("button", null, T("manage")); m.type = "button"; m.addEventListener("click", function () { call("create-portal").then(function (j) { location.href = j.url; }).catch(function () { toast(T("failed")); }); }); barEl.appendChild(m); }
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
  window.addEventListener("bb-lang", function () { if (authEl) { authEl.remove(); authEl = null; showAuth(); } renderBar(); });

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
      loadEnt().then(function () {
        if (/[?&]paid=1/.test(location.search)) { toast(T("paid")); var n = 0, iv = setInterval(function () { loadEnt().then(function (e) { if ((e && e.plan === "active") || ++n > 10) { clearInterval(iv); history.replaceState(null, "", location.pathname); } }); }, 2500); }
      });
      setInterval(loadEnt, 5 * 60 * 1000);
      window.addEventListener("focus", loadEnt);
    }
  }
  sb.auth.getSession().then(function (r) { onSession(r.data.session); });
  sb.auth.onAuthStateChange(function (ev, session) { if (ev === "SIGNED_OUT") { state.session = null; showAuth(); } else if (session && !state.session) onSession(session); else if (session) state.session = session; });
  // 앱 화면은 로그인 전에는 가려 둡니다.
  showAuth();
})();
