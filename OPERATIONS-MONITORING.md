# Betrieb, Monitoring und Cutover

Stand: 16.07.2026

## Was im Projekt automatisiert ist

- `scripts/check-production.mjs` prüft Homepage, wichtige Unterseiten, Sitemap, Robots, `/home`-Redirects, echte 404, den 410-Asset-Namensraum und zentrale Security-Header.
- `npm run social:check` prüft die 14 Social-Metadatensätze und Vorschaubilder rein lesend; `prepare:pages` blockiert bei einem veralteten Stand.
- `npm test` prüft Unit/Integrität, CSP, Cloudflare-Pages-Routing, sämtliche Seiten in Chromium, Firefox und WebKit, Mobile, Performance-Budgets und lokale LCP-/CLS-Grenzen.

Das Projekt verwendet bewusst kein Git/GitHub. `npm test` ist deshalb vor jedem Direktupload verpflichtend, startet die statische Vorschau und die Pages-Runtime selbst und beendet beide auch bei einem Fehler zuverlässig. Die Pages-Runtime nutzt das in `wrangler.jsonc` festgeschriebene Kompatibilitätsdatum `2026-07-15`.

## Cloudflare-Direktupload

Einmalig meldet sich eine berechtigte Person im Browser an und legt das Direct-Upload-Projekt mit Produktionsbranch `main` an:

```bash
npx wrangler login
npx wrangler pages project create
```

Danach wird ein geprüfter Stand zunächst als geschützte Preview und erst nach Abnahme als Produktion hochgeladen:

```bash
npm test
npm run prepare:pages
npx wrangler pages deploy .pages-dist --project-name <projektname> --branch preview
npx wrangler pages deploy .pages-dist --project-name <projektname> --branch main
```

Der Upload läuft über Wrangler, damit die vorhandene Pages Function zuverlässig mit ausgeliefert wird. Für den aktuellen Mailto-basierten Funktionsumfang sind keine Runtime-Secrets erforderlich.

## Cloudflare vor Preview und Produktion

1. Preview-Deployments über Cloudflare Access auf das Team begrenzen. Header `X-Robots-Tag: noindex` auf der tatsächlichen Preview-URL prüfen.
2. TLS auf Preview und Produktionsdomain prüfen. HSTS zunächst ohne `includeSubDomains`/`preload` belassen; Erweiterung erst nach Inventur aller Subdomains.

Cloudflare unterstützt Bindings getrennt für Preview und Produktion. Preview-URLs sind standardmäßig öffentlich, können mit Access geschützt werden und erhalten standardmäßig `X-Robots-Tag: noindex`: [Pages Bindings](https://developers.cloudflare.com/pages/functions/bindings/), [Preview Deployments](https://developers.cloudflare.com/pages/configuration/preview-deployments/).

## Cutover-Abnahme

Vor dem Domainwechsel gegen die Preview-URL, direkt danach gegen Produktion:

```bash
npm test
node scripts/check-production.mjs https://preview-domain.example
node scripts/check-production.mjs https://yorck-consulting.com
```

Zusätzlich manuell:

- Homepage und je eine Case-/Insight-Seite bei 320, 360, 390 und 430 px öffnen.
- Menü in Mobile Safari, Chrome Android, Firefox und Desktop-Safari/Chrome/Edge testen.
- mailto-Link öffnen und Zieladresse prüfen.
- Canonical, Sitemap, interne Links, 404 und Redirects aus der ausgelieferten Produktionsversion prüfen.
- CSP-Konsole und Network-Tab auf blockierte eigene Ressourcen oder ungewollte Drittanbieter-Requests prüfen.

Vor-Cutover-Snapshot vom 14.07.2026 (damals 10 Prüfungen, seit Entfernung des Kontaktendpunkts sind es 9): Die öffentliche Altfassung bestand nur 1 von 10 erweiterten Prüfungen (`sitemap.xml`). Root lieferte 302, `/home` und `/home/` noch 200, `robots.txt`, neue Case-/Insight-URLs und der 410-Namensraum jeweils 404. Der unbekannten URL fehlten zudem die neuen Security-Header. Erst ein vollständig grüner Produktionsmonitor bestätigt den Cutover.

## Alarme und Datenschutz in Logs

Alarmieren bei:

- jedem 404 auf einer URL der Migrationsliste;
- HTML-404-Anteil über 1 % innerhalb von 24 Stunden;
- Redirect-Loops oder Redirects auf eine fremde Domain;
- einem fehlgeschlagenen manuellen oder später extern geplanten Produktionsmonitor.

Zugriffe auf Logs vierteljährlich prüfen; Aufbewahrung so kurz wie für Fehlersuche und Trendalarmierung nötig festlegen.

Cloudflare HTTP Traffic beziehungsweise Log Explorer nach 404/410 gruppieren. Tarif- und zugangsabhängige Details: [Cloudflare Log Explorer](https://developers.cloudflare.com/log-explorer/).

## Search Console und reale Core Web Vitals

Search Console benötigt Google- und DNS-Zugriff und kann nicht aus dem Repository aktiviert werden:

1. Domain-Property `yorck-consulting.com` anlegen.
2. Google-TXT-Eintrag dauerhaft im DNS hinterlegen.
3. `https://yorck-consulting.com/sitemap.xml` einreichen.
4. `/`, `/cases/`, `/insights/` sowie je eine Detailseite per URL-Prüfung kontrollieren.
5. Indexierung, Sitemap-Fehler und CWV nach 24 Stunden, 7 Tagen und 30 Tagen prüfen.

Grundlagen: [DNS-Verifikation](https://support.google.com/webmasters/answer/9008080), [Sitemaps-Bericht](https://support.google.com/webmasters/answer/7451001), [Core-Web-Vitals-Bericht](https://support.google.com/webmasters/answer/9205520?hl=de).

Cloudflare Web Analytics erst nach Datenschutzprüfung aktivieren und reale P75-Werte beobachten. Zielwerte:

- LCP höchstens 2,5 Sekunden
- INP höchstens 200 Millisekunden
- CLS höchstens 0,1

Lokale Labortests sind Regressionstests, keine Felddaten. Search Console zeigt CrUX-Werte erst bei ausreichendem Traffic.

## Incident und Rollback

Bei schwerem Fehler:

1. Letztes grünes Produktionsdeployment im Cloudflare-Pages-Dashboard unter Deployments auswählen und auf dieses Deployment zurückrollen.
2. Produktionsmonitor erneut ausführen.
3. Vorfall, Zeitraum, Auswirkung, Ursache und Korrektur dokumentieren.

Cloudflare kann auf jedes zuvor erfolgreiche Produktionsdeployment sofort zurückrollen; Preview-Deployments sind keine Rollback-Ziele: [Pages Rollbacks](https://developers.cloudflare.com/pages/configuration/rollbacks/).
