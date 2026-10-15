# URL-Migration zum Relaunch

**Stand:** 16.07.2026  
**Produktionsdomain:** `https://yorck-consulting.com`

## Erfasste Alt-URLs

Die öffentlich erreichbare Sitemap der bisherigen Canva-Website wurde am 14.07.2026 abgerufen. Sie enthält genau zwei Inhalts-URLs. Die Canva-Navigation nutzt darüber hinaus ausschließlich Fragmente wie `#page-1`; Fragmente sind keine serverseitig aufrufbaren URLs.

| Bisherige URL | Entscheidung | Technische Umsetzung |
|---|---|---|
| `/` | bleibt `/` | neue Startseite, Canonical `https://yorck-consulting.com/` |
| `/home` | dauerhaft nach `/` | `_redirects`: HTTP 301 |
| `/home/` | dauerhaft nach `/` | `_redirects`: HTTP 301 |
| `/_assets/*` | bewusst entfernt | Pages Function liefert HTTP 410 und `X-Robots-Tag: noindex` |

Der alte Namensraum `/_assets/` enthält ausschließlich gehashte Canva-Runtime-, Font- und Mediendateien, keine eigenständigen Inhaltsseiten. Neue Assets liegen unter `/assets/`.

## Neue indexierbare URLs

Die Soll-Liste steht in `sitemap.xml`. Alle dort enthaltenen URLs verwenden die Produktionsdomain und besitzen in der jeweiligen HTML-Datei ein selbstreferenzielles Canonical.

### URL-Schema ohne `.html`

Cloudflare Workers Assets liefert jede Seite unter der Adresse ohne Endung aus (`/cases/kita`, `/impressum`) und leitet `.html`-Adressen mit 307 dorthin. Deshalb gilt überall die Adresse ohne `.html`: Canonical, `og:url`, JSON-LD, `sitemap.xml`, `content/social-pages.json`, interne Links und `robots.txt`. Verzeichnis-Seiten behalten den Schrägstrich (`/cases/`, `/insights/`). Die Quelldateien heißen weiter `kita.html` usw.

Interne Links sind relativ und ohne Endung (`../`, `./`, `kita`). Links auf `index.html` gibt es nicht mehr.

`_redirects` leitet `.html`-Adressen mit 301 auf die saubere Adresse (`/*.html /:splat 301`, `index.html` einzeln, weil sonst zwei Sprünge entstehen). Das ersetzt den temporären 307 und überträgt bereits indexierte Alt-Adressen dauerhaft. `python3 serve.py` bildet das Schema lokal nach (`/cases/kita` liefert `cases/kita.html`).

Beim Ändern von JSON-LD ändert sich der CSP-Hash in `_headers`; `tests/site-integrity.test.mjs` meldet fehlende Hashes.

## Prüfung vor dem Domain-Cutover

Vor der externen Abnahme muss die lokale Qualitätsprüfung vollständig grün sein:

```bash
npm test
```

Auf der Cloudflare-Preview-URL und anschließend auf der Produktionsdomain prüfen:

```bash
curl -I https://PREVIEW-DOMAIN/home
curl -I https://PREVIEW-DOMAIN/cases/kita.html
curl -I https://PREVIEW-DOMAIN/cases/kita
curl -I https://PREVIEW-DOMAIN/home/
curl -I https://PREVIEW-DOMAIN/_assets/test.js
curl -I https://PREVIEW-DOMAIN/eine-nicht-existierende-seite
curl -I https://PREVIEW-DOMAIN/sitemap.xml
```

Erwartungen:

- `/home` und `/home/`: genau ein `301` auf `/`, danach `200`.
- `/cases/kita.html`: genau ein `301` auf `/cases/kita`; `/cases/kita`: `200`.
- `/_assets/test.js`: `410 Gone`.
- unbekannte Seite: `404` mit der gestalteten Fehlerseite und `noindex`.
- `sitemap.xml`: `200`, ausschließlich `https://yorck-consulting.com/...`.
- interne Links: keine 404-Antworten und keine Links auf `/home`.

## Cutover-Abnahme

- Redirects zuerst auf der Preview-Deployment-URL testen.
- Nach DNS-/Domain-Umschaltung dieselben Prüfungen auf `https://yorck-consulting.com` wiederholen.
- Canonicals, Sitemap, `robots.txt`, 404-Antwort und interne Links aus der ausgelieferten Produktionsversion prüfen; lokale Dateien allein reichen dafür nicht.
