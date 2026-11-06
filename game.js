/* Demo game: tap the lemon N times before the time runs out.
   It exists to show how a game uses the kit — replace it with the real game:
     Kit.start(...)                    boot: Bridge, language, save, audio, first screen, game_ready
     Kit.platform.gameplayStart/Stop   real play starts / stops
     Kit.platform.showInterstitial(p)  only at natural breaks
     Kit.platform.showRewarded(p)      grant the prize only on 'rewarded'
     Kit.save + Kit.writeSave()        progress
     Kit.sound.play(name)              effects; Kit.toggleSound() for the sound button
     Kit.pause.is()                    stop timers while an ad, the platform or a hidden tab pauses the game */
(function () {
  const K = window.Kit, $ = K.$, t = K.t, LG = window.LOGIC;
  const sfx = name => K.sound.play(name);

  let G = null;     // current attempt
  let raf = 0, last = 0;

  // ---------- Home ----------
  function showHome() {
    stopLoop();
    G = null;
    K.platform.gameplayStop();
    hideOverlays();
    $('game').hidden = true;
    $('home').hidden = false;
    const next = Math.min(K.save.unlocked, LG.LEVELS.length) - 1;
    $('levels').innerHTML = LG.LEVELS.map((_, i) => {
      const st = K.save.stars[i] || 0, locked = i + 1 > K.save.unlocked;
      return '<button class="lv' + (st ? ' done' : '') + '" data-i="' + i + '" type="button"' + (locked ? ' disabled' : '') +
        ' aria-label="' + t('level', i + 1) + '">' + (i + 1) + (st ? '<span class="st">' + '★'.repeat(st) + '</span>' : '') + '</button>';
    }).join('');
    $('playBtn').textContent = t('play', next + 1);
    $('playBtn').dataset.i = next;
    updateSoundIcons();
  }

  // ---------- Level ----------
  // Interstitial first (the kit skips it until the player has played once), then the level.
  function goLevel(i, placement) {
    K.platform.showInterstitial(placement);
    startLevel(i);
  }

  function startLevel(i) {
    const cfg = LG.LEVELS[i];
    G = { i, cfg, hits: 0, time: cfg.time, timeMax: cfg.time, jumpIn: cfg.jump, pos: null, recovered: false, running: true };
    hideOverlays();
    $('home').hidden = true;
    $('game').hidden = false;
    $('hudLevel').textContent = t('level', i + 1);
    $('lemon').style.setProperty('--s', cfg.size);
    moveLemon();
    updateHud();
    startLoop();
    K.platform.gameplayStart();
  }

  function moveLemon() {
    G.pos = LG.nextSpot(Math.random, G.pos);
    G.jumpIn = G.cfg.jump;
    const el = $('lemon');
    el.style.left = (G.pos.x * 100) + '%';
    el.style.top = (G.pos.y * 100) + '%';
  }

  function updateHud() {
    $('hudHits').textContent = G.hits + ' / ' + G.cfg.target;
    $('timeFill').style.transform = 'scaleX(' + Math.max(0, G.time / G.timeMax) + ')';
    $('timeFill').classList.toggle('low', G.time < 4);
  }

  // ---------- Loop (stops while paused) ----------
  function startLoop() { stopLoop(); last = performance.now(); raf = requestAnimationFrame(frame); }
  function stopLoop() { cancelAnimationFrame(raf); raf = 0; }
  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    if (!G || !G.running || K.pause.is()) return;
    G.time -= dt;
    G.jumpIn -= dt;
    if (G.time <= 0) { G.time = 0; updateHud(); onLose(); return; }
    if (G.jumpIn <= 0) moveLemon();
    updateHud();
  }

  // ---------- Input ----------
  $('arena').addEventListener('pointerdown', e => {
    if (!G || !G.running || K.pause.is()) return;
    if (!e.target.closest('#lemon')) { sfx('no'); return; }
    G.hits++;
    sfx('hit');
    const el = $('lemon');
    el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
    if (G.hits >= G.cfg.target) { updateHud(); onWin(); return; }
    moveLemon();
    updateHud();
  });

  // ---------- Win / lose ----------
  function onWin() {
    G.running = false;
    K.platform.gameplayStop();
    const stars = LG.stars(G.time, G.timeMax);
    K.save.stars[G.i] = Math.max(K.save.stars[G.i] || 0, stars);
    K.save.unlocked = Math.max(K.save.unlocked, Math.min(LG.LEVELS.length, G.i + 2));
    K.writeSave();
    sfx('win');
    $('winTitle').textContent = t('win' + stars);
    $('winStars').textContent = '★'.repeat(stars) + '☆'.repeat(3 - stars);
    const last = G.i >= LG.LEVELS.length - 1;
    $('winNext').textContent = last ? t('allDone') : t('next');
    $('winNext').disabled = last;
    $('winOv').hidden = false;
  }

  function onLose() {
    G.running = false;
    K.platform.gameplayStop();
    sfx('lose');
    // Extra time at most once per attempt.
    const canContinue = !G.recovered && K.platform.canReward();
    $('loseText').textContent = canContinue ? t('timeUpText') : t('retryOnly');
    $('loseMore').hidden = !canContinue;
    $('loseOv').hidden = false;
  }

  function hideOverlays() { $('winOv').hidden = true; $('loseOv').hidden = true; }

  $('winNext').addEventListener('click', () => { if (G.i < LG.LEVELS.length - 1) goLevel(G.i + 1, 'next_level'); });
  $('winHome').addEventListener('click', () => { showHome(); K.platform.showInterstitial('menu'); });
  $('loseRetry').addEventListener('click', () => goLevel(G.i, 'retry'));
  $('loseMore').addEventListener('click', async () => {
    if (!G || G.recovered) return;
    const res = await K.platform.showRewarded('extra_time');
    if (res === 'rewarded') {
      G.recovered = true;
      G.time = 10;
      G.running = true;
      $('loseOv').hidden = true;
      updateHud();
      K.platform.gameplayStart();
    } else if (res !== 'closed') {
      K.ui.toast(t('noAd'));
    }
  });
  $('homeBtn').addEventListener('click', showHome);

  // ---------- Home buttons ----------
  $('levels').addEventListener('click', e => {
    const b = e.target.closest('.lv');
    if (b && !b.disabled) goLevel(+b.dataset.i, 'start_level');
  });
  $('playBtn').addEventListener('click', () => goLevel(+$('playBtn').dataset.i, 'start_level'));

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
  K.start({
    defaults: { unlocked: 1, stars: [] },
    sound: {
      // Add 'music' here once audio/music.mp3 exists (see audio/README.md).
      files: ['hit', 'no', 'win', 'lose'],
      music: null,
      synth: { hit: tone => tone(660, 0.08, 'triangle', 0.1) },
    },
    onReady: showHome,
  });
})();
