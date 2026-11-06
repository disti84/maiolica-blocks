/* paw-game-kit — boot sequence and save helpers.
   Order: Bridge → language → save → audio → first screen → game_ready. */
(function (K) {
  K.save = {};
  K.writeSave = () => K.platform.save(K.save);

  // The player's sound switch lives in the save as `sound`.
  K.toggleSound = function () {
    K.save.sound = !K.save.sound;
    K.writeSave();
    K.sound.setEnabled(K.save.sound);
    return K.save.sound;
  };

  /* opts:
       i18n      translations object (default: window.I18N)
       defaults  initial save data, merged with what was saved
       sound     options for Kit.sound.init (files, music, musicVolume, synth)
       onReady   async (save) => show the first screen (menu)            */
  K.start = async function (opts) {
    opts = opts || {};
    await K.platform.init({ saveKey: K.info.slug + '-v1' });
    K.i18n.setup(opts.i18n || window.I18N, K.platform.lang);
    K.i18n.apply();

    const saved = await K.platform.load();
    K.save = Object.assign({ sound: true }, opts.defaults || {}, saved || {});
    K.sound.enabled = K.save.sound !== false;
    await K.sound.init(opts.sound);

    const loading = K.$('loading'), app = K.$('app');
    if (loading) loading.hidden = true;
    if (app) app.hidden = false;
    if (opts.onReady) await opts.onReady(K.save);

    // Wait two frames so the first screen is actually painted.
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    K.platform.gameReady();
  };
})(window.Kit);
