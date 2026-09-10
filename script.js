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

  // ── Экспресс-чертёж: живая схема каркаса по размерам ────────────────────
  const config = document.querySelector("[data-config]");
  if (config) {
    const svg     = config.querySelector("[data-config-svg]");
    const areaOut = config.querySelector("[data-config-area]");
    const typeSel = config.querySelector("[data-config-type]");
    const wIn = config.querySelector("[data-config-w]");
    const lIn = config.querySelector("[data-config-l]");
    const hIn = config.querySelector("[data-config-h]");
    const wVal = config.querySelector("[data-config-w-val]");
    const lVal = config.querySelector("[data-config-l-val]");
    const hVal = config.querySelector("[data-config-h-val]");
    const sendBtn = config.querySelector("[data-config-send]");
    const mailTo = (sendBtn.getAttribute("href") || "mailto:").replace(/^mailto:/, "").split("?")[0];

    const map = (v, a, b, c, d) => c + (d - c) * ((v - a) / (b - a));

    function render() {
      const W = +wIn.value, L = +lIn.value, H = +hIn.value;
      wVal.textContent = W; lVal.textContent = L; hVal.textContent = H;

      const area = W * L;
      areaOut.textContent = area.toLocaleString("ru-RU") + " м²";

      // геометрия фронтального «портала»
      const ground = 176, cx = 160;
      const wpx = map(W, 6, 48, 74, 264);
      const hpx = map(H, 3, 12, 44, 118);
      const gable = wpx * 0.16;
      const x1 = +(cx - wpx / 2).toFixed(1), x2 = +(cx + wpx / 2).toFixed(1);
      const eave = +(ground - hpx).toFixed(1), apex = +(eave - gable).toFixed(1);
      const midY = +((ground + eave) / 2).toFixed(1);

      // раскладка колонн (рамы) по длине — чисто визуально, 3–7 шт.
      const bays = Math.max(2, Math.min(6, Math.round(L / 12)));
      let purlins = "";
      for (let i = 1; i < bays; i++) {
        const x = +(x1 + (wpx * i) / bays).toFixed(1);
        purlins += `M${x} ${ground} V${eave} `;
      }

      svg.innerHTML =
        `<g stroke="var(--color-text)" fill="none" stroke-linecap="square" stroke-width="1.9">` +
          `<path d="M18 ${ground} H302"/>` +
          `<path d="M${x1} ${ground} V${eave} M${x2} ${ground} V${eave}"/>` +
          `<path d="M${x1} ${eave} L${cx} ${apex} L${x2} ${eave}"/>` +
          `<path d="M${x1} ${eave} H${x2}"/>` +
        `</g>` +
        `<g stroke="var(--color-neutral-500)" fill="none" stroke-width="1" stroke-dasharray="3 4">${purlins}</g>` +
        `<g stroke="var(--color-accent)" fill="none" stroke-width="1.2">` +
          `<path d="M${x1} ${ground + 15} H${x2} M${x1} ${ground + 9} V${ground + 21} M${x2} ${ground + 9} V${ground + 21}"/>` +
          `<path d="M${x1 - 15} ${ground} V${eave} M${x1 - 21} ${ground} H${x1 - 9} M${x1 - 21} ${eave} H${x1 - 9}"/>` +
        `</g>` +
        `<g fill="var(--color-accent-700)" font-family="'IBM Plex Mono', monospace" font-size="12">` +
          `<text x="${cx}" y="${ground + 32}" text-anchor="middle">${W} м</text>` +
          `<text x="${x1 - 25}" y="${midY}" text-anchor="end" dominant-baseline="middle">${H} м</text>` +
        `</g>`;

      // предзаполненное письмо (данные нигде не сохраняются — открывается почтовый клиент)
      const body =
        `Здравствуйте! Интересует объект: ${typeSel.value}.\n` +
        `Пролёт (ширина): ${W} м\nДлина: ${L} м\nВысота: ${H} м\n` +
        `Площадь застройки: ${area} м²\n\nПрошу рассчитать ориентировочную стоимость.`;
      sendBtn.setAttribute(
        "href",
        `mailto:${mailTo}?subject=${encodeURIComponent("Заявка на расчёт объекта")}&body=${encodeURIComponent(body)}`
      );
    }

    [typeSel, wIn, lIn, hIn].forEach((el) => el.addEventListener("input", render));
    render();
  }
})();
