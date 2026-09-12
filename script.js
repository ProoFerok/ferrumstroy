"use strict";

(() => {
  const heroSvg = document.querySelector(".hero-svg");

  function playHeroAnimation() {
    if (!heroSvg) return;
    heroSvg.getAnimations({ subtree: true }).forEach((animation) => animation.cancel());

    heroSvg.querySelectorAll("[data-draw]").forEach((path) => {
      path.animate(
        [
          { strokeDasharray: 1, strokeDashoffset: 1 },
          { strokeDasharray: 1, strokeDashoffset: 0 },
        ],
        {
          duration: parseFloat(path.getAttribute("data-dur") || "0.5") * 1000,
          delay: parseFloat(path.getAttribute("data-draw")) * 1000,
          easing: "ease",
          fill: "backwards",
        }
      );
    });

    heroSvg.querySelectorAll("[data-fade]").forEach((group) => {
      group.animate(
        [{ opacity: 0 }, { opacity: 1 }],
        {
          duration: 600,
          delay: parseFloat(group.getAttribute("data-fade")) * 1000,
          easing: "ease",
          fill: "backwards",
        }
      );
    });
  }

  if (heroSvg) {
    // Clicking the drawing replays it regardless of reduced-motion — this is
    // an explicit, user-initiated repeat rather than an autoplaying effect.
    heroSvg.addEventListener("click", playHeroAnimation);

    const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduceMotion) {
      requestAnimationFrame(() => {
        // Skip the draw-in when the document timeline isn't actually running
        // (e.g. a frozen timeline during print or a static capture) so the
        // artwork stays in its finished state instead of hanging mid-draw.
        if (document.timeline && document.timeline.currentTime > 0) playHeroAnimation();
      });
    }
  }

  const logoLink = document.querySelector(".brand");
  if (logoLink) {
    logoLink.addEventListener("click", (event) => {
      event.preventDefault();
      location.reload();
    });
  }

  // ── Галерея объектов: карусель + модальное окно (lightbox) ──────────────
  const gallery = document.querySelector("[data-gallery]");
  if (gallery) {
    const track = gallery.querySelector("[data-gallery-track]");
    const slides = Array.from(gallery.querySelectorAll(".gallery-slide"));
    const counter = gallery.querySelector("[data-gallery-counter]");
    const dotsBox = gallery.querySelector("[data-gallery-dots]");
    const total = slides.length;

    const photos = slides.map((slide) => {
      const img = slide.querySelector(".gallery-photo");
      const cap = slide.querySelector(".gallery-caption");
      return { src: img.getAttribute("src"), alt: img.getAttribute("alt"), caption: cap ? cap.textContent : "" };
    });

    const pad = (n) => String(n).padStart(2, "0");
    let index = 0;

    // Точки-индикаторы
    const dots = photos.map((_, i) => {
      const dot = document.createElement("button");
      dot.type = "button";
      dot.className = "gallery-dot";
      dot.setAttribute("role", "tab");
      dot.setAttribute("aria-label", "Фото " + (i + 1));
      dot.addEventListener("click", () => goTo(i));
      dotsBox.appendChild(dot);
      return dot;
    });

    function goTo(i) {
      index = (i + total) % total;
      track.style.transform = "translateX(-" + index * 100 + "%)";
      if (counter) counter.textContent = pad(index + 1) + " / " + pad(total);
      dots.forEach((dot, di) => dot.setAttribute("aria-selected", di === index ? "true" : "false"));
      if (lightbox && !lightbox.hidden) showInLightbox(index);
    }

    gallery.querySelector("[data-gallery-prev]").addEventListener("click", () => goTo(index - 1));
    gallery.querySelector("[data-gallery-next]").addEventListener("click", () => goTo(index + 1));

    // Свайп по карусели
    bindSwipe(track, {
      left: () => goTo(index + 1),
      right: () => goTo(index - 1),
    });

    // ── Модальное окно ──
    const lightbox = document.querySelector("[data-lightbox]");
    const lbImage = lightbox && lightbox.querySelector("[data-lightbox-image]");
    const lbCaption = lightbox && lightbox.querySelector("[data-lightbox-caption]");
    let lastFocused = null;

    function showInLightbox(i) {
      const p = photos[i];
      lbImage.setAttribute("src", p.src);
      lbImage.setAttribute("alt", p.alt);
      lbCaption.textContent = p.caption;
    }

    function openLightbox(i) {
      if (!lightbox) return;
      lastFocused = document.activeElement;
      goTo(i);
      showInLightbox(index);
      lightbox.hidden = false;
      document.body.style.overflow = "hidden";
      lightbox.querySelector("[data-lightbox-close]").focus();
    }

    function closeLightbox() {
      lightbox.hidden = true;
      document.body.style.overflow = "";
      if (lastFocused && lastFocused.focus) lastFocused.focus();
    }

    slides.forEach((slide, i) => {
      const img = slide.querySelector(".gallery-photo");
      img.addEventListener("click", () => openLightbox(i));
    });

    if (lightbox) {
      lightbox.querySelector("[data-lightbox-close]").addEventListener("click", closeLightbox);
      lightbox.querySelector("[data-lightbox-prev]").addEventListener("click", () => goTo(index - 1));
      lightbox.querySelector("[data-lightbox-next]").addEventListener("click", () => goTo(index + 1));
      lightbox.addEventListener("click", (event) => {
        // Клик по фону (не по фото/кнопкам) закрывает окно
        if (event.target === lightbox || event.target.classList.contains("lightbox-figure")) closeLightbox();
      });
      bindSwipe(lbImage, {
        left: () => goTo(index + 1),
        right: () => goTo(index - 1),
      });
      document.addEventListener("keydown", (event) => {
        if (lightbox.hidden) return;
        if (event.key === "Escape") closeLightbox();
        else if (event.key === "ArrowLeft") goTo(index - 1);
        else if (event.key === "ArrowRight") goTo(index + 1);
      });
    }

    goTo(0);
  }

  // Простой обработчик горизонтального свайпа для тач-устройств.
  function bindSwipe(el, handlers) {
    let startX = 0, startY = 0, tracking = false;
    el.addEventListener("touchstart", (e) => {
      const t = e.changedTouches[0];
      startX = t.clientX; startY = t.clientY; tracking = true;
    }, { passive: true });
    el.addEventListener("touchend", (e) => {
      if (!tracking) return;
      tracking = false;
      const t = e.changedTouches[0];
      const dx = t.clientX - startX, dy = t.clientY - startY;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
        if (dx < 0) handlers.left(); else handlers.right();
      }
    }, { passive: true });
  }

  // ── Конверсии: клик по «Позвонить» / «Написать» ─────────────────────────
  // Сайт не собирает персональные данные (формы нет). Контакт идёт напрямую
  // через телефон/почту пользователя; для рекламы фиксируем цель в Метрике.
  document.querySelectorAll("[data-goal]").forEach((el) => {
    el.addEventListener("click", () => {
      if (typeof window.ym === "function" && window.__ymCounterId) {
        window.ym(window.__ymCounterId, "reachGoal", "contact");
      }
    });
  });

  // ── Уведомление об использовании cookie (152-ФЗ) ────────────────────────
  const cookieBanner = document.querySelector("[data-cookie]");
  if (cookieBanner) {
    const KEY = "fs-cookie-consent";
    let accepted = false;
    try { accepted = localStorage.getItem(KEY) === "1"; } catch (e) { /* localStorage недоступен */ }
    if (!accepted) cookieBanner.hidden = false;
    const acceptBtn = cookieBanner.querySelector("[data-cookie-accept]");
    if (acceptBtn) {
      acceptBtn.addEventListener("click", () => {
        try { localStorage.setItem(KEY, "1"); } catch (e) { /* игнорируем */ }
        cookieBanner.hidden = true;
      });
    }
  }

  // ── Конфигуратор каркаса: 2D-чертёж + 3D-изометрия, смета, письмо ───────
  // Порт дизайна из Claude Design («Феррум Строй — конфигуратор»). Ванильный
  // JS: 7 типов объектов со своими полями, ориентиры площади/бюджета/срока,
  // 2D-чертёж и вращающаяся 3D-изометрия на canvas, mailto со всеми параметрами.
  const config = document.querySelector("[data-config]");
  if (config) {
    const svg      = config.querySelector("[data-config-svg]");
    const canvas   = config.querySelector("[data-config-canvas]");
    const areaEl   = config.querySelector("[data-config-area]");
    const priceEl  = config.querySelector("[data-config-price]");
    const termEl   = config.querySelector("[data-config-term]");
    const typeSel  = config.querySelector("[data-config-type]");
    const fieldsBox = config.querySelector("[data-config-fields]");
    const sendBtn  = config.querySelector("[data-config-send]");
    const view2d   = config.querySelector("[data-config-2d]");
    const view3d   = config.querySelector("[data-config-3d]");
    const toggles  = config.querySelectorAll("[data-config-view]");
    const mailTo   = (sendBtn.getAttribute("href") || "mailto:").replace(/^mailto:/, "").split("?")[0];

    // характеристики по типам объектов: f — какие поля показываем; price — вилка ₽/м²
    const T = {
      "Производственный цех": { f: "roof slope bay gates clad glaz crane region", price: [24000, 36000], W: [12, 48], L: [12, 120], H: [5, 14], lantern: true },
      "Складской комплекс":   { f: "roof slope bay gates clad glaz region",       price: [19000, 29000], W: [9, 48],  L: [12, 150], H: [4, 14] },
      "Ангар арочный":        { f: "bay gates clad region",                        price: [12000, 20000], W: [6, 30],  L: [9, 90],   H: [0, 6],  hStep: 1, roof: "Арочная" },
      "Навес":                { f: "roof slope bay region",                        price: [6000, 11000],  W: [6, 30],  L: [6, 90],   H: [3, 9] },
      "Здание / АБК":         { f: "roof slope floors clad glaz region",           price: [32000, 52000], W: [6, 24],  L: [6, 48],   H: [3, 4.5], hStep: 0.5 },
      "Ограждение":           { f: "fill gates",                                   price: [2200, 3600],   L: [10, 500], H: [1.5, 4], hStep: 0.5, fence: true },
      "Индивидуальный проект":{ f: "roof slope bay gates clad glaz crane region",  price: [15000, 42000], W: [6, 48],  L: [6, 150],  H: [3, 16] }
    };

    const state = {
      type: "Ангар арочный", W: 18, L: 36, H: 0,
      roof: "Двускатная", slope: 12, bay: "6", gates: 1, gateSize: "4x4",
      clad: "Сэндвич-панели 100 мм", glaz: "Ленточные окна", crane: "Нет",
      floors: 2, fill: "Профлист", postStep: "3", region: "III — 1,8 кПа (Пенза)",
      view: "2d"
    };
    let yaw = 0.7, raf = null;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

    const cfg = (t) => T[t || state.type] || T["Производственный цех"];

    function vals() {
      const c = cfg(), s = state, cl = (v, a, b) => Math.min(b, Math.max(a, v));
      const fence = !!c.fence;
      const W = fence ? 0 : cl(+s.W, c.W[0], c.W[1]);
      const L = cl(+s.L, c.L[0], c.L[1]);
      const H = cl(+s.H, c.H[0], c.H[1]);
      const roof = c.roof || s.roof;
      const floors = c.f.indexOf("floors") > -1 ? +s.floors : 1;
      return { c, fence, W, L, H, roof, floors, s };
    }

    // ── смета: площадь, бюджет, срок ──────────────────────────────────────
    function calc() {
      const { c, fence, W, L, H, floors, s } = vals();
      let qty, mult = 1;
      if (fence) {
        qty = L;
        const fillK = { "Профлист": 1, "3D-сетка": 0.82, "Сварная сетка": 0.68, "Евроштакетник": 1.12 }[s.fill] || 1;
        mult *= fillK * (H / 2) * (s.postStep === "2.5" ? 1.08 : 1) * (1 + (+s.gates) * 0.06);
      } else {
        qty = W * L * floors;
        mult *= { "Профлист, без утепления": 0.9, "Сэндвич-панели 100 мм": 1, "Сэндвич-панели 150 мм": 1.08 }[s.clad] || 1;
        mult *= { "Без остекления": 1, "Ленточные окна": 1.04, "Витражное остекление": 1.1 }[s.glaz] || 1;
        mult *= { "Нет": 1, "3,2 т": 1.06, "5 т": 1.1, "10 т": 1.18 }[c.f.indexOf("crane") > -1 ? s.crane : "Нет"] || 1;
        mult *= { "II — 1,2 кПа": 0.98, "III — 1,8 кПа (Пенза)": 1, "IV — 2,4 кПа": 1.05, "V — 3,2 кПа": 1.09 }[s.region] || 1;
        mult *= { "4.5": 0.98, "6": 1, "7.5": 1.02, "9": 1.04, "12": 1.07 }[s.bay] || 1;
        if (c.f.indexOf("gates") > -1) mult *= 1 + (+s.gates) * 0.015;
        if (H > 10) mult *= 1.05;
      }
      const low = qty * c.price[0] * mult, high = qty * c.price[1] * mult;
      const fmt = (v) => v >= 1e6
        ? (v / 1e6).toLocaleString("ru-RU", { maximumFractionDigits: 1 }) + " млн"
        : Math.round(v / 1e4) * 10 + " тыс";
      const area = fence ? L * H : W * L * floors;
      const wk = Math.max(3, Math.round(area / 420) + 3);
      return {
        area,
        areaText: fence ? L.toLocaleString("ru-RU") + " м пог." : Math.round(area).toLocaleString("ru-RU") + " м²",
        priceText: fmt(low) + " – " + fmt(high) + " ₽",
        termText: wk + "–" + (wk + Math.max(2, Math.round(area / 300))) + " нед."
      };
    }

    // ── 2D-чертёж: генерация путей SVG ────────────────────────────────────
    function draft() {
      const { c, fence, W, L, H, roof, floors, s } = vals();
      const r = (n) => +n.toFixed(1);
      const map = (v, a, b, x, y) => x + (y - x) * Math.min(1, Math.max(0, (v - a) / (b - a)));
      const ground = 176, cx = 160;
      const o = { pGround: "M18 " + ground + " H302", pColumns: "", pRoof: "", pEave: "", pBays: "", pGates: "", pFloors: "", pGlaz: "", pCrane: "", pFill: "", pDim: "", wText: "", hText: "", wTextY: ground + 32, hTextX: 0, hTextY: ground };

      if (fence) {
        const wpx = map(L, c.L[0], c.L[1], 132, 272);
        const hpx = map(H, 1.5, 4, 42, 92);
        const x1 = r(cx - wpx / 2), x2 = r(cx + wpx / 2), top = r(ground - hpx);
        const postTop = r(top - 7);          // столбы с колпаками чуть выше полотна
        const railTop = top, railBot = r(ground - 7);

        const gate = +s.gates > 0;
        const gw = gate ? Math.min(wpx * 0.24, 62) : 0;
        const gL = r(cx - gw / 2), gR = r(cx + gw / 2);
        const inGate = (x) => gate && x > gL - 1 && x < gR + 1;

        // Столбы (рядовые + столбы ворот)
        const n = Math.min(9, Math.max(3, Math.round(wpx / 46)));
        let posts = "";
        for (let i = 0; i <= n; i++) { const x = r(x1 + (wpx * i) / n); posts += "M" + x + " " + ground + " V" + postTop + " "; }
        if (gate) posts += "M" + gL + " " + ground + " V" + postTop + " M" + gR + " " + ground + " V" + postTop + " ";
        o.pColumns = posts;

        // Верхняя и нижняя обвязка (рамка полотна)
        o.pEave = "M" + x1 + " " + railTop + " H" + x2 + " M" + x1 + " " + railBot + " H" + x2;

        // Заполнение секций (в проём ворот не заходит)
        let f = "";
        const rows = (step) => { for (let y = railTop + step; y < railBot; y += step) { f += "M" + x1 + " " + r(y) + " H" + (gate ? gL : x2) + " "; if (gate) f += "M" + gR + " " + r(y) + " H" + x2 + " "; } };
        const cols = (step, y0) => { for (let x = x1 + step; x < x2 - 1; x += step) { if (!inGate(x)) f += "M" + r(x) + " " + (y0 || railTop) + " V" + railBot + " "; } };
        if (s.fill === "Профлист") cols(7);
        else if (s.fill === "Евроштакетник") cols(11, r(railTop + 3));
        else if (s.fill === "Сварная сетка") { cols(11); rows(11); }
        else { cols(15); rows((railBot - railTop) / 3); }
        o.pFill = f;

        // Ворота с раскосинами (акцент)
        if (gate) {
          o.pGates = "M" + gL + " " + railTop + " H" + gR + " M" + gL + " " + railBot + " H" + gR +
            " M" + r(cx) + " " + railTop + " V" + railBot +
            " M" + gL + " " + railBot + " L" + r(cx) + " " + railTop +
            " M" + r(cx) + " " + railBot + " L" + gR + " " + railTop + " ";
        }

        o.pDim = "M" + x1 + " " + (ground + 15) + " H" + x2 + " M" + x1 + " " + (ground + 9) + " V" + (ground + 21) + " M" + x2 + " " + (ground + 9) + " V" + (ground + 21) +
          " M" + r(x1 - 15) + " " + ground + " V" + top + " M" + r(x1 - 21) + " " + ground + " H" + r(x1 - 9) + " M" + r(x1 - 21) + " " + top + " H" + r(x1 - 9);
        o.wText = L.toLocaleString("ru-RU") + " м";
        o.hText = H.toLocaleString("ru-RU") + " м";
        o.hTextX = r(x1 - 25); o.hTextY = r((ground + top) / 2);
        return o;
      }

      const wpx = map(W, 6, 48, 78, 252);
      const x1 = r(cx - wpx / 2), x2 = r(cx + wpx / 2), xpm = wpx / W;
      let eave, apex, hpx, ypm, hText;

      if (roof === "Арочная") {
        // Полукруглый ангар: свод радиусом W/2, опираясь на стены высотой H
        // (по умолчанию H = 0 — свод прямо от земли, без стен).
        const radiuspx = wpx / 2;
        let wallpx = Math.max(0, H * xpm);
        if (wallpx + radiuspx > 150) wallpx = Math.max(0, 150 - radiuspx);
        eave = r(ground - wallpx);
        apex = r(eave - radiuspx);
        hpx = ground - apex; ypm = radiuspx / (W / 2);
        if (wallpx > 1) {
          o.pColumns = "M" + x1 + " " + ground + " V" + eave + " M" + x2 + " " + ground + " V" + eave;
          o.pEave = "M" + x1 + " " + eave + " H" + x2;
        }
        o.pRoof = "M" + x1 + " " + eave + " A " + r(radiuspx) + " " + r(radiuspx) + " 0 0 1 " + x2 + " " + eave;
        hText = (H + W / 2).toLocaleString("ru-RU") + " м";
      } else {
        const Htot = H * floors;
        hpx = map(Htot, 3, 18, 40, 104);
        ypm = hpx / Htot;
        eave = r(ground - hpx);
        const rise = roof === "Односкатная" ? W * Math.tan(s.slope * Math.PI / 180) : (W / 2) * Math.tan(s.slope * Math.PI / 180);
        const risepx = Math.min(40, rise * ypm);
        apex = r(eave - risepx);
        if (roof === "Односкатная") {
          o.pColumns = "M" + x1 + " " + ground + " V" + eave + " M" + x2 + " " + ground + " V" + apex;
          o.pRoof = "M" + x1 + " " + eave + " L" + x2 + " " + apex;
          o.pEave = "M" + x1 + " " + eave + " H" + x2;
        } else {
          o.pColumns = "M" + x1 + " " + ground + " V" + eave + " M" + x2 + " " + ground + " V" + eave;
          o.pRoof = "M" + x1 + " " + eave + " L" + cx + " " + apex + " L" + x2 + " " + eave;
          o.pEave = "M" + x1 + " " + eave + " H" + x2 + " M" + cx + " " + eave + " V" + apex;
        }
        hText = (floors > 1 ? Htot.toLocaleString("ru-RU") : H.toLocaleString("ru-RU")) + " м";
      }

      const hRef = roof === "Арочная" ? apex : eave;

      // Аэрационный фонарь на коньке — отличительная деталь производственного цеха.
      // Стенки фонаря опираются на скаты кровли (не висят над коньком).
      if (c.lantern && roof === "Двускатная") {
        const lw = Math.min(wpx * 0.34, 88), lh = 13;
        const lx1 = r(cx - lw / 2), lx2 = r(cx + lw / 2);
        const yBase = r(eave + (apex - eave) * (1 - lw / wpx)); // высота ската под стенкой фонаря
        const lWall = r(apex - lh * 0.55), lTop = r(apex - lh);
        o.pRoof += " M" + lx1 + " " + yBase + " V" + lWall + " L" + cx + " " + lTop + " L" + lx2 + " " + lWall + " V" + yBase;
      }

      if (floors > 1) {
        let fl = "";
        for (let i = 1; i < floors; i++) { const y = r(ground - hpx * i / floors); fl += "M" + x1 + " " + y + " H" + x2 + " "; }
        o.pFloors = fl;
      }
      // Оси рам (пунктир) и остекление на 2D-чертёж не выводим — только каркас,
      // ворота и размеры. Эти параметры влияют на смету, 3D-вид и письмо.
      if (c.f.indexOf("gates") > -1 && +s.gates > 0) {
        const gs = (s.gateSize || "4x4").split("x").map(Number);
        const gw = Math.min(gs[0] * xpm, wpx / Math.max(1, +s.gates) - 6);
        const gh = Math.min(gs[1] * ypm, hpx - 6);
        const n = Math.min(4, +s.gates);
        let g = "";
        for (let i = 0; i < n; i++) {
          const gx = r(x1 + (wpx * (i + 0.5)) / n - gw / 2);
          g += "M" + gx + " " + ground + " V" + r(ground - gh) + " H" + r(gx + gw) + " V" + ground + " ";
        }
        o.pGates = g;
      }
      if (c.f.indexOf("crane") > -1 && s.crane !== "Нет") {
        const y = r(eave + 14);
        o.pCrane = "M" + x1 + " " + y + " H" + x2 + " M" + x1 + " " + y + " V" + r(y - 6) + " M" + x2 + " " + y + " V" + r(y - 6) + " M" + cx + " " + y + " V" + r(y + 14) + " M" + r(cx - 6) + " " + r(y + 14) + " H" + r(cx + 6);
      }
      o.pDim = "M" + x1 + " " + (ground + 15) + " H" + x2 + " M" + x1 + " " + (ground + 9) + " V" + (ground + 21) + " M" + x2 + " " + (ground + 9) + " V" + (ground + 21) +
        " M" + r(x1 - 15) + " " + ground + " V" + hRef + " M" + r(x1 - 21) + " " + ground + " H" + r(x1 - 9) + " M" + r(x1 - 21) + " " + hRef + " H" + r(x1 - 9);
      o.wText = W + " м";
      o.hText = hText;
      o.hTextX = r(x1 - 25); o.hTextY = r((ground + hRef) / 2);
      return o;
    }

    function drawSvg() {
      const o = draft();
      svg.innerHTML =
        '<g stroke="var(--color-neutral-500)" fill="none" stroke-width="1" stroke-dasharray="3 4"><path d="' + o.pBays + '"/></g>' +
        '<g stroke="var(--color-neutral-600)" fill="none" stroke-width="1"><path d="' + o.pFill + '"/><path d="' + o.pFloors + '"/></g>' +
        '<g stroke="var(--color-text)" fill="none" stroke-linecap="square" stroke-width="1.9"><path d="' + o.pGround + '"/><path d="' + o.pColumns + '"/><path d="' + o.pRoof + '"/><path d="' + o.pEave + '"/></g>' +
        '<g stroke="var(--color-text)" fill="none" stroke-width="1.3"><path d="' + o.pGlaz + '"/></g>' +
        '<g stroke="var(--color-accent)" fill="none" stroke-width="1.4"><path d="' + o.pGates + '"/><path d="' + o.pCrane + '"/></g>' +
        '<g stroke="var(--color-accent)" fill="none" stroke-width="1.2"><path d="' + o.pDim + '"/></g>' +
        '<g fill="var(--color-accent-700)" font-family="\'IBM Plex Mono\', monospace" font-size="12">' +
          '<text x="160" y="' + o.wTextY + '" text-anchor="middle">' + o.wText + '</text>' +
          '<text x="' + o.hTextX + '" y="' + o.hTextY + '" text-anchor="end" dominant-baseline="middle">' + o.hText + '</text>' +
        '</g>';
    }

    // ── 3D-модель: отрезки каркаса в метрах ───────────────────────────────
    function model() {
      const { c, fence, W, L, H, roof, floors, s } = vals();
      const S = [];
      const add = (a, b, k) => S.push([a, b, k || "main"]);
      if (fence) {
        const step = +s.postStep, n = Math.min(60, Math.max(3, Math.round(L / step)));
        for (let i = 0; i <= n; i++) { const z = -L / 2 + (L * i) / n; add([0, 0, z], [0, H, z]); }
        add([0, H, -L / 2], [0, H, L / 2]);
        add([0, H * 0.55, -L / 2], [0, H * 0.55, L / 2], "thin");
        add([0, 0, -L / 2], [0, 0, L / 2], "thin");
        const dense = s.fill === "Профлист" ? 0.35 : s.fill === "Евроштакетник" ? 0.6 : 1.2;
        for (let z = -L / 2; z <= L / 2; z += dense) add([0, 0, z], [0, H, z], "thin");
        if (+s.gates > 0) {
          const gw = Math.min(4, L / 4);
          add([0, 0, -gw / 2], [0, H * 1.05, -gw / 2], "accent");
          add([0, 0, gw / 2], [0, H * 1.05, gw / 2], "accent");
          add([0, H * 1.05, -gw / 2], [0, H * 1.05, gw / 2], "accent");
        }
        return S;
      }
      const hw = W / 2, bay = +s.bay || 6;
      const nb = Math.max(1, Math.round(L / bay));
      const zs = [];
      for (let i = 0; i <= nb; i++) zs.push(-L / 2 + (L * i) / nb);
      const rise = roof === "Арочная" ? hw : (roof === "Односкатная" ? W * Math.tan(s.slope * Math.PI / 180) : hw * Math.tan(s.slope * Math.PI / 180));
      const Htot = H * floors;
      const profile = (z) => {
        if (roof === "Арочная") {
          const seg = 10, pts = [];
          for (let i = 0; i <= seg; i++) { const t = i / seg, x = -hw + W * t; const y = Htot + rise * Math.sqrt(Math.max(0, 1 - Math.pow((x / hw), 2))); pts.push([x, y, z]); }
          for (let i = 0; i < seg; i++) add(pts[i], pts[i + 1]);
        } else if (roof === "Односкатная") { add([-hw, Htot, z], [hw, Htot + rise, z]); }
        else { add([-hw, Htot, z], [0, Htot + rise, z]); add([0, Htot + rise, z], [hw, Htot, z]); }
      };
      zs.forEach((z) => {
        add([-hw, 0, z], [-hw, Htot, z]);
        add([hw, 0, z], [hw, Htot + (roof === "Односкатная" ? rise : 0), z]);
        profile(z);
      });
      add([-hw, Htot, -L / 2], [-hw, Htot, L / 2]);
      add([hw, Htot + (roof === "Односкатная" ? rise : 0), -L / 2], [hw, Htot + (roof === "Односкатная" ? rise : 0), L / 2]);
      if (roof === "Двускатная" || roof === "Арочная") add([0, Htot + rise, -L / 2], [0, Htot + rise, L / 2]);
      add([-hw, 0, -L / 2], [hw, 0, -L / 2], "thin");
      add([-hw, 0, L / 2], [hw, 0, L / 2], "thin");
      add([-hw, 0, -L / 2], [-hw, 0, L / 2], "thin");
      add([hw, 0, -L / 2], [hw, 0, L / 2], "thin");
      // Аэрационный фонарь на коньке — отличие производственного цеха.
      if (c.lantern && roof === "Двускатная") {
        const lwm = W * 0.34, lhm = Math.max(1, rise * 0.6 + 0.8);
        const yb = Htot + rise, yt = yb + lhm, xl = -lwm / 2, xr = lwm / 2;
        [-L / 2, L / 2].forEach((z) => { add([xl, yb, z], [xl, yt, z]); add([xr, yb, z], [xr, yt, z]); add([xl, yt, z], [xr, yt, z]); });
        add([xl, yt, -L / 2], [xl, yt, L / 2]);
        add([xr, yt, -L / 2], [xr, yt, L / 2]);
      }
      if (floors > 1) {
        for (let i = 1; i < floors; i++) {
          const y = H * i;
          add([-hw, y, -L / 2], [hw, y, -L / 2], "thin");
          add([-hw, y, L / 2], [hw, y, L / 2], "thin");
          add([-hw, y, -L / 2], [-hw, y, L / 2], "thin");
          add([hw, y, -L / 2], [hw, y, L / 2], "thin");
        }
      }
      if (c.f.indexOf("glaz") > -1 && s.glaz !== "Без остекления") {
        const bands = s.glaz === "Витражное остекление" ? floors * 2 : floors;
        for (let i = 0; i < bands; i++) {
          const y = Htot * (i + 0.62) / bands, b = Math.min(1.4, Htot * 0.12);
          [-hw, hw].forEach((x) => {
            add([x, y, -L / 2], [x, y, L / 2], "thin");
            add([x, y - b, -L / 2], [x, y - b, L / 2], "thin");
            add([x, y, -L / 2], [x, y - b, -L / 2], "thin");
            add([x, y, L / 2], [x, y - b, L / 2], "thin");
          });
        }
      }
      if (c.f.indexOf("gates") > -1 && +s.gates > 0) {
        const gs = (s.gateSize || "4x4").split("x").map(Number);
        const gw = Math.min(gs[0], W / Math.max(1, +s.gates) - 1), gh = Math.min(gs[1], Htot - 0.5);
        const n = Math.min(4, +s.gates), z = L / 2;
        for (let i = 0; i < n; i++) {
          const cxx = -hw + (W * (i + 0.5)) / n;
          add([cxx - gw / 2, 0, z], [cxx - gw / 2, gh, z], "accent");
          add([cxx + gw / 2, 0, z], [cxx + gw / 2, gh, z], "accent");
          add([cxx - gw / 2, gh, z], [cxx + gw / 2, gh, z], "accent");
        }
      }
      if (c.f.indexOf("crane") > -1 && s.crane !== "Нет") {
        const y = Htot - 1.2;
        [-hw, hw].forEach((x) => {
          add([x, y, -L / 2], [x, y, L / 2], "accent");
          zs.forEach((z) => add([x, y, z], [x, Htot, z], "accent"));
        });
        add([-hw, y, 0], [hw, y, 0], "accent");
        add([0, y, 0], [0, y - 1.4, 0], "accent");
      }
      return S;
    }

    function drawCanvas() {
      if (!canvas || !canvas.clientWidth) return;
      const { fence, W, L, H, floors } = vals();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = canvas.clientWidth, h = canvas.clientHeight || 210;
      if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) { canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); }
      const g = canvas.getContext("2d");
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, w, h);
      const pitch = 0.42, cy = Math.cos(yaw), sy = Math.sin(yaw), sp = Math.sin(pitch), cp = Math.cos(pitch);
      const R = 0.5 * Math.sqrt((fence ? 1 : W) * (fence ? 1 : W) + L * L);
      const Htot = (fence ? H : H * floors) * 1.45;
      const scale = Math.min((w * 0.86) / (2 * R || 1), (h * 0.88) / (Htot * cp + 2 * R * sp || 1));
      const ox = w / 2, oy = h * 0.62 + Htot * cp * scale * 0.22;
      const P = (v) => {
        const X = v[0] * cy - v[2] * sy, Z = v[0] * sy + v[2] * cy;
        return [ox + X * scale, oy - v[1] * cp * scale + Z * sp * scale];
      };
      const segs = model();
      const styles = { thin: ["#98989b", 0.9], main: ["#1d1f20", 1.4], accent: ["#5980a6", 1.6] };
      ["thin", "main", "accent"].forEach((k) => {
        const st = styles[k];
        g.strokeStyle = st[0]; g.lineWidth = st[1]; g.beginPath();
        segs.forEach((s) => { if (s[2] !== k) return; const a = P(s[0]), b = P(s[1]); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); });
        g.stroke();
      });
    }

    function loop() {
      if (state.view === "3d") { if (!reduce) yaw += 0.0055; drawCanvas(); }
      raf = requestAnimationFrame(loop);
    }

    // ── построение полей под текущий тип ──────────────────────────────────
    function mk(tag, cls) { const e = document.createElement(tag); if (cls) e.className = cls; return e; }
    function rangeField(key, labelHtml, min, max, step, unit) {
      const wrap = mk("label", "config-field");
      const span = mk("span", "config-label");
      span.innerHTML = labelHtml + ": <b>" + state[key] + "</b>" + (unit ? ("&nbsp;" + unit) : "");
      const b = span.querySelector("b");
      const input = mk("input", "config-range");
      input.type = "range"; input.min = min; input.max = max; input.step = step; input.value = state[key];
      input.addEventListener("input", () => {
        const before = +state.gates > 0;
        state[key] = +input.value; b.textContent = state[key];
        if (key === "gates" && (before !== (+state.gates > 0))) { buildFields(); }
        render();
      });
      wrap.append(span, input); return wrap;
    }
    function selectField(key, label, options) {
      const wrap = mk("label", "config-field");
      const span = mk("span", "config-label"); span.textContent = label;
      const sel = mk("select", "config-select");
      options.forEach((o) => { const opt = mk("option"); if (Array.isArray(o)) { opt.value = o[0]; opt.textContent = o[1]; } else { opt.textContent = o; } sel.appendChild(opt); });
      sel.value = state[key];
      sel.addEventListener("change", () => {
        state[key] = sel.value;
        if (key === "roof") { buildFields(); }
        render();
      });
      wrap.append(span, sel); return wrap;
    }

    function buildFields() {
      const c = cfg(), s = state, has = (k) => c.f.indexOf(k) > -1, fence = !!c.fence;
      const roof = c.roof || s.roof;
      const hLabel = fence ? "Высота" : has("floors") ? "Высота этажа" : roof === "Арочная" ? "Высота стены" : "Высота";
      const bayLabel = roof === "Арочная" ? "Шаг арок" : "Шаг рам";
      const gatesLabel = fence ? "Ворота и калитки, шт" : "Ворота, шт";
      fieldsBox.innerHTML = "";
      if (!fence) fieldsBox.appendChild(rangeField("W", "Пролёт (ширина)", c.W[0], c.W[1], 3, "м"));
      fieldsBox.appendChild(rangeField("L", fence ? "Длина ограждения" : "Длина", c.L[0], c.L[1], fence ? 5 : 3, "м"));
      fieldsBox.appendChild(rangeField("H", hLabel, c.H[0], c.H[1], c.hStep || 1, "м"));
      if (has("floors")) fieldsBox.appendChild(rangeField("floors", "Этажность", 1, 4, 1, ""));
      if (has("roof")) fieldsBox.appendChild(selectField("roof", "Тип кровли", ["Двускатная", "Односкатная", "Арочная"]));
      if (has("slope") && roof !== "Арочная") fieldsBox.appendChild(rangeField("slope", "Уклон кровли", 5, 25, 1, "°"));
      if (has("bay")) fieldsBox.appendChild(selectField("bay", bayLabel, [["4.5", "4,5 м"], ["6", "6 м"], ["7.5", "7,5 м"], ["9", "9 м"], ["12", "12 м"]]));
      if (has("fill")) fieldsBox.appendChild(selectField("fill", "Тип заполнения", ["Профлист", "3D-сетка", "Сварная сетка", "Евроштакетник"]));
      if (has("fill")) fieldsBox.appendChild(selectField("postStep", "Шаг столбов", [["2.5", "2,5 м"], ["3", "3 м"]]));
      if (has("gates")) fieldsBox.appendChild(rangeField("gates", gatesLabel, 0, 6, 1, ""));
      if (has("gates") && !fence && +s.gates > 0) fieldsBox.appendChild(selectField("gateSize", "Размер ворот", [["3x3", "3 × 3 м"], ["4x4", "4 × 4 м"], ["4.5x4.5", "4,5 × 4,5 м"], ["6x6", "6 × 6 м"]]));
      if (has("clad")) fieldsBox.appendChild(selectField("clad", "Утепление / обшивка", ["Профлист, без утепления", "Сэндвич-панели 100 мм", "Сэндвич-панели 150 мм"]));
      if (has("glaz")) fieldsBox.appendChild(selectField("glaz", "Остекление", ["Без остекления", "Ленточные окна", "Витражное остекление"]));
      if (has("crane")) fieldsBox.appendChild(selectField("crane", "Кран-балка", ["Нет", "3,2 т", "5 т", "10 т"]));
      if (has("region")) fieldsBox.appendChild(selectField("region", "Снеговой район", ["II — 1,2 кПа", "III — 1,8 кПа (Пенза)", "IV — 2,4 кПа", "V — 3,2 кПа"]));
    }

    function mailBody() {
      const { c, fence, W, L, H, floors, s } = vals(), has = (k) => c.f.indexOf(k) > -1, calcR = calc();
      return "Здравствуйте! Интересует объект: " + s.type + ".\n" +
        (fence
          ? "Длина ограждения: " + L + " м\nВысота: " + H + " м\nЗаполнение: " + s.fill + "\nШаг столбов: " + s.postStep + " м\nВорота/калитки: " + s.gates + " шт\n"
          : "Пролёт (ширина): " + W + " м\nДлина: " + L + " м\n" + (has("floors") ? "Высота этажа: " + H + " м\nЭтажность: " + floors + "\n" : "Высота: " + H + " м\n") +
            "Кровля: " + (c.roof || s.roof) + (has("slope") ? ", уклон " + s.slope + "°" : "") + "\n" +
            (has("bay") ? "Шаг рам: " + s.bay + " м\n" : "") +
            (has("gates") ? "Ворота: " + s.gates + " шт, " + s.gateSize.replace("x", " × ") + " м\n" : "") +
            (has("clad") ? "Обшивка: " + s.clad + "\n" : "") +
            (has("glaz") ? "Остекление: " + s.glaz + "\n" : "") +
            (has("crane") ? "Кран-балка: " + s.crane + "\n" : "") +
            (has("region") ? "Снеговой район: " + s.region + "\n" : "")) +
        "Площадь: " + calcR.areaText + "\nОриентир по бюджету: " + calcR.priceText + "\n\nПрошу рассчитать стоимость.";
    }

    function render() {
      const c = calc();
      areaEl.textContent = c.areaText;
      priceEl.textContent = c.priceText;
      termEl.textContent = c.termText;
      drawSvg();
      if (state.view === "3d") drawCanvas();
      sendBtn.setAttribute("href", "mailto:" + mailTo + "?subject=" + encodeURIComponent("Заявка на расчёт объекта") + "&body=" + encodeURIComponent(mailBody()));
    }

    typeSel.addEventListener("change", () => {
      const t = typeSel.value, n = cfg(t);
      state.type = t;
      if (n.W) state.W = Math.min(Math.max(state.W, n.W[0]), n.W[1]);
      state.L = Math.min(Math.max(state.L, n.L[0]), n.L[1]);
      state.H = Math.min(Math.max(state.H, n.H[0]), n.H[1]);
      buildFields();
      render();
    });

    toggles.forEach((btn) => {
      btn.addEventListener("click", () => {
        state.view = btn.getAttribute("data-config-view");
        toggles.forEach((b) => b.classList.toggle("is-active", b === btn));
        view2d.hidden = state.view !== "2d";
        view3d.hidden = state.view !== "3d";
        if (state.view === "3d") requestAnimationFrame(drawCanvas);
      });
    });

    typeSel.value = state.type;
    buildFields();
    render();
    window.addEventListener("resize", () => { if (state.view === "3d") drawCanvas(); });
    raf = requestAnimationFrame(loop);
  }
})();
