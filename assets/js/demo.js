/*
 * Kompas AI – demo van de leeromgeving
 * Leerpad en niveau wisselen, lessen kiezen, opdracht inleveren en de coach een bericht sturen.
 */
(function (K) {
  'use strict';
  const root = document.querySelector('[data-demo]');
  if (!root) return;
  const esc = K.esc, rt = K.core.reactietijd();
  const q = n => root.querySelector('[data-demo="' + n + '"]');

  const ROLES = ['Marketing & communicatie', 'Administratie & finance', 'HR & recruitment', 'Sales & klantcontact'];
  const LESSONS = [
    { title: 'Wat AI wel en niet kan', dur: '12 min', sum: 'Hoe taalmodellen werken, waar ze sterk in zijn en waar ze fouten maken.', points: ['AI voorspelt tekst, het weet niet automatisch wat waar is.', 'Sterk in schrijven, samenvatten en structureren.', 'Zwak in actuele feiten, rekenwerk en bronnen zonder controle.'] },
    { title: 'Goed prompten in vier stappen', dur: '15 min', sum: 'Rol, context, opdracht en vorm: zo krijg je bruikbare antwoorden.', points: ['Geef AI een rol en vertel voor wie het antwoord is.', 'Voeg context toe die een collega ook nodig zou hebben.', 'Vraag om een vaste vorm, zoals een lijst of een tabel.'] },
    { title: 'Veilig werken met bedrijfsinformatie', dur: '14 min', sum: 'Welke gegevens je wel en niet invoert, en wat de afspraken binnen jouw bedrijf zijn.', points: ['Persoonsgegevens van klanten en collega’s horen niet in een openbare AI-tool.', 'Anonimiseer voorbeelden voordat je ze gebruikt.', 'Twijfel je? Check de afspraken of vraag je coach.'] },
    { title: 'AI-uitvoer controleren', dur: '12 min', sum: 'Feiten checken, bronnen nagaan en herkennen wanneer een antwoord niet klopt.', points: ['Controleer namen, cijfers en data altijd zelf.', 'Vraag AI om aan te geven waar het onzeker is.', 'Jij blijft verantwoordelijk voor wat je verstuurt.'] },
    { title: 'AI in je eigen workflow', dur: '18 min', sum: 'Van losse vraag naar vaste werkwijze voor taken die je elke week doet.', points: ['Kies één terugkerende taak om mee te beginnen.', 'Bewaar prompts die goed werken als sjabloon.', 'Houd bij hoeveel tijd het je bespaart.'] },
    { title: 'Jouw persoonlijke AI-werkwijze', dur: '15 min', sum: 'Je legt vast welke taken je met AI doet en hoe je de kwaliteit bewaakt.', points: ['Maak een overzicht van je vaste AI-taken.', 'Spreek per taak af wat je altijd zelf controleert.', 'Deel je werkwijze met je team.'] }
  ];
  const TASKS = [
    ['Laat AI drie varianten van een LinkedIn-post maken en noteer welke fouten of clichés je ziet.', 'Schrijf een prompt voor een nieuwsbrief-intro met rol, context, opdracht en vorm. Vergelijk het resultaat met je eerste poging.', 'Bepaal welke klantgegevens uit een campagnebriefing je eerst moet weghalen voordat je AI gebruikt.', 'Laat AI een blog samenvatten en controleer elke bewering tegen de originele tekst.', 'Maak een vaste prompt voor het herschrijven van advertentieteksten in jullie tone of voice.', 'Beschrijf drie marketingtaken die je voortaan met AI doet, en hoe je de kwaliteit bewaakt.'],
    ['Vraag AI om een btw-regel uit te leggen en markeer wat je zou moeten nachecken.', 'Schrijf een prompt die een rommelige e-mail van een klant omzet in een overzichtelijke takenlijst.', 'Ga na welke gegevens op een factuur persoonsgegevens zijn en dus niet in een openbare AI-tool horen.', 'Laat AI een tabel met bedragen optellen en controleer het resultaat zelf.', 'Bouw een vaste prompt voor een betalingsherinnering in drie verschillende toonhoogtes.', 'Leg vast welke administratieve taken je met AI versnelt, en welke controle je altijd zelf doet.'],
    ['Laat AI een vacaturetekst beoordelen en noteer waar het advies te algemeen blijft.', 'Schrijf een prompt voor een inclusieve vacaturetekst, met de functie-eisen als context.', 'Bepaal welke cv-gegevens je nooit in een AI-tool invoert, en hoe je een cv anonimiseert.', 'Controleer een door AI geschreven afwijzingsmail op toon, feiten en risico’s.', 'Maak een vaste prompt voor het voorbereiden van interviewvragen per functie.', 'Beschrijf hoe AI jouw wervingsproces ondersteunt en waar altijd een mens beslist.'],
    ['Laat AI een bezwaar van een klant beantwoorden en beoordeel of je het zo zou versturen.', 'Schrijf een prompt voor een follow-upmail na een kennismakingsgesprek.', 'Ga na welke klantinformatie uit je CRM je wel en niet in een AI-tool mag plakken.', 'Laat AI productinformatie samenvatten en controleer prijzen en voorwaarden.', 'Maak een vaste prompt om een klantgesprek voor te bereiden op basis van je notities.', 'Leg vast welke salestaken je met AI doet en hoe je het persoonlijke contact bewaakt.']
  ];
  const LEVELS = [
    { name: 'Beginner', hint: 'Je krijgt een uitgewerkt voorbeeld en vaste stappen om te volgen.' },
    { name: 'Toepassen', hint: 'Je past de stappen toe op een eigen taak, met minder sturing.' },
    { name: 'Zelfstandig', hint: 'Je kiest zelf een taak, bepaalt waar AI helpt en legt je aanpak vast.' }
  ];

  const s = { role: 0, level: 1, lesson: 2, done: [true, true, false, false, false, false], tab: 'les', chat: [{ from: 'coach', text: 'Hoi! Mooi dat je les 1 en 2 hebt afgerond. Les 3 gaat over bedrijfsinformatie. Twijfel je of iets gevoelig is? Stuur gerust een bericht.' }], typing: false };
  let replyT = null, playT = null;

  function render() {
    const L = LESSONS[s.lesson], doneCount = s.done.filter(Boolean).length, pct = Math.round(doneCount / 6 * 100) + '%';
    q('roleName').textContent = ROLES[s.role]; q('roleName2').textContent = ROLES[s.role];
    q('progress').textContent = pct; q('progressBar').style.width = pct;
    K.renderHTML(q('lessons'), LESSONS.map((ls, i) => {
      const st = s.done[i] ? ' · afgerond' : (i === s.lesson ? ' · nu' : '');
      return '<li><button type="button" class="lesson-btn' + (s.done[i] ? ' lesson-btn--done' : (i === s.lesson ? ' lesson-btn--now' : '')) + '" data-lesson="' + i + '" data-fk="les-' + i + '"' + (i === s.lesson ? ' aria-current="step"' : '') + '>'
        + '<span class="lesson-btn__dot" aria-hidden="true"></span><span class="lesson-btn__t"><b>' + esc(ls.title) + '</b><small>Les ' + (i + 1) + ' · ' + ls.dur + st + '</small></span></button></li>';
    }).join(''));
    K.renderHTML(q('roles'), ROLES.map((r, i) => '<button type="button" class="chip chip--sm" data-role="' + i + '" data-fk="role-' + i + '" aria-pressed="' + (s.role === i) + '">' + esc(r) + '</button>').join('')
      + '<a class="chip chip--sm chip--dashed" href="contact.html?type=leerpad-op-aanvraag" data-cta="Leerpad op aanvraag">Ander leerpad: op aanvraag</a>');
    K.renderHTML(q('levels'), LEVELS.map((lv, i) => '<button type="button" class="chip chip--sm" data-level="' + i + '" data-fk="lvl-' + i + '" aria-pressed="' + (s.level === i) + '">' + lv.name + '</button>').join(''));
    q('lessonMeta').textContent = 'UITLEG · LES ' + (s.lesson + 1) + ' · ' + L.dur;
    q('lessonTitle').textContent = L.title; q('lessonSum').textContent = L.sum; q('videoDur').textContent = L.dur;
    q('points').innerHTML = L.points.map(p => '<li>' + esc(p) + '</li>').join('');
    q('task').textContent = TASKS[s.role][s.lesson];
    q('levelName').textContent = LEVELS[s.level].name; q('levelHint').textContent = LEVELS[s.level].hint;
    q('done').textContent = s.done[s.lesson] ? 'Afgerond ✓' : 'Markeer als afgerond';
    const log = q('chat'), chatKey = s.chat.length + ':' + s.typing;
    if (log._key !== chatKey) {
      const n = log.querySelectorAll('.msg').length;
      log.querySelectorAll('.typing').forEach(el => el.remove());
      s.chat.slice(n).forEach(m => log.insertAdjacentHTML('beforeend', '<div class="msg' + (m.from === 'me' ? ' msg--me' : '') + '">' + esc(m.text) + '</div>'));
      if (s.typing) log.insertAdjacentHTML('beforeend', '<div class="typing" aria-label="Coach typt"><i></i><i></i><i></i></div>');
      log._key = chatKey; log.scrollTop = log.scrollHeight;
    }
    root.querySelectorAll('[data-tab]').forEach(b => b.setAttribute('aria-pressed', String(b.getAttribute('data-tab') === s.tab)));
    root.querySelectorAll('[data-panel]').forEach(p => p.classList.toggle('is-active', p.getAttribute('data-panel') === s.tab));
  }

  function coachReply(text) {
    clearTimeout(replyT); s.typing = true; render();
    replyT = setTimeout(() => {
      s.typing = false; s.chat.push({ from: 'coach', text });
      const tab = root.querySelector('[data-tab="coach"]');
      if (tab && s.tab !== 'coach' && getComputedStyle(root.querySelector('.app-tabs')).display !== 'none') tab.classList.add('has-unread');
      render();
    }, 1100);
  }

  // Samenvatting van de les als korte 'video': de drie kernpunten na elkaar.
  function stopVideo() {
    clearInterval(playT); playT = null;
    const v = q('video'), sl = v.querySelector('.video__slide'); if (sl) sl.remove();
    q('play').hidden = false; const bar = q('videoBar'); bar.style.transition = 'none'; bar.style.width = '0';
  }
  function playVideo() {
    stopVideo();
    const v = q('video'), pts = LESSONS[s.lesson].points, step = 3200, bar = q('videoBar');
    let i = 0;
    const show = () => {
      const old = v.querySelector('.video__slide'); if (old) old.remove();
      const d = document.createElement('p'); d.className = 'video__slide'; d.setAttribute('aria-live', 'polite');
      d.innerHTML = '<small>Kernpunt ' + (i + 1) + ' van ' + pts.length + '</small>' + esc(pts[i]);
      v.insertBefore(d, v.firstChild);
    };
    q('play').hidden = true;
    void bar.offsetWidth; bar.style.transition = 'width ' + (step * pts.length) + 'ms linear'; bar.style.width = '100%';
    show();
    playT = setInterval(() => { i++; if (i >= pts.length) { stopVideo(); return; } show(); }, step);
  }

  root.addEventListener('click', e => {
    const t = e.target;
    const les = t.closest('[data-lesson]'); if (les) { stopVideo(); s.lesson = +les.getAttribute('data-lesson'); if (s.tab === 'lessen') s.tab = 'les'; render(); return; }
    const role = t.closest('[data-role]'); if (role) { s.role = +role.getAttribute('data-role'); render(); return; }
    const lvl = t.closest('[data-level]'); if (lvl) { s.level = +lvl.getAttribute('data-level'); render(); return; }
    const tab = t.closest('[data-tab]'); if (tab) { s.tab = tab.getAttribute('data-tab'); if (s.tab === 'coach') tab.classList.remove('has-unread'); render(); return; }
    if (t.closest('[data-demo="play"]')) { playVideo(); return; }
    if (t.closest('[data-demo="done"]')) { s.done[s.lesson] = !s.done[s.lesson]; render(); return; }
    if (t.closest('[data-demo="submit"]')) {
      const ta = document.getElementById('taak-invoer'), v = ta.value.trim();
      s.done[s.lesson] = true;
      s.chat.push({ from: 'me', text: 'Opdracht bij les ' + (s.lesson + 1) + ' ingeleverd' + (v ? ': ' + v.slice(0, 120) : '.') });
      ta.value = '';
      coachReply('Je opdracht is ontvangen. Je krijgt feedback ' + rt + '.');
    }
  });
  q('chatForm').addEventListener('submit', e => {
    e.preventDefault();
    const inp = document.getElementById('chat-invoer'), v = inp.value.trim(); if (!v) return;
    s.chat.push({ from: 'me', text: v }); inp.value = '';
    coachReply('Je vraag is binnen. Je krijgt antwoord ' + rt + '. (Demo: in de echte leeromgeving antwoordt je coach persoonlijk.)');
  });

  render();
})(window.Kompas = window.Kompas || {});
