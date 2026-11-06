/* Maiolica Blocks — interface, input and platform calls. Rules live in logic.js.
   Kit usage:
     gameplayStart/Stop     new game, resume, continue / game over, menu
     showInterstitial       only 'retry' (play again) and 'menu' (back to menu after game over)
     showRewarded           'rotate_pieces', 'new_pieces' (once per game each),
                            'continue' (once per game, after game over)
     Kit.pause              blocks input and freezes animations and delayed steps */
(function () {
  const K = window.Kit, $ = K.$, t = K.t, LG = window.LOGIC, N = LG.N;
  const sfx = (name, rate) => K.sound.play(name, rate);
  const PRAISE = ['', '', 'Bello!', 'Bellissimo!', 'Mizzica!'];   // Italian on purpose, like Dolce Sort

  let G = null;          // current game
  let busy = false;      // clear animation running
  let drag = null;       // piece being dragged
  let cell = 40, tcell = 20;
  const cellEls = [], shown = [];
  const slots = [...document.querySelectorAll('.slot')];

  // ---------- Pause-aware delay (stops while an ad, the platform or a hidden tab pauses) ----------
  function later(ms, fn) {
    let left = ms, last = performance.now();
    const tick = now => {
      if (!K.pause.is()) left -= now - last;
      last = now;
      if (left <= 0) fn(); else requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
  K.pause.on(p => {
    document.body.classList.toggle('paused', p);
    if (p) cancelDrag();
  });

  const tileSvg = (tile, x, y, size) =>
    '<svg viewBox="0 0 40 40"' + (size ? ' style="left:' + x + 'px;top:' + y + 'px;width:' + size + 'px;height:' + size + 'px"' : '') +
    '><use href="#t' + tile + '"/></svg>';
  const pieceHtml = (p, size) =>
    '<div class="piece" style="width:' + p.w * size + 'px;height:' + p.h * size + 'px">' +
    p.cells.map(([r, c]) => tileSvg(p.tile, c * size, r * size, size)).join('') + '</div>';

  // ---------- Home ----------
  function showHome() {
    cancelDrag();
    K.platform.gameplayStop();
    $('overOv').hidden = true;
    $('game').hidden = true;
    $('home').hidden = false;
    $('app').classList.remove('wide', 'traycol');
    $('homeBest').textContent = K.save.best || 0;
    $('resumeBtn').hidden = !LG.validRun(K.save.run);
    $('playBtn').textContent = t($('resumeBtn').hidden ? 'play' : 'newGame');
    updateSoundIcons();
  }

  // ---------- Game ----------
  function newGame() {
    G = {
      board: LG.emptyBoard(), tray: [null, null, null], score: 0, combo: 0, sinceClear: 0, sets: 0,
      used: { rotate: false, fresh: false, cont: false }, rotating: false, over: false,
    };
    deal(false);
    K.save.games = (K.save.games || 0) + 1;
    enterGame();
  }

  function resumeGame() {
    const r = K.save.run;
    G = {
      board: r.board.slice(), score: r.score | 0, combo: r.combo | 0, sinceClear: r.sinceClear | 0, sets: r.sets | 0,
      tray: r.tray.map(p => {
        if (!p) return null;
        const s = LG.shapeForCells(p.cells);
        return { id: s.id, cells: s.cells, h: s.h, w: s.w, tile: p.tile || 1 };
      }),
      used: Object.assign({ rotate: false, fresh: false, cont: false }, r.used), rotating: !!r.rotating, over: false,
    };
    if (G.tray.every(p => !p)) deal(false);
    enterGame();
  }

  function enterGame() {
    busy = false;
    G.startBest = K.save.best || 0;
    $('home').hidden = true;
    $('overOv').hidden = true;
    $('game').hidden = false;
    layout();
    shown.fill(-1);
    renderAll();
    saveRun();
    K.platform.gameplayStart();
    if (LG.isStuck(G.board, G.tray)) later(400, gameOver);
  }

  function deal(assist) {
    G.tray = LG.dealSet(G.board, Math.random, { sets: G.sets, assist });
    G.sets++;
    G.rotating = false;
  }

  function saveRun() {
    if (!G) return;
    K.save.run = G.over ? null : {
      board: G.board, tray: G.tray, score: G.score, combo: G.combo, sinceClear: G.sinceClear,
      sets: G.sets, used: G.used, rotating: G.rotating,
    };
    K.save.best = Math.max(K.save.best || 0, G.score);
    K.writeSave();
  }

  // ---------- Rendering ----------
  function buildBoard() {
    const b = $('board');
    for (let i = 0; i < N * N; i++) {
      const d = document.createElement('div');
      d.className = 'cell';
      b.appendChild(d);
      cellEls.push(d);
      shown.push(-1);
    }
  }

  function renderBoard(board) {
    board = board || G.board;
    for (let i = 0; i < N * N; i++) {
      if (shown[i] === board[i]) continue;
      shown[i] = board[i];
      cellEls[i].innerHTML = board[i] ? tileSvg(board[i]) : '';
      cellEls[i].classList.remove('pop', 'drop');
    }
  }

  function renderTray(dealt) {
    slots.forEach((el, i) => {
      const p = G.tray[i];
      el.innerHTML = p ? pieceHtml(p, tcell) + (G.rotating ? '<span class="rot"><svg style="color:#15264f"><use href="#ic-rotate"/></svg></span>' : '') : '';
      el.classList.toggle('nofit', !!p && !LG.fitsAnywhere(G.board, p));
      el.classList.remove('lift', 'spin');
      el.classList.toggle('deal', !!dealt);
      el.setAttribute('aria-label', p ? t('pieceN', i + 1) : '');
    });
  }

  // Dims the pieces that fit nowhere, without rebuilding the tray (keeps its animations).
  function updateFit() {
    slots.forEach((el, i) => el.classList.toggle('nofit', !!G.tray[i] && !LG.fitsAnywhere(G.board, G.tray[i])));
  }

  function renderHud() {
    $('score').textContent = G.score;
    $('best').textContent = Math.max(K.save.best || 0, G.score);
    const can = K.platform.canReward() && !G.over;
    $('rotBtn').disabled = !can || G.used.rotate;
    $('rotBtn').classList.toggle('on', G.rotating);
    $('freshBtn').disabled = !can || G.used.fresh;
    $('rotBtn').title = t(G.used.rotate ? 'usedOnce' : 'rotateInfo');
    $('freshBtn').title = t(G.used.fresh ? 'usedOnce' : 'freshInfo');
    $('rotBtn').setAttribute('aria-label', $('rotBtn').title);
    $('freshBtn').setAttribute('aria-label', $('freshBtn').title);
  }

  function renderAll(dealt) { renderBoard(); renderTray(dealt); renderHud(); }

  function floatText(text, small, delay) {
    const el = document.createElement('div');
    el.className = 'float' + (small ? ' small' : '');
    el.textContent = text;
    if (delay) el.style.animationDelay = delay + 's';
    if (small) el.style.top = '58%';
    el.addEventListener('animationend', () => el.remove());
    $('boardWrap').appendChild(el);
  }

  // ---------- Layout: pick the arrangement that gives the biggest board ----------
  function layout() {
    if (!G || $('game').hidden) return;
    const app = $('app'), stage = $('stage');
    const modes = [
      { cls: [], fit: (W, H) => Math.min((W - 20) / 8, (W - 74) / 7.5, (H - 128) / 10.5) },
      { cls: ['wide'], fit: (W, H) => Math.min((H - 36) / 8, (H - 78) / 2.5, (W - 120) / 15.5) },
      { cls: ['wide', 'traycol'], fit: (W, H) => Math.min((H - 36) / 8, (H - 190) / 7.5, (W - 200) / 10.5) },
    ];
    let best = null;
    for (const m of modes) {
      app.classList.remove('wide', 'traycol');
      m.cls.forEach(c => app.classList.add(c));
      const c = m.fit(stage.clientWidth, stage.clientHeight);
      if (!best || c > best.c + 2) best = { m, c };
    }
    app.classList.remove('wide', 'traycol');
    best.m.cls.forEach(c => app.classList.add(c));
    cell = Math.max(22, Math.min(64, Math.floor(best.c)));
    tcell = Math.floor(cell / 2);
    document.documentElement.style.setProperty('--cell', cell + 'px');
    document.documentElement.style.setProperty('--tcell', tcell + 'px');
    renderTray();
  }
  addEventListener('resize', () => { cancelDrag(); layout(); });

  // ---------- Drag and drop ----------
  slots.forEach(el => el.addEventListener('pointerdown', e => startDrag(e, +el.dataset.i)));

  function startDrag(e, i) {
    if (!G || G.over || busy || drag || K.pause.is() || !G.tray[i]) return;
    if (e.button != null && e.button > 0) return;
    e.preventDefault();
    const p = G.tray[i];
    const touch = e.pointerType !== 'mouse';
    drag = { i, p, id: e.pointerId, sx: e.clientX, sy: e.clientY, t0: performance.now(), moved: false, touch, target: null };
    try { slots[i].setPointerCapture(e.pointerId); } catch (err) {}
    const g = $('drag');
    g.innerHTML = pieceHtml(p, cell);
    g.hidden = false;
    slots[i].classList.add('lift');
    sfx('hit');
    moveDrag(e);
  }

  function moveDrag(e) {
    if (!drag || e.pointerId !== drag.id) return;
    if (Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) > 8) drag.moved = true;
    const p = drag.p, w = p.w * cell, h = p.h * cell;
    // On touch the piece floats above the finger so it stays visible.
    const x = e.clientX - w / 2, y = e.clientY - h / 2 - (drag.touch ? h / 2 + cell * 1.1 : 0);
    $('drag').style.transform = 'translate(' + x + 'px,' + y + 'px)';
    const first = cellEls[0].getBoundingClientRect();
    // Snap to the nearest free spot within about one cell, so near misses still land.
    const rf = (y - first.top) / cell, cf = (x - first.left) / cell;
    let r = Math.round(rf), c = Math.round(cf), ok = LG.canPlace(G.board, p, r, c);
    if (!ok && rf > -1.2 && cf > -1.2 && rf < N - p.h + 1.2 && cf < N - p.w + 1.2) {
      let bestD = 1.25;
      for (let rr = Math.floor(rf) - 1; rr <= Math.ceil(rf) + 1; rr++)
        for (let cc = Math.floor(cf) - 1; cc <= Math.ceil(cf) + 1; cc++) {
          const d = Math.hypot(rr - rf, cc - cf);
          if (d < bestD && LG.canPlace(G.board, p, rr, cc)) { bestD = d; r = rr; c = cc; ok = true; }
        }
    }
    const target = ok ? r * N + c : null;
    if (target !== drag.target) { drag.target = target; drag.r = r; drag.c = c; preview(ok ? { r, c } : null); }
  }

  function preview(pos) {
    cellEls.forEach(el => el.classList.remove('pv', 'line'));
    cellEls.forEach(el => { const gh = el.querySelector('.ghost'); if (gh) gh.remove(); });
    if (!pos || !drag) return;
    const p = drag.p;
    p.cells.forEach(([dr, dc]) => {
      const el = cellEls[(pos.r + dr) * N + pos.c + dc];
      el.insertAdjacentHTML('beforeend', tileSvg(p.tile).replace('<svg', '<svg class="ghost"'));
    });
    const l = LG.linesAfter(G.board, p, pos.r, pos.c);
    l.rows.forEach(r => { for (let j = 0; j < N; j++) cellEls[r * N + j].classList.add('line'); });
    l.cols.forEach(c => { for (let j = 0; j < N; j++) cellEls[j * N + c].classList.add('line'); });
  }

  function endDrag(e) {
    if (!drag || e.pointerId !== drag.id) return;
    const d = drag;
    const tap = !d.moved && performance.now() - d.t0 < 400;
    cancelDrag();
    if (tap) { if (G.rotating) rotateSlot(d.i); return; }
    if (d.target != null) placePiece(d.i, d.r, d.c);
    else sfx('no');
  }

  function cancelDrag() {
    if (!drag) return;
    const i = drag.i;
    drag = null;
    $('drag').hidden = true;
    $('drag').innerHTML = '';
    preview(null);
    if (slots[i]) slots[i].classList.remove('lift');
  }

  document.addEventListener('pointermove', moveDrag);
  document.addEventListener('pointerup', endDrag);
  document.addEventListener('pointercancel', e => { if (drag && e.pointerId === drag.id) cancelDrag(); });

  function rotateSlot(i) {
    if (!G.tray[i]) return;
    G.tray[i] = LG.rotatePiece(G.tray[i]);
    sfx('hit', 1.3);
    renderTray();
    slots[i].classList.add('spin');
    saveRun();
  }

  // ---------- Moves ----------
  function placePiece(i, r, c) {
    const p = G.tray[i];
    const res = LG.place(G, p, r, c);
    if (!res) return;
    // Show the piece in place first, then pop the cleared lines.
    const withPiece = G.board.slice();
    p.cells.forEach(([dr, dc]) => { withPiece[(r + dr) * N + c + dc] = p.tile; });
    Object.assign(G, { board: res.board, score: res.score, combo: res.combo, sinceClear: res.sinceClear });
    G.tray[i] = null;
    renderBoard(withPiece);
    p.cells.forEach(([dr, dc]) => cellEls[(r + dr) * N + c + dc].classList.add('drop'));
    sfx('drop');

    const lines = res.rows.length + res.cols.length;
    floatText('+' + res.points, !lines);
    if (lines) {
      busy = true;
      res.cleared.forEach(ci => cellEls[ci].classList.add('pop'));
      sfx('clear', 1 + Math.min(8, res.combo - 1) * 0.08);
      if (res.perfect) later(250, () => floatText(t('perfect'), false));
      else if (lines >= 2) later(250, () => floatText(PRAISE[Math.min(4, lines)], false));
      if (res.combo >= 2) later(lines >= 2 || res.perfect ? 650 : 250, () => floatText(t('combo', res.combo), true));
    }
    const sc = $('score');
    sc.classList.remove('bump'); void sc.offsetWidth; sc.classList.add('bump');

    if (G.tray.every(x => !x)) deal(false);
    renderTray(G.tray.every(Boolean));
    renderHud();
    saveRun();
    const done = () => {
      busy = false;
      renderBoard();
      updateFit();
      if (LG.isStuck(G.board, G.tray)) later(350, gameOver);
    };
    if (lines) later(400, done); else done();
  }

  // ---------- Game over ----------
  function gameOver() {
    if (!G || G.over || $('game').hidden) return;
    cancelDrag();
    G.over = true;
    K.platform.gameplayStop();
    const record = G.score > G.startBest && G.score > 0;
    saveRun();
    sfx(record ? 'win' : 'lose');
    const canCont = !G.used.cont && K.platform.canReward();
    $('finalScore').textContent = G.score;
    $('newBest').hidden = !record;
    $('overText').textContent = t(canCont ? 'overText' : 'overOnly');
    $('contBtn').hidden = !canCont;
    $('overOv').hidden = false;
    renderHud();
  }

  async function onContinue() {
    if (!G || !G.over || G.used.cont) return;
    const res = await K.platform.showRewarded('continue');
    if (res === 'rewarded' && G && G.over) {
      G.used.cont = true;
      G.over = false;
      G.board = LG.clearCross(G.board);
      deal(true);
      $('overOv').hidden = true;
      renderAll(true);
      saveRun();
      sfx('clear');
      K.platform.gameplayStart();
    } else if (res !== 'closed') K.ui.toast(t('noAd'));
  }

  // ---------- Boosters (rewarded, once per game each) ----------
  async function onRotate() {
    if (!G || G.over || busy || G.used.rotate) return;
    const res = await K.platform.showRewarded('rotate_pieces');
    if (res === 'rewarded' && G && !G.over) {
      G.used.rotate = true;
      G.rotating = true;
      renderTray();
      renderHud();
      saveRun();
      K.ui.toast(t('rotateHint'), 2400);
    } else if (res !== 'closed') K.ui.toast(t('noAd'));
  }

  async function onFresh() {
    if (!G || G.over || busy || G.used.fresh) return;
    const res = await K.platform.showRewarded('new_pieces');
    if (res === 'rewarded' && G && !G.over) {
      G.used.fresh = true;
      G.sets--;            // a replacement, not a new set: difficulty does not move on
      deal(true);
      renderTray(true);
      renderHud();
      saveRun();
      sfx('hit', 1.2);
    } else if (res !== 'closed') K.ui.toast(t('noAd'));
  }

  // ---------- Buttons ----------
  $('playBtn').addEventListener('click', newGame);
  $('resumeBtn').addEventListener('click', () => { if (LG.validRun(K.save.run)) resumeGame(); else newGame(); });
  $('homeBtn').addEventListener('click', () => { saveRun(); showHome(); });
  $('againBtn').addEventListener('click', () => { K.platform.showInterstitial('retry'); newGame(); });
  $('menuBtn').addEventListener('click', () => { showHome(); K.platform.showInterstitial('menu'); });
  $('contBtn').addEventListener('click', onContinue);
  $('rotBtn').addEventListener('click', onRotate);
  $('freshBtn').addEventListener('click', onFresh);

  function updateSoundIcons() {
    const icon = '<svg><use href="#ic-' + (K.save.sound ? 'sound' : 'mute') + '"/></svg>';
    $('soundBtn').innerHTML = icon;
    $('soundBtn2').innerHTML = icon;
  }
  function toggleSound() {
    K.toggleSound();
    updateSoundIcons();
    if (K.save.sound) sfx('hit');
  }
  $('soundBtn').addEventListener('click', toggleSound);
  $('soundBtn2').addEventListener('click', toggleSound);

  // ---------- Boot ----------
  buildBoard();
  K.start({
    defaults: { best: 0, games: 0, run: null },
    sound: {
      // Add 'music' here once audio/music.mp3 exists (see audio/README.md), and remove `music: null`.
      files: ['hit', 'drop', 'clear', 'no', 'win', 'lose'],
      music: null,
      synth: {
        hit: tone => tone(700, 0.06, 'triangle', 0.08),
        drop: tone => tone(330, 0.09, 'sine', 0.14),
        clear: tone => [784, 988, 1175].forEach((f, i) => tone(f, 0.18, 'triangle', 0.09, i * 0.05)),
      },
    },
    onReady: showHome,
  });
})();
