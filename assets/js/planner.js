/*
 * Kompas AI – Planner (agenda van het traject)
 * Week- en maandoverzicht, dagdetails, legenda en bewerken van minuten en toetsen.
 * Gebruik: const p = new Kompas.Planner(element, { editable, onStep, onPlace, onAuto, onStart, onWeekend, title });
 *          p.update(plan)   // plan = { days, first, last, start, weekend, werkdagen, canEind, canPraktijk }
 */
(function (K) {
  'use strict';
  const esc = K.esc;
  const T = {
    nulmeting: { label: 'Nulmeting', icon: '◎', bg: '#2f5d50', fg: '#ffffff', info: 'Korte meting van kennis en werkzaamheden. Bepaalt per medewerker het startniveau: Beginner, Toepassen of Zelfstandig.' },
    kickoff: { label: 'Online kick-off', icon: '▶', bg: '#8a5a1c', fg: '#ffffff', info: 'Live startsessie met het hele team, online.' },
    update: { label: 'AI-update', icon: '•', bg: '#dfe3ea', fg: '#15213b', info: 'Wekelijkse korte update over nieuwe AI-ontwikkelingen die relevant zijn voor jullie werk. Inbegrepen.' },
    uitleg: { label: 'Uitleg', icon: '▤', bg: '#15213b', fg: '#f6f2eb', info: 'Korte lessen als video en tekst, te volgen op een eigen moment.' },
    opdracht: { label: 'Opdrachten', icon: '◆', bg: '#d39b52', fg: '#15213b', info: 'Praktische opdrachten met echte AI-tools in het eigen werk, op het eigen niveau, met feedback van de coach.' },
    bellen: { label: 'Belmoment', icon: '◐', bg: '#c9d5ea', fg: '#15213b', info: 'Persoonlijk gesprek van 15 minuten met je coach, op afspraak. Het aantal geldt voor het hele team.' },
    kennis: { label: 'Kennischeck', icon: '✓', bg: '#efe0c2', fg: '#15213b', info: 'Korte automatische quiz na elke leerweek.' },
    praktijk: { label: 'Praktijktoets', icon: '▲', bg: '#e7c9b8', fg: '#15213b', info: 'Praktijkopdracht uit het eigen werk, beoordeeld door de coach.' },
    eind: { label: 'Eindtoets', icon: '★', bg: '#9a4a2b', fg: '#ffffff', info: 'Afsluitende toets met een bewijs van deelname. Dit is geen certificaat.' },
    manager: { label: 'Managersessie', icon: '■', bg: '#3d4f75', fg: '#ffffff', info: 'Online sessie van 30 minuten met de manager over voortgang en bijsturing.' },
    rapport: { label: 'Maandrapportage', icon: '▦', bg: '#e9e2d3', fg: '#15213b', info: 'Rapportage over deelname en voortgang van de afgelopen periode. Alleen teamgegevens.' },
    eindmeting: { label: 'Eindmeting en rapportage', icon: '◉', bg: '#2f5d50', fg: '#ffffff', info: 'Dezelfde meting als aan het begin. Laat de groei per medewerker zien en sluit af met een rapportage voor het team.' }
  };
  const ORDER = ['nulmeting', 'kickoff', 'update', 'uitleg', 'opdracht', 'bellen', 'kennis', 'praktijk', 'eind', 'manager', 'rapport', 'eindmeting'];
  const DOW = ['zo', 'ma', 'di', 'wo', 'do', 'vr', 'za'];
  const DOWL = ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag'];
  const MON = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];
  const MONL = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];
  const CHECK = '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 6.2 5 8.6l4.5-5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  const parse = s => { const a = String(s).split('-').map(Number); return new Date(a[0], a[1] - 1, a[2]); };
  const key = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  const monday = d => { const x = new Date(d); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; };
  const fmt = (s, long) => { const d = parse(s); return long ? DOWL[d.getDay()] + ' ' + d.getDate() + ' ' + MONL[d.getMonth()] + ' ' + d.getFullYear() : DOW[d.getDay()] + ' ' + d.getDate() + ' ' + MON[d.getMonth()] + ' ' + d.getFullYear(); };
  function itemsOf(day) {
    const out = [], m = day.markers || [];
    ORDER.forEach(t => {
      const def = T[t];
      if (t === 'uitleg') { if (day.uitleg) out.push({ t, ...def, val: day.uitleg + ' min' }); }
      else if (t === 'opdracht') { if (day.opdracht) out.push({ t, ...def, val: day.opdracht + ' min' }); }
      else m.filter(x => x.t === t).forEach(x => out.push({ t, ...def, val: x.count ? x.count + '×' : '' }));
    });
    return out.map(i => ({ ...i, short: i.label + (i.val ? ' · ' + i.val : '') }));
  }
  const pill = it => '<span class="pitem" style="background:' + it.bg + ';color:' + it.fg + '"><i aria-hidden="true">' + it.icon + '</i><span>' + esc(it.short) + '</span></span>';

  function Planner(el, opts) {
    this.el = el; this.opts = opts || {}; this.plan = null;
    this.s = { view: null, wi: 0, mi: 0, sel: null, info: null, w: Math.round(el.getBoundingClientRect().width) || 900 };
    el.classList.add('planner');
    el.addEventListener('click', e => this.onClick(e));
    el.addEventListener('change', e => this.onChange(e));
    if (window.ResizeObserver) {
      this.ro = new ResizeObserver(entries => {
        const w = Math.round(entries[0].contentRect.width);
        if (w && Math.abs(w - this.s.w) > 1) { this.s.w = w; if (this.plan) this.render(); }
      });
      this.ro.observe(el);
    }
  }
  Planner.prototype.update = function (plan) {
    const firstIso = this.plan && this.plan.days.length ? this.plan.days[0].iso : null;
    this.plan = plan;
    if (plan.days.length && plan.days[0].iso !== firstIso) { this.s.wi = 0; this.s.mi = 0; }
    this.render();
  };
  Planner.prototype.set = function (patch) { Object.assign(this.s, patch); this.render(); };

  Planner.prototype.onClick = function (e) {
    const b = e.target.closest('[data-pa]'); if (!b || !this.el.contains(b)) return;
    const a = b.getAttribute('data-pa'), v = b.getAttribute('data-v'), o = this.opts, s = this.s;
    switch (a) {
      case 'view': this.set({ view: v }); break;
      case 'prevW': this.set({ wi: Math.max(0, s.wi - 1) }); break;
      case 'nextW': this.set({ wi: s.wi + 1 }); break;
      case 'prevM': this.set({ mi: Math.max(0, s.mi - 1) }); break;
      case 'nextM': this.set({ mi: s.mi + 1 }); break;
      case 'day': this.set({ sel: s.sel === v ? null : v }); break;
      case 'close': this.set({ sel: null }); break;
      case 'info': this.set({ info: s.info === v ? null : v }); break;
      case 'step': if (s.sel && o.onStep) o.onStep(s.sel, v, +b.getAttribute('data-d')); break;
      case 'place': if (s.sel && o.onPlace) o.onPlace(s.sel, v); break;
      case 'auto': if (o.onAuto) o.onAuto(); break;
      case 'weekend': if (o.onWeekend) o.onWeekend(!(this.plan && this.plan.weekend)); break;
      case 'print': this.print(); break;
    }
  };
  Planner.prototype.onChange = function (e) {
    const t = e.target;
    if (t.matches('[data-pc="week"]')) this.set({ wi: +t.value, view: 'week' });
    if (t.matches('[data-pc="start"]') && t.value && this.opts.onStart) this.opts.onStart(t.value);
  };

  Planner.prototype.render = function () {
    const plan = this.plan || { days: [] }, s = this.s, ed = !!this.opts.editable;
    const days = plan.days || [], byIso = {};
    days.forEach(d => { byIso[d.iso] = d; });
    const wide = s.w >= 720, showWe = !!plan.weekend, cols = showWe ? 7 : 5;
    const weeks = [];
    if (days.length) {
      const m = monday(parse(days[0].iso)), end = parse(days[days.length - 1].iso);
      while (m <= end) { const slots = []; for (let i = 0; i < cols; i++) { const d = new Date(m); d.setDate(d.getDate() + i); slots.push(key(d)); } weeks.push(slots); m.setDate(m.getDate() + 7); }
    }
    const wi = s.wi = Math.max(0, Math.min(s.wi, weeks.length - 1));
    const manyWeeks = weeks.length > 13, view = s.view || (manyWeeks ? 'maand' : 'week');
    const sel = s.sel && byIso[s.sel] ? s.sel : null;
    const cell = iso => {
      const d = byIso[iso], dt = parse(iso), dow = DOW[dt.getDay()], num = dt.getDate() + ' ' + MON[dt.getMonth()];
      if (!d) return { st: true, dow, num, note: 'Buiten de planning', out: true };
      if (d.holiday) return { st: true, dow, num, note: 'Feestdag · ' + d.holiday, muted: true };
      if (!d.plannable) return { st: true, dow, num, note: 'Weekend', muted: true };
      const items = itemsOf(d), on = sel === iso;
      const aria = DOWL[dt.getDay()] + ' ' + dt.getDate() + ' ' + MONL[dt.getMonth()] + ': ' + (items.length ? items.map(i => i.label + (i.val ? ' ' + i.val : '')).join(', ') : 'geen activiteiten');
      return { st: false, iso, dow, num, items, aria, on, weekend: d.weekend, custom: d.custom };
    };
    const wk = weeks[wi] || [], cells = wk.map(cell);
    let h = '';

    // Kop
    h += '<div class="planner__top"><div class="stack" style="gap:3px;min-width:0"><span class="planner__range">' + (plan.first ? esc(fmt(plan.first) + ' t/m ' + fmt(plan.last)) : 'Nog geen planning') + '</span>'
      + '<span class="text-sm">' + (plan.werkdagen || 0) + ' werkdagen · ' + weeks.length + ' kalenderweken' + (showWe ? ' · weekend op aanvraag' : '') + '</span></div>'
      + '<div class="planner__tools"><div class="segmented" role="group" aria-label="Weergave">'
      + '<button type="button" data-pa="view" data-v="week" data-fk="pv-week" aria-pressed="' + (view === 'week') + '">Week</button>'
      + '<button type="button" data-pa="view" data-v="maand" data-fk="pv-maand" aria-pressed="' + (view === 'maand') + '">Maandoverzicht</button></div>';
    if (manyWeeks) {
      h += '<label class="row" style="gap:8px;font:500 13px var(--font-sans)">Ga naar week <select class="select" data-pc="week" data-fk="pv-select">'
        + weeks.map((w, i) => { const a = parse(w[0]); return '<option value="' + i + '"' + (i === wi ? ' selected' : '') + '>Week ' + (i + 1) + ' · ' + a.getDate() + ' ' + MON[a.getMonth()] + ' ' + a.getFullYear() + '</option>'; }).join('')
        + '</select></label>';
    }
    h += '<button type="button" class="btn btn--soft btn--xs" data-pa="print" data-fk="pv-print">Print of bewaar als pdf</button></div></div>';

    // Bewerkbalk
    if (ed) {
      h += '<div class="planner__edit"><label>Startdatum<input class="date-input" type="date" data-pc="start" data-fk="pv-start" value="' + esc(plan.start || '') + '"></label>'
        + '<button type="button" class="toggle-btn" data-pa="weekend" data-fk="pv-weekend" aria-pressed="' + showWe + '"><span class="toggle-btn__box">' + CHECK + '</span>Ook in het weekend (op aanvraag)</button>'
        + '<button type="button" class="btn btn--primary btn--xs" style="border-radius:9px;height:42px" data-pa="auto" data-fk="pv-auto">Verdeel automatisch</button>'
        + '<span class="text-xs" style="color:var(--text-2);flex:1 1 240px">Feestdagen worden automatisch overgeslagen. Kies een dag om de minuten aan te passen of een toets in te plannen.</span></div>';
    }

    if (view === 'week') {
      const a = wk[0] ? parse(wk[0]) : null, b = wk.length ? parse(wk[wk.length - 1]) : null;
      const label = a ? 'Week ' + (wi + 1) + ' van ' + weeks.length + ' · ' + a.getDate() + ' ' + MON[a.getMonth()] + ' – ' + b.getDate() + ' ' + MON[b.getMonth()] : '';
      h += '<div class="planner__nav"><button type="button" class="round-btn" data-pa="prevW" data-fk="pv-prevw" aria-label="Vorige week"' + (wi > 0 ? '' : ' disabled') + '>‹</button>'
        + '<span class="planner__label">' + esc(label) + '</span>'
        + '<button type="button" class="round-btn" data-pa="nextW" data-fk="pv-nextw" aria-label="Volgende week"' + (wi < weeks.length - 1 ? '' : ' disabled') + '>›</button></div>';
      if (wide) {
        h += '<div class="week-grid" style="grid-template-columns:repeat(' + cols + ',minmax(0,1fr))">' + cells.map(c => c.st
          ? '<div class="pday pday--static' + (c.muted ? ' pday--muted' : '') + '"><span class="pday__head"><span>' + c.dow + ' ' + c.num + '</span></span><span class="pday__note">' + esc(c.note) + '</span></div>'
          : '<button type="button" class="pday' + (c.weekend ? ' pday--weekend' : '') + '" data-pa="day" data-v="' + c.iso + '" data-fk="d-' + c.iso + '" aria-pressed="' + c.on + '" aria-label="' + esc(c.aria) + '">'
            + '<span class="pday__head"><span>' + c.dow + ' ' + c.num + '</span><span>' + (c.custom ? 'aangepast' : '') + '</span></span>'
            + '<span class="pday__items">' + c.items.map(pill).join('') + '</span></button>').join('') + '</div>';
      } else {
        h += '<div class="stack-8">' + cells.filter(c => !c.out).map(c => c.st
          ? '<div class="pday pday--list pday--static' + (c.muted ? ' pday--muted' : '') + '"><span class="pday__head"><span>' + c.dow + '</span><span>' + c.num + '</span></span><span class="pday__note">' + esc(c.note) + '</span></div>'
          : '<button type="button" class="pday pday--list" data-pa="day" data-v="' + c.iso + '" data-fk="d-' + c.iso + '" aria-pressed="' + c.on + '" aria-label="' + esc(c.aria) + '">'
            + '<span class="pday__head"><span>' + c.dow + '</span><span>' + c.num + '</span></span>'
            + '<span class="pday__items">' + (c.items.length ? c.items.map(pill).join('') : '<span class="pday__note">Geen activiteiten</span>') + '</span></button>').join('') + '</div>';
      }
    } else {
      const months = [];
      if (days.length) { const a = parse(days[0].iso), b = parse(days[days.length - 1].iso), m = new Date(a.getFullYear(), a.getMonth(), 1); while (m <= b) { months.push(new Date(m)); m.setMonth(m.getMonth() + 1); } }
      const mi = s.mi = Math.max(0, Math.min(s.mi, months.length - 1)), mon = months[mi];
      h += '<div class="planner__nav"><button type="button" class="round-btn" data-pa="prevM" data-fk="pv-prevm" aria-label="Vorige maand"' + (mi > 0 ? '' : ' disabled') + '>‹</button>'
        + '<span class="planner__label">' + (mon ? MONL[mon.getMonth()] + ' ' + mon.getFullYear() : '') + '</span>'
        + '<button type="button" class="round-btn" data-pa="nextM" data-fk="pv-nextm" aria-label="Volgende maand"' + (mi < months.length - 1 ? '' : ' disabled') + '>›</button></div>';
      h += '<div class="month-grid">' + ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'].map(d => '<span class="month-grid__dow">' + d + '</span>').join('');
      if (mon) {
        const lead = (mon.getDay() + 6) % 7, n = new Date(mon.getFullYear(), mon.getMonth() + 1, 0).getDate();
        for (let i = 0; i < lead; i++) h += '<span class="pmon pmon--static"></span>';
        for (let i = 1; i <= n; i++) {
          const iso = key(new Date(mon.getFullYear(), mon.getMonth(), i)), d = byIso[iso];
          if (!d) { h += '<span class="pmon pmon--static">' + i + '</span>'; continue; }
          if (d.holiday || !d.plannable) { h += '<span class="pmon pmon--static pmon--muted">' + i + '<span class="pmon__note">' + esc(d.holiday || '') + '</span></span>'; continue; }
          const items = itemsOf(d), on = sel === iso, dt = parse(iso);
          const aria = DOWL[dt.getDay()] + ' ' + i + ' ' + MONL[dt.getMonth()] + ': ' + (items.length ? items.map(x => x.label + (x.val ? ' ' + x.val : '')).join(', ') : 'geen activiteiten');
          h += '<button type="button" class="pmon" data-pa="day" data-v="' + iso + '" data-fk="m-' + iso + '" aria-pressed="' + on + '" aria-label="' + esc(aria) + '">' + i
            + '<span class="pmon__dots">' + items.map(it => '<i style="background:' + it.bg + '"></i>').join('') + '</span></button>';
        }
      }
      h += '</div>';
    }

    // Dagdetails
    const sd = sel ? byIso[sel] : null;
    if (sd) {
      const items = itemsOf(sd), has = t => (sd.markers || []).some(x => x.t === t);
      h += '<div class="pdetail"><div class="pdetail__head"><span class="pdetail__title">' + esc(fmt(sd.iso, true)) + '</span>'
        + '<button type="button" class="btn btn--soft btn--xxs" data-pa="close" data-fk="pv-close" aria-label="Sluit details">Sluiten</button></div>';
      h += items.length ? '<div class="stack-12">' + items.map(it => '<div class="pdetail__item"><span class="pdetail__icon" aria-hidden="true" style="background:' + it.bg + ';color:' + it.fg + '">' + it.icon + '</span>'
        + '<span class="stack" style="gap:2px"><span style="font-size:15px;font-weight:600">' + esc(it.label) + ' <span style="font-weight:400;color:var(--text-3)">' + esc(it.val) + '</span></span>'
        + '<span class="text-sm">' + esc(it.info) + '</span></span></div>').join('') + '</div>' : '<span class="text-sm">Geen activiteiten op deze dag.</span>';
      if (ed && sd.plannable) {
        const stepBtn = (t, d, label) => '<button type="button" class="stepper__btn stepper__btn--sm" data-pa="step" data-v="' + t + '" data-d="' + d + '" data-fk="st-' + t + d + '" aria-label="' + label + '">' + (d < 0 ? '−' : '+') + '</button>';
        h += '<div class="pdetail__edit">'
          + '<div><span>Uitleg</span>' + stepBtn('uitleg', -15, 'Uitleg 15 minuten minder') + '<span class="pdetail__min">' + sd.uitleg + ' min</span>' + stepBtn('uitleg', 15, 'Uitleg 15 minuten meer') + '</div>'
          + '<div><span>Opdrachten</span>' + stepBtn('opdracht', -15, 'Opdrachten 15 minuten minder') + '<span class="pdetail__min">' + sd.opdracht + ' min</span>' + stepBtn('opdracht', 15, 'Opdrachten 15 minuten meer') + '</div>'
          + (plan.canEind && !sd.weekend && !has('eind') ? '<button type="button" class="btn btn--outline btn--xxs" data-pa="place" data-v="eind" data-fk="pl-eind">Plan eindtoets op deze dag</button>' : '')
          + (plan.canPraktijk && !sd.weekend && !has('praktijk') ? '<button type="button" class="btn btn--outline btn--xxs" data-pa="place" data-v="praktijk" data-fk="pl-praktijk">Plan praktijktoets op deze dag</button>' : '')
          + '</div>';
      }
      h += '</div>';
    }

    // Legenda
    const present = new Set();
    days.forEach(d => itemsOf(d).forEach(i => present.add(i.t)));
    h += '<div class="stack-8"><span class="mono-sm" style="font-weight:500;letter-spacing:.08em;text-transform:uppercase">Legenda · klik voor uitleg</span><div class="legend">'
      + ORDER.filter(t => present.has(t)).map(t => '<button type="button" data-pa="info" data-v="' + t + '" data-fk="lg-' + t + '" aria-pressed="' + (s.info === t) + '"><i aria-hidden="true" style="background:' + T[t].bg + ';color:' + T[t].fg + '">' + T[t].icon + '</i>' + esc(T[t].label) + '</button>').join('')
      + '</div>' + (s.info ? '<span class="legend__info">' + esc(T[s.info].label + ': ' + T[s.info].info) + '</span>' : '') + '</div>';

    this.el.classList.toggle('planner--narrow', !wide);
    K.renderHTML(this.el, h);
  };

  // Afdrukbare planning (ook te bewaren als pdf via het printvenster).
  Planner.prototype.print = function () {
    const plan = this.plan; if (!plan) return;
    let box = document.querySelector('.planner-print');
    if (!box) { box = document.createElement('div'); box.className = 'planner-print'; document.body.appendChild(box); }
    let rows = '', wk = null, n = 0;
    plan.days.forEach(d => {
      if (!d.plannable) return;
      const m = key(monday(parse(d.iso)));
      if (m !== wk) { wk = m; n++; rows += '<tr class="week"><td colspan="2">Week ' + n + '</td></tr>'; }
      const items = itemsOf(d);
      rows += '<tr><td>' + esc(fmt(d.iso, true)) + '</td><td>' + (items.length ? esc(items.map(i => i.short).join(' · ')) : '—') + '</td></tr>';
    });
    box.innerHTML = '<h1>' + esc(this.opts.title || 'Planning van je Kompas AI-traject') + '</h1>'
      + '<p>' + esc(fmt(plan.first, true) + ' t/m ' + fmt(plan.last, true)) + ' · ' + plan.werkdagen + ' werkdagen · feestdagen overgeslagen. Indicatieve planning; de definitieve planning stemmen we af in het intakegesprek.</p>'
      + '<table><thead><tr><th>Dag</th><th>Activiteiten</th></tr></thead><tbody>' + rows + '</tbody></table>';
    document.body.classList.add('print-plan');
    const done = () => { document.body.classList.remove('print-plan'); window.removeEventListener('afterprint', done); };
    window.addEventListener('afterprint', done);
    window.print();
  };

  K.Planner = Planner;
})(window.Kompas = window.Kompas || {});
