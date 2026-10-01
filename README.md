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

Die Vorschau unter `http://127.0.0.1:8765` ist für Oberfläche, Mobile und Performance. Sie bildet Functions, Redirects und `_headers` nicht ab.

Für die echte Worker-Runtime mit Redirects und `_headers`:

```bash
npm run prepare:pages
npx wrangler dev --port 8788
```

`.pages-dist` enthält ausschließlich auslieferbare Dateien. Tests, Dependencies, Dokumentation und lokale Secrets werden nicht deployt.
`wrangler.jsonc` hält dafür das getestete Kompatibilitätsdatum `2026-07-15` verbindlich fest.

CSS und JavaScript werden im Deployment-Artefakt automatisch mit einem zwölfstelligen SHA-256-Inhaltshash benannt. Die HTML-Quelldateien verwenden bewusst die lesbaren Namen `styles.css` und `main.js`; manuelle `?v=`-Nummern sind nicht mehr nötig.

## Inhalte und Social-Vorschauen

Alle 14 öffentlichen Seiten besitzen vollständige Open-Graph- und Twitter-Card-Metadaten sowie eine eigene 1200×630-PNG-Karte. Title, Meta-Description und Canonical bleiben in den HTML-Dateien die inhaltliche Quelle; `content/social-pages.json` verwaltet Seitentyp, Kategorie, Akzent, Bildname und Bildbeschreibung.

Nach einer inhaltlichen Änderung:

```bash
npm run social:sync
npm test
```

`npm run social:check` prüft den Stand ohne Dateien zu verändern. Der genaue Pflegeablauf steht in `CONTENT-GOVERNANCE.md`.

## Security- und Deployment-Modell

- `_headers` schützt statische Antworten mit CSP, HSTS, Framing-, MIME-, Referrer- und Permissions-Regeln.
- Die Pages Function `functions/_assets/[[path]].js` (410 für alte Canva-Assets) läuft unter der Workers-Konfiguration nicht. `/_assets/…` liefert aktuell 404.
- CSP erlaubt nur eigene Scripts, die Cloudflare-Web-Analytics-Ressource und die gehashten JSON-LD-Blöcke. Inline-Styles bleiben wegen des bestehenden unveränderten Designs vorerst erlaubt.
- Preview-Deployments müssen per Cloudflare Access geschützt werden; zusätzlich `X-Robots-Tag: noindex` auf der Preview-URL verifizieren.
- Die HSTS-Regel enthält absichtlich weder `includeSubDomains` noch `preload`, bis alle Subdomains geprüft sind.

## Tests

```bash
npm test
```

Der vollständige Befehl startet und beendet seine lokalen Server selbst. Er prüft Integrität, alle Seiten in Chromium/Firefox/WebKit, Mobile und Accessibility, Performance/CWV sowie die Worker-/CSP-Runtime. Für die schnelle Prüfung ohne Browser steht weiterhin Folgendes bereit:

```bash
npm run test:unit
```

Die einzelnen `test:*`-Befehle bleiben für gezielte Fehlersuche erhalten. Browserprüfungen verwenden `BROWSER=chromium|firefox|webkit` und `PLAYWRIGHT_MANAGED_BROWSER=1`.

## Bewusste Bedien- und Designentscheidungen

- Das Kompliz:innen-Marquee läuft bei Hover weiter. Tastaturfokus und Gedrückthalten pausieren; während des Gedrückthaltens kann die Reihe nach links und rechts gezogen werden. Bei Reduced Motion stoppt die automatische Bewegung und die Reihe wird scrollbar.
- Es gibt keinen sichtbaren Pause-/Stop-Button.
- Die weiße Schrift der Artikel-Buttons auf Cyan, Pink und Grün bleibt als bewusst akzeptierte, eng begrenzte Kontrastausnahme unverändert. Alle anderen ernsten oder kritischen Axe-Befunde blockieren die Qualitätsprüfung.

## Qualität, Direktupload und Monitoring

- `npm test` ist die verbindliche lokale Qualitätsstufe vor jeder Veröffentlichung.
- Der Code liegt auf GitHub. Cloudflare Workers Builds baut jeden Branch als Vorschau und `main` als Produktion (Details in `OPERATIONS-MONITORING.md`). Änderungen laufen über Branches und Pull Requests, nie direkt auf `main`.
- Für den aktuellen Mailto-basierten Umfang werden keine Laufzeit-Secrets benötigt.
- `scripts/check-production.mjs` prüft wichtige 200/301/404/405/410-Antworten und Security-Header. Ein externer Zeitplan dafür bleibt bis zur Monitoring-Einrichtung offen.
- `OPERATIONS-MONITORING.md` beschreibt Preview, Cutover, Search Console, Logs, Alarme und Rollback.

## Struktur

```text
assets/                     Statische Styles, Scripts, Fonts und Bilder
cases/, insights/           Indexierbare Unterseiten
content/social-pages.json   Zentrale Social-Konfiguration der öffentlichen Seiten
functions/_assets/          410-Antwort für alte Canva-Assets
scripts/prepare-pages.cjs   Erzeugt das saubere Deployment-Verzeichnis
scripts/social-metadata.cjs Synchronisiert und prüft Social-Tags und Karten
scripts/verify.mjs          Orchestriert die vollständige lokale Qualitätsprüfung
tests/                      Unit-, Browser-, Pages-, CSP- und Performance-Tests
_headers, _redirects        Edge-Header und URL-Migration
404.html                    Eigene Fehlerseite
performance-budget.json     Verbindliche Lade- und CWV-Budgets
STATUS.md                   Aktueller Abschlussstand und offene Priorität 2
CONTENT-GOVERNANCE.md       Verbindlicher Ablauf für Inhaltsänderungen
wrangler.jsonc              Getestete Pages-Runtime-Konfiguration
```
