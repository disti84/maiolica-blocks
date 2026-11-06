# Maiolica Blocks

Block puzzle HTML5 di **Paw Software Entertainment** (JavaScript puro, nessun motore), nello stile di
*Dolce Sort: Sicilian Bakery*: cobalto, giallo limone e un muro di maioliche siciliane, tutto disegnato in SVG/CSS.
Creato dal template `paw-game-kit` (`disti84/html5-game-template`): il platform layer è in `kit/` e non va modificato qui.

## Il gioco

- Griglia 8×8, tre pezzi alla volta da trascinare sulla griglia (mouse o touch).
- Righe e colonne piene si svuotano; più linee insieme valgono di più, linee in mosse vicine fanno **combo**.
- Partita infinita: finisce quando nessuno dei pezzi rimasti entra. Il record viene salvato.
- I pezzi sono maioliche siciliane (7 decori in SVG, `#t1`…`#t7` in `template.html`).
- La partita in corso si salva a ogni mossa: dal menu si può riprendere.

### Punteggio (`logic.js`)

| Evento | Punti |
|---|---|
| Pezzo piazzato | 1 per casella |
| Linee svuotate insieme | 10 · L · (L+1) / 2 → 1 linea 10, 2 linee 30, 3 linee 60, 4 linee 100 |
| Combo | il bonus linee è moltiplicato per la combo (×2, ×3…) |
| Griglia completamente vuota | +300 |

La combo cresce a ogni mossa che svuota almeno una linea e si azzera dopo 3 mosse senza linee.

### Generatore dei pezzi

`LOGIC.dealSet(board, rnd, { sets, assist })` sceglie tre pezzi tra 39 forme (tutte le rotazioni di 14 forme base).
È gentile all'inizio e si fa più duro col tempo (`LOGIC.difficulty`):

- prime 12 serie: la serie è **sempre** piazzabile per intero, in qualche ordine (contando le linee che si svuotano);
  poi la probabilità scende piano fino al 55%;
- prime 30 serie: almeno un pezzo entra sempre; poi la garanzia scende fino all'85%;
- i pezzi ingombranti (3×3, 1×5, L grande) sono rari all'inizio;
- all'inizio spesso c'è un pezzo che chiude una linea.

`assist: true` (premi "nuovi pezzi" e "continua") dà sempre una serie piazzabile.

### Pubblicità

| Tipo | Posizionamento | Quando |
|---|---|---|
| Interstitial | `retry` | "Gioca ancora" dopo il game over |
| Interstitial | `menu` | "Menu" dopo il game over |
| Rewarded | `rotate_pieces` | Booster *Ruota*: i pezzi della serie attuale si ruotano toccandoli. Una volta per partita. |
| Rewarded | `new_pieces` | Booster *Nuovi pezzi*: tre pezzi nuovi che entrano. Una volta per partita. |
| Rewarded | `continue` | Dopo il game over: svuota le due righe e le due colonne centrali e dà tre pezzi che entrano. Una volta per partita. |

Il gioco è a punteggio infinito, quindi non c'è un "livello successivo": gli interstitial sono solo su riprova e menu,
mai al primo avvio (lo garantisce il kit). Il premio arriva solo con esito `rewarded`.

## Struttura

| File / cartella | Cosa contiene |
|---|---|
| `kit/` | Codice condiviso del template (Bridge, salvataggi, pubblicità, pausa, audio, i18n). **Non modificare.** |
| `game.config.json` | Nome, slug, versione, colore e font. |
| `template.html` | HTML + CSS + SVG (maioliche, icone). |
| `logic.js` | Regole, punteggio e generatore. Niente DOM: si testa con Node. |
| `game.js` | Interfaccia, trascinamento, booster, uso del kit. |
| `i18n.js` | Testi in 9 lingue: en (predefinita), it, es, de, fr, pt, tr, pl, id. |
| `tests/` | Test Node di `logic.js` (regole, generatore, partite simulate). |
| `audio/` | Effetti Kenney CC0 (vedi `audio/README.md`). La musica va aggiunta. |
| `playgama-bridge-config.json` | Posizionamenti pubblicitari e intervallo minimo degli interstitial (60 s). |
| `promo/` | Scheda per il modulo Playgama. |
| `CHECKLIST-PLAYGAMA.md` | Requisiti da controllare prima di caricare. |

## Requisiti

- Node.js 18+ e npm
- Python 3.9+

```bash
cd vendor && npm install && cd ..
```

## Test

```bash
node --test tests/*.test.js
```

## Build

```bash
python3 build.py
```

Produce:

- `dist/` e `build/maiolica-blocks-playgama.zip` — **build per Playgama**. Lo zip è quello da caricare.
- `build/maiolica-blocks.html` — anteprima a file unico (font da Google, niente Bridge, suoni sintetici di prova).
- `build/maiolica-blocks-mobile.html` — la stessa anteprima, apribile sul telefono.

La build si ferma se `index.html` carica file esterni.

Per provare la build Playgama in locale:

```bash
cd dist && python3 -m http.server 8000
# apri http://localhost:8000 — il Bridge gira in modalità "mock"
# http://localhost:8000/?lang=it forza la lingua
```

## Musica

Aggiungi `audio/music.mp3`, poi in `game.js` (opzione `sound` di `Kit.start`) metti `'music'` in `files`
e togli `music: null`. Annota fonte e licenza in `audio/README.md` e in `promo/SCHEDA-PLAYGAMA.txt`.

## Crediti

- Effetti sonori: Kenney, "Interface Sounds" — CC0 (`audio/KENNEY-LICENSE.txt`).
- Font: Lilita One, Nunito — SIL Open Font License.
- SDK: Playgama Bridge 2.4.0.
