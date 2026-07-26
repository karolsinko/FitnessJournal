# Tréner

Osobná appka na sledovanie váhy, kalórií, makier a silových výkonov.
Dáta sa ukladajú lokálne v prehliadači (localStorage) – nikam sa neposielajú.

## Spustenie na počítači

Potrebuješ Node.js 18 alebo novší ([nodejs.org](https://nodejs.org)).

```bash
npm install
npm run dev
```

V termináli sa objaví adresa, zvyčajne `http://localhost:5173`. Otvor ju v prehliadači.

## Vytvorenie verzie na web

```bash
npm run build
```

Vznikne priečinok `dist/` – to je hotová stránka, ktorú vieš nahrať kamkoľvek.

Rýchla kontrola pred nahraním:

```bash
npm run preview
```

## Kam to nahrať

**Netlify Drop** – najrýchlejšie, bez registrácie účtu vopred.
Choď na [app.netlify.com/drop](https://app.netlify.com/drop) a pretiahni tam priečinok `dist`.
Do minúty dostaneš verejnú adresu.

**Vercel** – nahraj projekt na GitHub, potom na [vercel.com](https://vercel.com) klikni Import.
Framework rozpozná sám (Vite), nič nenastavuješ.

**GitHub Pages** – nahraj obsah `dist` do vetvy `gh-pages`.
V `vite.config.js` je už `base: './'`, takže funguje aj v podpriečinku.

## Appka v telefóne

Otvor adresu v mobile a pridaj si stránku na plochu:

- **iPhone (Safari):** Zdieľať → Pridať na plochu
- **Android (Chrome):** menu ⋮ → Pridať na plochu

Otvorí sa potom na celú obrazovku ako bežná appka.

## Dôležité o dátach

Záznamy sú uložené v prehliadači na tom zariadení, kde ich zapíšeš.
Neprenášajú sa medzi telefónom a počítačom a zmažú sa, ak vyčistíš dáta prehliadača.
Ak chceš dáta na viacerých zariadeniach, treba doplniť backend – to je väčší zásah,
ale dá sa spraviť neskôr.

## Štruktúra

```
src/App.jsx     celá appka (logika aj vzhľad)
src/main.jsx    štartovací bod Reactu
src/index.css   Tailwind + drobné úpravy
```

Tréningové splity a cviky sú v `App.jsx` v konštante `TEMPLATES`,
pravidlá trénera v funkcii `buildAdvice`. Oboje sa dá upraviť priamo v súbore.
