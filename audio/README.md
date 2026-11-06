# Audio

Playgama rifiuta i suoni generati dal codice (req. 3.3.2): qui ci sono solo file MP3, poi `python3 build.py`.
Un file mancante resta semplicemente muto. I nomi vanno elencati in `game.js`, nell'opzione `sound.files` di `Kit.start`.

| File | Quando suona | Fonte | Licenza |
|---|---|---|---|
| hit.mp3 | pezzo preso, rotazione | Kenney "Interface Sounds" (drop_004) | CC0 |
| drop.mp3 | pezzo posato | Kenney "Interface Sounds" (drop_002), come in Dolce Sort | CC0 |
| clear.mp3 | linee svuotate (il tono sale con la combo) | Kenney "Interface Sounds" (glass_002), come in Dolce Sort | CC0 |
| no.mp3 | rilascio fuori posto | Kenney "Interface Sounds" (error_004) | CC0 |
| win.mp3 | game over con nuovo record | Kenney "Interface Sounds" (confirmation_002) | CC0 |
| lose.mp3 | game over | Kenney "Interface Sounds" (minimize_006) | CC0 |
| music.mp3 | **da aggiungere** | | |

Per la musica: aggiungi `music.mp3`, poi in `game.js` metti `'music'` in `files` e togli `music: null`.
Tienila sotto ~1,5 MB (un loop di 1–2 minuti a 80 kbps va bene).
