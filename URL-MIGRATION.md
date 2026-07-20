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

## Prüfung vor dem Domain-Cutover

Vor der externen Abnahme muss die lokale Qualitätsprüfung vollständig grün sein:

```bash
npm test
```

Auf der Cloudflare-Preview-URL und anschließend auf der Produktionsdomain prüfen:

```bash
curl -I https://PREVIEW-DOMAIN/home
curl -I https://PREVIEW-DOMAIN/home/
curl -I https://PREVIEW-DOMAIN/_assets/test.js
curl -I https://PREVIEW-DOMAIN/eine-nicht-existierende-seite
curl -I https://PREVIEW-DOMAIN/sitemap.xml
```

Erwartungen:

- `/home` und `/home/`: genau ein `301` auf `/`, danach `200`.
- `/_assets/test.js`: `410 Gone`.
- unbekannte Seite: `404` mit der gestalteten Fehlerseite und `noindex`.
- `sitemap.xml`: `200`, ausschließlich `https://yorck-consulting.com/...`.
- interne Links: keine 404-Antworten und keine Links auf `/home`.

## Cutover-Abnahme

- Redirects zuerst auf der Preview-Deployment-URL testen.
- Nach DNS-/Domain-Umschaltung dieselben Prüfungen auf `https://yorck-consulting.com` wiederholen.
- Canonicals, Sitemap, `robots.txt`, 404-Antwort und interne Links aus der ausgelieferten Produktionsversion prüfen; lokale Dateien allein reichen dafür nicht.
