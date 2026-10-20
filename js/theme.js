/* ============================================================
   theme.js — przełącznik motywów kolorystycznych MultiGraf
   8 palet zdefiniowanych w css/style.css (selektory
   :root[data-theme="..."]). Wybór zapisywany w localStorage
   pod kluczem «multigraf-motyw» i odtwarzany przy wejściu.
   ============================================================ */
(function () {
  'use strict';

  /* Klucz w localStorage */
  var KLUCZ = 'multigraf-motyw';

  /* Lista motywów: identyfikator + polska nazwa widoczna na liście */
  var MOTYWY = [
    { id: 'fairy',        nazwa: 'Fairy' },
    { id: 'prem-min',     nazwa: 'Klasyczny minimalizm' },
    { id: 'korpo',        nazwa: 'Korporacyjny niebieski' },
    { id: 'tech',         nazwa: 'Bento tech' },
    { id: 'dark-premium', nazwa: 'Ciemny premium' },
    { id: 'prem-korpo',   nazwa: 'Royal korporacyjny' },
    { id: 'studio',       nazwa: 'Kreatywne studio' },
    { id: 'digital',      nazwa: 'Cyfrowy neon' }
  ];

  /* Kolory kropek-światełek przy nazwie [tło, akcent1, akcent2, akcent3] */
  var PALETY = {
    'fairy':        ['#252C49', '#A163F7', '#6F88FC', '#45E3FF'],
    'prem-min':     ['#F8F9FA', '#D4AF37', '#9A7B2F', '#2E6349'],
    'korpo':        ['#F4F6F9', '#FF6B35', '#0052FF', '#3B82F6'],
    'tech':         ['#FFFFFF', '#10B981', '#0052FF', '#84CC16'],
    'dark-premium': ['#0F172A', '#E2B659', '#38BDF8', '#7DD3FC'],
    'prem-korpo':   ['#F4F5F7', '#E5A93C', '#0F2C59', '#D4AF37'],
    'studio':       ['#FFFFFF', '#FF5A36', '#0052FF', '#7C3AED'],
    'digital':      ['#0B0F19', '#00F5D4', '#A85CF0', '#9D4EDD']
  };

  var przycisk = null;
  var panel = null;

  /* Odczyt zapisanego motywu — z zabezpieczeniem na zablokowany localStorage */
  function odczytajZapis() {
    try {
      return window.localStorage.getItem(KLUCZ);
    } catch (blad) {
      return null;
    }
  }

  /* Zapis wyboru — cicho, gdy storage niedostępny */
  function zapisz(id) {
    try {
      window.localStorage.setItem(KLUCZ, id);
    } catch (blad) { /* brak dostępu do localStorage — pomijamy */ }
  }

  /* Zastosowanie motywu: atrybut data-theme na elemencie <html>.
     Na czas zmiany wyłączamy przejścia (klasa na <body>) — starsze
     silniki nie przeliczają wtedy stanów przechwyconych
     przez transition na właściwościach z var(). */
  function zastosuj(id) {
    if (!PALETY[id]) id = 'fairy';
    var korpus = document.body;
    document.documentElement.setAttribute('data-theme', id);
    zapisz(id);
    odswiezPanel(id);
    if (!korpus || typeof requestAnimationFrame !== 'function') return;

    korpus.classList.add('przelaczanie-tematu');
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          korpus.classList.remove('przelaczanie-tematu');
        });
      });
    });
  }

  /* Podświetlenie aktywnego elementu listy */
  function odswiezPanel(id) {
    if (!panel) return;
    var elementy = panel.querySelectorAll('.theme-panel__item');
    for (var i = 0; i < elementy.length; i++) {
      elementy[i].classList.toggle('theme-panel__item--active', elementy[i].dataset.motyw === id);
    }
  }

  /* Budowa listy: przyciski z polskimi nazwami i próbkami kolorów */
  function zbudujListe() {
    MOTYWY.forEach(function (motyw) {
      var element = document.createElement('button');
      element.type = 'button';
      element.className = 'theme-panel__item';
      element.dataset.motyw = motyw.id;
      element.setAttribute('role', 'menuitem');
      element.textContent = motyw.nazwa;

      var kropki = document.createElement('span');
      kropki.className = 'theme-dots';
      (PALETY[motyw.id] || []).forEach(function (kolor) {
        var kropka = document.createElement('span');
        kropka.style.background = kolor;
        kropki.appendChild(kropka);
      });
      element.appendChild(kropki);

      element.addEventListener('click', function () {
        zastosuj(motyw.id);
        zamknij();
      });
      panel.appendChild(element);
    });

    odswiezPanel(document.documentElement.getAttribute('data-theme') || 'fairy');
  }

  /* Otwieranie / zamykanie panelu */
  function otworz() {
    panel.hidden = false;
    przycisk.setAttribute('aria-expanded', 'true');
  }
  function zamknij() {
    panel.hidden = true;
    przycisk.setAttribute('aria-expanded', 'false');
  }

  /* Natychmiastowe przywrócenie zapisanego motywu */
  var zapis = odczytajZapis();
  if (zapis && PALETY[zapis]) {
    document.documentElement.setAttribute('data-theme', zapis);
  }

  przycisk = document.getElementById('motyw-przycisk');
  panel = document.getElementById('motyw-panel');

  if (przycisk && panel) {
    zbudujListe();

    przycisk.addEventListener('click', function () {
      if (panel.hidden) otworz(); else zamknij();
    });

    /* Zamknięcie klawiszem Escape */
    document.addEventListener('keydown', function (zdarzenie) {
      if (zdarzenie.key === 'Escape') zamknij();
    });

    /* Zamknięcie po kliknięciu poza panelem */
    document.addEventListener('click', function (zdarzenie) {
      if (panel.hidden) return;
      var cel = zdarzenie.target;
      if (panel.contains(cel) || przycisk.contains(cel)) return;
      zamknij();
    });
  }
})();
