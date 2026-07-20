# Content-Pflege und Social-Metadaten

Stand: 16.07.2026

## Quellen der Wahrheit

- Sichtbarer Inhalt, Seitentitel, Meta-Description und Canonical stehen direkt in der jeweiligen HTML-Datei.
- `content/social-pages.json` enthält nur die zusätzliche Social-Konfiguration: öffentliche URL, Seitentyp, Kategorie, Markenakzent, Bilddatei und Bildbeschreibung.
- `sitemap.xml` und die Seitentabelle müssen exakt dieselben 14 öffentlichen URLs enthalten.
- 404, Impressum und Datenschutz bleiben als nicht indexierbare Seiten bewusst ohne Social-Vorschau.

Eine vollständige Template-Migration ist für die kleine statische Website nicht vorgesehen. Dadurch bleiben die Quelldateien direkt lesbar, während wiederkehrende Social-Daten trotzdem zentral geprüft werden.

## Bestehende Seite ändern

1. Sichtbaren Inhalt sowie gegebenenfalls `<title>` und Meta-Description in der HTML-Datei bearbeiten.
2. Falls Kategorie, Markenfarbe oder Bildbeschreibung betroffen sind, den Eintrag in `content/social-pages.json` anpassen.
3. Metadaten und Vorschaubilder synchronisieren:

```bash
npm run social:sync
```

4. Den erzeugten Social-Block und die zugehörige 1200×630-PNG-Karte prüfen.
5. Die vollständige Qualitätssicherung ausführen:

```bash
npm test
```

## Neue öffentliche Seite ergänzen

1. HTML-Datei mit eindeutigem Title, Meta-Description, Canonical und Favicon anlegen.
2. URL in `sitemap.xml` ergänzen.
3. Genau einen passenden Eintrag in `content/social-pages.json` anlegen.
4. `npm run social:sync` und danach `npm test` ausführen.

`npm run social:check` ist eine rein lesende Kurzprüfung. Auch `prepare:pages` führt sie aus und bricht ab, wenn HTML-Tags, Seitentabelle oder Karten veraltet sind. Der Build verändert die Quelldateien nicht stillschweigend.

## Veröffentlichung

Nur das mit `npm run prepare:pages` erzeugte Verzeichnis `.pages-dist` wird veröffentlicht. Die externe Cloud-Ablage und ihre Versionierungsstruktur werden vom Yorck-Team verwaltet; das technische Projekt enthält dafür keine Git- oder GitHub-Abhängigkeit.
