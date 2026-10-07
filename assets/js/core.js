/*
 * Kompas AI – kern: instellingen, prijs en planning
 * ---------------------------------------------------------------------------
 * Pure functies zonder DOM. buildPlan() en price() zijn één-op-één overgenomen
 * uit het ontwerp (CORE START – CORE END, zie OVERDRACHT §3): de agenda is de
 * bron, de prijs rekent met de minuten uit de agenda.
 */
(function (K) {
  'use strict';

  /* ── Instellingen ───────────────────────────────────────────────────── */
  const DEFAULTS = {
    contactEmail: '', kvkNummer: '', btwNummer: '', adres: '', linkedinUrl: '', portaalUrl: '', formEndpoint: '',
    chatReactietijd: 'binnen 48 uur, vaak al dezelfde dag', contactReactietijd: 'binnen 1 werkdag',
    leerpadOpties: 'Marketing & communicatie, Administratie & finance, HR & recruitment, Sales & klantcontact',
    showFounding: true, kvkBron: '', vergelijkingDatum: '',
    rateOpstart: 395, ratePlatform: 5, rateUitleg: 14, rateOpdracht: 22, rateChat: 2, rateBellen: 40,
    rateKennischeck: 3, rateEindtoets: 25, ratePraktijktoets: 60, rateManagersessie: 95, rateMaandrapportage: 45,
    wekenPerModule: 1, maxMedewerkers: 100, grootVoorstelVanaf: 50, pilotModus: false, coachUrenPerWeek: 8,
    feedbackMinutenPerOpdrachtuur: 10, chatMinutenPerMedewerkerPerWeek: 3, praktijktoetsMinuten: 30,
    managersessieMinuten: 45, maandrapportageMinuten: 30, startInSnelleModus: true,
    lichtUitleg: 0.5, lichtOpdracht: 0.5, lichtBellen: 0,
    normaalUitleg: 1, normaalOpdracht: 1, normaalBellen: 1,
    intensiefUitleg: 1, intensiefOpdracht: 2, intensiefBellen: 2
  };
  const raw = window.KOMPAS_CONFIG || {};
  const config = { ...DEFAULTS };
  Object.keys(raw).forEach(k => { if (raw[k] !== undefined && raw[k] !== null) config[k] = raw[k]; });
  const str = v => String(v == null ? '' : v).trim();

  const LP_DEFAULT = ['Marketing & communicatie', 'Administratie & finance', 'HR & recruitment', 'Sales & klantcontact'];

  const EX = {
    kickstart: { name: 'Kickstart', emp: 10, werkdagen: 30, uitleg: 1, opdracht: 1, chat: 'standaard', bellen: 1, toets: { kennis: true, eind: false, praktijk: false }, extras: { manager: false, rapport: false }, lp: { 'Marketing & communicatie': 5, 'Administratie & finance': 5 }, desc: 'Zes weken de basis leggen: elke week een uur uitleg en een uur opdrachten, chat met de coach en één belmoment per week voor het team.' },
    verdieping: { name: 'Verdieping', emp: 20, werkdagen: 65, uitleg: 1, opdracht: 1.5, chat: 'standaard', bellen: 2, toets: { kennis: true, eind: true, praktijk: false }, extras: { manager: false, rapport: true }, lp: { 'Marketing & communicatie': 8, 'Administratie & finance': 6, 'Sales & klantcontact': 6 }, desc: 'Dertien weken verdiepen, met meer tijd voor opdrachten, maandrapportages en een eindtoets met bewijs van deelname.' },
    jaartraject: { name: 'Jaartraject', emp: 30, werkdagen: 260, uitleg: 0.5, opdracht: 0.5, chat: 'standaard', bellen: 1, toets: { kennis: true, eind: true, praktijk: true }, extras: { manager: true, rapport: true }, lp: { 'Marketing & communicatie': 8, 'Administratie & finance': 8, 'HR & recruitment': 7, 'Sales & klantcontact': 7 }, desc: 'Een jaar lang in een rustig ritme leren en toepassen, met managersessies, maandrapportages en een praktijktoets die de coach beoordeelt.' }
  };

  function rates() {
    const p = config;
    return {
      opstart: +p.rateOpstart, platform: +p.ratePlatform, uitleg: +p.rateUitleg, opdracht: +p.rateOpdracht,
      chat: +p.rateChat, bellen: +p.rateBellen, kennis: +p.rateKennischeck, eind: +p.rateEindtoets, praktijk: +p.ratePraktijktoets,
      manager: +p.rateManagersessie, rapport: +p.rateMaandrapportage,
      wpm: +p.wekenPerModule || 1, coachUren: +p.coachUrenPerWeek, fbMin: +p.feedbackMinutenPerOpdrachtuur,
      chatMin: +p.chatMinutenPerMedewerkerPerWeek, praktijkMin: +p.praktijktoetsMinuten, managerMin: +p.managersessieMinuten, rapportMin: +p.maandrapportageMinuten
    };
  }
  function limits() {
    const pilot = !!config.pilotModus;
    return { pilot, maxEmp: Math.max(5, +config.maxMedewerkers || 100), maxWd: pilot ? 60 : 260, groot: +config.grootVoorstelVanaf };
  }
  function lpNames() {
    const v = config.leerpadOpties;
    const a = (Array.isArray(v) ? v : str(v).split(/[,;\n]/)).map(str).filter(Boolean);
    return a.length ? a : LP_DEFAULT.slice();
  }
  function intens() {
    const p = config;
    return {
      licht: { label: 'Licht', uitleg: +p.lichtUitleg, opdracht: +p.lichtOpdracht, chat: 'standaard', bellen: +p.lichtBellen },
      normaal: { label: 'Normaal', uitleg: +p.normaalUitleg, opdracht: +p.normaalOpdracht, chat: 'standaard', bellen: +p.normaalBellen },
      intensief: { label: 'Intensief', uitleg: +p.intensiefUitleg, opdracht: +p.intensiefOpdracht, chat: 'standaard', bellen: +p.intensiefBellen }
    };
  }
  const reactietijd = () => str(config.chatReactietijd) || DEFAULTS.chatReactietijd;
  const contactRt = () => str(config.contactReactietijd);
  const vrijblijvend = () => 'Vrijblijvend, je zit nergens aan vast' + (contactRt() ? ' · reactie ' + contactRt() : '') + '.';

  /* ── Datums en notatie ──────────────────────────────────────────────── */
  const pad = n => String(n).padStart(2, '0');
  const iso = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const parse = s => { const a = String(s).split('-').map(Number); return new Date(a[0], a[1] - 1, a[2]); };
  const H = h => { const m = Math.round(h * 60), hh = Math.floor(m / 60), mm = m % 60; if (!m) return '0 min'; return hh ? hh + ' u' + (mm ? ' ' + mm + ' min' : '') : mm + ' min'; };
  const MON = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];
  const fmtD = s => { const d = parse(s); return d.getDate() + ' ' + MON[d.getMonth()] + ' ' + d.getFullYear(); };
  const nfEur = new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
  const nfEurD = new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 2 });
  const eur = n => nfEur.format(Math.round(n));
  const eurD = n => nfEurD.format(n);
  function nextMonday() { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + (((8 - d.getDay()) % 7) || 7)); return iso(d); }

  /* ── CORE: feestdagen, agenda en prijs ─────────────────────────────── */
  function easter(y) {
    const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
    return new Date(y, Math.floor((h + l - 7 * m + 114) / 31) - 1, ((h + l - 7 * m + 114) % 31) + 1);
  }
  function holidays(y) {
    const e = easter(y), add = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
    const kd = new Date(y, 3, 27); if (kd.getDay() === 0) kd.setDate(26);
    const list = [[new Date(y, 0, 1), 'Nieuwjaarsdag'], [add(e, 1), 'Tweede paasdag'], [kd, 'Koningsdag'], [add(e, 39), 'Hemelvaartsdag'], [add(e, 50), 'Tweede pinksterdag'], [new Date(y, 11, 25), 'Eerste kerstdag'], [new Date(y, 11, 26), 'Tweede kerstdag']];
    if (y % 5 === 0) list.push([new Date(y, 4, 5), 'Bevrijdingsdag']);
    const o = {}; list.forEach(([d, n]) => { o[iso(d)] = n; }); return o;
  }
  function buildPlan(c, r) {
    const start = parse(c.start), hol = {};
    [0, 1, 2].forEach(i => Object.assign(hol, holidays(start.getFullYear() + i)));
    const days = [], work = [], d = new Date(start);
    let guard = 0;
    while (work.length < c.werkdagen && guard++ < 1000) {
      const wd = d.getDay(), weekend = wd === 0 || wd === 6, key = iso(d);
      const day = { iso: key, wd, weekend, holiday: weekend ? null : (hol[key] || null), markers: [], uitleg: 0, opdracht: 0, custom: false, plannable: false };
      days.push(day);
      if (!weekend && !day.holiday) work.push(day);
      d.setDate(d.getDate() + 1);
    }
    const lw = []; for (let i = 0; i < work.length; i += 5) lw.push(work.slice(i, i + 5));
    const spread = (n, total, order) => {
      const out = new Array(n).fill(0); if (!total || !n) return out;
      const chunk = total >= 60 ? 30 : 15, ord = order.filter(i => i < n); let left = total, k = 0;
      while (left > 0) { const i = ord[k % ord.length], m = Math.min(chunk, left); out[i] += m; left -= m; k++; }
      return out;
    };
    lw.forEach(ws => {
      const u = spread(ws.length, Math.round(c.uitleg * 60), [0, 2, 4, 1, 3]), o = spread(ws.length, Math.round(c.opdracht * 60), [1, 3, 0, 2, 4]);
      ws.forEach((day, i) => { day.auto = { uitleg: u[i], opdracht: o[i] }; });
    });
    const custom = c.custom || {};
    days.forEach(day => {
      day.plannable = !day.holiday && (!day.weekend || !!c.weekend);
      if (!day.plannable) return;
      const base = day.auto || { uitleg: 0, opdracht: 0 }, v = custom[day.iso];
      day.uitleg = v ? v.uitleg : base.uitleg; day.opdracht = v ? v.opdracht : base.opdracht; day.custom = !!v;
    });
    const mk = (day, t, extra) => { if (day) day.markers.push({ t, ...(extra || {}) }); };
    const last = work[work.length - 1];
    mk(work[0], 'nulmeting'); mk(work[1] || work[0], 'kickoff');
    let wk = null;
    work.forEach(day => { const m = new Date(parse(day.iso)); m.setDate(m.getDate() - ((m.getDay() + 6) % 7)); const k = iso(m); if (k !== wk) { wk = k; mk(day, 'update'); } });
    let bellen = 0;
    if (c.bellen > 0) lw.forEach(ws => { mk(ws[Math.min(3, ws.length - 1)], 'bellen', { count: c.bellen }); bellen += c.bellen; });
    const wpm = Math.max(1, r.wpm || 1), modules = Math.ceil(lw.length / wpm);
    if (c.toets.kennis) for (let mi = 0; mi < modules; mi++) { const ws = lw[Math.min(lw.length - 1, (mi + 1) * wpm - 1)]; mk(ws[ws.length - 1], 'kennis'); }
    const valid = s => work.find(x => x.iso === s);
    if (c.toets.eind) mk((c.placed && valid(c.placed.eind)) || work[work.length - 2] || last, 'eind');
    if (c.toets.praktijk) { const pw = lw[Math.max(0, lw.length - 2)]; mk((c.placed && valid(c.placed.praktijk)) || pw[pw.length - 1], 'praktijk'); }
    let manager = 0, rapport = 0;
    if (c.extras.manager) { const idx = lw.map((_, i) => i).filter(i => (i + 1) % 4 === 0); (idx.length ? idx : [lw.length - 1]).forEach(i => { const ws = lw[i]; mk(ws[Math.min(2, ws.length - 1)], 'manager'); manager++; }); }
    if (c.extras.rapport) lw.forEach((ws, i) => { if ((i + 1) % 4 === 0 && i < lw.length - 1) { mk(ws[ws.length - 1], 'rapport'); rapport++; } });
    mk(last, 'eindmeting');
    let uitlegMin = 0, opdrachtMin = 0;
    days.forEach(x => { uitlegMin += x.uitleg; opdrachtMin += x.opdracht; });
    return { days, work, weken: Math.max(2, lw.length), first: work[0] ? work[0].iso : c.start, last: last ? last.iso : c.start, totals: { uitlegMin, opdrachtMin, bellen, modules: c.toets.kennis ? modules : 0, manager, rapport } };
  }
  function price(c, P, r) {
    const w = P.weken, t = P.totals, items = [];
    const add = (label, detail, amount, group, note) => items.push({ label, detail, amount, group, note });
    add('Opstart', 'Nulmeting, online kick-off en inrichting', r.opstart, 'basis');
    add('Leeromgeving', c.emp + ' medewerkers × ' + w + ' weken', c.emp * w * r.platform, 'basis');
    if (t.uitlegMin) add('Uitleg', H(t.uitlegMin / 60 / w) + ' per week gem. × ' + c.emp + ' medewerkers × ' + w + ' weken', t.uitlegMin / 60 * c.emp * r.uitleg, 'uitleg');
    if (t.opdrachtMin) add('Opdrachten', H(t.opdrachtMin / 60 / w) + ' per week gem. × ' + c.emp + ' medewerkers × ' + w + ' weken, incl. feedback', t.opdrachtMin / 60 * c.emp * r.opdracht, 'opdracht');
    if (c.chat === 'standaard') add('Vragen via chat', 'Standaard · ' + c.emp + ' medewerkers × ' + w + ' weken', c.emp * w * r.chat, 'vragen');
    if (t.bellen) add('Vragen via bellen', t.bellen + ' belmomenten van 15 min', t.bellen * r.bellen, 'vragen');
    if (t.modules) add('Kennischecks', c.emp + ' medewerkers × ' + t.modules + ' leerweken', c.emp * t.modules * r.kennis, 'toetsen');
    if (c.toets.eind) add('Eindtoets', c.emp + ' medewerkers · bewijs van deelname', c.emp * r.eind, 'toetsen');
    if (c.toets.praktijk) add('Praktijktoets', c.emp + ' medewerkers · beoordeeld door de coach', c.emp * r.praktijk, 'toetsen');
    if (c.extras.manager) add('Managersessies', t.manager + ' × online sessie van 30 min', t.manager * r.manager, 'extras');
    if (c.extras.rapport) add('Maandrapportages', t.rapport + ' × rapportage', t.rapport * r.rapport, 'extras');
    add('Wekelijkse AI-update', w + ' updates', null, 'extras', 'inbegrepen');
    if (c.ander && c.ander.on) add('Ander leerpad', (c.ander.tekst || 'op aanvraag') + ' · ' + (c.ander.n || 0) + ' medewerkers', null, 'leerpad', 'prijs volgt in de offerte');
    const total = items.reduce((a, b) => a + (b.amount || 0), 0);
    const sub = g => items.filter(i => i.group === g).reduce((a, b) => a + (b.amount || 0), 0);
    const coachMin = (t.opdrachtMin / 60 / w) * c.emp * r.fbMin + (c.chat === 'standaard' ? c.emp * r.chatMin : 0) + (t.bellen / w) * 15 + (c.toets.praktijk ? c.emp * r.praktijkMin / w : 0) + t.manager * r.managerMin / w + t.rapport * r.rapportMin / w;
    return { items, total, perEmp: total / c.emp, coachMin, weken: w, learnH: (t.uitlegMin + t.opdrachtMin) / 60 / w, sub: { uitleg: sub('uitleg'), opdracht: sub('opdracht'), vragen: sub('vragen'), toetsen: sub('toetsen'), extras: sub('extras') } };
  }

  /* ── Configuratie ───────────────────────────────────────────────────── */
  function exCfg(key, start) {
    const e = EX[key];
    return { emp: e.emp, werkdagen: e.werkdagen, start: start || nextMonday(), weekend: false, uitleg: e.uitleg, opdracht: e.opdracht, chat: e.chat, bellen: e.bellen, toets: { ...e.toets }, extras: { ...e.extras }, lp: { ...e.lp }, lpManual: false, ander: { on: false, tekst: '', n: 0 }, custom: {}, placed: {} };
  }
  function cfgC(c) {
    const l = limits();
    const wd = Math.min(l.maxWd, Math.max(10, Math.round((+c.werkdagen || 30) / 5) * 5));
    return { ...c, emp: Math.min(Math.max(5, Math.round(+c.emp) || 5), l.maxEmp), werkdagen: wd };
  }
  function lpSumOf(c) { return Object.values(c.lp || {}).reduce((a, b) => a + (+b || 0), 0) + (c.ander && c.ander.on ? (+c.ander.n || 0) : 0); }
  function lpDist(cc, total) {
    const parts = Object.keys(cc.lp || {}).map(k => ({ k, w: Math.max(0, +cc.lp[k] || 0) }));
    if (cc.ander && cc.ander.on) parts.push({ k: '__ander', w: Math.max(0, +cc.ander.n || 0) });
    if (!parts.length) return { lpManual: false };
    let sw = parts.reduce((a, p) => a + p.w, 0);
    if (!sw) { parts.forEach(p => { p.w = 1; }); sw = parts.length; }
    // Naar verhouding, naar beneden afgerond; de rest gaat naar de grootste restwaarden
    // (bij gelijke rest het eerste leerpad), zodat 5/2/2/2 niet scheef wordt tot 7/1/1/1.
    const exact = parts.map(p => total * p.w / sw), out = exact.map(Math.floor);
    let left = total - out.reduce((a, b) => a + b, 0);
    exact.map((x, i) => ({ i, r: x - out[i] })).sort((a, b) => b.r - a.r || a.i - b.i).forEach(o => { if (left > 0) { out[o.i]++; left--; } });
    const lp = {}; let an = cc.ander ? cc.ander.n : 0;
    parts.forEach((p, i) => { if (p.k === '__ander') an = out[i]; else lp[p.k] = out[i]; });
    return { lp, ander: { ...cc.ander, n: an }, lpManual: false };
  }
  function avgW(cc) { const v = Object.values(cc.lp || {}).map(Number).concat(cc.ander && cc.ander.on ? [+cc.ander.n || 0] : []); const s = v.reduce((a, b) => a + b, 0); return v.length && s ? s / v.length : 1; }
  function lpSummaryOf(c) {
    const ok = lpSumOf(c) === c.emp;
    const a = Object.keys(c.lp || {}).map(k => k + (ok ? ' (' + c.lp[k] + ')' : ''));
    if (c.ander && c.ander.on) a.push((c.ander.tekst ? 'Ander leerpad: ' + c.ander.tekst : 'Ander leerpad op aanvraag') + (ok ? ' (' + (c.ander.n || 0) + ')' : ''));
    return a.length ? a.join(', ') + (ok ? '' : ' · verdeling volgt') : 'Nog geen leerpad gekozen';
  }
  function summary(c, P) {
    const w = P.weken, t = ['Nul- en eindmeting'];
    if (c.toets.kennis) t.push('kennischecks'); if (c.toets.eind) t.push('eindtoets'); if (c.toets.praktijk) t.push('praktijktoets');
    const ex = ['wekelijkse AI-update']; if (c.extras.manager) ex.push('managersessies'); if (c.extras.rapport) ex.push('maandrapportage');
    return {
      leren: H(P.totals.uitlegMin / 60 / w) + ' uitleg + ' + H(P.totals.opdrachtMin / 60 / w) + ' opdrachten p.p./week',
      vragen: (c.chat === 'standaard' ? 'Chat' : 'Geen chat') + ' · ' + (c.bellen ? c.bellen + ' belmoment' + (c.bellen > 1 ? 'en' : '') + ' p/w' : 'niet bellen'),
      toetsen: t.join(', '), extras: ex.join(', ')
    };
  }
  // Vergelijkt een configuratie met een voorbeeld (volgorde van leerpaden telt niet mee).
  function same(a, b) {
    const j = x => JSON.stringify(x || {});
    const lp = x => JSON.stringify(Object.keys(x || {}).sort().map(k => [k, x[k]]));
    return a.emp === b.emp && a.werkdagen === b.werkdagen && a.uitleg === b.uitleg && a.opdracht === b.opdracht && a.chat === b.chat && a.bellen === b.bellen && j(a.toets) === j(b.toets) && j(a.extras) === j(b.extras) && lp(a.lp) === lp(b.lp) && !(a.ander && a.ander.on) && !Object.keys(a.custom || {}).length && !Object.keys(a.placed || {}).length && !a.weekend;
  }
  // Prijs en planning in één keer, voor een (nog niet begrensde) configuratie.
  function compute(cfg) {
    const c = cfgC(cfg), r = rates(), P = buildPlan(c, r), k = price(c, P, r);
    return { c, r, P, k };
  }
  function examples() { const l = limits(); return Object.keys(EX).filter(key => EX[key].werkdagen <= l.maxWd); }

  K.config = config;
  K.core = {
    LP_DEFAULT, EX, rates, limits, lpNames, intens, reactietijd, contactRt, vrijblijvend,
    iso, parse, H, fmtD, eur, eurD, nextMonday, easter, holidays, buildPlan, price,
    exCfg, cfgC, lpSumOf, lpDist, avgW, lpSummaryOf, summary, same, compute, examples
  };
})(window.Kompas = window.Kompas || {});
