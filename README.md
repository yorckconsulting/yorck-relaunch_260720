# Yorck Consulting — Relaunch

Statische HTML/CSS/JS-Website ohne Server-Backend; Kontakt ausschließlich über einen mailto-Link. Es gibt keine Datenbank, Benutzerkonten oder Admin-Oberfläche; Authentifizierung, Rollen, SQL-Schutz, Sessions und Datei-Uploads sind deshalb für den aktuellen Umfang nicht anwendbar.

## Lokale Entwicklung

Voraussetzung: Node.js 24 und Python 3.

```bash
npm ci
npm run setup:test-browsers
npm run serve
```

Die Browserinstallation ist nur nach einer frischen Einrichtung beziehungsweise einem Playwright-Update nötig.

Die Vorschau unter `http://127.0.0.1:8765` ist für Oberfläche, Mobile und Performance. Sie liefert Seiten wie Cloudflare ohne `.html` aus (`/cases/kita` aus `cases/kita.html`), bildet aber Functions, Redirects und `_headers` nicht ab.

Für die echte Worker-Runtime mit Redirects und `_headers`:

```bash
npm run prepare:pages
npx wrangler dev --port 8788
```

`.pages-dist` enthält ausschließlich auslieferbare Dateien. Tests, Dependencies, Dokumentation und lokale Secrets werden nicht deployt.
`wrangler.jsonc` hält dafür das getestete Kompatibilitätsdatum `2026-07-15` verbindlich fest.

CSS und JavaScript werden im Deployment-Artefakt automatisch mit einem zwölfstelligen SHA-256-Inhaltshash benannt. Die HTML-Quelldateien verwenden bewusst die lesbaren Namen `styles.css` und `main.js`; manuelle `?v=`-Nummern sind dafür nicht nötig. Für Bilder gilt das nicht, siehe Abschnitt „Bilder“.

## Arbeitsablauf und Branches

- `main` ist die Produktion. Jeder Stand auf `main` geht sofort live.
- `integration` ist der Abnahme-Branch. Alle Änderungen landen zuerst dort.
- Neue Branches werden von `integration` abgezweigt (zum Beispiel `feature/…`), der Pull Request geht mit `--base integration` nach `integration`. Nie direkt auf `main` committen oder pushen.
- Cloudflare Workers Builds baut jeden Branch als Vorschau unter `https://<branch>-yorck-relaunch260720.<konto>.workers.dev`. Der Check-Run `Workers Builds` am Commit zeigt Status und Vorschau-URL.
- Ein Pull Request nach `integration` wird gemergt, sobald der Build grün ist und die Prüfungen aus „Tests“ bestanden sind.
- Nach `main` geht nichts ohne ausdrückliche Freigabe: kein Merge, kein Push, kein Pull Request, kein Auto-Merge.
- Nach dem Preview-Build einer Änderung: `node scripts/check-production.mjs <Vorschau-URL>` muss alle Prüfungen bestehen.

## URL-Schema

Seiten werden ohne `.html` adressiert (`/cases/kita`, `/impressum`); Verzeichnis-Seiten behalten den Schrägstrich (`/cases/`, `/insights/`). Canonical, `og:url`, Sitemap, `robots.txt`, JSON-LD und alle internen Links verwenden dieses Schema. Cloudflare Workers Assets liefert die Seiten so aus. Alte `.html`-Adressen leitet `_redirects` mit 301 auf die saubere Adresse um (`/*.html /:splat 301`, `index.html` einzeln), die Alt-URLs der Canva-Website (`/home`) auf `/`. Details und Prüfbefehle stehen in `URL-MIGRATION.md`.

## Inhalte und Social-Vorschauen

Alle 19 öffentlichen Seiten besitzen vollständige Open-Graph- und Twitter-Card-Metadaten sowie eine eigene 1200×630-PNG-Karte. Title, Meta-Description und Canonical bleiben in den HTML-Dateien die inhaltliche Quelle; `content/social-pages.json` verwaltet Seitentyp, Kategorie, Akzent, Bildname und Bildbeschreibung. Die Karten enthalten nur Titel, Kategorie und Markenname, keine URL.

Nach einer inhaltlichen Änderung:

```bash
npm run social:sync
npm test
```

`npm run social:check` prüft den Stand ohne Dateien zu verändern. Der genaue Pflegeablauf steht in `CONTENT-GOVERNANCE.md`.

Achtung: Die Karten werden in der Hausschrift League Spartan erzeugt und byte genau verglichen. Ist die Schrift auf dem Rechner nicht systemweit installiert, rendert die Umgebung mit Ersatzschrift. Dann meldet `social:check` alle Karten als veraltet und `npm test` bricht schon bei `test:unit` ab. In dem Fall `social:sync` nicht ausführen, es würde die richtigen Karten mit Ersatzschrift überschreiben. Die Schrift installieren oder die Prüfung auf einem Rechner mit der Schrift laufen lassen.

