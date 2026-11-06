/* Demo game rules — pure JS, no DOM. Replace with the real game's logic.
   Keeping rules here (separate from game.js) makes them easy to test with Node. */
const LOGIC = (function () {
  // 10 levels: more taps needed, smaller lemon, faster jumps.
  const LEVELS = Array.from({ length: 10 }, (_, i) => ({
    target: 8 + i * 2,
    time: 15,
    size: Math.max(0.55, 1 - i * 0.05),   // lemon scale
    jump: Math.max(0.7, 1.6 - i * 0.1),   // seconds before the lemon jumps by itself
  }));

  // 3 stars with more than half the time left, 2 above a quarter, otherwise 1.
  function stars(timeLeft, timeMax) {
    const f = timeLeft / timeMax;
    return f > 0.5 ? 3 : f > 0.25 ? 2 : 1;
  }

  // Next position (0..1 on both axes), away from the edges and from the previous spot.
  function nextSpot(rnd, prev) {
    for (let k = 0; k < 20; k++) {
      const p = { x: 0.12 + rnd() * 0.76, y: 0.12 + rnd() * 0.76 };
      if (!prev || Math.hypot(p.x - prev.x, p.y - prev.y) > 0.3) return p;
    }
    return { x: 0.5, y: 0.5 };
  }

  return { LEVELS, stars, nextSpot };
})();
if (typeof window !== 'undefined') window.LOGIC = LOGIC;
if (typeof module !== 'undefined') module.exports = LOGIC;
