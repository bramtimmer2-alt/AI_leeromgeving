/*
 * Kompas AI – contact- en offerteformulier
 * Gedrag per aanvraagtype (OVERDRACHT §4):
 *  - Kennismaking, Live demo, Founding partner: optionele interesse in leerpaden;
 *    'Stuur mijn configuratie mee' alleen als de bezoeker de configurator heeft gebruikt.
 *  - Offerte, Groot voorstel, Leerpad op aanvraag: leerpaden gekoppeld aan de configuratie,
 *    die altijd meegaat, met samenvatting en planning.
 */
(function (K) {
  'use strict';
  const root = document.getElementById('main'), formEl = document.getElementById('aanvraag');
  if (!root || !formEl) return;
  const core = K.core, store = K.store, forms = K.forms, esc = K.esc;
  const $ = id => document.getElementById(id);

  const TYPES_B = ['Offerte', 'Groot voorstel', 'Leerpad op aanvraag'];
  const VISIBLE = ['Kennismaking', 'Offerte', 'Live demo'];
  const SLUG_TYPE = {}; Object.keys(K.TYPE_SLUG).forEach(t => { SLUG_TYPE[K.TYPE_SLUG[t]] = t; });
  const FIELDS = ['bedrijf', 'naam', 'email', 'telefoon', 'bericht'];
  const VALID = { bedrijf: v => !!v.trim(), naam: v => !!v.trim(), email: v => forms.EMAIL_RE.test(v.trim()) };

  let type = SLUG_TYPE[new URLSearchParams(location.search).get('type')] || 'Kennismaking';
  const d = forms.draft.get();
  let form = { bedrijf: d.bedrijf || '', naam: d.naam || '', email: d.email || '', telefoon: d.telefoon || '', bericht: d.bericht || '', lpInteresse: Array.isArray(d.lpInteresse) ? d.lpInteresse : [], config: false };
  let errors = {};
  const ui = { showPlan: false, sending: false, sendError: '', sent: null, view: 'form' };
  let formPlanner = null, sentPlanner = null;
  const isB = () => TYPES_B.includes(type);

  function vals() {
    const b = isB(), { c, P, k } = core.compute(store.cfg), l = core.limits();
    const sm = core.summary(c, P), names = core.lpNames();
    const pressed = on => ' aria-pressed="' + !!on + '"';
    const types = VISIBLE.concat(VISIBLE.includes(type) ? [] : [type]);
    return {
      testMode: forms.testMode(),
      formTypes: types.map(tp => '<button type="button" class="chip chip--md" data-action="setType" data-arg="' + esc(tp) + '" data-fk="type-' + K.TYPE_SLUG[tp] + '"' + pressed(type === tp) + '>' + esc(tp) + '</button>').join(''),
      isA: !b, isB: b,
      lpChips: names.map((nm, i) => '<button type="button" class="chip chip--md" data-action="lpToggle" data-arg="' + esc(nm) + '" data-fk="clp-' + i + '"' + pressed(nm in (c.lp || {})) + '>' + esc(nm) + '</button>').join('')
        + '<button type="button" class="chip chip--md chip--dashed" data-action="anderToggle" data-fk="clp-ander"' + pressed(c.ander.on) + '>Ander leerpad: op aanvraag</button>',
      lpiChips: names.map((nm, i) => '<button type="button" class="chip chip--md" data-action="lpiToggle" data-arg="' + esc(nm) + '" data-fk="lpi-' + i + '"' + pressed(form.lpInteresse.includes(nm)) + '>' + esc(nm) + '</button>').join(''),
      anderField: b && !!c.ander.on,
      err: { bedrijf: !!errors.bedrijf, naam: !!errors.naam, email: !!errors.email },
      ai: { bedrijf: String(!!errors.bedrijf), naam: String(!!errors.naam), email: String(!!errors.email) },
      ad: { bedrijf: errors.bedrijf ? 'f-bedrijf-fout' : null, naam: errors.naam ? 'f-naam-fout' : null, email: errors.email ? 'f-email-fout' : null },
      hasErrors: Object.keys(errors).length > 0, sendError: ui.sendError, sending: ui.sending, submitLabel: ui.sending ? 'Versturen…' : 'Verstuur aanvraag',
      showCfgOpt: !b && store.touched,
      cfg: c, groot: c.emp > l.groot,
      summaryRows: [['Medewerkers', String(c.emp)], ['Leerpaden', core.lpSummaryOf(c)], ['Looptijd', P.weken + ' weken (' + c.werkdagen + ' werkdagen) · ' + core.fmtD(P.first) + ' – ' + core.fmtD(P.last)], ['Leren', sm.leren], ['Vragen', sm.vragen], ['Toetsen', sm.toetsen], ['Extra’s', sm.extras]]
        .map(([kk, v]) => '<div><dt>' + kk + '</dt><dd>' + esc(v) + '</dd></div>').join(''),
      totalFmt: core.eur(k.total), perEmpFmt: core.eur(k.perEmp),
      showPlan: b && ui.showPlan, planExp: String(ui.showPlan), planLabel: ui.showPlan ? 'Verberg planning' : 'Bekijk volledige planning',
      sent: ui.sent || {}, sentA: !!ui.sent && !ui.sent.isB, sentB: !!ui.sent && ui.sent.isB,
      lpSummary: core.lpSummaryOf(c), emp: c.emp, werkdagen: c.werkdagen, leren: sm.leren,
      plan: { days: P.days, first: P.first, last: P.last, start: c.start, weekend: !!c.weekend, werkdagen: c.werkdagen, canEind: !!c.toets.eind, canPraktijk: !!c.toets.praktijk }
    };
  }

  function update() {
    const v = vals();
    K.bind(root, v);
    const fa = $('f-ander');
    if (fa && document.activeElement !== fa && fa.value !== (v.cfg.ander.tekst || '')) fa.value = v.cfg.ander.tekst || '';
    const fc = $('f-config'); if (fc) fc.checked = !!form.config;
    root.querySelectorAll('[data-view]').forEach(el => { el.hidden = el.getAttribute('data-view') !== ui.view; });
    if (v.showPlan && ui.view === 'form') {
      if (!formPlanner) formPlanner = new K.Planner(root.querySelector('[data-planner="form"]'), { editable: false });
      formPlanner.update(v.plan);
    }
    if (ui.view === 'sent' && v.sentB) {
      if (!sentPlanner) sentPlanner = new K.Planner(root.querySelector('[data-planner="sent"]'), { editable: false });
      sentPlanner.update(v.plan);
    }
  }

  function fillInputs() { FIELDS.forEach(k => { const el = $('f-' + k); if (el) el.value = form[k]; }); }
  const urlFor = (tp, hash) => location.pathname + '?type=' + K.TYPE_SLUG[tp] + (hash || '');
  function ensureAnder() {
    if (!store.cfg.ander.on) store.set(cc => { const ander = { ...cc.ander, on: true, n: core.avgW(cc) }; return { ander, ...core.lpDist({ ...cc, ander }, cc.emp) }; }, { touch: false });
  }
  function setType(tp) {
    type = tp;
    if (!TYPES_B.includes(tp)) form.config = false;
    try { history.replaceState(history.state, '', urlFor(tp)); } catch (e) { /* ignore */ }
    if (tp === 'Leerpad op aanvraag') ensureAnder();
    update();
  }
  function focusField(el) {
    const header = document.querySelector('[data-header]'), h = header ? header.offsetHeight : 72;
    try { window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - h - 56, behavior: K.reducedMotion() ? 'auto' : 'smooth' }); } catch (e) { /* ignore */ }
    try { el.focus({ preventScroll: true }); } catch (e) { /* ignore */ }
  }
  function showSent(push) {
    ui.view = 'sent';
    if (push) { try { history.pushState({ sent: true }, '', urlFor(type, '#bedankt')); } catch (e) { /* ignore */ } }
    update();
    window.scrollTo(0, 0);
    const h = $('bedankt-titel'); if (h) try { h.focus({ preventScroll: true }); } catch (e) { /* ignore */ }
  }

  function payload(withCfg) {
    const { c, r, P, k } = core.compute(store.cfg), sm = core.summary(c, P);
    const p = {
      type, _subject: 'Kompas AI · ' + type + ' · ' + form.bedrijf.trim(),
      bedrijf: form.bedrijf.trim(), naam: form.naam.trim(), email: form.email.trim(), telefoon: form.telefoon.trim(), bericht: form.bericht.trim(),
      leerpaden: isB() ? core.lpSummaryOf(c) : form.lpInteresse.join(', ')
    };
    if (withCfg) {
      p.configuratie = {
        medewerkers: c.emp, leerpaden: core.lpSummaryOf(c),
        looptijd: P.weken + ' weken (' + c.werkdagen + ' werkdagen) · ' + core.fmtD(P.first) + ' – ' + core.fmtD(P.last),
        leren: sm.leren, vragen: sm.vragen, toetsen: sm.toetsen, extras: sm.extras,
        prijsopbouw: k.items.map(i => i.label + ': ' + (i.amount == null ? i.note : core.eur(i.amount)) + ' (' + i.detail + ')'),
        totaal: core.eur(k.total) + ' excl. btw', perMedewerker: core.eur(k.perEmp),
        coachMinutenPerWeek: Math.round(k.coachMin), bovenCoachcapaciteit: k.coachMin / 60 > r.coachUren,
        cfg: c
      };
    }
    return p;
  }

  async function submit(e) {
    e.preventDefault();
    if (ui.sending) return;
    const errs = {};
    if (!VALID.bedrijf(form.bedrijf)) errs.bedrijf = true;
    if (!VALID.naam(form.naam)) errs.naam = true;
    if (!VALID.email(form.email)) errs.email = true;
    errors = errs; ui.sendError = '';
    const first = ['bedrijf', 'naam', 'email'].find(k => errs[k]);
    if (first) { K.track('formulier_fout', { velden: Object.keys(errs).join(',') }); update(); focusField($('f-' + first)); return; }
    const b = isB(), withCfg = b || (form.config && store.touched);
    ui.sending = true; update();
    try {
      // Honeypot: ingevuld door een bot? Dan doen we alsof, maar versturen niets.
      const res = $('f-website').value ? { ok: true, test: forms.testMode() } : await forms.send(payload(withCfg));
      K.track('formulier_verstuurd', { type, configuratie: withCfg });
      ui.sent = { type, naam: form.naam.trim(), bedrijf: form.bedrijf.trim(), test: !!res.test, isB: b, cfgSent: !b && withCfg };
      ui.sending = false;
      showSent(true);
    } catch (err) {
      const mail = K.str(K.config.contactEmail);
      ui.sendError = 'Versturen lukte niet. Controleer je verbinding en probeer het opnieuw' + (mail ? ', of mail naar ' + mail : '') + '.';
      ui.sending = false; update();
    }
  }

  function newForm() {
    forms.draft.clear();
    form = { bedrijf: '', naam: '', email: '', telefoon: '', bericht: '', lpInteresse: [], config: false };
    errors = {}; ui.sent = null; ui.view = 'form'; ui.showPlan = false; ui.sendError = '';
    type = 'Kennismaking';
    try { history.replaceState(null, '', urlFor(type)); } catch (e) { /* ignore */ }
    fillInputs(); update(); window.scrollTo(0, 0);
  }

  K.actions(root, {
    setType,
    lpToggle: name => store.set(cc => { const lp = { ...cc.lp }; if (name in lp) delete lp[name]; else lp[name] = core.avgW(cc); return { lp, ...core.lpDist({ ...cc, lp }, cc.emp) }; }),
    anderToggle: () => store.set(cc => { const ander = { ...cc.ander, on: !cc.ander.on, n: !cc.ander.on ? core.avgW(cc) : 0 }; return { ander, ...core.lpDist({ ...cc, ander }, cc.emp) }; }),
    lpiToggle: name => { const a = form.lpInteresse; form.lpInteresse = a.includes(name) ? a.filter(x => x !== name) : a.concat(name); forms.draft.set({ lpInteresse: form.lpInteresse }); update(); },
    togglePlan: () => { ui.showPlan = !ui.showPlan; update(); },
    newForm
  });

  FIELDS.forEach(k => {
    const el = $('f-' + k); if (!el) return;
    el.addEventListener('input', () => {
      form[k] = el.value; forms.draft.set({ [k]: el.value });
      if (errors[k] && VALID[k] && VALID[k](el.value)) { delete errors[k]; update(); }
    });
  });
  $('f-config').addEventListener('change', e => { form.config = e.target.checked; });
  $('f-ander').addEventListener('input', e => { const v = e.target.value; store.set(cc => ({ ander: { ...cc.ander, tekst: v } })); });
  formEl.addEventListener('submit', submit);
  window.addEventListener('popstate', () => {
    const t = SLUG_TYPE[new URLSearchParams(location.search).get('type')];
    if (location.hash === '#bedankt' && ui.sent) ui.view = 'sent';
    else { ui.view = 'form'; if (t) type = t; }
    update(); window.scrollTo(0, 0);
  });
  store.subscribe(update);

  // De bevestiging bestaat alleen direct na versturen; anders terug naar het formulier.
  if (location.hash === '#bedankt') { try { history.replaceState(null, '', urlFor(type)); } catch (e) { /* ignore */ } }
  if (type === 'Leerpad op aanvraag') ensureAnder();
  fillInputs();
  update();
})(window.Kompas = window.Kompas || {});
