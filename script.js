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

  const requestForm = document.querySelector(".request-form");
  if (requestForm) {
    const note = requestForm.querySelector(".request-note");
    requestForm.addEventListener("submit", (event) => {
      event.preventDefault();
      if (note) {
        note.textContent =
          "Заявка отправлена — в прототипе данные не уходят. Подключите обработчик при разработке.";
      }
    });
  }
})();
