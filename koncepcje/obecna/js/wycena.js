/* ============================================================
   MultiGraf — kalkulator wyceny druku (wycena.html)
   Model: «wycena orientacyjna → mail do handlowca (mailto)»
   ✱ WSZYSTKIE CENY SĄ DEMONSTRACYJNE — podmień je w obiekcie
     CONFIG poniżej (zł netto). Model uproszczony, ale działa
     na realnej logice: naświetlanie CTP + druk arkuszowy.

     RACHUJEMY WYŁĄCZNIE PO ARKUSZACH: klient podaje liczbę
     arkuszy z rozkładówką (impozycją); ile wydzieleń zmieści
     się na arkuszu — ustala nasze DTP. Format pojedynczego
     wyrobu nie jest już parametrem kalkulatora.

     Druk offsetowy prowadzony na 4 arkuszach papieru:
     A1 (594×841), A1+ (610×860), B1 (700×1000), B1+ (720×1020).
     Naświetlanie płyt CTP: wyłącznie format 1030×785.

     Nowe bloki wyceny (id analiza _info):
     [A1] mini-bar wyceny na mobile  [A2] cena za arkusz
     [A3] technologia druku          [A4] waga przesyłki
     [A5] data wysyłki               [A6] ważność wyceny 48 h
     [A7] podpowiedzi przy polach    [B8] rozbicie wyceny
     [B9] porównanie nakładów        [B10] pobierz wycenę
     [B11] walidacja + RODO          [B12] dostawa wg wagi
   ============================================================ */

