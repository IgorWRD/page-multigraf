/* ============================================================
   MultiGraf — main.js
   Menu mobilne · nagłówek przy przewijaniu · reveal · formularz
   ============================================================ */

(function () {
  'use strict';

  /* ---------- Burger / menu mobilne ---------- */
  const burger = document.getElementById('burger');
  const nav = document.getElementById('nav');

  if (burger && nav) {
    burger.addEventListener('click', function () {
      const isOpen = nav.classList.toggle('nav--open');
      burger.classList.toggle('burger--open', isOpen);
      burger.setAttribute('aria-expanded', String(isOpen));
      burger.setAttribute('aria-label', isOpen ? 'Zamknij menu' : 'Otwórz menu');
    });

    // Zamknięcie menu po kliknięciu w link
    nav.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        nav.classList.remove('nav--open');
        burger.classList.remove('burger--open');
        burger.setAttribute('aria-expanded', 'false');
      });
    });
  }

  /* ---------- Podświetlenie nagłówka przy przewijaniu ---------- */
  const header = document.getElementById('header');

  function onScroll() {
    if (!header) return;
    header.classList.toggle('header--scrolled', window.scrollY > 24);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- Reveal przy przewijaniu ---------- */
  const revealEls = document.querySelectorAll('.reveal');

  if ('IntersectionObserver' in window && revealEls.length) {
    const io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('reveal--in');
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    // Fallback: pokaż wszystko od razu
    revealEls.forEach(function (el) { el.classList.add('reveal--in'); });
  }

  /* ---------- Formularz kontaktowy (walidacja HTML5 +	status) ---------- */
  const form = document.getElementById('contact-form');
  const status = document.getElementById('form-status');

  if (form && status) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();

      if (!form.checkValidity()) {
        status.textContent = 'Uzupełnij wymagane pola: imię i nazwisko oraz poprawny e-mail.';
        status.style.color = 'var(--tag)';
        return;
      }

      // TODO: podłączyć wysyłkę (fetch → backend / mailto / API formularza)
      status.textContent = 'Dziękujemy! Formularz działa w trybie demonstracyjnym — wysyłka zostanie podłączona na etapie produkcji.';
      status.style.color = '';
      form.reset();
    });
  }
})();