## Bilder

- Kachelbilder (`*-tile-480.webp`, `*-tile-800.webp`, Format 4:3), Kopfbild-Streifen der Cases (`*-hero-1280.webp`, `*-hero-1920.webp`) und das Insights-Banner (`insight-banner-w-2560.webp`, `insight-banner-w-4480.webp`, Format 6,4:1, damit `object-fit: cover` bis 2560 px Fensterbreite nur seitlich beschneidet) sind vorgeschnittene Dateien. Ein Generator liegt nicht im Repo. `scripts/generate-responsive-images.cjs` erzeugt nur die Breitenvarianten der Originalbilder.
- Bilder unter `/assets/img/*` werden 30 Tage zwischengespeichert (`_headers`). Wird ein Bild unter gleichem Namen ersetzt, bekommt jeder Verweis im HTML eine neue Nummer, zum Beispiel `…-tile-480.webp?v=2`. Sonst zeigen Browser, vor allem auf dem Handy, den alten Stand. Neue Dateinamen brauchen das nicht. Für CSS und JavaScript sind `?v=`-Nummern verboten, der Integritätstest prüft das.
- Der Integritätstest verlangt, dass der Dateiname jeder Datei in `assets/img/` und `assets/fonts/` in irgendeiner Text- oder Skriptdatei vorkommt. Nicht mehr benutzte Bilder werden gelöscht, und ihr Eintrag in `scripts/generate-responsive-images.cjs` entfällt, sonst läuft der Generator ins Leere.
- Ausschnitte einzelner Bilder (`object-position`, Hochformat-Rahmen) stehen in `assets/css/styles.css` im Block „Bildausschnitte“.

## Security- und Deployment-Modell

- `_headers` schützt statische Antworten mit CSP, HSTS, Framing-, MIME-, Referrer- und Permissions-Regeln.
- `src/worker.js` beantwortet nur `/_assets/*` mit 410 (alte Canva-Assets, Code in `functions/_assets/[[path]].js`, Schutzheader direkt in der Antwort). Alles andere liefern die Static Assets direkt aus; unbekannte URLs zeigen `404.html`.
- CSP erlaubt nur eigene Scripts, die Cloudflare-Web-Analytics-Ressource und die gehashten JSON-LD-Blöcke. Ändert sich ein JSON-LD-Block, muss sein Hash in `_headers` ersetzt werden. Inline-Styles bleiben wegen des bestehenden unveränderten Designs vorerst erlaubt.
- Preview-Deployments müssen per Cloudflare Access geschützt werden; zusätzlich `X-Robots-Tag: noindex` auf der Preview-URL verifizieren. Stand: Der Schutz ist noch nicht eingerichtet, die Vorschau-URLs sind öffentlich und tragen `X-Robots-Tag: noindex`.
- Die HSTS-Regel enthält absichtlich weder `includeSubDomains` noch `preload`, bis alle Subdomains geprüft sind.

## Tests

```bash
npm test
```

Der vollständige Befehl startet und beendet seine lokalen Server selbst. Er prüft Integrität, alle Seiten in Chromium/Firefox/WebKit, Mobile und Accessibility, Performance/CWV sowie die Worker-/CSP-Runtime. Für die schnelle Prüfung ohne Browser steht weiterhin Folgendes bereit:

```bash
npm run test:unit
```

Die einzelnen `test:*`-Befehle bleiben für gezielte Fehlersuche erhalten: `test:compat` (Browser, Tastatur, Axe), `test:browser` (Mobile, Accessibility, Reduced Motion), `test:strips` (Scroll-Streifen), `test:performance` und `test:cwv` laufen gegen `npm run serve`; `test:pages` und `test:csp` laufen gegen `wrangler dev` auf Port 8788 (Adresse als Argument). Browserprüfungen verwenden `BROWSER=chromium|firefox|webkit` und `PLAYWRIGHT_MANAGED_BROWSER=1`.

Ohne die Hausschrift (siehe „Inhalte und Social-Vorschauen“) bricht `npm test` bei `test:unit` ab. Dann `node --test tests/site-integrity.test.mjs` nach `npm run prepare:pages` ohne den Social-Check ausführen und die übrigen Suiten einzeln starten.

## Bewusste Bedien- und Designentscheidungen

