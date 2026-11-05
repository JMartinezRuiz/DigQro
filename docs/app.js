(function () {
  "use strict";

  document.documentElement.classList.add("js");

  var whatsappNumber = "524426000092";

  function init() {
    document.querySelectorAll("[data-wa]").forEach(function (link) {
      link.href = "https://wa.me/" + whatsappNumber + "?text=" + encodeURIComponent(link.dataset.wa);
    });

    var year = document.querySelector("[data-year]");
    if (year) {
      year.textContent = String(new Date().getFullYear());
    }

    var revealed = document.querySelectorAll("[data-reveal]");

    if (!("IntersectionObserver" in window)) {
      revealed.forEach(function (element) {
        element.classList.add("is-in");
      });
      document.querySelector("[data-motion]").classList.add("play");
      return;
    }

    var revealObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-in");
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.2, rootMargin: "0px 0px -6% 0px" }
    );

    revealed.forEach(function (element) {
      revealObserver.observe(element);
    });

    /* La cabecera marca su borde solo cuando hay contenido debajo */

    var head = document.querySelector("[data-head]");
    var sentinel = document.querySelector("[data-sentinel]");

    if (head && sentinel) {
      new IntersectionObserver(function (entries) {
        head.classList.toggle("is-stuck", !entries[0].isIntersecting);
      }).observe(sentinel);
    }

    /* La animación de la portada empieza al verse y se repite al volver a ella */

    var motion = document.querySelector("[data-motion]");

    if (motion) {
      new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.intersectionRatio >= 0.75) {
              motion.classList.add("play");
            } else if (!entry.isIntersecting) {
              motion.classList.remove("play");
              motion.classList.add("reset");
              void motion.offsetWidth;
              motion.classList.remove("reset");
            }
          });
        },
        { threshold: [0, 0.75] }
      ).observe(motion);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
