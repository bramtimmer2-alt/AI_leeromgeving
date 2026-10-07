/*
 * Kompas AI – gedeelde sitecode
 * Header en menu, instellingen in de pagina, tracking (dataLayer + UTM),
 * de gedeelde configuratie (localStorage) en kleine hulpfuncties.
 */
(function (K) {
  'use strict';
  const doc = document, core = K.core, C = K.config;
  const $ = (s, r) => (r || doc).querySelector(s);
  const $$ = (s, r) => Array.prototype.slice.call((r || doc).querySelectorAll(s));
  const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, ch => ESC[ch]);
  const get = (o, path) => path.split('.').reduce((a, k) => (a == null ? a : a[k]), o);
  const str = v => String(v == null ? '' : v).trim();
  const reducedMotion = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const page = doc.body.getAttribute('data-page') || '';

  /* ── Tracking ───────────────────────────────────────────────────────
     track(event, data) pusht naar window.dataLayer, aangevuld met UTM-waarden
     (bewaard in sessionStorage 'kompas-utm'). Klaar voor een tag manager. */
  let utm = {};
  try {
    const q = new URLSearchParams(location.search), u = {};
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'].forEach(k => { if (q.get(k)) u[k] = q.get(k); });
    if (Object.keys(u).length) sessionStorage.setItem('kompas-utm', JSON.stringify(u));
    utm = JSON.parse(sessionStorage.getItem('kompas-utm') || '{}') || {};
  } catch (e) { utm = {}; }
  function track(ev, data) {
    try { window.dataLayer = window.dataLayer || []; window.dataLayer.push({ event: ev, ...(data || {}), ...utm }); } catch (e) { /* ignore */ }
  }

  /* ── Gedeelde configuratie (localStorage 'kompas-site-v4' → { cfg, touched }) ── */
  const KEY = 'kompas-site-v4';
  function loadState() {
    let s = {};
    try { s = JSON.parse(localStorage.getItem(KEY) || localStorage.getItem('kompas-site-v3') || '{}') || {}; } catch (e) { s = {}; }
    const base = core.exCfg('kickstart');
    const sc = s.cfg && typeof s.cfg === 'object' ? s.cfg : null;
    const cfg = sc ? {
      ...base, ...sc,
      toets: { ...base.toets, ...(sc.toets || {}) }, extras: { ...base.extras, ...(sc.extras || {}) }, ander: { ...base.ander, ...(sc.ander || {}) },
      lp: sc.lp && typeof sc.lp === 'object' ? { ...sc.lp } : base.lp, custom: sc.custom || {}, placed: sc.placed || {}
    } : base;
    // Een startdatum in het verleden schuift door naar de eerstvolgende maandag.
    const today = new Date(); today.setHours(0, 0, 0, 0);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(cfg.start)) || core.parse(cfg.start) < today) { cfg.start = core.nextMonday(); cfg.custom = {}; cfg.placed = {}; }
    if (!cfg.lpManual && core.lpSumOf(cfg) !== cfg.emp) Object.assign(cfg, core.lpDist(cfg, cfg.emp));
    return { cfg, touched: !!s.touched };
  }
  let state = loadState(), trackedPrice = false;
  const subs = [];
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify({ cfg: state.cfg, touched: state.touched })); } catch (e) { /* ignore */ } };
  const emit = () => subs.forEach(fn => { try { fn(state); } catch (e) { console.error(e); } });
  const store = {
    get cfg() { return state.cfg; },
    get touched() { return state.touched; },
    subscribe(fn) { subs.push(fn); },
    // Wijziging door de bezoeker; { touch: false } voor automatische aanpassingen.
    set(patch, opt) {
      const touch = !(opt && opt.touch === false);
      if (touch && !trackedPrice) { trackedPrice = true; track('prijs_interactie'); }
      const next = typeof patch === 'function' ? patch(state.cfg) : patch;
      state = { cfg: { ...state.cfg, ...next }, touched: touch ? true : state.touched };
      save(); emit();
    },
    replace(cfg, touched) { state = { cfg, touched: touched === undefined ? state.touched : !!touched }; save(); emit(); }
  };
  window.addEventListener('storage', e => { if (e.key === KEY) { state = loadState(); emit(); } });

  /* ── Navigatie ──────────────────────────────────────────────────── */
  const TYPE_SLUG = { 'Kennismaking': 'kennismaking', 'Offerte': 'offerte', 'Groot voorstel': 'groot-voorstel', 'Live demo': 'live-demo', 'Founding partner': 'founding-partner', 'Leerpad op aanvraag': 'leerpad-op-aanvraag' };
  const contactUrl = type => 'contact.html' + (type ? '?type=' + (TYPE_SLUG[type] || 'kennismaking') : '');
  function goExample(key) {
    if (!core.EX[key]) return;
    const cfg = core.cfgC(core.exCfg(key, state.cfg.start));
    store.replace(cfg, true);
    if (typeof K.onExampleInPage === 'function') K.onExampleInPage(key);
    else location.href = 'pakketten.html#configurator';
  }
  function scrollToEl(el, focusSel) {
    if (!el) return;
    const header = $('[data-header]'), h = header ? header.offsetHeight : 72;
    const top = el.getBoundingClientRect().top + window.scrollY - h - 16;
    try { window.scrollTo({ top, behavior: reducedMotion() ? 'auto' : 'smooth' }); } catch (e) { window.scrollTo(0, top); }
    const f = focusSel === false ? null : (focusSel && typeof focusSel !== 'string' ? focusSel : el.querySelector(focusSel || 'input,button,select,textarea,a[href],[tabindex]'));
    if (f) { try { f.focus({ preventScroll: true }); } catch (e) { /* ignore */ } }
  }

  /* ── Binden van waarden aan de pagina ─────────────────────────────
     data-text="pad"  → tekst · data-show="pad" → zichtbaar · data-attr="naam:pad;…"
     data-style="--var:pad" · data-list="pad" → HTML (met behoud van focus via data-fk) */
  function renderHTML(el, html) {
    const a = doc.activeElement, key = a && a !== doc.body && el.contains(a) ? a.getAttribute('data-fk') : null;
    el.innerHTML = html;
    if (key) {
      const n = el.querySelector('[data-fk="' + (window.CSS && CSS.escape ? CSS.escape(key) : key) + '"]');
      if (n) { try { n.focus({ preventScroll: true }); } catch (e) { /* ignore */ } }
    }
  }
  function bind(root, vals) {
    $$('[data-text]', root).forEach(el => { const v = get(vals, el.getAttribute('data-text')); const s = v == null ? '' : String(v); if (el.textContent !== s) el.textContent = s; });
    $$('[data-show]', root).forEach(el => { const on = !!get(vals, el.getAttribute('data-show')); if (el.hidden === on) el.hidden = !on; });
    $$('[data-attr]', root).forEach(el => {
      el.getAttribute('data-attr').split(';').forEach(pair => {
        const i = pair.indexOf(':'); if (i < 0) return;
        const name = pair.slice(0, i).trim(), v = get(vals, pair.slice(i + 1).trim());
        if (name === 'value') { const s = String(v == null ? '' : v); if (el.value !== s) el.value = s; return; }
        if (name.indexOf('aria-') === 0) { if (v == null) el.removeAttribute(name); else if (el.getAttribute(name) !== String(v)) el.setAttribute(name, String(v)); return; }
        if (v === false || v == null) { if (el.hasAttribute(name)) el.removeAttribute(name); return; }
        const s = v === true ? '' : String(v); if (el.getAttribute(name) !== s) el.setAttribute(name, s);
      });
    });
    $$('[data-style]', root).forEach(el => {
      el.getAttribute('data-style').split(';').forEach(pair => { const i = pair.indexOf(':'); if (i < 0) return; const v = get(vals, pair.slice(i + 1).trim()); el.style.setProperty(pair.slice(0, i).trim(), v == null ? '' : String(v)); });
    });
    $$('[data-list]', root).forEach(el => { const v = get(vals, el.getAttribute('data-list')); const s = v == null ? '' : String(v); if (el._html !== s) { renderHTML(el, s); el._html = s; } });
  }
  // Delegeert klikken op [data-action] binnen root naar de functies in actions.
  function actions(root, map) {
    root.addEventListener('click', e => {
      const b = e.target.closest('[data-action]');
      if (!b || !root.contains(b) || b.disabled || b.getAttribute('aria-disabled') === 'true') return;
      const fn = map[b.getAttribute('data-action')];
      if (fn) { e.preventDefault(); fn(b.getAttribute('data-arg'), b, e); }
    });
  }

  /* ── Header en menu ─────────────────────────────────────────────── */
  function initHeader() {
    const header = $('[data-header]'); if (!header) return;
    const toggle = $('[data-menu-toggle]', header), menu = $('#mobiel-menu');
    const setOpen = open => {
      if (!toggle || !menu) return;
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Menu sluiten' : 'Menu openen');
      menu.hidden = !open;
      header.classList.toggle('menu-open', open);
    };
    if (toggle) toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
    doc.addEventListener('keydown', e => {
      if (e.key === 'Escape' && toggle && toggle.getAttribute('aria-expanded') === 'true') { setOpen(false); toggle.focus(); }
    });
    if (window.matchMedia) {
      const mq = window.matchMedia('(min-width: 1100px)'), onMq = () => { if (mq.matches) setOpen(false); };
      if (mq.addEventListener) mq.addEventListener('change', onMq); else if (mq.addListener) mq.addListener(onMq);
    }
    const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 4);
    window.addEventListener('scroll', onScroll, { passive: true }); onScroll();
    $$('[data-nav]').forEach(a => { if (a.getAttribute('data-nav') === page) a.setAttribute('aria-current', 'page'); });
  }

  /* ── Instellingen in de pagina ─────────────────────────────────── */
  function initConfigContent() {
    const each = (sel, fn) => $$(sel).forEach(fn);
    each('[data-bind="chatReactietijd"]', el => { el.textContent = core.reactietijd(); });
    each('[data-bind="vrijblijvend"]', el => { el.textContent = core.vrijblijvend(); });
    each('[data-bind="contactReactietijd"]', el => { el.textContent = core.contactRt(); });
    each('[data-if="contactReactietijd"]', el => { el.hidden = !core.contactRt(); });

    const email = str(C.contactEmail);
    each('[data-email]', el => { if (!email) return; if (el.tagName === 'A') el.href = 'mailto:' + email; if (!el.hasAttribute('data-keep-text')) el.textContent = email; });
    each('[data-if="contactEmail"]', el => { el.hidden = !email; });
    each('[data-if-not="contactEmail"]', el => { el.hidden = !!email; });

    const portal = str(C.portaalUrl);
    each('[data-login]', el => { if (portal) { el.href = portal; el.hidden = false; } else el.hidden = true; });
    const li = str(C.linkedinUrl);
    each('[data-linkedin]', el => { if (li) { el.href = li; el.hidden = false; } else el.hidden = true; });

    const reg = [str(C.kvkNummer) ? 'KvK ' + str(C.kvkNummer) : '', str(C.btwNummer) ? 'Btw ' + str(C.btwNummer) : '', str(C.adres)].filter(Boolean).join(' · ');
    each('[data-bedrijfsregel]', el => { el.textContent = reg; el.hidden = !reg; });
    each('[data-legal="kvk"]', el => { if (str(C.kvkNummer)) { el.textContent = str(C.kvkNummer); el.classList.remove('todo'); } });
    each('[data-legal="adres"]', el => { if (str(C.adres)) { el.textContent = str(C.adres); el.classList.remove('todo'); } });
    each('[data-founding]', el => { el.hidden = C.showFounding === false; });

    const bron = str(C.kvkBron);
    each('[data-kvk-stat]', el => { el.hidden = !bron; });
    each('[data-bind="kvkBron"]', el => { el.textContent = bron; });
    each('[data-stats]', el => { el.classList.toggle('stats--3', !!bron); });
    const datum = str(C.vergelijkingDatum);
    each('[data-bind="cmpDatum"]', el => { el.textContent = datum ? ', ' + datum : ''; });

    const l = core.limits();
    each('[data-bind="maxWd"]', el => { el.textContent = String(l.maxWd); });
    each('[data-bind="pilotNote"]', el => { el.textContent = l.pilot ? ' in de pilotfase' : ''; });
    each('[data-if="pilot"]', el => { el.hidden = !l.pilot; });

    // Leerpaden-chips volgen de instelling leerpadOpties.
    const names = core.lpNames();
    each('[data-leerpaden]', row => {
      const cur = $$('[data-lp]', row).map(el => el.textContent.trim());
      if (cur.join('|') === names.join('|')) return;
      $$('[data-lp]', row).forEach(el => el.remove());
      const before = row.firstChild, cls = row.getAttribute('data-leerpaden') || 'chip';
      names.forEach(n => { const s = doc.createElement('span'); s.className = cls; s.setAttribute('data-lp', ''); s.textContent = n; row.insertBefore(s, before); });
    });

    // Prijsanker: Kickstart-prijs per medewerker per week, berekend uit de tarieven.
    if ($('[data-anchor]')) {
      const { c, P, k } = core.compute(core.exCfg('kickstart'));
      const v = { pw: core.eur(k.total / c.emp / P.weken), emp: c.emp, weeks: P.weken, total: core.eur(k.total) };
      each('[data-anchor]', el => { const key = el.getAttribute('data-anchor'); if (v[key] != null) el.textContent = String(v[key]); });
    }
    each('[data-year]', el => { el.textContent = String(new Date().getFullYear()); });
  }

  /* ── Onthullen bij scrollen ────────────────────────────────────── */
  function initReveal() {
    $$('[data-stagger]').forEach(p => { Array.prototype.forEach.call(p.children, (ch, i) => { ch.classList.add('reveal'); ch.style.setProperty('--d', String(i)); }); });
    const els = $$('.reveal');
    doc.documentElement.classList.add('reveal-ready');
    if (!els.length) return;
    if (!('IntersectionObserver' in window) || reducedMotion()) { els.forEach(el => el.classList.add('is-visible')); return; }
    const io = new IntersectionObserver(entries => {
      entries.forEach(en => { if (en.isIntersecting) { en.target.classList.add('is-visible'); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.06 });
    els.forEach(el => io.observe(el));
  }

  /* ── Klikgedrag dat overal geldt ───────────────────────────────── */
  function initClicks() {
    doc.addEventListener('click', e => {
      const cta = e.target.closest('[data-cta]');
      if (cta) track('cta_aanvraag', { type: cta.getAttribute('data-cta'), pagina: page });
      const ex = e.target.closest('[data-example]');
      if (ex) { e.preventDefault(); goExample(ex.getAttribute('data-example')); return; }
      const d = e.target.closest('[data-disclosure]');
      if (d) {
        const target = doc.getElementById(d.getAttribute('aria-controls')); if (!target) return;
        const open = d.getAttribute('aria-expanded') !== 'true';
        d.setAttribute('aria-expanded', String(open)); target.hidden = !open;
      }
    });
  }

  Object.assign(K, { $, $$, esc, get, str, track, utm: () => ({ ...utm }), store, TYPE_SLUG, contactUrl, goExample, scrollToEl, bind, renderHTML, actions, page, reducedMotion });

  initHeader();
  initConfigContent();
  initClicks();
  initReveal();
})(window.Kompas = window.Kompas || {});
