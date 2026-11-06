/* paw-game-kit — translations.
   English is the default and fallback (Playgama requirement).
   Markup: data-t="key" (text), data-th="key" (HTML), data-ta="key" (aria-label). */
(function (K) {
  let dict = { en: {} };
  let cur = {};
  let fallback = 'en';

  const I = K.i18n = {
    lang: 'en',
    setup(d, lang, fb) {
      dict = d || { en: {} };
      fallback = fb || 'en';
      this.lang = dict[lang] ? lang : fallback;
      cur = dict[this.lang] || {};
      document.documentElement.lang = this.lang;
    },
    // t('level', 3) → "Level 3"  ·  t('score', { a: 1, b: 2 }) → "{a} of {b}" filled in
    t(key, vars) {
      let s = cur[key] != null ? cur[key] : (dict[fallback] || {})[key];
      if (s == null) s = key;
      if (vars == null) return s;
      if (typeof vars !== 'object') vars = { n: vars };
      return s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
    },
    apply(root) {
      root = root || document;
      root.querySelectorAll('[data-t]').forEach(el => { el.textContent = I.t(el.dataset.t); });
      root.querySelectorAll('[data-th]').forEach(el => { el.innerHTML = I.t(el.dataset.th); });
      root.querySelectorAll('[data-ta]').forEach(el => { el.setAttribute('aria-label', I.t(el.dataset.ta)); });
    },
  };
  K.t = (key, vars) => I.t(key, vars);
})(window.Kit);
