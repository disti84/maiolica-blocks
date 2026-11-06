# Checklist prima di caricare su Playgama

Punti emersi con Dolce Sort. Quelli marcati **kit** li gestisce già il kit, se il gioco lo usa come nel demo.

## Bridge e messaggi
- [ ] **kit** `game_ready` inviato una sola volta, dopo che la prima schermata è visibile.
- [ ] `gameplay_started` / `gameplay_stopped` chiamati a inizio partita, vittoria, sconfitta, ritorno al menu e ripresa dopo un premio.
- [ ] Il gioco parte anche se il Bridge non risponde (il kit aspetta al massimo 10 s).

## Pausa
- [ ] **kit** Audio fermo durante pubblicità, pausa della piattaforma e scheda nascosta.
- [ ] Timer e animazioni di gioco fermi quando `Kit.pause.is()` è vero.
- [ ] **kit** Rispettato l'interruttore audio della piattaforma.

## Pubblicità
- [ ] Interstitial solo nelle pause naturali (livello successivo, riprova, menu), mai al primo avvio. **kit**: niente interstitial prima della prima partita.
- [ ] `minimumDelayBetweenInterstitial` impostato in `playgama-bridge-config.json` (60 s di default).
- [ ] **kit** Premio del rewarded dato solo con esito `rewarded` (video guardato fino in fondo).
- [ ] Il pulsante "guarda pubblicità" spiega cosa si ottiene.
- [ ] Recupero (tempo o mosse extra) al massimo una volta per tentativo (req. 2.2.4 vista con Dolce Sort).
- [ ] Tutti i posizionamenti usati nel codice sono nel file di config.

## Audio
- [ ] Solo file audio veri: niente suoni generati dal codice nella build (req. 3.3.2). **kit**: i suoni sintetici esistono solo nelle anteprime senza Bridge.
- [ ] Licenze di musica ed effetti annotate in `audio/README.md`.

## Lingue
- [ ] Inglese come lingua predefinita e di riserva (req. 3.4.1).
- [ ] Le lingue dichiarate nel modulo sono tutte in `i18n.js` e i testi stanno nei pulsanti.

## Salvataggi
- [ ] **kit** Progressi salvati con lo storage del Bridge (localStorage fuori dal Bridge).
- [ ] Il gioco funziona anche con un salvataggio vuoto o vecchio (campi nuovi presi da `defaults`).

## Pacchetto
- [ ] `index.html` nella radice dello zip.
- [ ] **build** Nessun file esterno caricato da `index.html` (font inclusi nel pacchetto).
- [ ] Provato con `dist/` in locale (Bridge in modalità mock) e su un telefono vero.
- [ ] Funziona in verticale e in orizzontale, con mouse e con touch.

## Scheda e media
- [ ] Titolo, descrizione e "come si gioca" in inglese (`promo/SCHEDA-PLAYGAMA.txt`).
- [ ] Copertine 800×800, 1080×1920, 1920×1080.
- [ ] 3 screenshot verticali (1080×1920) e 3 orizzontali (1920×1080).
