/*
 * Kompas AI – configurator (Pakketten & prijzen)
 * Startkaarten, snelle modus en 'Alles zelf instellen', agenda, samenvatting met
 * prijsopbouw en de vaste prijsbalk op mobiel. Alle rekenwerk komt uit core.js.
 */
(function (K) {
  'use strict';
  const core = K.core, store = K.store, esc = K.esc, doc = document;
  const root = doc.getElementById('main');
  if (!root || !doc.querySelector('[data-cfg]')) return;

  const ui = { mode: K.config.startInSnelleModus === false ? 'alles' : 'snel', planOpen: false, empDraft: null };
  let planner = null, lastPlan = null;
  const CHECK = '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 6.2 5 8.6l4.5-5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const pct = (v, min, max) => (max > min ? Math.max(0, Math.min(100, (v - min) / (max - min) * 100)) : 0).toFixed(2) + '%';
  const n2 = i => String(i).padStart(2, '0');

  function vals() {
    const r = core.rates(), l = core.limits(), c = core.cfgC(store.cfg);
    const P = core.buildPlan(c, r), k = core.price(c, P, r);
    lastPlan = P;
    const snel = ui.mode === 'snel', IN = core.intens();
    const inKey = Object.keys(IN).find(kk => IN[kk].uitleg === c.uitleg && IN[kk].opdracht === c.opdracht && IN[kk].bellen === c.bellen && c.chat === 'standaard');
    const exKeys = core.examples();
    const exMatch = exKeys.find(key => core.same(c, core.cfgC(core.exCfg(key, c.start))));
    const isKickstart = core.same(c, core.cfgC(core.exCfg('kickstart', c.start)));
    const lpChosen = Object.keys(c.lp || {}), lpSum = core.lpSumOf(c), lpNone = !lpChosen.length && !c.ander.on;
    const groot = c.emp > l.groot;
    const sm = core.summary(c, P), lpSummary = core.lpSummaryOf(c);

    const stepDefs = snel
      ? [['stap-medewerkers', 'Medewerkers', String(c.emp)], ['stap-looptijd', 'Looptijd', P.weken + ' wk'], ['stap-intensiteit', 'Intensiteit', inKey ? IN[inKey].label : 'Aangepast'], ['stap-planning', 'Planning', '']]
      : [['stap-medewerkers', 'Medewerkers', String(c.emp)], ['stap-leerpaden', 'Leerpaden', String(lpChosen.length + (c.ander.on ? 1 : 0))], ['stap-looptijd', 'Looptijd', P.weken + ' wk'], ['stap-uitleg', 'Uitleg', core.H(c.uitleg)], ['stap-opdrachten', 'Opdrachten', core.H(c.opdracht)], ['stap-vragen', 'Vragen', c.chat === 'standaard' ? 'chat' : '–'], ['stap-toetsen', 'Toetsen', ''], ['stap-extras', 'Extra’s', ''], ['stap-planning', 'Planning', '']];
    const steps = stepDefs.map(([id, label, val], i) => '<button type="button" class="step-chip" data-action="goStep" data-arg="' + id + '" data-fk="step-' + id + '"><span class="step-chip__n">' + n2(i + 1) + '</span>' + esc(label) + (val ? '<span class="step-chip__v">· ' + esc(val) + '</span>' : '') + '</button>').join('');

    const startCards = exKeys.map(key => {
      const e = core.cfgC(core.exCfg(key, c.start)), eP = core.buildPlan(e, r), ek = core.price(e, eP, r), on = exMatch === key;
      return '<button type="button" class="start-card" data-action="loadEx" data-arg="' + key + '" data-fk="ex-' + key + '" aria-pressed="' + on + '">'
        + '<span class="start-card__badge">' + (on ? 'Gekozen' : 'Voorbeeld') + '</span>'
        + '<span class="start-card__name">' + esc(core.EX[key].name) + '</span>'
        + '<span class="start-card__meta">' + e.emp + ' medewerkers · ' + eP.weken + ' weken</span>'
        + '<span class="start-card__desc">' + esc(core.EX[key].desc) + '</span>'
        + '<span class="start-card__foot"><span>Indicatie</span><span>' + core.eur(ek.total) + '</span></span></button>';
    }).join('') + '<button type="button" class="start-card start-card--dashed" data-action="useCustom" data-fk="ex-custom" aria-pressed="' + !exMatch + '">'
      + '<span class="start-card__badge">' + (!exMatch ? 'Gekozen' : 'Eigen keuze') + '</span>'
      + '<span class="start-card__name">Zelf samenstellen</span><span class="start-card__meta">Alle stappen open</span>'
      + '<span class="start-card__desc">Kies zelf de leerpaden, de uren uitleg en opdrachten, de begeleiding, toetsen en extra’s.</span>'
      + '<span class="start-card__foot"><span>Prijs</span><span>rekent mee</span></span></button>';

    const wdPresets = [20, 40, 60, 120, 260].filter(d => d <= l.maxWd).map(d => '<button type="button" class="chip chip--sm" data-action="setWd" data-arg="' + d + '" data-fk="wd-' + d + '" aria-pressed="' + (c.werkdagen === d) + '">' + (d / 5) + ' weken</button>').join('');
    const intensOpts = Object.keys(IN).map(kk => {
      const o = IN[kk], desc = core.H(o.uitleg) + ' uitleg + ' + core.H(o.opdracht) + ' opdrachten p.p./week · chat' + (o.bellen ? ' · ' + o.bellen + ' belmoment' + (o.bellen > 1 ? 'en' : '') + ' per week' : '');
      return '<button type="button" class="option" data-action="setIntens" data-arg="' + kk + '" data-fk="in-' + kk + '" aria-pressed="' + (inKey === kk) + '"><span class="option__t">' + esc(o.label) + '</span><span class="option__d">' + esc(desc) + '</span></button>';
    }).join('');

    const names = core.lpNames();
    const lpChips = names.map((nm, i) => '<button type="button" class="chip chip--md" data-action="lpToggle" data-arg="' + esc(nm) + '" data-fk="lp-' + i + '" aria-pressed="' + (nm in (c.lp || {})) + '">' + esc(nm) + '</button>').join('')
      + '<button type="button" class="chip chip--md chip--dashed" data-action="anderToggle" data-fk="lp-ander" aria-pressed="' + !!c.ander.on + '">Ander leerpad, op aanvraag</button>';
    const lpRows = lpChosen.map((nm, i) => '<div class="lp-row"><span class="lp-row__name">' + esc(nm) + '</span><div class="stepper">'
      + '<button type="button" class="stepper__btn stepper__btn--sm" data-action="lpDec" data-arg="' + esc(nm) + '" data-fk="lpd-' + i + '" aria-label="' + esc(nm) + ': één medewerker minder">−</button>'
      + '<span class="stepper__val">' + c.lp[nm] + '</span>'
      + '<button type="button" class="stepper__btn stepper__btn--sm" data-action="lpInc" data-arg="' + esc(nm) + '" data-fk="lpi-' + i + '" aria-label="' + esc(nm) + ': één medewerker meer">+</button>'
      + '<span class="text-xs">medewerkers</span></div></div>').join('');

    const row = (action, label, desc, price, on, locked) => {
      const inner = '<span class="check-row__box">' + CHECK + '</span><span class="check-row__t"><b>' + esc(label) + '</b><span class="check-row__price">' + esc(price) + '</span><span>' + esc(desc) + '</span></span><span class="check-row__price">' + esc(price) + '</span>';
      return locked ? '<div class="check-row check-row--locked">' + inner + '</div>'
        : '<button type="button" class="check-row" data-action="' + action + '" data-fk="' + action + '" aria-pressed="' + !!on + '">' + inner + '</button>';
    };
    const toetsRows = row('', 'Nulmeting en eindmeting', 'Het startpunt en eindpunt van elk traject. Bepaalt het startniveau per medewerker.', 'Inbegrepen', true, true)
      + row('tKennis', 'Kennischeck na elke leerweek', 'Korte automatische quiz na elke leerweek.', core.eurD(r.kennis) + ' p.p. per leerweek', c.toets.kennis)
      + row('tEind', 'Eindtoets', 'Eén afsluitende toets, met een bewijs van deelname.', core.eurD(r.eind) + ' p.p.', c.toets.eind)
      + row('tPraktijk', 'Praktijktoets', 'Een praktijkopdracht die de coach beoordeelt.', core.eurD(r.praktijk) + ' p.p.', c.toets.praktijk);
    const extraRows = row('', 'Wekelijkse AI-update', 'Elke maandag een korte update over nieuwe AI-ontwikkelingen voor jullie werk.', 'Inbegrepen', true, true)
      + row('xManager', 'Managersessies', 'Elke vier weken een online sessie van 30 minuten met de manager over voortgang.', core.eurD(r.manager) + ' per sessie', c.extras.manager)
      + row('xRapport', 'Maandrapportage', 'Elke vier weken een rapportage over deelname en voortgang. Alleen teamgegevens.', core.eurD(r.rapport) + ' per rapportage', c.extras.rapport);
    const chatOpts = [['geen', 'Geen'], ['standaard', 'Standaard']].map(([v, label]) => '<button type="button" data-action="setChat" data-arg="' + v + '" data-fk="chat-' + v + '" aria-pressed="' + (c.chat === v) + '">' + label + '</button>').join('');

    const summaryRows = [['Medewerkers', String(c.emp)], ['Leerpaden', lpSummary], ['Looptijd', P.weken + ' weken (' + c.werkdagen + ' werkdagen) · ' + core.fmtD(P.first) + ' – ' + core.fmtD(P.last)], ['Leren', sm.leren], ['Vragen', sm.vragen], ['Toetsen', sm.toetsen], ['Extra’s', sm.extras]]
      .map(([kk, v]) => '<div><dt>' + kk + '</dt><dd>' + esc(v) + '</dd></div>').join('');
    const priceLines = k.items.map(it => '<li><div><span class="price-lines__l">' + esc(it.label) + '</span><span class="price-lines__d">' + esc(it.detail) + '</span></div><span class="price-lines__a' + (it.amount == null ? ' price-lines__a--note' : '') + '">' + esc(it.amount == null ? it.note : core.eur(it.amount)) + '</span></li>').join('');

    return {
      cfg: c, emp: c.emp, werkdagen: c.werkdagen, weeks: P.weken, maxEmp: l.maxEmp, maxWd: l.maxWd, maxWeeks: l.maxWd / 5, grootVanaf: l.groot + 1, groot,
      pilotNote: l.pilot ? ' (pilotfase)' : '', wdText: P.weken + ' weken, ' + c.werkdagen + ' werkdagen',
      empDecOff: c.emp <= 5, empIncOff: c.emp >= l.maxEmp,
      isSnel: snel, isAlles: !snel, modeLabel: snel ? 'Alles zelf instellen' : 'Terug naar snelle modus', modeExp: String(!snel),
      nums: { wd: snel ? '02' : '03', plan: snel ? '04' : '09' },
      steps, startCards, wdPresets, intensOpts, intensCustom: !inKey,
      lpChips, lpRows, lpSum, lpNone, lpWarn: !lpNone && lpSum !== c.emp,
      uitlegH: core.H(c.uitleg), opdrachtH: core.H(c.opdracht), learnH: core.H(k.learnH), over4: k.learnH > 4,
      rl: { uitleg: core.eurD(r.uitleg) + ' per uur p.p.', opdracht: core.eurD(r.opdracht) + ' per uur p.p.', chat: core.eurD(r.chat) + ' p.p. per week', bellen: core.eurD(r.bellen) + ' per belmoment' },
      sub: { uitleg: core.eur(k.sub.uitleg), opdracht: core.eur(k.sub.opdracht), vragen: core.eur(k.sub.vragen), toetsen: core.eur(k.sub.toetsen), extras: core.eur(k.sub.extras) },
      chatOpts, toetsRows, extraRows,
      planRange: P.weken + ' weken · ' + core.fmtD(P.first) + ' t/m ' + core.fmtD(P.last) + ' · feestdagen overgeslagen',
      planOpen: ui.planOpen, planExp: String(ui.planOpen), planLabel: ui.planOpen ? 'Agenda verbergen' : 'Bekijk en wijzig de agenda',
      isKickstart, notKickstart: !isKickstart, summaryRows, priceLines, totalFmt: core.eur(k.total), perEmpFmt: core.eur(k.perEmp),
      ctaNormal: !groot, ctaGroot: groot,
      fill: { emp: pct(c.emp, 5, l.maxEmp), wd: pct(c.werkdagen, 10, l.maxWd), uitleg: pct(c.uitleg, 0, 2), opdracht: pct(c.opdracht, 0, 3) },
      plan: { days: P.days, first: P.first, last: P.last, start: c.start, weekend: !!c.weekend, werkdagen: c.werkdagen, canEind: !!c.toets.eind, canPraktijk: !!c.toets.praktijk }
    };
  }

  const $ = id => doc.getElementById(id);
  const syncRange = (id, v) => { const el = $(id); if (el && +el.value !== +v) el.value = String(v); };
  function update() {
    const v = vals();
    K.bind(root, v);
    syncRange('emp-range', v.cfg.emp); syncRange('wd-range', v.cfg.werkdagen); syncRange('uitleg-range', v.cfg.uitleg); syncRange('opdracht-range', v.cfg.opdracht);
    const ei = $('aantal-medewerkers');
    if (ei) { const s = ui.empDraft != null ? ui.empDraft : String(v.cfg.emp); if (ei.value !== s && !(doc.activeElement === ei && ui.empDraft != null)) ei.value = s; }
    const at = $('ander-tekst');
    if (at && doc.activeElement !== at && at.value !== (v.cfg.ander.tekst || '')) at.value = v.cfg.ander.tekst || '';
    if (ui.planOpen) {
      if (!planner) planner = new K.Planner(doc.querySelector('[data-planner]'), { editable: true, onStep, onPlace, onAuto, onStart, onWeekend });
      planner.update(v.plan);
    }
  }

  /* ── Acties ───────────────────────────────────────────────────── */
  const clampEmp = n => Math.min(core.limits().maxEmp, Math.max(5, n));
  const applyEmp = n => store.set(cc => ({ emp: n, ...core.lpDist(cc, n) }));
  const tgl = (grp, key) => () => store.set(cc => ({ [grp]: { ...cc[grp], [key]: !cc[grp][key] } }));
  function loadEx(key) {
    store.replace(core.cfgC(core.exCfg(key, store.cfg.start)), true);
    K.scrollToEl($('configurator'), false);
  }
  K.onExampleInPage = key => K.scrollToEl($('configurator'), false);
  function onStep(iso, t, d) {
    store.set(cc => {
      const day = ((lastPlan && lastPlan.days) || []).find(x => x.iso === iso); if (!day) return {};
      const cur = (cc.custom || {})[iso] || { uitleg: day.uitleg, opdracht: day.opdracht };
      return { custom: { ...cc.custom, [iso]: { ...cur, [t]: Math.max(0, Math.min(240, (cur[t] || 0) + d)) } } };
    });
  }
  const onPlace = (iso, t) => store.set(cc => ({ placed: { ...cc.placed, [t]: iso } }));
  const onAuto = () => store.set({ custom: {}, placed: {} });
  const onStart = iso => store.set({ start: iso, custom: {}, placed: {} });
  const onWeekend = on => store.set({ weekend: !!on });
  const sheet = $('opbouw');

  K.actions(root, {
    goStep: id => K.scrollToEl($(id)),
    toggleMode: () => { ui.mode = ui.mode === 'snel' ? 'alles' : 'snel'; update(); },
    loadEx,
    useCustom: () => { ui.mode = 'alles'; update(); K.scrollToEl($('configurator'), false); },
    loadKickstart: () => loadEx('kickstart'),
    empDec: () => { ui.empDraft = null; applyEmp(clampEmp(store.cfg.emp - 1)); },
    empInc: () => { ui.empDraft = null; applyEmp(clampEmp(store.cfg.emp + 1)); },
    setWd: d => store.set({ werkdagen: +d }),
    setIntens: kk => { const o = core.intens()[kk]; if (o) store.set({ uitleg: o.uitleg, opdracht: o.opdracht, chat: o.chat, bellen: o.bellen }); },
    lpToggle: name => store.set(cc => { const lp = { ...cc.lp }; if (name in lp) delete lp[name]; else lp[name] = core.avgW(cc); return { lp, ...core.lpDist({ ...cc, lp }, cc.emp) }; }),
    lpDec: name => store.set(cc => ({ lp: { ...cc.lp, [name]: Math.max(0, (cc.lp[name] || 0) - 1) }, lpManual: true })),
    lpInc: name => store.set(cc => ({ lp: { ...cc.lp, [name]: (cc.lp[name] || 0) + 1 }, lpManual: true })),
    anderToggle: () => store.set(cc => { const ander = { ...cc.ander, on: !cc.ander.on, n: !cc.ander.on ? core.avgW(cc) : 0 }; return { ander, ...core.lpDist({ ...cc, ander }, cc.emp) }; }),
    anderDec: () => store.set(cc => ({ ander: { ...cc.ander, n: Math.max(0, (cc.ander.n || 0) - 1) }, lpManual: true })),
    anderInc: () => store.set(cc => ({ ander: { ...cc.ander, n: (cc.ander.n || 0) + 1 }, lpManual: true })),
    lpEven: () => store.set(cc => core.lpDist(cc, cc.emp)),
    setChat: v => store.set({ chat: v }),
    bellenMin: () => store.set(cc => ({ bellen: Math.max(0, cc.bellen - 1) })),
    bellenPlus: () => store.set(cc => ({ bellen: Math.min(10, cc.bellen + 1) })),
    tKennis: tgl('toets', 'kennis'), tEind: tgl('toets', 'eind'), tPraktijk: tgl('toets', 'praktijk'),
    xManager: tgl('extras', 'manager'), xRapport: tgl('extras', 'rapport'),
    togglePlan: () => { ui.planOpen = !ui.planOpen; update(); },
    openSheet: () => { if (sheet && sheet.showModal) sheet.showModal(); },
    closeSheet: () => { if (sheet && sheet.open) sheet.close(); }
  });

  /* ── Invoervelden ─────────────────────────────────────────────── */
  const on = (id, ev, fn) => { const el = $(id); if (el) el.addEventListener(ev, fn); };
  on('emp-range', 'input', e => { ui.empDraft = null; applyEmp(+e.target.value); });
  on('wd-range', 'input', e => store.set({ werkdagen: +e.target.value }));
  on('uitleg-range', 'input', e => store.set({ uitleg: +e.target.value }));
  on('opdracht-range', 'input', e => store.set({ opdracht: +e.target.value }));
  on('aantal-medewerkers', 'input', e => {
    const v = e.target.value; ui.empDraft = v;
    const n = parseInt(v, 10), l = core.limits();
    if (n >= 5 && n <= l.maxEmp) applyEmp(n);
  });
  on('aantal-medewerkers', 'blur', () => {
    const n = parseInt(ui.empDraft, 10); ui.empDraft = null;
    if (!isNaN(n)) applyEmp(clampEmp(n)); else update();
  });
  on('aantal-medewerkers', 'keydown', e => { if (e.key === 'Enter') e.target.blur(); });
  on('ander-tekst', 'input', e => { const v = e.target.value; store.set(cc => ({ ander: { ...cc.ander, tekst: v } })); });
  if (sheet) {
    sheet.addEventListener('click', e => { if (e.target === sheet) sheet.close(); });
    sheet.addEventListener('close', () => { const b = $('sheet-open'); if (b) b.focus(); });
  }

  store.subscribe(update);
  update();
})(window.Kompas = window.Kompas || {});
