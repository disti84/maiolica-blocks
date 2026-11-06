/* paw-game-kit — platform layer: Playgama Bridge when present, local fallback otherwise.
   Extracted from Dolce Sort (tested in the Playgama sandbox). */
(function (K) {
  const timeout = ms => new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms));

  const P = K.platform = {
    bridge: null,          // window.bridge after a successful initialize()
    mock: true,            // true in local tests (Bridge "mock" platform) and in previews
    lang: 'en',            // two-letter language code
    device: 'desktop',     // 'mobile' | 'tablet' | 'desktop' | 'tv'
    audioEnabled: true,    // platform-level audio switch
    interstitialOK: false,
    rewardedOK: false,
    saveKey: 'game-v1',
    _reward: null,
    _playing: false,
    _hasPlayed: false,

    async init(opts) {
      opts = opts || {};
      if (opts.saveKey) this.saveKey = opts.saveKey;
      this.device = matchMedia('(pointer: coarse)').matches ? 'mobile' : 'desktop';

      const b = window.bridge;
      if (b) {
        try { await Promise.race([b.initialize(), timeout(10000)]); this.bridge = b; }
        catch (e) { console.warn('[kit] Bridge init failed, running without it', e); }
      }
      if (this.bridge) {
        this.mock = b.platform.id === 'mock';
        this.lang = b.platform.language || 'en';
        if (b.device && b.device.type) this.device = b.device.type;
        this.audioEnabled = b.platform.isAudioEnabled !== false;
        this.interstitialOK = !!b.advertisement.isInterstitialSupported;
        this.rewardedOK = !!b.advertisement.isRewardedSupported;

        const EV = b.EVENT_NAME;
        b.platform.on(EV.AUDIO_STATE_CHANGED, on => { this.audioEnabled = !!on; if (K.sound) K.sound.apply(); });
        b.platform.on(EV.PAUSE_STATE_CHANGED, paused => K.pause.set('platform', !!paused));
        b.advertisement.on(EV.INTERSTITIAL_STATE_CHANGED, s => {
          if (s === 'opened') K.pause.set('ad', true);
          else if (s === 'closed' || s === 'failed') K.pause.set('ad', false);
        });
        b.advertisement.on(EV.REWARDED_STATE_CHANGED, s => this._onRewarded(s));
        if (b.advertisement.interstitialState === 'opened') K.pause.set('ad', true);
      }

      // ?lang=it in the URL forces a language (handy for testing translations).
      try {
        const q = new URLSearchParams(location.search).get('lang');
        if (q) this.lang = q;
      } catch (e) {}
      this.lang = String(this.lang || 'en').slice(0, 2).toLowerCase();
    },

    // ---------- Messages to the platform ----------
    msg(name) { try { if (this.bridge) this.bridge.platform.sendMessage(name); } catch (e) {} },
    // Send once, after the first screen is visible and interactive.
    gameReady() { this.msg('game_ready'); },
    // Call when real play starts/stops (level start, win, lose, menu). Duplicates are filtered.
    gameplayStart() {
      this._hasPlayed = true;
      if (!this._playing) { this._playing = true; this.msg('gameplay_started'); }
    },
    gameplayStop() {
      if (this._playing) { this._playing = false; this.msg('gameplay_stopped'); }
    },

    // ---------- Saves (Bridge storage, localStorage fallback) ----------
    async load() {
      if (this.bridge) {
        try {
          let v = await this.bridge.storage.get('save');
          if (typeof v === 'string') v = JSON.parse(v);
          return v && typeof v === 'object' ? v : null;
        } catch (e) { return null; }
      }
      try { return JSON.parse(localStorage.getItem(this.saveKey) || 'null'); } catch (e) { return null; }
    },
    save(data) {
      if (this.bridge) { try { this.bridge.storage.set('save', data); } catch (e) {} return; }
      try { localStorage.setItem(this.saveKey, JSON.stringify(data)); } catch (e) {}
    },

    // ---------- Ads ----------
    // Interstitial only at natural breaks (next level, retry, back to menu).
    // Never before the player has played once; the Bridge enforces the minimum delay.
    showInterstitial(placement) {
      if (!this._hasPlayed) return;
      if (this.bridge && !this.mock && this.interstitialOK) {
        try { this.bridge.advertisement.showInterstitial(placement); } catch (e) {}
      }
    },

    canReward() { return this.mock || !this.bridge || this.rewardedOK; },

    // Resolves to 'rewarded' (grant the prize), 'closed' (closed early),
    // 'failed' or 'unavailable'. Grant the prize only on 'rewarded'.
    showRewarded(placement) {
      if (!this.bridge || this.mock) return K.ui.fakeAd(2);
      if (!this.rewardedOK) return Promise.resolve('unavailable');
      if (this._reward) return Promise.resolve('unavailable');
      return new Promise(resolve => {
        this._reward = { resolve, earned: false };
        try { this.bridge.advertisement.showRewarded(placement); }
        catch (e) { this._reward = null; resolve('failed'); }
      });
    },
    _onRewarded(s) {
      const r = this._reward;
      if (s === 'opened') K.pause.set('ad', true);
      if (s === 'rewarded' && r) r.earned = true;
      if (s === 'closed' || s === 'failed') {
        K.pause.set('ad', false);
        if (r) {
          this._reward = null;
          r.resolve(r.earned ? 'rewarded' : s);
        }
      }
    },
  };
})(window.Kit);
