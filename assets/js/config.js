/*
 * Kompas AI – instellingen van de website
 * ---------------------------------------------------------------------------
 * Alle instelbare waarden staan hier op één plek. De namen zijn gelijk aan de
 * props uit het ontwerp (zie OVERDRACHT.md), zodat de overdracht blijft kloppen.
 * Een leeg tekstveld ('') betekent: niet tonen.
 * Na het opslaan van dit bestand: vernieuw de pagina in de browser.
 */
window.KOMPAS_CONFIG = {

  /* ── Bedrijfsgegevens ───────────────────────────────────────────────── */
  contactEmail: '',      // bijv. 'hallo@kompas-ai.nl' — verschijnt in header, footer en contact
  kvkNummer: '',         // footer en privacyverklaring
  btwNummer: '',
  adres: '',
  linkedinUrl: '',       // LinkedIn-profiel op de Over-pagina
  portaalUrl: '',        // adres van de leeromgeving; leeg = geen 'Inloggen'-link

  /* ── Formulieren ────────────────────────────────────────────────────────
   * Adres dat de aanvragen ontvangt als JSON (POST), bijvoorbeeld een
   * Formspree-formulier ('https://formspree.io/f/xxxxxxx') of een eigen API.
   * Leeg = testmodus: de bevestiging verschijnt, maar er wordt niets verstuurd.
   */
  formEndpoint: '',

  /* ── Inhoud ────────────────────────────────────────────────────────── */
  chatReactietijd: 'binnen 48 uur, vaak al dezelfde dag',
  contactReactietijd: 'binnen 1 werkdag',   // '' = geen reactietijd beloven
  leerpadOpties: 'Marketing & communicatie, Administratie & finance, HR & recruitment, Sales & klantcontact',
  showFounding: true,     // blok 'Founding partners' op de homepage
  kvkBron: '',            // bron van het 7%-cijfer (AI Act); leeg = cijfer verborgen
  vergelijkingDatum: '',  // bijv. 'oktober 2026', voor de voetnoot bij de vergelijking

  /* ── Tarieven (excl. btw) ───────────────────────────────────────────── */
  rateOpstart: 395,          // eenmalig
  ratePlatform: 5,           // per medewerker per week
  rateUitleg: 14,            // per uur per medewerker
  rateOpdracht: 22,          // per uur per medewerker, incl. feedback
  rateChat: 2,               // per medewerker per week
  rateBellen: 40,            // per belmoment van 15 minuten
  rateKennischeck: 3,        // per medewerker per leerweek
  rateEindtoets: 25,         // per medewerker
  ratePraktijktoets: 60,     // per medewerker
  rateManagersessie: 95,     // per sessie
  rateMaandrapportage: 45,   // per rapportage
  wekenPerModule: 1,         // leerweken per kennischeck

  /* ── Capaciteit ─────────────────────────────────────────────────────── */
  maxMedewerkers: 100,
  grootVoorstelVanaf: 50,    // vanaf dit aantal + 1: 'groot voorstel'
  pilotModus: false,         // true = looptijd maximaal 60 werkdagen
  coachUrenPerWeek: 8,
  feedbackMinutenPerOpdrachtuur: 10,
  chatMinutenPerMedewerkerPerWeek: 3,
  praktijktoetsMinuten: 30,
  managersessieMinuten: 45,
  maandrapportageMinuten: 30,

  /* ── Snelle modus van de configurator ──────────────────────────────── */
  startInSnelleModus: true,
  lichtUitleg: 0.5,     lichtOpdracht: 0.5,     lichtBellen: 0,
  normaalUitleg: 1,     normaalOpdracht: 1,     normaalBellen: 1,
  intensiefUitleg: 1,   intensiefOpdracht: 2,   intensiefBellen: 2
};
