/* Kompas AI – huisstijlvoorbeeld op 'Leeromgeving op maat' */
(function () {
  'use strict';
  const box = document.querySelector('[data-brand-demo]');
  if (!box) return;
  const mock = box.querySelector('[data-brand-mock]'), input = box.querySelector('[data-brand-name]');
  const label = box.querySelector('[data-brand-label]'), initials = box.querySelector('[data-brand-initials]'), url = box.querySelector('[data-brand-url]');

  box.addEventListener('click', e => {
    const sw = e.target.closest('[data-color]'); if (!sw) return;
    box.querySelectorAll('[data-color]').forEach(b => b.setAttribute('aria-pressed', String(b === sw)));
    mock.style.setProperty('--brand', sw.getAttribute('data-color'));
  });

  const slug = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'jouw-bedrijf';
  const letters = s => { const w = s.split(/\s+/).filter(Boolean); return ((w[0] || 'J')[0] + (w[1] ? w[1][0] : (w[0] || 'JB')[1] || '')).toUpperCase(); };
  input.addEventListener('input', () => {
    const name = input.value.trim() || 'Jouw bedrijf';
    label.textContent = name;
    initials.textContent = input.value.trim() ? letters(name) : 'JB';
    url.textContent = 'leeromgeving · ' + slug(input.value.trim());
  });
})();