- Cases, Insights und Team sind native Scroll-Snap-Streifen ohne Auto-Lauf (Council-Entscheidung vom 01.10.2026, Transkript lokal, nicht im Repo): Wischen, Trackpad, Shift+Mausrad und Pfeiltasten gehen nativ, die nächste Kachel ragt angeschnitten herein, zwei Pfeil-Buttons (48 px) mit Zähler stehen darunter (`data-strip` in `index.html`, Logik in `main.js`, Test `tests/strips.cjs`).
- Jedes Teammitglied hat dieselbe Karte: Foto und Infokachel (Rolle, Vorstellungstext in Ich-Form, fünf Hashtags in Großbuchstaben, LinkedIn). Rollenzeilen werden nicht automatisch getrennt. Die Porträts sind gleich gerahmt (Kopf etwa 50 bis 60 Prozent der Bildhöhe).
- Artikel und Cases teilen einen Textrhythmus (`.article-body` in `styles.css`): Bild 48 px Abstand oben und unten, Zwischenüberschrift 52 px zum Vortext und 12 px zum eigenen Absatz, Absatz zu Absatz 20 px. Auf Desktop beginnt der Text höchstens 64 px unter dem Kopfbild.
- Hochformat-Fotos mit Personen stehen in Artikeln ganz im 3:4-Rahmen (maximal 520 px) statt als angeschnittener Streifen.
- Das Kompliz:innen-Marquee läuft bei Hover weiter. Tastaturfokus und Gedrückthalten pausieren; während des Gedrückthaltens kann die Reihe nach links und rechts gezogen werden. Bei Reduced Motion stoppt die automatische Bewegung und die Reihe wird scrollbar.
- Es gibt keinen sichtbaren Pause-/Stop-Button. Das Logo-Laufband bewegt sich weiterhin automatisch (offen: WCAG 2.2.2 verlangt dafür ein Pause-Mittel).
- Die weiße Schrift der Artikel-Buttons auf Cyan, Pink und Grün bleibt als bewusst akzeptierte, eng begrenzte Kontrastausnahme unverändert. Alle anderen ernsten oder kritischen Axe-Befunde blockieren die Qualitätsprüfung.

## Qualität, Direktupload und Monitoring

- `npm test` ist die verbindliche lokale Qualitätsstufe vor jeder Veröffentlichung (Einschränkung: siehe „Tests“).
- Der Code liegt auf GitHub. Cloudflare Workers Builds baut jeden Branch als Vorschau und `main` als Produktion (Details in `OPERATIONS-MONITORING.md`). Änderungen laufen über Branches und Pull Requests, nie direkt auf `main` (siehe „Arbeitsablauf und Branches“).
- Für den aktuellen Mailto-basierten Umfang werden keine Laufzeit-Secrets benötigt.
- `scripts/check-production.mjs` prüft wichtige 200/301/404/410-Antworten (unter anderem `/cases/kita` und `/insights/angstfreie-organisationen` mit 200, `/home` mit 301) und Security-Header. Ein externer Zeitplan dafür bleibt bis zur Monitoring-Einrichtung offen.
- `OPERATIONS-MONITORING.md` beschreibt Preview, Cutover, Search Console, Logs, Alarme und Rollback.

## Struktur

```text
index.html, impressum.html, datenschutz.html, 404.html   Startseite, Rechtstexte, Fehlerseite
assets/                     Statische Styles, Scripts, Fonts und Bilder
cases/, insights/           Indexierbare Unterseiten
content/social-pages.json   Zentrale Social-Konfiguration der öffentlichen Seiten
src/worker.js               Worker: nur /_assets/* (410), sonst Static Assets
functions/_assets/          410-Antwort für alte Canva-Assets
scripts/prepare-pages.cjs   Erzeugt das saubere Deployment-Verzeichnis
scripts/social-metadata.cjs Synchronisiert und prüft Social-Tags und Karten
scripts/generate-responsive-images.cjs  Breitenvarianten der Originalbilder
scripts/check-production.mjs            Status-, Redirect- und Header-Prüfung gegen eine URL
scripts/verify.mjs          Orchestriert die vollständige lokale Qualitätsprüfung
serve.py                    Lokaler Server (Port 8765), liefert Seiten ohne .html aus
tests/                      Unit-, Browser-, Pages-, CSP- und Performance-Tests
_headers, _redirects        Edge-Header, URL-Migration und .html-Weiterleitungen
sitemap.xml, robots.txt     Sitemap (19 URLs) und Crawler-Regeln
performance-budget.json     Verbindliche Lade- und CWV-Budgets
STATUS.md                   Aktueller Abschlussstand und offene Priorität 2
CONTENT-GOVERNANCE.md       Verbindlicher Ablauf für Inhaltsänderungen
OPERATIONS-MONITORING.md    Preview, Cutover, Search Console, Alarme, Rollback
URL-MIGRATION.md            URL-Schema und Weiterleitungen
wrangler.jsonc              Getestete Workers-Runtime-Konfiguration
```
