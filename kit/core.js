/* paw-game-kit — core: namespace, pause handling, small UI helpers (toast, preview ad). */
window.Kit = window.Kit || {};
(function (K) {
  K.$ = id => document.getElementById(id);
  K.info = window.GAME_INFO || { slug: 'game', title: 'Game', version: '0.0.0' };

  // ---------------------------------------------------------------------
  // Pause: independent reasons (ad, platform, hidden tab, game menu...).
  // The game is paused while at least one reason is active.
  // Timers and audio must stop while paused (Playgama checks this).
  // ---------------------------------------------------------------------
  const reasons = new Set();
  const listeners = [];
  K.pause = {
    set(reason, on) {
      const before = reasons.size > 0;
      if (on) reasons.add(reason); else reasons.delete(reason);
      const now = reasons.size > 0;
      if (before !== now) listeners.forEach(f => { try { f(now); } catch (e) { console.error(e); } });
    },
    is: () => reasons.size > 0,
    has: reason => reasons.has(reason),
    on(fn) { listeners.push(fn); },
  };
  document.addEventListener('visibilitychange', () => K.pause.set('hidden', document.hidden));

  // ---------------------------------------------------------------------
  // UI helpers. Styles are injected first in <head>, so the game's own CSS
  // can restyle .kit-toast and .kit-ad.
  // ---------------------------------------------------------------------
  const CSS = `
.kit-toast{position:fixed;left:50%;bottom:calc(28px + env(safe-area-inset-bottom,0px));transform:translate(-50%,16px);
  background:rgba(18,22,40,.92);color:#fff;font:700 15px/1.3 system-ui,sans-serif;padding:10px 18px;border-radius:999px;
  opacity:0;transition:opacity .2s,transform .2s;pointer-events:none;z-index:1000;max-width:calc(100% - 32px);text-align:center}
.kit-toast.on{opacity:1;transform:translate(-50%,0)}
.kit-ad{position:fixed;inset:0;background:rgba(0,0,0,.78);display:flex;align-items:center;justify-content:center;z-index:1001;
  color:#fff;font:700 17px/1.4 system-ui,sans-serif;text-align:center;padding:16px}
.kit-ad>div{background:#22263a;border-radius:16px;padding:24px 28px;max-width:280px}
.kit-ad b{display:block;font-size:44px;margin-top:8px}`;
  const style = document.createElement('style');
  style.textContent = CSS;
  (document.head || document.documentElement).prepend(style);

  let toastEl = null, toastTimer = 0;
  K.ui = {
    toast(text, ms) {
      if (!toastEl) {
        toastEl = document.createElement('div');
        toastEl.className = 'kit-toast';
        toastEl.setAttribute('role', 'status');
        document.body.appendChild(toastEl);
      }
      toastEl.textContent = text;
      void toastEl.offsetWidth;
      toastEl.classList.add('on');
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => toastEl.classList.remove('on'), ms || 1600);
    },

    // Stand-in rewarded ad, used only when there is no real Bridge (preview builds).
    fakeAd(seconds) {
      return new Promise(resolve => {
        K.pause.set('ad', true);
        const ov = document.createElement('div');
        ov.className = 'kit-ad';
        ov.innerHTML = '<div>Rewarded ad (preview)<b>' + seconds + '</b></div>';
        document.body.appendChild(ov);
        let n = seconds;
        const iv = setInterval(() => {
          n--;
          ov.querySelector('b').textContent = n;
          if (n <= 0) {
            clearInterval(iv);
            ov.remove();
            K.pause.set('ad', false);
            resolve('rewarded');
          }
        }, 1000);
      });
    },
  };
})(window.Kit);