(function () {
  'use strict';

  /* ============================================================
     1. CONFIG — JEDYNE MIEJSCE DO PODMIANY CEN (zł netto)
     ============================================================ */
  const CONFIG = {

    /* Adres odbiorcy wycen (dział sprzedaży) */
    salesEmail: 'mp@multigraf.com.pl',

    /* Grupy produktów — wpływają na oprawę, liczbę stron i opis wyceny */
    produkt: {
      ulotki:     { nazwa: 'Ulotki' },
      plakaty:    { nazwa: 'Plakaty' },
      opakowania: { nazwa: 'Opakowania' },
      naklejki:   { nazwa: 'Naklejki (folia)' },
      katalogi:   { nazwa: 'Katalogi / książki' }
    },

    /* Formaty arkusza maszyny offsetowej — TYLKO 4 (mm) */
    arkusze: {
      'A1':  { szer: 594, wys: 841  },
      'A1+': { szer: 610, wys: 860  },
      'B1':  { szer: 700, wys: 1000 },
      'B1+': { szer: 720, wys: 1020 }
    },
    arkuszDomyślny: 'B1+',

    /* Koszty produkcji */
    druk: {
      kosztZaPas: 0.34,          // zł / arkusz / jedno pasowanie kolorowe
      kosztPrzygotowania: 180,   // naświetlanie CTP 1030×785 + przygotowanie (offset)
      pantoneZaKolor: 85,        // forma CTP na jeden kolor Pantone
      progCyfrowy: 200,          // nakład (arkuszy) < N → druk cyfrowy
      cyfrowy: {
        kosztPrzygotowania: 45,  // przygotowanie na maszynie cyfrowej
        kosztZaStrA4: 0.55       // zadrukowana strona A4 (CMYK) — skalujemy polem arkusza
      }
    },

    /* Podłoża — koszt w zł netto za m² (indeks = pozycja suwaka) */
    gramatury: [
      { g: 80,  c: 0.52, opis: '— ulotki lekkie, składane' },
      { g: 90,  c: 0.54, opis: '— ulotki proste' },
      { g: 115, c: 0.60, opis: '— standard ulotek i wnętrz katalogów' },
      { g: 130, c: 0.65, opis: '— wnętrza katalogów i czasopism' },
      { g: 150, c: 0.72, opis: '— grubsze ulotki' },
      { g: 170, c: 0.80, opis: '— okładki katalogów, plakaty' },
      { g: 200, c: 0.95, opis: '— dyplomy, świadectwa' },
      { g: 250, c: 1.20, opis: '— kartony, opakowania lekkie' },
      { g: 300, c: 1.45, opis: '— kartony, opakowania standard' }
    ],

    /* Mnożnik rodzaju podłoża (papier bazowy = kreda) */
    mnoznikPodloza: {
      kreda: 1.0,
      niepowlekany: 1.12,
      karton: 1.35,
      niewsiakliwy: 2.10          // folia drukowana
    },

    /* Uszlachetnienie (zł netto):
       przygotowanie — koszt stały; m2 — za m² zadrukowanego podłoża;
       arkusz — za arkusz maszyny (prace introligatorskie, sztancowanie) */
    usz: {
      folia_mat:     { nazwa: 'Foliowanie matowe',     przygotowanie: 80,  m2: 0.80 },
      folia_poz:     { nazwa: 'Foliowanie błyszczące', przygotowanie: 80,  m2: 0.80 },
      lakier_uv:     { nazwa: 'Lakier apla',           przygotowanie: 60,  m2: 0.35 },
      lakier_uv_wyb: { nazwa: 'Lakier UV wybiórczy',   przygotowanie: 220, m2: 0.85 },
      bigowanie:     { nazwa: 'Bigowanie',    przygotowanie: 90,  arkusz: 0.05 },
      perforacja:    { nazwa: 'Perforacja',   przygotowanie: 70,  arkusz: 0.03 },
      numeracja:     { nazwa: 'Numeracja',    przygotowanie: 30 },
      wiercenie:     { nazwa: 'Wiercenie',    przygotowanie: 25,  arkusz: 0.08 },
      sztancowanie:  { nazwa: 'Sztancowanie', przygotowanie: 250, arkusz: 0.12 }
    },

    /* Oprawa (tylko katalogi; zł netto / arkusz — demo) */
    oprawa: {
      brak:      { nazwa: 'Bez oprawy (luźne arkusze)', zaArkusz: 0    },
      zeszytowa: { nazwa: 'Oprawa zeszytowa',           zaArkusz: 0.18 },
      miekka:    { nazwa: 'Oprawa miękka klejona',      zaArkusz: 0.75 }
    },

    /* Termin: mnożnik ceny + dni robocze do wysyłki (dla [A5]) */
    termin: {
      standard: { nazwa: 'Standard (5–7 dni)', mnoznik: 1.0,  dniRobocze: 6 },
      ekspres:  { nazwa: 'Ekspres (2–3 dni)',  mnoznik: 1.35, dniRobocze: 3 }
    },

    /* [B12] Dostawa: kurier rozliczany wg wagi przesyłki */
    dostawa: {
      osobisty: { nazwa: 'Odbiór osobisty', koszt: 0 },
      kurier:   { nazwa: 'Kurier DPD',      baza: 22, zaKg: 0.8 },
      inpost:   { nazwa: 'Paczkomat InPost', koszt: 15, limitKg: 25 }
    },

    vat: 0.23,
    zapasPapieru: 1.08        /* 8 % zapasu technologicznego */
  };

  /* ============================================================
     2. STAN + POMOCNICZE
     ============================================================ */
  const $  = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));
  const zl = (v) => new Intl.NumberFormat('pl-PL',
    { style: 'currency', currency: 'PLN', minimumFractionDigits: 2 }).format(v);
  const liczba = (v) => new Intl.NumberFormat('pl-PL').format(v);
  /* Waga przesyłki — jedno formatowanie używane w panelu i w liście mail */
  const kg = (v) => new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 1 }).format(v) + ' kg';

  const state = { produkt: 'ulotki', papier: 'kreda', arkusz: 'B1+' };
  const isKatalog = () => state.produkt === 'katalogi';

  /* Odmiana: 1 arkusz / 2–4 arkusze / 5+ arkuszy */
  function odmienArkusze(n) {
    if (n === 1) return 'arkusz';
    const ost = n % 10, dzies = n % 100;
    if (ost >= 2 && ost <= 4 && !(dzies >= 12 && dzies <= 14)) return 'arkusze';
    return 'arkuszy';
  }

  /* Tekst arkusza papieru: «B1+ — 720×1020 mm» */
  function tekstArkusza() {
    const arkusz = CONFIG.arkusze[state.arkusz];
    return state.arkusz + ' — ' + arkusz.szer + '×' + arkusz.wys + ' mm';
  }

  /* Tekst zadruku: CMYK + ewentualne kolory dodatkowe Pantone */
  function tekstZadruku() {
    const wariant = $('#in-zadruk').value;
    const pantone = +$('#in-pantone').value || 0;
    return wariant + (pantone > 0 ? ' + ' + pantone + '× Pantone' : '');
  }

  /* [A5] Orientacyjna data wysyłki — licznik dni roboczych od dziś */
  function tekstWysylki(dniRoboczych) {
    const d = new Date();
    let dodane = 0;
    while (dodane < dniRoboczych) {
      d.setDate(d.getDate() + 1);
      const dzien = d.getDay();
      if (dzien !== 0 && dzien !== 6) dodane++;
    }
    return '~ ' + new Intl.DateTimeFormat('pl-PL',
      { weekday: 'short', day: 'numeric', month: 'short' }).format(d);
  }

  /* ============================================================
     3. KROK 1 — widoczność grup
     ============================================================ */
  /* Widoczność grup zależnie od produktu */
  function adaptuj() {
    const kat = isKatalog();
    $('#group-oprawa').classList.toggle('hidden', !kat);
    $('#group-strony').classList.toggle('hidden', !kat);
  }

  function pokazGramature() {
    const g = CONFIG.gramatury[+$('#in-gramatura').value];
    $('#gramatura-val').textContent = g.g + ' g/m²';
    $('#gramatura-hint').textContent = g.opis;
  }

  /* ============================================================
     4. RDZEŃ — obliczenie (rachunek po arkuszach z impozycją)
     nakladZastepczy — liczenie wariantu nakładu dla [B9]
     ============================================================ */
  function oblicz(nakladZastepczy) {
    const arkusze = Math.max(1, Math.floor(nakladZastepczy || +$('#in-naklad').value || 1));

    /* Powierzchnia wybranego arkusza maszyny (m²) */
    const arkusz = CONFIG.arkusze[state.arkusz];
    const poleArkusza = (arkusz.szer * arkusz.wys) / 1e6;

    /* Zadruk: pasy = kolory CMYK na obu stronach + dodatkowe Pantone */
    const wariant = $('#in-zadruk').value;           // np. 4+4
    const [kolor1, kolor2] = wariant.split('+').map(Number);
    const pantoneCount = Math.max(0, +$('#in-pantone').value || 0);
    const pasy = kolor1 + kolor2 + pantoneCount;
    const stronyDoDruku = (kolor2 > 0) ? 2 : 1;

    /* [A3] Technologia: mały nakład → cyfrowa, powyżej progu → offset */
    const cyfrowo = arkusze < CONFIG.druk.progCyfrowy;
    let przygotowanie, pantoneKoszt, druk;
    if (cyfrowo) {
      przygotowanie = CONFIG.druk.cyfrowy.kosztPrzygotowania;
      pantoneKoszt = 0;    /* w cyfrowym Pantone przechodzi jako CMYK — bez formy */
      /* koszt zadrukowanej strony A4 skalujemy polem wybranego arkusza */
      druk = CONFIG.druk.cyfrowy.kosztZaStrA4 * (poleArkusza / (0.21 * 0.297)) *
        arkusze * stronyDoDruku;
    } else {
      /* Przygotowanie: CTP 1030×785; forma na każdy dodatkowy Pantone */
      przygotowanie = CONFIG.druk.kosztPrzygotowania;
      pantoneKoszt = pantoneCount * CONFIG.druk.pantoneZaKolor;
      druk = arkusze * (pasy / 4) * CONFIG.druk.kosztZaPas;
    }

    /* Podłoże: powierzchnia arkusza × liczba arkuszy × zapas × cena m² */
    const g = CONFIG.gramatury[+$('#in-gramatura').value];
    const kosztPapier = poleArkusza * arkusze * CONFIG.zapasPapieru *
      g.c * CONFIG.mnoznikPodloza[state.papier];

    /* Uszlachetnienie: koszt stały + rozliczenie per m² lub per arkusz */
    let uszKoszt = 0, uszNazwy = [];
    $$('#opt-usz input:checked').forEach(function (ch) {
      const u = CONFIG.usz[ch.value];
      uszNazwy.push(u.nazwa);
      uszKoszt += u.przygotowanie;                       // natężanie, formy
      if (u.m2)     uszKoszt += u.m2 * poleArkusza * arkusze * CONFIG.zapasPapieru;
      if (u.arkusz) uszKoszt += u.arkusz * arkusze;
    });

    /* Oprawa (katalogi) — rozliczana per arkusz (demo) */
    const opr = CONFIG.oprawa[$('#in-oprawa').value];
    const kosztOprawy = isKatalog() ? opr.zaArkusz * arkusze : 0;
    const uszRazem = uszKoszt + kosztOprawy;

    /* [A4] Waga przesyłki (kg) — podłoże wraz z zapasem */
    const wagaKg = poleArkusza * arkusze * CONFIG.zapasPapieru * g.g / 1000;

    /* [B12] Dostawa: odbiór osobisty 0; kurier wg wagi; paczkomat stała */
    const kluczDostawy = $('#in-dostawa').value;
    const dost = CONFIG.dostawa[kluczDostawy];
    const kosztDostawy = (kluczDostawy === 'kurier')
      ? dost.baza + dost.zaKg * wagaKg
      : dost.koszt;

    /* Termin: mnożnik ceny + dni robocze do wysyłki */
    const termin = CONFIG.termin[$('#in-termin').value];
    const mnoz = termin.mnoznik;

    /* Podsumowanie: część produkcyjna podlega mnożnikowi terminu */
    const produkcyjne = przygotowanie + pantoneKoszt + druk + kosztPapier;
    const netto = Math.max(20, produkcyjne * mnoz + uszRazem + kosztDostawy);

    return {
      arkusze, gramCount: g, pasy, stronyDoDruku, cyfrowo,
      przygotowanie, pantoneKoszt, druk, kosztPapier,
      uszRazem, uszNazwy, kosztOprawy,
      wagaKg, kosztDostawy, dost, termin, mnoz, pantoneCount,
      netto, brutto: netto * (1 + CONFIG.vat), unit: netto / arkusze
    };
  }

  /* ============================================================
     5. WYŚWIETLENIE — panel podsumowania
     ============================================================ */
  function licz() {
    const r = oblicz();

    $('#sw-produkt').textContent = CONFIG.produkt[state.produkt].nazwa;
    $('#sw-arkusz').textContent = tekstArkusza();
    $('#sw-param').textContent = r.gramCount.g + ' g/m² · ' + tekstZadruku();
    $('#sw-naklad').textContent = liczba(r.arkusze) + ' ' + odmienArkusze(r.arkusze);
    /* [A3] Technologia druku widoczna dla klienta */
    $('#sw-tech').textContent = r.cyfrowo
      ? 'Druk cyfrowy (mały nakład)'
      : 'Druk offsetowy (formy CTP)';
    $('#sw-usz').textContent = r.uszNazwy.length ? r.uszNazwy.join(', ') : 'Brak';
    $('#sw-termin').textContent = r.termin.nazwa;
    /* [A5] Data wysyłki */
    $('#sw-wysylka').textContent = tekstWysylki(r.termin.dniRobocze);
    $('#sw-dostawa').textContent = r.dost.nazwa;
    /* [A4] Waga przesyłki */
    $('#sw-waga').textContent = '≈ ' + kg(r.wagaKg);

    /* [B8] Rozbicie ceny: część produkcyjna × mnożnik terminu */
    $('#sb-przygotowanie').textContent = zl(r.przygotowanie * r.mnoz);
    $('#sb-pantone').textContent       = zl(r.pantoneKoszt * r.mnoz);
    $('#sb-druk').textContent          = zl(r.druk * r.mnoz);
    $('#sb-papier').textContent        = zl(r.kosztPapier * r.mnoz);
    $('#sb-usz').textContent           = zl(r.uszRazem);
    $('#sb-dostawa').textContent       = zl(r.kosztDostawy);
    $('#row-pantone').classList.toggle('hidden', !(r.pantoneKoszt > 0));

    $('#sum-netto').textContent  = zl(r.netto);
    $('#sum-brutto').textContent = zl(r.brutto);
    /* [A2] Cena za arkusz */
    $('#sum-unit').textContent   = zl(r.unit);

    /* [B9] Porównanie nakładów: bieżący, ×2 i ×5 — ekonomia skali */
    $('#porownanie-body').innerHTML = [1, 2, 5].map(function (k) {
      const w = oblicz(r.arkusze * k);
      const teraz = (k === 1) ? ' class="porownanie--teraz"' : '';
      return '<tr' + teraz + '><td>' + liczba(w.arkusze) + '</td><td>' +
        zl(w.netto) + '</td><td>' + zl(w.unit) + '</td></tr>';
    }).join('');

    /* [B12] Kwoty dostawy odświeżone wagą przesyłki w liście wyboru
       (poszukiwanie po value — kolejność w HTML jest obojętna) */
    const dostawaSel = $('#in-dostawa');
    const kurier = CONFIG.dostawa.kurier;
    dostawaSel.querySelector('option[value="kurier"]').textContent =
      kurier.nazwa + ' — ' + zl(kurier.baza + kurier.zaKg * r.wagaKg) + ' (' + kg(r.wagaKg) + ')';
    const inpost = CONFIG.dostawa.inpost;
    dostawaSel.querySelector('option[value="inpost"]').textContent =
      inpost.nazwa + ' — ' + zl(inpost.koszt) + ' (do ' + liczba(inpost.limitKg) + ' kg)';

    /* [A1] Mini-bar na mobile */
    $('#minibar-netto').textContent  = zl(r.netto);
    $('#minibar-brutto').textContent = 'brutto ' + zl(r.brutto);

    odswiezWysylke();
  }

  /* ============================================================
     6. [B11] WALIDACJA — imię, e-mail, zgoda RODO
     ============================================================ */
  function polaDoWalidacji() {
    return [
      { el: $('#in-name'),  ok: $('#in-name').value.trim().length > 1 },
      { el: $('#in-email'), ok: /\S+@\S+\.\S+/.test($('#in-email').value.trim()) },
      { el: $('#in-rodo'),  ok: $('#in-rodo').checked, etykieta: true }
    ];
  }

  /* Przycisk wysyłki aktywny dopiero po poprawnym formularzu */
  function odswiezWysylke() {
    const wszystkieOk = polaDoWalidacji().every(function (p) { return p.ok; });
    $('#btn-send').classList.toggle('btn--disabled', !wszystkieOk);
    $('#minibar-send').classList.toggle('btn--disabled', !wszystkieOk);
  }

  /* Oznaczenie pól z błędem (obwódka w kolorze var(--tag)) */
  function oznaczBledy() {
    polaDoWalidacji().forEach(function (p) {
      if (p.etykieta) p.el.closest('.rodo').classList.toggle('rodo--blad', !p.ok);
      else p.el.classList.toggle('input--blad', !p.ok);
    });
    return polaDoWalidacji().every(function (p) { return p.ok; });
  }

  /* ============================================================
     7. WYSYŁKA — list mailto z pełnym zestawieniem
        (ten sam tekst służy do kopiowania — [B10])
     ============================================================ */
  function tekstWyceny(r) {
    const produkt = CONFIG.produkt[state.produkt].nazwa;
    return [
      'WYCENA ORIENTACYJNA — kalkulator multigraf.com.pl', '',
      'PRODUKT:         ' + produkt,
      'ARKUSZ PAPIERU:  ' + tekstArkusza(),
      'NAKŁAD:          ' + liczba(r.arkusze) + ' ' + odmienArkusze(r.arkusze),
      isKatalog() ? 'STRONY:          ' + $('#in-strony').value : null,
      isKatalog() ? 'OPRAWA:          ' + CONFIG.oprawa[$('#in-oprawa').value].nazwa : null,
      'TECHNOLOGIA:     ' + (r.cyfrowo ? 'druk cyfrowy' : 'druk offsetowy (CTP 1030×785)'),
      'PODŁOŻE:         ' + $('#in-papier').options[$('#in-papier').selectedIndex].text +
        ', ' + r.gramCount.g + ' g/m²',
      'ZADRUK:          ' + tekstZadruku(),
      'USZLACHETNIENIE: ' + (r.uszNazwy.length ? r.uszNazwy.join(', ') : 'brak'),
      'TERMIN:          ' + r.termin.nazwa + ', wysyłka ' + tekstWysylki(r.termin.dniRobocze),
      'DOSTAWA:         ' + r.dost.nazwa + ' — ' + zl(r.kosztDostawy),
      'WAGA PRZESYŁKI:  ≈ ' + kg(r.wagaKg), '',
      'WYCENA (orientacyjna, netto):',
      '  przygotowanie:   ' + zl(r.przygotowanie * r.mnoz),
      r.pantoneKoszt > 0 ? '  formy Pantone:   ' + zl(r.pantoneKoszt * r.mnoz) : null,
      '  druk:            ' + zl(r.druk * r.mnoz),
      '  podłoże:         ' + zl(r.kosztPapier * r.mnoz),
      '  uszlachetnienie: ' + zl(r.uszRazem),
      '  dostawa:         ' + zl(r.kosztDostawy),
      '  RAZEM netto:     ' + zl(r.netto) + '  (brutto ' + zl(r.brutto) + ')',
      '  za arkusz:       ' + zl(r.unit), '',
      'ZAMAWIAJĄCY:',
      '  ' + $('#in-name').value +
        ($('#in-firma').value.trim() ? ' · ' + $('#in-firma').value.trim() : ''),
      '  e-mail: ' + $('#in-email').value.trim(),
      $('#in-tel').value.trim() ? '  tel: ' + $('#in-tel').value.trim() : null,
      $('#in-uwagi').value.trim() ? 'UWAGI: ' + $('#in-uwagi').value.trim() : null
    ].filter(function (x) { return x !== null; }).join('\n');
  }

  function wyslij() {
    const r = oblicz();
    const produkt = CONFIG.produkt[state.produkt].nazwa;
    location.href = 'mailto:' + CONFIG.salesEmail +
      '?subject=' + encodeURIComponent('Wyceń zamówienie — ' + produkt +
        ', ' + liczba(r.arkusze) + ' ' + odmienArkusze(r.arkusze)) +
      '&body=' + encodeURIComponent(tekstWyceny(r));
  }

  /* Próba wysyłki: walidacja → mailto (używają jej panel i mini-bar) */
  function probaWyslania() {
    if (!oznaczBledy()) {
      const pierwsze = polaDoWalidacji().find(function (p) { return !p.ok; });
      if (pierwsze) pierwsze.el.focus();
      return;
    }
    wyslij();
  }

  /* ============================================================
     8. INICJALIZACJA I EVENTY
     ============================================================ */
  function init() {
    state.arkusz = $('#in-arkusz').value || CONFIG.arkuszDomyślny;
    state.papier = $('#in-papier').value;
    adaptuj();
    pokazGramature();
    licz();

    /* Krok 1: produkcja, nakład, arkusz, podłoże, gramatura */
    $('#in-produkt').addEventListener('change', function () {
      state.produkt = this.value;
      adaptuj();
      licz();
    });
    $('#in-naklad').addEventListener('input', licz);
    $('#in-arkusz').addEventListener('change', function () { state.arkusz = this.value; licz(); });
    $('#in-gramatura').addEventListener('input', function () { pokazGramature(); licz(); });
    $('#in-papier').addEventListener('change', function () { state.papier = this.value; licz(); });

    /* Krok 2: uszlachetnienie i oprawa (chips) — każde kliknięcie przelicza */
    $$('#opt-usz input').forEach(function (c) { c.addEventListener('change', licz); });

    /* Krok 1–3: strony (katalog), zadruk, Pantone, oprawa, termin, dostawa */
    ['#in-strony', '#in-zadruk', '#in-pantone', '#in-oprawa',
     '#in-termin', '#in-dostawa'].forEach(function (sel) {
      document.querySelector(sel).addEventListener('change', licz);
    });

    /* Krok 4: dane zamawiającego — odświeżenie przycisku wysyłki */
    ['#in-name', '#in-firma', '#in-email', '#in-tel'].forEach(function (sel) {
      document.querySelector(sel).addEventListener('input', function () {
        this.classList.remove('input--blad');
        odswiezWysylke();
      });
    });
    $('#in-rodo').addEventListener('change', function () {
      this.closest('.rodo').classList.remove('rodo--blad');
      odswiezWysylke();
    });

    /* Panel + mini-bar: wspólna walidacja i mailto */
    $('#btn-send').addEventListener('click', probaWyslania);
    $('#minibar-send').addEventListener('click', probaWyslania);

    /* [B10] Wydruk / zapis PDF — drukuje wyłącznie panel wyceny */
    $('#btn-drukuj').addEventListener('click', function () { window.print(); });

    /* [B10] Kopiowanie opisu wyceny do schowka (z mechanizmem zapasowym) */
    $('#btn-kopiuj').addEventListener('click', function () {
      const tekst = tekstWyceny(oblicz());
      const przycisk = this;
      const potwierdz = function () {
        przycisk.textContent = 'Skopiowano ✓';
        setTimeout(function () { przycisk.textContent = 'Kopiuj opis'; }, 2000);
      };
      const zapas = function () {
        const pomoc = document.createElement('textarea');
        pomoc.value = tekst;
        pomoc.style.position = 'fixed';
        pomoc.style.opacity = '0';
        document.body.appendChild(pomoc);
        pomoc.select();
        try { document.execCommand('copy'); } catch (blad) { /* brak zgody */ }
        document.body.removeChild(pomoc);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(tekst).then(potwierdz, function () { zapas(); potwierdz(); });
      } else {
        zapas();
        potwierdz();
      }
    });

    /* [A1] Mini-bar: pokazujemy, gdy panel wyceny jest poza ekranem.
       Zamiast IntersectionObserver stosujemy zwykły scroll listener —
       działa identycznie w każdej przeglądarce, także w starych silnikach */
    const minibar = $('#minibar');
    const odswiezMinibar = function () {
      const pozycja = $('#summary').getBoundingClientRect();
      const pozaEkranem = pozycja.top > window.innerHeight || pozycja.bottom < 0;
      minibar.classList.toggle('minibar--widoczny', pozaEkranem);
    };
    odswiezMinibar();
    window.addEventListener('scroll', odswiezMinibar, { passive: true });
    window.addEventListener('resize', odswiezMinibar);
  }

  document.addEventListener('DOMContentLoaded', init);
})();
