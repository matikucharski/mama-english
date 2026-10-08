# Mama English 🇬🇧👩‍👧‍👦

Aplikacja do nauki potocznego angielskiego do codziennych rozmów z dziećmi – w domu i w przedszkolu.
Czysty HTML + CSS + JavaScript (moduły ES), bez frameworka i bez budowania. Działa jako PWA (instalacja na telefonie, offline).

## Co jest w środku
- **15 sytuacji × 4 dialogi = 60 lekcji, 303 zdania do nauki** (`js/data/*.js`)
- Lekcja w 3 krokach: **Posłuchaj** (dialog z lektorem) → **Poznaj zdania** (fiszki PL→EN z samooceną) → **Ćwicz** (quiz: wybór zdania, odpowiedź dziecku, układanie zdania, słuchanie, 🎤 mówienie)
- **Powtórki** metodą pudełek Leitnera (1 → 2 → 4 → 8 → 16 → 30 dni)
- **Odznaki**: ogólne (serie dni, liczba zdań, użycie w życiu, mikrofon) i 🥉🥈🥇 za każdą sytuację
- **„Zdanie na dziś”** + przycisk „Użyłam dziś!” – liczy, ile razy zdanie padło w prawdziwej rozmowie
- Postęp w `localStorage` (klucz `mama-en.v1`), kopia zapasowa do pliku w Ustawieniach

## Uruchomienie lokalnie
Moduły ES wymagają serwera HTTP (otwarcie `index.html` z dysku nie zadziała):

```bash
npx serve -l 5173 .
```

albo prawy klik na `index.html` w WebStorm → *Open in Browser*. Lokalnie service worker jest wyłączony, więc zmiany widać od razu.

Sprawdzenie treści po edycji dialogów:

```bash
node tools/validate-content.mjs
```

## Deploy – GitHub Pages (zalecane)
1. Utwórz repozytorium na GitHubie (np. `angielski`) i wypchnij ten folder:
   ```bash
   git init && git add . && git commit -m "Mama English" && git branch -M main
   git remote add origin git@github.com:<login>/angielski.git && git push -u origin main
   ```
2. Na GitHubie: **Settings → Pages → Source: Deploy from a branch → `main` / `(root)`** → Save.
3. Po ~1 min aplikacja jest pod `https://<login>.github.io/angielski/`.
4. Aktualizacja = `git push`. Przy większych zmianach podbij `CACHE` w `sw.js` (np. `mama-en-v2`), a jeśli dodajesz nowe pliki, dopisz je do listy `ASSETS`.

Alternatywa bez gita: **Netlify Drop** (https://app.netlify.com/drop) – przeciągnij folder w okno przeglądarki.

HTTPS (który dają oba serwisy) jest potrzebny do instalacji PWA i mikrofonu.

## Instalacja na Androidzie
Otwórz adres w **Chrome** → menu **⋮** → **Zainstaluj aplikację** (albo „Dodaj do ekranu głównego”).
Po instalacji ikona działa jak zwykła aplikacja, również bez internetu (poza ćwiczeniem z mikrofonem).

⚠️ Postęp jest przypisany do adresu strony. Nie zmieniaj adresu po rozpoczęciu nauki – a jeśli musisz, najpierw zrób **Ustawienia → Zapisz kopię** i wczytaj ją pod nowym adresem.

Jeśli lektor brzmi źle: Ustawienia Androida → *Zamiana tekstu na mowę* → silnik Google, pobierz głos angielski (US/UK). W aplikacji w Ustawieniach można wybrać konkretny głos.

## Struktura
```
index.html, manifest.webmanifest, sw.js, icons/
css/styles.css
js/app.js          – router (#/home, #/categories, #/cat/:id, #/lesson/:id, #/review, #/badges, #/settings)
js/store.js        – stan i localStorage
js/srs.js          – powtórki
js/speech.js       – lektor (speechSynthesis) i rozpoznawanie mowy
js/badges.js       – odznaki
js/content.js      – indeksy treści
js/views/*.js      – ekrany
js/data/*.js       – dialogi (jedna sytuacja = jeden plik)
tools/validate-content.mjs
```

## Dodawanie dialogów
Dopisz lekcję do pliku w `js/data/` (`who`: `mom` / `kid` / `teacher`, `key: true` = zdanie do nauki, opcjonalnie `tip`).
Nową sytuację dodaj też w `js/data/index.js` i w liście `DATA` w `sw.js`.
Nie zmieniaj kolejności linii w istniejących lekcjach – identyfikator zdania to `idLekcji#numerLinii`, więc zmiana kolejności „przepnie” postęp na inne zdania.
