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
