/*
 * Kompas AI – verzenden van formulieren
 * Stuurt aanvragen als JSON (POST) naar KOMPAS_CONFIG.formEndpoint, bijvoorbeeld Formspree.
 * Zonder endpoint staat de site in testmodus: er wordt niets verstuurd.
 * Het concept van het contactformulier blijft in sessionStorage ('kompas-form'),
 * zodat het niet verloren gaat als je tussendoor je configuratie aanpast.
 */
(function (K) {
  'use strict';
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const DRAFT_KEY = 'kompas-form';
  const endpoint = () => K.str(K.config.formEndpoint);

  async function send(payload) {
    const url = endpoint();
    if (!url) return { ok: true, test: true };
    const body = { ...payload, pagina: location.pathname.split('/').pop() || 'index.html', verzondenOp: new Date().toISOString(), utm: K.utm() };
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify(body) });
    if (!res.ok) throw new Error('Verzenden mislukt (' + res.status + ')');
    return { ok: true, test: false };
  }

  const draft = {
    get() { try { return JSON.parse(sessionStorage.getItem(DRAFT_KEY) || '{}') || {}; } catch (e) { return {}; } },
    set(patch) { try { sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ ...draft.get(), ...patch })); } catch (e) { /* ignore */ } },
    clear() { try { sessionStorage.removeItem(DRAFT_KEY); } catch (e) { /* ignore */ } }
  };

  K.forms = { EMAIL_RE, send, draft, testMode: () => !endpoint() };
})(window.Kompas = window.Kompas || {});
