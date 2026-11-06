# paw-game-kit

Template condiviso per i giochi web HTML5 di **Paw Software Entertainment** (JavaScript puro, nessun motore).
Contiene il platform layer estratto da *Dolce Sort: Sicilian Bakery*, già testato nel sandbox Playgama,
e un piccolo gioco demo (*Tap the Lemon*) che mostra come usarlo.

## Nuovo gioco

1. Su GitHub: **Use this template → Create a new repository** (es. `cannolo-merge`).
2. Modifica `game.config.json`: `slug`, `title`, `version`, `themeColor`, font.
3. Sostituisci i file del demo con quelli del gioco: `template.html`, `game.js`, `logic.js`, `i18n.js`, `audio/`.
4. Aggiorna `playgama-bridge-config.json` con i tuoi posizionamenti pubblicitari.
5. Compila la scheda in `promo/SCHEDA-PLAYGAMA.txt` e prepara copertine e screenshot.

La cartella `kit/` non va toccata nei singoli giochi: se la migliori, fallo qui e poi copiala nei giochi.

## Struttura

| File / cartella | Cosa contiene |
|---|---|
| `kit/` | Codice condiviso: `core.js` (pausa, toast), `platform.js` (Bridge, salvataggi, pubblicità), `sound.js` (audio), `i18n.js` (testi), `boot.js` (avvio). |
| `game.config.json` | Nome, slug, versione, colore e font del gioco. |
| `template.html` | HTML + CSS + sprite SVG. Segnaposto: `<!--FONTS-->`, `<!--BODY-->`, `/*KIT*/`, `/*I18N*/`, `/*LOGIC*/`, `/*GAME*/`. |
| `logic.js` | Regole del gioco, solo JS puro (niente DOM): si può testare con Node. |
| `game.js` | Interfaccia, input, livelli, uso del kit. |
| `i18n.js` | Testi nelle varie lingue (inglese predefinito). |
| `audio/` | Effetti e musica in MP3 (obbligatori per Playgama, vedi `audio/README.md`). |
| `assets/` | Facoltativa: immagini o altri file, copiati così come sono nella build. |
| `playgama-bridge-config.json` | Posizionamenti pubblicitari e intervallo minimo degli interstitial. |
| `promo/` | Scheda per il modulo Playgama, copertine e screenshot. |
| `vendor/package.json` | Dipendenze di terze parti: Playgama Bridge e font (fontsource). |
| `CHECKLIST-PLAYGAMA.md` | Requisiti da controllare prima di caricare. |

## Requisiti

- Node.js 18+ e npm
- Python 3.9+

```bash
cd vendor && npm install && cd ..
```

Se cambi i font in `game.config.json`, aggiungi i pacchetti `@fontsource/...` corrispondenti in `vendor/package.json`.

## Build

```bash
python3 build.py
```

Produce:

- `dist/` e `build/<slug>-playgama.zip` — **build per Playgama**. Lo zip è quello da caricare.
- `build/<slug>.html` — anteprima a file unico (font da Google, niente Bridge, suoni sintetici di prova).
- `build/<slug>-mobile.html` — la stessa anteprima, apribile sul telefono.

La build si ferma se `index.html` carica file esterni.

Per provare la build Playgama in locale:

```bash
cd dist && python3 -m http.server 8000
# apri http://localhost:8000 — il Bridge gira in modalità "mock"
# http://localhost:8000/?lang=it forza la lingua
```

## Come si usa il kit in `game.js`

```js
const K = window.Kit, t = K.t;

K.start({
  defaults: { unlocked: 1, stars: [] },              // salvataggio iniziale
  sound: { files: ['music', 'click', 'win'], music: 'music' },
  onReady: showHome,                                  // mostra la prima schermata
});                                                   // poi il kit invia game_ready

K.platform.gameplayStart();                // inizio partita / ripresa
K.platform.gameplayStop();                 // vittoria, sconfitta, menu
K.platform.showInterstitial('next_level'); // solo nelle pause naturali
const res = await K.platform.showRewarded('extra_time');
if (res === 'rewarded') { /* dai il premio */ }

K.save.coins += 10; K.writeSave();         // salvataggio (Bridge o localStorage)
K.sound.play('click');                     // effetti; K.toggleSound() per il pulsante audio
if (K.pause.is()) { /* ferma timer e animazioni */ }
K.ui.toast(t('noAd'));
```

`K.platform.device` vale `mobile`, `tablet` o `desktop`; `K.platform.lang` è la lingua a due lettere.

## Crediti del demo

- Effetti sonori: Kenney, "Interface Sounds" — CC0 (`audio/KENNEY-LICENSE.txt`).
- Font: Lilita One, Nunito — SIL Open Font License.
- SDK: Playgama Bridge 2.4.0.
