/* paw-game-kit — audio.
   Real builds play MP3 files from ./audio (Playgama rejects sound generated in code).
   Previews without the Bridge use short synth placeholder tones instead. */
(function (K) {
  const S = K.sound = {
    ctx: null, master: null, buffers: {}, els: {}, music: null,
    synth: true,        // placeholder tones (preview only)
    enabled: true,      // player's own switch (saved)
    files: [],
    musicName: 'music',
    musicVolume: 0.35,
    synthMap: null,
    path: 'audio/',

    // opts: { files: ['music','click',...], music: 'music' | null, musicVolume, synth: { name: tone => {...} } }
    async init(opts) {
      opts = opts || {};
      this.files = opts.files || [];
      this.musicName = 'music' in opts ? opts.music : 'music';
      if (opts.musicVolume != null) this.musicVolume = opts.musicVolume;
      this.synthMap = opts.synth || null;
      this.synth = !K.platform.bridge;
      if (this.synth) return;
      await Promise.all(this.files.map(async name => {
        try {
          const res = await fetch(this.path + name + '.mp3');
          if (res.ok) this.buffers[name] = await res.arrayBuffer();
          return; // a missing file is simply silent
        } catch (e) {}
        // Opened from disk (file://): fetch is blocked, fall back to <audio> elements.
        const a = new Audio(this.path + name + '.mp3');
        a.preload = 'auto';
        if (name === this.musicName) { a.loop = true; a.volume = this.musicVolume; }
        this.els[name] = a;
      }));
    },

    // Creates the AudioContext. Browsers allow it only after a user gesture.
    ensure() {
      if (this.ctx) return true;
      try {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.master = this.ctx.createGain();
        this.master.connect(this.ctx.destination);
        for (const k in this.buffers) {
          const raw = this.buffers[k];
          if (raw instanceof ArrayBuffer) {
            this.ctx.decodeAudioData(raw.slice(0), b => {
              this.buffers[k] = b;
              if (k === this.musicName) this.startMusic();
            }, () => {});
          }
        }
        this.apply();
        return true;
      } catch (e) { return false; }
    },

    muted() { return !this.enabled || !K.platform.audioEnabled || K.pause.is(); },

    // Applies mute/pause state. Called on every pause or audio change.
    apply() {
      const m = this.els[this.musicName];
      if (m) { if (this.muted()) m.pause(); else if (this.ctx) m.play().catch(() => {}); }
      if (!this.ctx) return;
      this.master.gain.value = this.muted() ? 0 : 1;
      if (this.muted()) { if (this.ctx.state === 'running') this.ctx.suspend(); }
      else if (this.ctx.state !== 'running') this.ctx.resume();
    },

    setEnabled(on) {
      this.enabled = !!on;
      this.apply();
      if (this.enabled) this.startMusic();
    },

    startMusic() {
      if (!this.musicName) return;
      const el = this.els[this.musicName];
      if (el) { if (!this.muted()) el.play().catch(() => {}); return; }
      const b = this.buffers[this.musicName];
      if (!this.ctx || !(b instanceof AudioBuffer) || this.music) return;
      const src = this.ctx.createBufferSource();
      const g = this.ctx.createGain();
      g.gain.value = this.musicVolume;
      src.buffer = b; src.loop = true;
      src.connect(g); g.connect(this.master); src.start();
      this.music = src;
    },

    // rate changes pitch/speed (e.g. rising combo sounds).
    play(name, rate) {
      if (this.muted() || !this.ensure()) return;
      if (this.synth) return synth(name, rate);
      const b = this.buffers[name];
      if (!(b instanceof AudioBuffer)) {
        const el = this.els[name];
        if (el) { const c = el.cloneNode(); c.playbackRate = rate || 1; c.play().catch(() => {}); }
        return;
      }
      const src = this.ctx.createBufferSource();
      src.buffer = b;
      src.playbackRate.value = rate || 1;
      src.connect(this.master);
      src.start();
    },
  };

  // Preview-only placeholder tones (never used when the Bridge is present).
  function synth(name, rate) {
    const c = S.ctx;
    const tone = (f, d, type, v, delay) => {
      const t0 = c.currentTime + (delay || 0), o = c.createOscillator(), g = c.createGain();
      o.type = type || 'triangle';
      o.frequency.setValueAtTime(f * (rate || 1), t0);
      g.gain.setValueAtTime(v || 0.1, t0);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + d);
      o.connect(g); g.connect(S.master); o.start(t0); o.stop(t0 + d + 0.02);
    };
    if (S.synthMap && S.synthMap[name]) return S.synthMap[name](tone);
    const defaults = {
      win: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.25, 'triangle', 0.12, i * 0.11)),
      lose: () => [392, 330, 262].forEach((f, i) => tone(f, 0.3, 'sawtooth', 0.05, i * 0.14)),
      no: () => tone(150, 0.12, 'square', 0.05),
    };
    if (defaults[name]) return defaults[name]();
    if (name === S.musicName) return;
    tone(440, 0.08, 'triangle', 0.08);
  }

  K.pause.on(() => S.apply());
  const unlock = () => { if (S.ensure()) { S.apply(); S.startMusic(); } };
  document.addEventListener('pointerdown', unlock, { capture: true });
  document.addEventListener('keydown', unlock, { capture: true });
})(window.Kit);
