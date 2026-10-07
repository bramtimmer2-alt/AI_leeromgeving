# Kompas AI – website

Statische website op basis van het Claude Design-ontwerp (`Kompas AI Website.dc.html`).
Gewone HTML, CSS en JavaScript: geen build-stap en geen afhankelijkheden.

## Bekijken
- Dubbelklik `index.html`, of
- upload de hele map naar een webhost (Netlify, Vercel, Cloudflare Pages, TransIP enz.).
  `404.html` gaat uit van publicatie in de root van het domein.

## Instellen: `assets/js/config.js`
Alle instelbare waarden staan op één plek, met dezelfde namen als de props in het ontwerp:
- **Bedrijfsgegevens**: `contactEmail`, `kvkNummer`, `btwNummer`, `adres`, `linkedinUrl`.
  Leeg betekent niet tonen.
- **`portaalUrl`**: adres van de leeromgeving. Leeg betekent geen ‘Inloggen’-link.
- **`formEndpoint`**: adres dat de formulieren ontvangt als JSON (bijvoorbeeld een Formspree-formulier).
  Leeg betekent **testmodus**: de bevestiging verschijnt, maar er wordt niets verstuurd,
  en op de formulieren staat het label ‘Testmodus’.
- Tarieven, capaciteit, intensiteit, reactietijden, leerpaden, `kvkBron` en `vergelijkingDatum`.

## Structuur
| Pagina | Bestand |
|---|---|
| Home | `index.html` |
| Werkwijze | `werkwijze.html` |
| Pakketten & prijzen (configurator, agenda, FAQ) | `pakketten.html` |
| Leeromgeving op maat | `leeromgeving-op-maat.html` |
| Demo | `demo.html` |
| AI-scan | `ai-scan.html` |
| Over | `over.html` |
| Contact en offerte (met bevestiging) | `contact.html?type=…` (kennismaking, offerte, groot-voorstel, live-demo, founding-partner, leerpad-op-aanvraag) |
| Juridisch | `privacy.html`, `voorwaarden.html` |

- `assets/js/core.js` bevat de prijs- en planningslogica (CORE uit het ontwerp), zonder DOM.
  Gecontroleerd tegen de vijf trajecten uit OVERDRACHT §3: € 3.395, € 16.890, € 50.480, € 78.170
  en Leerpad op aanvraag, inclusief einddata en coachminuten.
- De configuratie wordt gedeeld via `localStorage` (`kompas-site-v4`), het concept van het contactformulier via `sessionStorage`.
- Tracking: `dataLayer`-events met UTM-waarden, zoals in het ontwerp. Er is nog geen tag manager of consentbanner.
- Header en footer staan in elk HTML-bestand. Wijzig je het menu, pas het dan op alle pagina’s aan.

## Bewuste aanpassingen ten opzichte van het ontwerp
- Echte URL’s per pagina in plaats van `#/`-routes (beter voor SEO en campagnes).
- Plaatshouders vervangen door echte beelden en productvoorbeelden in HTML.
  Op de homepage staat een voorbeeld van de leeromgeving, op Op maat een huisstijlvoorbeeld dat je zelf kunt kleuren.
- Op de homepage staat een strook met de coach (foto van Bram, advies uit de UX-audit).
- AI-scan: één vraag per scherm, met terugknop, toetsen 1–4 en een score per thema.
- Automatisch verdelen van leerpaden: de rest gaat naar de grootste restwaarden (5/2/2/2 wordt 4/2/2/2, niet 7/1/1/1).
  Dit heeft geen invloed op de prijs.
- Startkaarten tonen de looptijd in weken. Een startdatum in het verleden schuift naar de eerstvolgende maandag.
- ‘Download planning’ opent de printweergave, waar je de planning ook als pdf kunt bewaren.

## Nog te doen vóór livegang
- [ ] `contactEmail`, KvK, btw en adres invullen in `config.js`
- [x] `formEndpoint` ingesteld op Formspree (aanvragen komen bij jou binnen; de AI-scan-uitslag stuur je zelf persoonlijk toe)
- [ ] Een testaanvraag versturen op de live site (contactformulier én AI-scan)
- [ ] Privacyverklaring en voorwaarden aanvullen (zoek op `todo` en `[invullen]`) en juridisch laten controleren
- [ ] AI Act-teksten controleren via EUR-Lex (zoek op `CONTROLEER`)
- [ ] Domein bekend? Maak `og:image` absoluut en voeg canonical-tags en een sitemap toe
- [ ] Eventueel: lettertypen zelf hosten in plaats van Google Fonts, en een consentbanner bij het toevoegen van analytics
