# Umsetzungsstatus – Prioritäten 0 bis 2

**Stand:** 16.07.2026  
**Scope:** Technische Zuverlässigkeit, Codebereinigung, Accessibility, Social-Metadaten, Content-Pflege und aktuelle Betriebsdokumentation. Öffentliche URLs, freigegebene Inhalte, Mailto-Kontakt und sichtbares Design wurden nicht neu gestaltet.

## Priorität 0 – umgesetzt

- Manuelle CSS-/JavaScript-Versionen wurden durch automatisch erzeugte Inhaltshashes im Pages-Artefakt ersetzt.
- Wrangler verwendet ein verbindliches Kompatibilitätsdatum und ein festes Pages-Ausgabeverzeichnis.
- `npm test` bildet die vollständige lokale Qualitätsprüfung inklusive aller Browser und Pages-Runtime ab.
- Das aktive Betriebsmodell verwendet bewusst kein Git/GitHub. Projektstände werden vom Yorck-Team in der eigenen Cloud-Struktur verwaltet.

## Priorität 1 – umgesetzt

- Unerreichbarer JavaScript- und CSS-Code sowie widersprüchliche Kommentare wurden entfernt.
- Nicht verwendete Fonts und Bilder liegen außerhalb der aktiven Website im datierten Projektarchiv.
- Ein Integritätstest verhindert neue verwaiste Runtime-Assets, manuelle CSS-/JS-Versionen, fehlende Favicons und `.DS_Store`-Rückstände.
- Alle Seitentypen werden auf Axe-Befunde, Tastaturbedienung, Bildmetadaten, Browserfehler, externe Requests, Mobile-Überlauf und 200-%-Textskalierung geprüft.
- Das Kompliz:innen-Marquee läuft bei Hover weiter, pausiert bei Fokus oder Gedrückthalten, lässt sich gedrückt nach links und rechts ziehen und setzt danach die Animation fort.
- Reduced Motion stoppt die automatische Marquee-Bewegung und hält die Inhalte horizontal scrollbar.
- Es wurde kein sichtbarer Pause-/Stop-Button ergänzt. Die ausdrücklich akzeptierten weißen Artikel-Button-Texte auf Cyan, Pink und Grün bleiben unverändert.
- Die nicht ausgenommenen gelben und violetten Artikel-Buttons verwenden für ausreichenden Kontrast dunkle Schrift; Hover-Zustände bleiben weiß auf der jeweils dunklen Akzentvariante.
- README, Betrieb, URL-Migration und lokale Startkonfiguration verwenden dieselben Ports, Befehle und Runtime-Einstellungen.

## Priorität 2 – Punkte 1 bis 4

1. Rechtstexte und Datenschutz wurden laut fachlicher Freigabe abgeschlossen; die Dateien wurden in dieser Runde nicht verändert.
2. Logos, Referenzen, Cases, Aussagen und Bildkontexte wurden laut fachlicher Freigabe abgeschlossen; die Inhalte wurden in dieser Runde nicht verändert.
3. Alle 14 öffentlichen Seiten besitzen vollständige Open-Graph-/Twitter-Metadaten und eigene 1200×630-PNG-Karten. Eine zentrale Seitentabelle, ein deterministischer Pflegebefehl und ein blockierender Prüfmodus verhindern Abweichungen.
4. Die Entscheidung gegen Git/GitHub ist technisch bereinigt: vorbereitete Workflows liegen datiert im Projektarchiv. Cloudflare-Projekt, Anmeldung und Access-Schutz bleiben der nächste operative Schritt.

## Verifikation

- Der abschließende Lauf `npm test` war am 16.07.2026 vollständig grün.
- 9/9 Integritäts-, Metadaten-, CSP-, Asset- und Konfigurationstests bestanden.
- Chromium, Firefox und WebKit bestanden die vollständigen Seiten-, Tastatur-, Axe- und Marquee-Prüfungen.
- Mobile, 200-%-Textskalierung, Reduced Motion, Performance-/CWV-Budgets, Pages-Routing, Redirects, Security-Header und CSP bestanden.
- Die Social-Seitentabelle deckt exakt die 14 Sitemap-URLs ab.
- 404, Impressum und Datenschutz bleiben bewusst ohne Social-Vorschau.
- Die generierten Karten werden auf Dateityp, Abmessungen, Vollständigkeit und inhaltliche Aktualität geprüft.
- Der Pages-Build bricht ab, wenn Social-Tags oder Karten nicht mit HTML und Seitentabelle übereinstimmen.
- Der visuelle Vorher-/Nachher-Vergleich der Start-, Case- und Insight-Seite besitzt identische Abmessungen und zeigt keine unbeabsichtigte sichtbare Änderung.

## Noch offen

1. Cloudflare-Projekt anlegen, einmalig anmelden, Preview über Access schützen und den Direct-Upload-Weg verifizieren.
2. Preview-End-to-End-Abnahme, Produktionsdeployment und Domain-Cutover durchführen.
3. Den öffentlichen Produktions-Smoke-Test vollständig grün bestätigen.
4. Search Console verbinden, Sitemap einreichen und reale Core Web Vitals, 404-Raten und Security-Monitoring beobachten.

Für den derzeitigen Mailto-basierten Umfang werden keine Runtime-Secrets benötigt. Domain- und DNS-Änderungen erfolgen erst nach ausdrücklicher Freigabe.
