# Audio

Playgama rifiuta i suoni generati dal codice (req. 3.3.2): metti qui i file MP3 e poi lancia `python3 build.py`.
Un file mancante resta semplicemente muto. I nomi dei file vanno elencati in `game.js`, nell'opzione `sound.files` di `Kit.start`.

Nel demo ci sono quattro effetti di Kenney "Interface Sounds" (CC0, vedi `KENNEY-LICENSE.txt`):
`hit` (da drop_004), `no` (error_004), `win` (confirmation_002), `lose` (minimize_006).

Per la musica: aggiungi `music.mp3`, poi in `game.js` metti `'music'` in `files` e togli `music: null`.

Fonti gratuite con licenze valide per un gioco commerciale:
- Kenney.nl (CC0): "Interface Sounds", "UI Audio", "Casino Audio", "Music Jingles"
- Pixabay Music / Sound Effects (Pixabay Content License)
- OpenGameArt.org (controlla che ogni file sia CC0 o CC-BY; CC-BY richiede il credito)

Tieni ogni effetto sotto ~1 s e la musica sotto ~1,5 MB (un loop di 1–2 minuti a 80 kbps va bene).

Annota qui sotto la provenienza di ogni file:

| File | Fonte | Licenza |
|---|---|---|
| hit.mp3, no.mp3, win.mp3, lose.mp3 | Kenney "Interface Sounds" | CC0 |
