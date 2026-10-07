/*
 * Kompas AI – gratis AI-scan
 * Eén vraag per scherm, automatisch door na een keuze, met een terugknop en vaste voortgang.
 * Uitslag: fase, score per thema, drie acties, e-mail en vervolgstap.
 */
(function (K) {
  'use strict';
  const card = document.querySelector('[data-scan]'), resultBox = document.querySelector('[data-scan-result]');
  if (!card) return;
  const esc = K.esc, core = K.core, forms = K.forms;

  const SCAN = [
    { q: 'Hoe gebruiken medewerkers nu AI-tools zoals ChatGPT, Copilot of Claude?', theme: 'Gebruik', o: ['Nog niet', 'Een paar mensen, op eigen houtje', 'Meerdere mensen, zonder afspraken', 'Breed, met duidelijke afspraken'] },
    { q: 'Zijn er afspraken over welke bedrijfsinformatie in AI-tools mag?', theme: 'Afspraken', o: ['Nee', 'Informeel', 'Op papier', 'Ja, en iedereen kent ze'] },
    { q: 'Weet je wat de EU AI Act van je bedrijf vraagt?', theme: 'AI Act', o: ['Nooit van gehoord', 'Ervan gehoord', 'Globaal', 'Ja, en we hebben maatregelen genomen'] },
    { q: 'Bij welke taken bespaart AI jullie nu tijd?', theme: 'Tijdwinst', o: ['Weten we niet', 'Af en toe', 'Bij een paar vaste taken', 'In meerdere processen'] },
    { q: 'Hoe zeker voelen medewerkers zich bij het controleren van AI-uitvoer?', theme: 'Vaardigheid', o: ['Onzeker', 'Wisselend', 'Redelijk zeker', 'Zeker'] },
    { q: 'Wie begeleidt het AI-gebruik binnen het bedrijf?', theme: 'Begeleiding', o: ['Niemand', 'Een enthousiaste collega', 'Iemand is verantwoordelijk', 'Vast aanspreekpunt met een plan'] }
  ];
  const LEVELS = [
    { name: 'Verkennen', ex: 'kickstart', text: 'Je team staat aan het begin. Begin met de basis: wat AI kan, waar het fout gaat en duidelijke afspraken over bedrijfsinformatie.' },
    { name: 'Experimenteren', ex: 'kickstart', text: 'Er wordt al met AI gewerkt, maar zonder vaste lijn. Afspraken en opdrachten per functie zorgen voor veilig en consistent gebruik.' },
    { name: 'Toepassen', ex: 'verdieping', text: 'AI is onderdeel van het werk. De winst zit nu in vaste werkwijzen per functie en in het bijhouden van wat het oplevert.' },
    { name: 'Borgen', ex: 'jaartraject', text: 'Je organisatie is al ver. Richt je op borging: vastleggen welke maatregelen je neemt en bijblijven bij nieuwe ontwikkelingen.' }
  ];
  const ACTIES = [
    ['Spreek af welke bedrijfsinformatie niet in AI-tools mag.', 'Laat iedereen één vaste taak met AI proberen, aan de hand van een voorbeeld.', 'Wijs één aanspreekpunt aan voor vragen over AI.'],
    ['Leg de afspraken over bedrijfsinformatie vast en deel ze met het team.', 'Kies per functie twee taken waarbij AI tijd bespaart.', 'Leer medewerkers AI-uitvoer controleren voordat ze die gebruiken.'],
    ['Maak vaste prompts per functie en bewaar ze op één plek.', 'Houd bij hoeveel tijd AI per week bespaart.', 'Leg vast welke maatregelen je neemt voor AI-geletterdheid (artikel 4 AI Act).'],
    ['Herhaal de basisafspraken elk jaar met het hele team.', 'Beoordeel nieuwe AI-tools en functies op risico voordat je ze gebruikt.', 'Leg deelname en voortgang vast als onderdeel van je AI-beleid.']
  ];
  const KEYS = ['A', 'B', 'C', 'D'];
  const SKEY = 'kompas-scan';

  let s = { a: [null, null, null, null, null, null], step: 0, email: '', sent: false, error: '' };
  try { const saved = JSON.parse(sessionStorage.getItem(SKEY) || 'null'); if (saved && Array.isArray(saved.a) && saved.a.length === 6) s = { ...s, a: saved.a, step: saved.step || 0, email: saved.email || '', sent: !!saved.sent }; } catch (e) { /* ignore */ }
  const persist = () => { try { sessionStorage.setItem(SKEY, JSON.stringify({ a: s.a, step: s.step, email: s.email, sent: s.sent })); } catch (e) { /* ignore */ } };
  let advanceT = null;

  const answered = () => s.a.filter(x => x !== null).length;
  const done = () => s.a.every(x => x !== null);
  function result() {
    const score = s.a.reduce((acc, b) => acc + (b || 0), 0);
    const li = s.a[0] === 0 ? 0 : score <= 4 ? 0 : score <= 9 ? 1 : score <= 14 ? 2 : 3, L = LEVELS[li];
    const exKey = core.EX[L.ex].werkdagen > core.limits().maxWd ? 'kickstart' : L.ex;
    return { score, li, L, exKey, exName: core.EX[exKey].name };
  }

  function progress() {
    const n = answered(), pct = Math.round(n / 6 * 100) + '%';
    document.querySelectorAll('[data-scan-count]').forEach(el => { el.textContent = String(n); });
    document.querySelectorAll('[data-scan-pct]').forEach(el => { el.textContent = pct; });
    document.querySelectorAll('[data-scan-bar]').forEach(el => { el.style.width = pct; });
  }

  function renderQuestion(focus) {
    const i = s.step, Q = SCAN[i];
    card.hidden = false; resultBox.hidden = true;
    card.innerHTML = '<div class="scan__step">'
      + '<div class="row" style="justify-content:space-between"><span class="mono-sm">Vraag ' + (i + 1) + ' van 6</span><span class="mono-sm">Thema · ' + esc(Q.theme) + '</span></div>'
      + '<h2 class="scan__q" id="scan-q" tabindex="-1">' + esc(Q.q) + '</h2>'
      + '<div class="scan__opts" role="group" aria-labelledby="scan-q">' + Q.o.map((label, oi) => '<button type="button" class="scan-opt" data-opt="' + oi + '" aria-pressed="' + (s.a[i] === oi) + '"><span class="scan-opt__k" aria-hidden="true">' + KEYS[oi] + '</span>' + esc(label) + '</button>').join('') + '</div>'
      + '</div>'
      + '<div class="scan__nav">'
      + (i > 0 ? '<button type="button" class="link-arrow link-arrow--sm" data-back><span class="arrow" aria-hidden="true">←</span> Vorige vraag</button>' : '<span></span>')
      + (s.a[i] !== null && i < 5 ? '<button type="button" class="link-arrow link-arrow--sm" data-next>Volgende <span class="arrow" aria-hidden="true">→</span></button>' : '<span class="text-xs">Kies een antwoord, of gebruik toets 1 tot 4</span>')
      + '</div>';
    if (focus) {
      // Houd de vraag in beeld (vooral op mobiel, waar de kaart onder de intro staat).
      const header = document.querySelector('[data-header]'), hh = header ? header.offsetHeight : 72, r = card.getBoundingClientRect();
      if (r.top < hh + 8 || r.top > window.innerHeight * 0.6) {
        try { window.scrollTo({ top: r.top + window.scrollY - hh - 16, behavior: K.reducedMotion() ? 'auto' : 'smooth' }); } catch (e) { /* ignore */ }
      }
      const h = card.querySelector('#scan-q'); if (h) try { h.focus({ preventScroll: true }); } catch (e) { /* ignore */ }
    }
    progress();
  }

  function choose(oi) {
    const i = s.step, first = answered() === 0, wasDone = done();
    s.a[i] = oi; persist();
    if (first) K.track('scan_start');
    K.track('scan_vraag', { vraag: i + 1, antwoord: oi + 1 });
    card.querySelectorAll('[data-opt]').forEach(b => b.setAttribute('aria-pressed', String(+b.getAttribute('data-opt') === oi)));
    progress();
    clearTimeout(advanceT);
    advanceT = setTimeout(() => {
      if (i < 5) { s.step = i + 1; persist(); renderQuestion(true); }
      else { if (!wasDone) K.track('scan_klaar', { fase: result().L.name }); s.step = 6; persist(); renderResult(true); }
    }, K.reducedMotion() ? 60 : 320);
  }

  function renderResult(focus) {
    const R = result(), { L, li } = R;
    card.hidden = true; resultBox.hidden = false;
    const themes = SCAN.map((Q, i) => '<div class="theme"><span>' + esc(Q.theme) + '</span><span class="theme__v">' + (s.a[i] || 0) + '/3</span><span class="theme__bar" aria-hidden="true">' + [0, 1, 2].map(k => '<i' + (k < (s.a[i] || 0) ? ' class="on"' : '') + '></i>').join('') + '</span></div>').join('');
    const testNote = forms.testMode() ? '<span class="test-notice">Testmodus: dit formulier verstuurt nog niets</span>' : '';
    resultBox.innerHTML = '<div class="result" id="scan-uitslag">'
      + '<span class="eyebrow">Jouw uitslag · ' + R.score + ' van 18 punten</span>'
      + '<h2 class="result__name" tabindex="-1">' + esc(L.name) + '</h2>'
      + '<div class="phase-bars" aria-label="Fase ' + (li + 1) + ' van 4">' + LEVELS.map((lv, i) => '<div><i' + (i <= li ? ' class="on"' : '') + '></i><span' + (i === li ? ' class="cur"' : '') + '>' + esc(lv.name) + '</span></div>').join('') + '</div>'
      + '<p style="font-size:18px;line-height:1.6;color:#dfe3ea;text-wrap:pretty">' + esc(L.text) + '</p>'
      + '<div class="stack-12"><span class="eyebrow eyebrow--muted">Score per thema</span><div class="themes">' + themes + '</div></div>'
      + '<div class="stack-12"><span class="eyebrow eyebrow--muted">Drie acties voor je team</span><ol>' + ACTIES[li].map(a => '<li>' + esc(a) + '</li>').join('') + '</ol></div>'
      + '<div class="result__block">'
      + (s.sent
        ? '<span style="font-size:15px;color:var(--gold)">' + (forms.testMode() ? 'Testmodus: er is niets verstuurd. ' : '') + esc(thanks(s.email)) + '</span>'
        : '<label for="scan-email" style="font-size:16px;font-weight:500">Wil je de uitslag en deze drie acties per e-mail? Bram stuurt ze je persoonlijk toe, met een korte toelichting.</label>'
          + '<form class="row" style="gap:8px;align-items:flex-start" data-scan-form novalidate>'
          + '<input class="input input--dark" id="scan-email" type="email" autocomplete="email" placeholder="naam@bedrijf.nl" style="flex:1 1 220px" value="' + esc(s.email) + '"' + (s.error ? ' aria-invalid="true" aria-describedby="scan-email-fout"' : '') + '>'
          + '<button type="submit" class="btn btn--light" style="height:46px;border-radius:10px">Stuur mij de uitslag</button></form>'
          + (s.error ? '<span class="field__error field__error--dark" id="scan-email-fout">' + esc(s.error) + '</span>' : '')
          + '<span class="text-xs" style="color:var(--on-ink-2)">Lees in onze <a href="privacy.html" style="color:var(--on-ink)">privacyverklaring</a> hoe we met je gegevens omgaan.</span>'
          + testNote)
      + '</div>'
      + '<div class="result__block" style="flex-direction:row;flex-wrap:wrap;align-items:center;gap:10px">'
      + '<a class="btn btn--accent" href="contact.html?type=kennismaking" data-scan-talk>Bespreek je uitslag (20 min) <span class="arrow" aria-hidden="true">→</span></a>'
      + '<a class="btn btn--ghost-light" href="pakketten.html#configurator" data-example="' + R.exKey + '">Bekijk het ' + esc(R.exName) + '-voorbeeld</a>'
      + '<button type="button" class="link-arrow link-arrow--sm" style="color:var(--on-ink-3)" data-edit>Antwoorden aanpassen</button>'
      + '<button type="button" class="link-arrow link-arrow--sm" style="color:var(--on-ink-3)" data-reset>Opnieuw</button>'
      + '</div></div>';
    progress();
    if (focus) {
      const h = resultBox.querySelector('.result__name');
      const top = resultBox.getBoundingClientRect().top + window.scrollY - ((document.querySelector('[data-header]') || {}).offsetHeight || 72) - 16;
      try { window.scrollTo({ top, behavior: K.reducedMotion() ? 'auto' : 'smooth' }); } catch (e) { /* ignore */ }
      if (h) try { h.focus({ preventScroll: true }); } catch (e) { /* ignore */ }
    }
  }

  // Formspree mailt de aanvraag naar Kompas AI; de bezoeker krijgt de uitslag persoonlijk van Bram.
  function thanks(email) {
    const rt = core.contactRt();
    return 'Bedankt! Bram stuurt je uitslag met een persoonlijke toelichting ' + (rt ? rt + ' ' : '') + 'naar ' + email + '.';
  }

  async function sendEmail(form) {
    const input = form.querySelector('#scan-email'), v = input.value.trim();
    s.email = v;
    if (!forms.EMAIL_RE.test(v)) { s.error = 'Vul een geldig e-mailadres in, bijvoorbeeld naam@bedrijf.nl.'; renderResult(false); const i = document.getElementById('scan-email'); if (i) i.focus(); return; }
    s.error = '';
    const btn = form.querySelector('button[type="submit"]'); btn.disabled = true; btn.textContent = 'Versturen…';
    const R = result();
    try {
      await forms.send({ type: 'AI-scan', _subject: 'Kompas AI · AI-scan: uitslag toesturen · ' + R.L.name, email: v, fase: R.L.name, score: R.score + ' van 18', antwoorden: SCAN.map((Q, i) => Q.theme + ': ' + Q.o[s.a[i]]), acties: ACTIES[R.li] });
      K.track('scan_email', { fase: R.L.name });
      s.sent = true; persist(); renderResult(false);
    } catch (e) {
      s.error = 'Versturen lukte niet. Probeer het opnieuw' + (K.str(K.config.contactEmail) ? ' of mail naar ' + K.str(K.config.contactEmail) : '') + '.';
      renderResult(false);
    }
  }

  card.addEventListener('click', e => {
    const opt = e.target.closest('[data-opt]'); if (opt) { choose(+opt.getAttribute('data-opt')); return; }
    if (e.target.closest('[data-back]')) { clearTimeout(advanceT); s.step = Math.max(0, s.step - 1); persist(); renderQuestion(true); return; }
    if (e.target.closest('[data-next]')) { clearTimeout(advanceT); s.step = Math.min(5, s.step + 1); persist(); renderQuestion(true); }
  });
  resultBox.addEventListener('submit', e => { const f = e.target.closest('[data-scan-form]'); if (f) { e.preventDefault(); sendEmail(f); } });
  resultBox.addEventListener('click', e => {
    if (e.target.closest('[data-reset]')) { s = { a: [null, null, null, null, null, null], step: 0, email: '', sent: false, error: '' }; persist(); renderQuestion(true); card.scrollIntoView({ block: 'center' }); return; }
    if (e.target.closest('[data-edit]')) { s.step = 0; persist(); renderQuestion(true); return; }
    if (e.target.closest('[data-scan-talk]')) {
      const R = result();
      K.track('scan_cta_gesprek');
      K.track('cta_aanvraag', { type: 'Kennismaking', pagina: K.page });
      const d = forms.draft.get(), patch = { type: 'Kennismaking' };
      if (!d.bericht) patch.bericht = 'Ik wil graag de uitslag van de AI-scan bespreken (fase ' + R.L.name + ', ' + R.score + ' van 18 punten).';
      if (!d.email && forms.EMAIL_RE.test(s.email)) patch.email = s.email;
      forms.draft.set(patch);
    }
  });
  document.addEventListener('keydown', e => {
    if (card.hidden || e.ctrlKey || e.metaKey || e.altKey) return;
    const tag = (e.target.tagName || '').toLowerCase(); if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
    const k = e.key.toUpperCase(), idx = ['1', '2', '3', '4'].indexOf(k) >= 0 ? +k - 1 : KEYS.indexOf(k);
    if (idx >= 0 && card.getBoundingClientRect().top < window.innerHeight) { e.preventDefault(); choose(idx); }
  });

  if (s.step >= 6 && done()) renderResult(false); else { s.step = Math.min(s.step, 5); renderQuestion(false); }
})(window.Kompas = window.Kompas || {});
