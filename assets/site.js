/* Wspólne, niewielkie zachowania dla trzech prototypów.
   Brak frameworka, brak zewnętrznych zależności. */
(() => {
  document.documentElement.classList.add("js");

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");

  document.querySelectorAll("[data-nav-toggle]").forEach((toggle) => {
    const panelId = toggle.getAttribute("aria-controls");
    const panel = panelId ? document.getElementById(panelId) : null;
    if (!panel) return;

    const label = toggle.querySelector(".visually-hidden");
    const setOpen = (open, returnFocus = false) => {
      toggle.setAttribute("aria-expanded", String(open));
      panel.classList.toggle("is-open", open);
      document.body.classList.toggle("nav-open", open);
      if (label) label.textContent = open ? "Zamknij menu" : "Otwórz menu";
      if (open) {
        const first = panel.querySelector("a, button");
        if (first) first.focus();
      } else if (returnFocus) {
        toggle.focus();
      }
    };

    toggle.addEventListener("click", () => {
      setOpen(toggle.getAttribute("aria-expanded") !== "true");
    });

    panel.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => setOpen(false));
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && toggle.getAttribute("aria-expanded") === "true") {
        setOpen(false, true);
      }
    });

    document.addEventListener("click", (event) => {
      if (
        toggle.getAttribute("aria-expanded") !== "true" ||
        panel.contains(event.target) ||
        toggle.contains(event.target)
      ) {
        return;
      }
      setOpen(false);
    });
  });

  /* Formularze są wizualne: nie wysyłają danych w prototypie. */
  document.querySelectorAll("[data-demo-form]").forEach((form) => {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const status = form.querySelector("[data-form-status]");
      if (!status) return;
      status.textContent =
        "To wersja poglądowa — formularz nie wysyła wiadomości. Zadzwoń: 12 429 30 04.";
      status.classList.add("is-visible");
      status.setAttribute("role", "status");
    });
  });

  /* Delikatne wejście tylko tam, gdzie strona tego chce. */
  if (!reduced.matches) {
    document.querySelectorAll("[data-enter]").forEach((el) => {
      el.classList.add("is-entering");
      requestAnimationFrame(() => {
        requestAnimationFrame(() => el.classList.add("is-entered"));
      });
    });
  } else {
    document.querySelectorAll("[data-enter]").forEach((el) => el.classList.add("is-entered"));
  }
})();
