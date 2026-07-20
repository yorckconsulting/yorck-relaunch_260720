/* yorck. consulting — Interaktionen. Vanilla JS, kein Framework. */
(function () {
  "use strict";
  var root = document.documentElement;
  root.classList.add("js");
  var motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  var reduce = motionQuery.matches;

  /* ---------- Sticky header ---------- */
  var header = document.getElementById("header");
  function onScroll() { header.classList.toggle("is-scrolled", window.scrollY > 24); }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- Reveal on scroll (löst bei erneutem Eintreten wieder aus) ---------- */
  var revealEls = [].slice.call(document.querySelectorAll("[data-reveal]"));
  if (!("IntersectionObserver" in window) || reduce) {
    revealEls.forEach(function (el) { el.classList.add("is-visible"); });
  } else {
    var revObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        el = e.target;
        if (e.isIntersecting) el.classList.add("is-visible");
        else if (e.boundingClientRect.top > 0) el.classList.remove("is-visible"); // nur unterhalb des Viewports zurücksetzen
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
    var el;
    revealEls.forEach(function (el) { revObs.observe(el); });
  }

  /* ---------- Scrollspy ---------- */
  var navLinks = [].slice.call(document.querySelectorAll(".nav-links a"));
  var sections = navLinks.map(function (a) { return document.getElementById(a.getAttribute("href").slice(1)); }).filter(Boolean);
  if ("IntersectionObserver" in window && sections.length) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) navLinks.forEach(function (a) { a.classList.toggle("is-active", a.getAttribute("href") === "#" + e.target.id); });
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    sections.forEach(function (s) { spy.observe(s); });
  }

  /* ---------- Mobile navigation ---------- */
  var nav = document.getElementById("nav"), toggle = document.getElementById("navToggle");
  var lastNavFocus = null;
  var navRegions = [].slice.call(document.querySelectorAll("main, .site-footer, .site-header > .brand, .skip-link"));
  var focusableSelector = 'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';
  function setRegionInert(region, inert) {
    if (inert) {
      region.dataset.navWasInert = region.hasAttribute("inert") ? "true" : "false";
      region.dataset.navAriaHidden = region.hasAttribute("aria-hidden") ? region.getAttribute("aria-hidden") : "__none__";
      region.setAttribute("aria-hidden", "true");
      if ("inert" in region) region.inert = true;
      else [].slice.call(region.querySelectorAll(focusableSelector)).forEach(function (el) {
        el.dataset.navTabindex = el.hasAttribute("tabindex") ? el.getAttribute("tabindex") : "__none__";
        el.setAttribute("tabindex", "-1");
      });
      return;
    }
    if ("inert" in region) region.inert = region.dataset.navWasInert === "true";
    else [].slice.call(region.querySelectorAll("[data-nav-tabindex]")).forEach(function (el) {
      if (el.dataset.navTabindex === "__none__") el.removeAttribute("tabindex");
      else el.setAttribute("tabindex", el.dataset.navTabindex);
      delete el.dataset.navTabindex;
    });
    if (region.dataset.navAriaHidden === "__none__") region.removeAttribute("aria-hidden");
    else if (region.dataset.navAriaHidden !== undefined) region.setAttribute("aria-hidden", region.dataset.navAriaHidden);
    delete region.dataset.navWasInert;
    delete region.dataset.navAriaHidden;
  }
  function navFocusables() {
    return [].slice.call(nav.querySelectorAll(focusableSelector)).filter(function (el) {
      return !el.disabled && el.getClientRects().length > 0;
    });
  }
  function setNav(open, restoreFocus) {
    if (!nav || !toggle) return;
    if (open) lastNavFocus = toggle;
    nav.classList.toggle("is-open", open);
    document.body.classList.toggle("nav-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Menü schließen" : "Menü öffnen");
    navRegions.forEach(function (region) { setRegionInert(region, open); });
    if (open) {
      window.requestAnimationFrame(function () {
        var targets = navFocusables().filter(function (el) { return el !== toggle; });
        (targets[0] || toggle).focus();
      });
    } else if (restoreFocus !== false) {
      window.requestAnimationFrame(function () {
        var target = lastNavFocus && typeof lastNavFocus.focus === "function" ? lastNavFocus : toggle;
        target.focus();
      });
    }
  }
  if (toggle && nav) {
    toggle.addEventListener("click", function () { setNav(!nav.classList.contains("is-open")); });
    nav.querySelectorAll(".nav-links a, .nav-cta").forEach(function (a) { a.addEventListener("click", function () { setNav(false); }); });
    document.addEventListener("keydown", function (e) {
      if (!nav.classList.contains("is-open")) return;
      if (e.key === "Escape") { e.preventDefault(); setNav(false); return; }
      if (e.key !== "Tab") return;
      var targets = navFocusables();
      if (!targets.length) { e.preventDefault(); toggle.focus(); return; }
      var first = targets[0], last = targets[targets.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
    window.addEventListener("resize", function () {
      if (window.innerWidth > 720 && nav.classList.contains("is-open")) setNav(false, false);
    });
  }

  /* ---------- Leistungen: Kreis-Diagramm ---------- */
  var WHEEL = [
    { c: "var(--yellow)", k: "I. KI-Kontext", t: "Arbeitsfähigkeit und Skalierung im Kontext von Digitalisierung und KI",
      d: "Viele Unternehmen haben in KI investiert, Piloten gestartet und einzelne Anwendungsfälle erprobt. Im Alltag bleibt davon oft weniger übrig als erhofft. Die Technik steht, doch sie greift nicht in die Abläufe, und es fehlt die Entscheidung, was wirklich skaliert werden soll. Wir setzen bei der Einführung und Wirkung an: Anwendungsfälle, die zur echten Arbeit passen, verankert in bestehenden Prozessen. So begleiten wir den Weg vom Pilot in die Skalierung, bis digitale Lösungen selbstverständlich genutzt werden, Potentiale messbar sind und Effizienz steigt.",
      b: ["Anwendungsfälle, die zur echten Arbeit passen", "Verankerung in bestehenden Prozessen", "Gemeinsame Prototypisierung und Test von KI-Lösungen", "Optimierung und Modellierung von Abläufen", "Befähigung der Teams im Alltag", "Der Weg vom Pilot in die Skalierung"] },
    { c: "var(--pink)", k: "II. Organisation & Prozesse", t: "Organisation, Prozesse und Entscheidungsfähigkeit",
      d: "Wenn Organisationen wachsen, fusionieren oder sich neu aufstellen, entstehen schnell Strukturen, die niemand mehr ganz überblickt. Zuständigkeiten überschneiden sich, Entscheidungen bleiben liegen. Wir schaffen die organisatorische Basis, auf der ein Unternehmen wieder verlässlich arbeitet und entscheidet. Wir analysieren Prozesse, strukturieren sie neu, klären Rollen und Schnittstellen und bauen ein Berichtswesen auf, das Führung wirklich steuern lässt. So wird gewachsene Komplexität zu klaren Verantwortlichkeiten und Entscheidungen fallen schneller.",
      b: ["Prozessanalyse und -neustrukturierung", "Klärung von Rollen und Schnittstellen", "Aufbau eines steuerungsfähigen Management Reporting", "Komplexität in klare Verantwortlichkeiten übersetzt"] },
    { c: "var(--green)", k: "III. People & Führung", t: "People, Führung und Workforce Transformation",
      d: "Transformation gelingt nur, wenn die Menschen sie tragen, doch wenn sich Führung, Rollen und Arbeitsweisen verändern, entsteht oft Unsicherheit. Wir helfen Organisationen, Führung und Zusammenarbeit so zu gestalten, dass sie heute trägt. Wir entwickeln Führungskräfte in ihrer Rolle, gestalten Zusammenarbeits- und Arbeitsmodelle und stärken Innovationskultur und psychologische Sicherheit. So entsteht Führung, die Orientierung gibt und eine Zusammenarbeit, in der Verantwortung übernommen wird.",
      b: ["Führungskräfteentwicklung in der Rolle", "Zusammenarbeits- und Arbeitsmodelle gestalten", "Innovationskultur und psychologische Sicherheit stärken", "Begleitung des Wandels der gesamten Workforce"] },
    { c: "var(--violet)", k: "IV. Training & Lernen", t: "Training, Befähigung und nachhaltiges Lernen",
      d: "Wissen vermittelt sich schnell, aber es verändert den Arbeitsalltag nur, wenn es dort ankommt und bleibt. Klassische Trainings verpuffen oft, weil der Bezug zur realen Arbeit fehlt. Wir entwickeln Lern- und Trainingsformate, die genau diesen Bezug herstellen: von innovativen Methoden und KI-Anwendung über Projektmanagement, Prozessanalysen und Kennzahlen bis zu Design Thinking und Medientrainings. Wir konzipieren die Lernreise, führen die Trainings durch und sorgen dafür, dass das Gelernte im Alltag verankert wird. So wird aus einem Training eine Lernerfahrung, die nachhaltig wirkt.",
      b: ["Lern- und Trainingsformate mit echtem Praxisbezug", "Von Prozessmanagement bis Design Thinking", "Konzeption und Durchführung der Lernreise", "Konkrete Verankerung des Gelernten im Alltag"] } ];
  var wheel = document.getElementById("wheel");
  var detail = document.getElementById("wheelDetail");
  if (wheel && detail) {
    var segs = [].slice.call(wheel.querySelectorAll(".seg"));
    function showArea(i) {
      var a = WHEEL[i];
      segs.forEach(function (s, j) {
        var selected = j === i;
        s.classList.toggle("is-active", selected);
        s.setAttribute("aria-pressed", String(selected));
      });
      detail.style.setProperty("--wheel-color", a.c);
      detail.innerHTML = '<span class="wheel__kicker">' + a.k + '</span><h3>' + a.t + '</h3><p>' + a.d +
        '</p><ul>' + a.b.map(function (x) { return "<li>" + x + "</li>"; }).join("") + "</ul>";
    }
    segs.forEach(function (s, i) {
      s.addEventListener("mouseenter", function () { showArea(i); });
      s.addEventListener("focus", function () { showArea(i); });
      s.addEventListener("click", function () { showArea(i); });
      s.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); showArea(i); } });
    });
    showArea(0);
    function lockWheelDetailHeight() {
      var activeHTML = detail.innerHTML;
      var activeColor = detail.style.getPropertyValue("--wheel-color");
      detail.style.minHeight = "";
      var max = 0;
      WHEEL.forEach(function (a) {
        detail.innerHTML = '<span class="wheel__kicker">' + a.k + '</span><h3>' + a.t + '</h3><p>' + a.d +
          '</p><ul>' + a.b.map(function (x) { return "<li>" + x + "</li>"; }).join("") + "</ul>";
        max = Math.max(max, detail.scrollHeight);
      });
      detail.innerHTML = activeHTML;
      if (activeColor) detail.style.setProperty("--wheel-color", activeColor);
      detail.style.minHeight = max + "px";
    }
    lockWheelDetailHeight();
    var wheelLockTicking = false;
    window.addEventListener("resize", function () {
      if (wheelLockTicking) return;
      wheelLockTicking = true;
      window.requestAnimationFrame(function () { lockWheelDetailHeight(); wheelLockTicking = false; });
    }, { passive: true });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(lockWheelDetailHeight);
  }

  /* ---------- Scroll-FX: Parallax-Ebenen, Bild-Parallax, Hero-Ausblenden, Lesefortschritt ---------- */
  var fxParallax = [].slice.call(document.querySelectorAll("[data-parallax]"));
  var fxLamps = [].slice.call(document.querySelectorAll("[data-lamp]"));
  var fxImgWraps = [].slice.call(document.querySelectorAll("[data-parallax-img], .article-hero__bg, .article-figure__frame"))
    .map(function (wrap) {
      var img = wrap.querySelector("img");
      return img ? { wrap: wrap, img: img, speed: parseFloat(wrap.getAttribute("data-parallax-img")) || 0.14 } : null;
    })
    .filter(Boolean);
  var hero = document.querySelector(".hero");
  var fxArticle = document.querySelector(".article-body") ? document.querySelector("article") : null;
  var progressSpan = null;
  if (fxArticle && !reduce) {
    var progressBar = document.createElement("div");
    progressBar.className = "scroll-progress";
    progressBar.setAttribute("aria-hidden", "true");
    progressBar.innerHTML = "<span></span>";
    (document.getElementById("main") || document.body).appendChild(progressBar);
    progressSpan = progressBar.firstChild;
  }
  if (!reduce && (fxParallax.length || fxLamps.length || fxImgWraps.length || hero || progressSpan)) {
    var fxTicking = false;
    function applyFx() {
      var vh = window.innerHeight;
      /* Element-Parallax (z. B. Hero-Lampe) */
      fxParallax.forEach(function (el) {
        var speed = parseFloat(el.getAttribute("data-parallax")) || 0;
        var rect = el.getBoundingClientRect();
        var offset = (rect.top + rect.height / 2) - vh / 2;
        el.style.transform = "translate3d(0," + (offset * -speed).toFixed(1) + "px,0)";
      });
      /* Laternen: Unterkante bleibt fix (transform-origin:bottom), nur dezentes Wachsen beim Scrollen */
      fxLamps.forEach(function (el) {
        var amp = parseFloat(el.getAttribute("data-lamp")) || 0;
        var rect = el.getBoundingClientRect();
        var prog = Math.max(0, Math.min(1, (vh - rect.top) / (vh + rect.height)));
        el.style.transform = "scale(" + (1 + amp * prog).toFixed(3) + ")";
      });
      /* Bild-Parallax: Motiv wandert langsam innerhalb des beschnittenen Rahmens */
      fxImgWraps.forEach(function (o) {
        var rect = o.wrap.getBoundingClientRect();
        if (rect.bottom < -80 || rect.top > vh + 80) return;
        var offset = (rect.top + rect.height / 2) - vh / 2;
        var max = rect.height * 0.06;
        var py = Math.max(-max, Math.min(max, offset * o.speed));
        o.img.style.setProperty("--py", py.toFixed(1));
      });
      /* Hero: Inhalt weicht beim Scrollen sanft nach oben und blendet aus */
      if (hero) {
        var hp = Math.min(1, Math.max(0, window.scrollY / (hero.offsetHeight * 0.7)));
        hero.style.setProperty("--hero-fade", (1 - hp).toFixed(3));
        hero.style.setProperty("--hero-shift", (hp * -46).toFixed(1));
        hero.style.setProperty("--hero-cue", (1 - Math.min(1, hp * 3)).toFixed(3));
        // Nahezu unsichtbarer Inhalt darf keinen Tastaturfokus mehr annehmen (WCAG 2.4.7).
        if ("inert" in hero) hero.inert = hp > 0.97;
      }
      /* Lesefortschritt (Artikelseiten) */
      if (progressSpan && fxArticle) {
        var total = fxArticle.offsetHeight - vh;
        var sp = total > 0 ? Math.min(1, Math.max(0, (window.scrollY - fxArticle.offsetTop) / total)) : 1;
        progressSpan.style.setProperty("--sp", sp.toFixed(4));
      }
      fxTicking = false;
    }
    window.addEventListener("scroll", function () { if (!fxTicking) { window.requestAnimationFrame(applyFx); fxTicking = true; } }, { passive: true });
    window.addEventListener("resize", function () { if (!fxTicking) { window.requestAnimationFrame(applyFx); fxTicking = true; } }, { passive: true });
    applyFx();
  }

  /* ---------- Arbeitsweise: Fortschritts-Pfad (scrollgesteuert) ---------- */
  var journey = document.getElementById("journey");
  if (journey) {
    var jSteps = [].slice.call(journey.querySelectorAll(".journey__step"));
    var n = jSteps.length;
    if (reduce || !("IntersectionObserver" in window) || n < 2) {
      journey.style.setProperty("--progress", "1");
      jSteps.forEach(function (s) { s.classList.add("is-active"); });
    } else {
      var jTicking = false;
      function updateJourney() {
        var vh = window.innerHeight;
        var rect = journey.getBoundingClientRect();
        // Fortschritt an die Viewport-Durchquerung der Sektionsmitte koppeln:
        // 0 wenn die Mitte tief im Viewport einläuft (85%), 1 wenn sie ins obere Drittel (30%) steigt.
        var center = rect.top + rect.height / 2;
        var p = (vh * 1.0 - center) / (vh * 0.55);
        p = Math.max(0, Math.min(1, p));
        journey.style.setProperty("--progress", p.toFixed(4));
        jSteps.forEach(function (s, i) {
          var nodePos = i / (n - 1);
          s.classList.toggle("is-active", p + 0.001 >= nodePos);
        });
        jTicking = false;
      }
      window.addEventListener("scroll", function () { if (!jTicking) { window.requestAnimationFrame(updateJourney); jTicking = true; } }, { passive: true });
      window.addEventListener("resize", function () { if (!jTicking) { window.requestAnimationFrame(updateJourney); jTicking = true; } }, { passive: true });
      updateJourney();
    }
  }

  /* ---------- Marquee: Reihe füllen + nahtloser Loop ---------- */
  function cloneTile(n) {
    var c = n.cloneNode(true);
    c.setAttribute("aria-hidden", "true");
    if (c.hasAttribute && c.hasAttribute("href")) c.setAttribute("tabindex", "-1");
    if (c.querySelectorAll) [].slice.call(c.querySelectorAll("a,button,[tabindex]")).forEach(function (x) { x.setAttribute("tabindex", "-1"); });
    return c;
  }
  var marqueeTracks = [];
  function setMarqueeDur(track) {
    var speed = parseFloat(track.getAttribute("data-speed")) || 25; // px/s, konstant unabhängig von Viewport/Klonzahl
    track.style.setProperty("--dur", ((track.scrollWidth / 2) / speed) + "s");
  }

  /* ---------- Marquee: Drag-to-scroll (Maus + Touch) ---------- */
  var DRAG_CLICK_THRESHOLD = 8; // px – darunter zählt eine Geste noch als Klick/Tap, nicht als Drag

  function getTranslateX(el) {
    var tr = getComputedStyle(el).transform;
    if (!tr || tr === "none") return 0;
    var m3d = tr.match(/^matrix3d\(([^)]+)\)$/);
    if (m3d) { var v3 = m3d[1].split(","); return parseFloat(v3[12]) || 0; }
    var m2d = tr.match(/^matrix\(([^)]+)\)$/);
    if (m2d) { var v2 = m2d[1].split(","); return parseFloat(v2[4]) || 0; }
    return 0;
  }

  function initMarqueeDrag(m, track) {
    if (!window.PointerEvent) return; // kein Pointer-Events-Support: Auto-Loop bleibt unangetastet, kein Drag
    m.classList.add("marquee--draggable");
    var isRtl = m.classList.contains("marquee--rtl");
    var pointerId = null, pointerKind = "", startX = 0, startOffset = 0, dragging = false, moved = false, suppressClick = false;

    track.addEventListener("click", function (e) {
      if (suppressClick) { suppressClick = false; e.preventDefault(); e.stopPropagation(); }
    }, true);
    track.addEventListener("dragstart", function (e) {
      e.preventDefault();                                       // Firefox: nativen Bild-/Link-Drag nicht den Pointer-Drag übernehmen lassen
    });

    m.addEventListener("pointerdown", function (e) {
      if (pointerId !== null) return;                        // Multitouch: nur der erste Kontakt zählt
      if (e.button !== undefined && e.button !== 0) return;   // nur primäre Maustaste
      pointerId = e.pointerId;
      pointerKind = e.pointerType || "";
      startX = e.clientX;
      dragging = false; moved = false;
      startOffset = getTranslateX(track);                     // Gedrückthalten friert sofort an der aktuellen Position ein
      track.style.transform = "translateX(" + startOffset + "px)";
      track.style.animation = "none";
      // Pointer-Capture und Klickunterdrückung beginnen weiterhin erst nach der Drag-Schwelle.
      // So bleibt ein kurzer Klick auf einen Link im Marquee vollständig erhalten.
    });

    m.addEventListener("pointermove", function (e) {
      if (pointerId === null || (pointerKind !== "mouse" && e.pointerId !== pointerId)) return;
      var dx = e.clientX - startX;
      if (!dragging) {
        if (Math.abs(dx) <= DRAG_CLICK_THRESHOLD) return;     // noch kein Drag ausgelöst, nichts tun
        dragging = true; moved = true;                        // Schwelle überschritten: jetzt erst zum Drag eskalieren
        try { m.setPointerCapture(pointerId); } catch (err) {}
        m.classList.add("is-dragging");
      }
      var half = track.scrollWidth / 2;                        // Loop-Distanz: Track ist immer exakt doppelt so breit
      if (!half) return;
      var tx = (startOffset + dx) % half;
      if (tx > 0) tx -= half;                                  // auf (-half, 0] normalisieren -> nahtloser Wraparound
      track.style.transform = "translateX(" + tx + "px)";
    });

    function endDrag(e) {
      if (pointerId === null || (pointerKind !== "mouse" && e.pointerId !== pointerId)) return;
      var wasDragging = dragging;
      dragging = false;
      if (wasDragging) { try { m.releasePointerCapture(pointerId); } catch (err) {} }
      pointerId = null;
      pointerKind = "";
      m.classList.remove("is-dragging");
      suppressClick = moved;                                    // nur bei echtem Drag den folgenden Klick unterdrücken
      var half = track.scrollWidth / 2;
      var txNow = getTranslateX(track);                          // VOR dem Zurücksetzen lesen (noch eingefroren)
      track.style.transform = "";
      track.style.animation = "";                                // Stylesheet-Animation (inkl. RTL-Override) reaktivieren
      if (half) {
        var dur = parseFloat(track.style.getPropertyValue("--dur")) || 50; // immer aktuellen Wert lesen, nicht gecacht
        var p = Math.max(0, Math.min(1, -txNow / half));          // Fortschritt 0..1 im Loop
        var delay = isRtl ? (p - 1) * dur : -p * dur;             // negativer Delay setzt Animation exakt an Position p fort
        track.style.animationDelay = delay + "s";                 // MUSS nach dem Leeren von animation gesetzt werden
      }
    }
    m.addEventListener("pointerup", endDrag);
    m.addEventListener("pointercancel", endDrag);
  }

  [].slice.call(document.querySelectorAll("[data-marquee]")).forEach(function (m) {
    var track = m.querySelector(".marquee__track");
    if (!track) return;
    var originals = [].slice.call(track.children);
    if (!originals.length) return;
    if (!reduce) {
      var guard = 0;
      while (track.scrollWidth < window.innerWidth * 1.3 && guard < 60) {
        originals.forEach(function (n) { track.appendChild(cloneTile(n)); });
        guard++;
      }
      [].slice.call(track.children).forEach(function (n) { track.appendChild(cloneTile(n)); });
      setMarqueeDur(track);
      marqueeTracks.push(track);
      initMarqueeDrag(m, track);
    }
  });
  // Dauer neu berechnen, sobald ALLE Bilder geladen sind: sonst wird scrollWidth mit
  // noch nicht geladenen (0px breiten) Bildern gemessen -> zu kurze Dauer -> Marquee viel zu schnell.
  window.addEventListener("load", function () { marqueeTracks.forEach(setMarqueeDur); });

})();
