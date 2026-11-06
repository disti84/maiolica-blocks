/* Maiolica Blocks — rules and piece generator. Pure JS, no DOM: test with `node --test tests/`.
   Board: 8×8 array of 64 cells, 0 = empty, otherwise the tile design (1..TILES).
   Piece: { id, cells: [[r, c], ...], h, w, tile }. */
const LOGIC = (function () {
  const N = 8;
  const TILES = 7;          // maiolica designs, see the #t1..#t7 symbols in template.html
  const FULL = (1 << N) - 1;

  // ---------------------------------------------------------------------
  // Shapes. Each base shape lists its orientations explicitly through `rot`
  // (how many quarter turns are distinct) and `mirror` (add the mirror image).
  // `w` is the base weight, `tier` 0 = easy … 2 = bulky (rarer early on).
  // ---------------------------------------------------------------------
  const BASE = [
    { id: 'o1', art: ['#'], rot: 1, w: 0.6, tier: 0 },
    { id: 'i2', art: ['##'], rot: 2, w: 1.0, tier: 0 },
    { id: 'i3', art: ['###'], rot: 2, w: 1.2, tier: 0 },
    { id: 'i4', art: ['####'], rot: 2, w: 1.0, tier: 1 },
    { id: 'i5', art: ['#####'], rot: 2, w: 0.7, tier: 2 },
    { id: 'o2', art: ['##', '##'], rot: 1, w: 1.2, tier: 0 },
    { id: 'o3', art: ['###', '###', '###'], rot: 1, w: 0.5, tier: 2 },
    { id: 'r23', art: ['###', '###'], rot: 2, w: 0.6, tier: 1 },
    { id: 'l3', art: ['#.', '##'], rot: 4, w: 1.1, tier: 0 },
    { id: 'l4', art: ['#.', '#.', '##'], rot: 4, mirror: true, w: 1.0, tier: 1 },
    { id: 't4', art: ['###', '.#.'], rot: 4, w: 0.9, tier: 1 },
    { id: 's4', art: ['.##', '##.'], rot: 2, mirror: true, w: 0.7, tier: 1 },
    { id: 'l5', art: ['#..', '#..', '###'], rot: 4, w: 0.6, tier: 2 },
    { id: 'd2', art: ['#.', '.#'], rot: 2, w: 0.35, tier: 1 },
  ];

  function fromArt(art) {
    const cells = [];
    art.forEach((row, r) => [...row].forEach((ch, c) => { if (ch === '#') cells.push([r, c]); }));
    return normalize(cells);
  }
  function normalize(cells) {
    const r0 = Math.min(...cells.map(p => p[0])), c0 = Math.min(...cells.map(p => p[1]));
    const out = cells.map(([r, c]) => [r - r0, c - c0]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    return out;
  }
  // 90° clockwise.
  function rotateCells(cells) {
    const h = Math.max(...cells.map(p => p[0])) + 1;
    return normalize(cells.map(([r, c]) => [c, h - 1 - r]));
  }
  function mirrorCells(cells) {
    const w = Math.max(...cells.map(p => p[1])) + 1;
    return normalize(cells.map(([r, c]) => [r, w - 1 - c]));
  }
  const key = cells => cells.map(p => p.join(',')).join(';');

  function makeShape(id, cells, base) {
    const h = Math.max(...cells.map(p => p[0])) + 1, w = Math.max(...cells.map(p => p[1])) + 1;
    const rows = Array(h).fill(0);
    cells.forEach(([r, c]) => { rows[r] |= 1 << c; });
    return { id, cells, h, w, rows, size: cells.length, weight: base.w, tier: base.tier };
  }

  // Every orientation becomes its own shape; the base weight is split between them.
  const SHAPES = [];
  BASE.forEach(b => {
    const seen = new Set(), list = [];
    const add = cells => { const k = key(cells); if (!seen.has(k)) { seen.add(k); list.push(cells); } };
    let cur = fromArt(b.art);
    for (let i = 0; i < 4; i++) { add(cur); if (b.mirror) add(mirrorCells(cur)); cur = rotateCells(cur); }
    list.forEach((cells, i) => SHAPES.push(makeShape(b.id + '_' + i, cells, { w: b.w / list.length, tier: b.tier })));
  });
  const SHAPE_BY_ID = Object.fromEntries(SHAPES.map(s => [s.id, s]));
  const shapeForCells = cells => SHAPES.find(s => key(s.cells) === key(normalize(cells)));

  // ---------------------------------------------------------------------
  // Pieces and the board
  // ---------------------------------------------------------------------
  const piece = (shape, tile) => ({ id: shape.id, cells: shape.cells, h: shape.h, w: shape.w, tile });
  const shapeOf = p => SHAPE_BY_ID[p.id] || shapeForCells(p.cells);

  function rotatePiece(p) {
    const s = shapeForCells(rotateCells(p.cells));
    return piece(s, p.tile);
  }

  const emptyBoard = () => Array(N * N).fill(0);

  function canPlace(board, p, r, c) {
    if (r < 0 || c < 0 || r + p.h > N || c + p.w > N) return false;
    for (const [dr, dc] of p.cells) if (board[(r + dr) * N + c + dc]) return false;
    return true;
  }

  function fitsAnywhere(board, p) {
    for (let r = 0; r <= N - p.h; r++)
      for (let c = 0; c <= N - p.w; c++)
        if (canPlace(board, p, r, c)) return true;
    return false;
  }

  // Rows and columns that would be full after putting p at (r, c). Board is not changed.
  function linesAfter(board, p, r, c) {
    const b = board.slice();
    for (const [dr, dc] of p.cells) b[(r + dr) * N + c + dc] = 1;
    return fullLines(b);
  }

  function fullLines(b) {
    const rows = [], cols = [];
    for (let i = 0; i < N; i++) {
      let rf = true, cf = true;
      for (let j = 0; j < N; j++) {
        if (!b[i * N + j]) rf = false;
        if (!b[j * N + i]) cf = false;
      }
      if (rf) rows.push(i);
      if (cf) cols.push(i);
    }
    return { rows, cols };
  }

  // Line bonus: 1 line 10, 2 lines 30, 3 lines 60, 4 lines 100 …
  const lineBonus = n => 10 * n * (n + 1) / 2;
  const PERFECT_BONUS = 300;
  const COMBO_WINDOW = 3;   // placements without a clear before the combo resets

  /* Places p at (r, c) and clears full lines.
     state: { board, score, combo, sinceClear } (not changed)
     Returns { board, score, combo, sinceClear, points, rows, cols, cleared: [cell indexes], perfect } or null. */
  function place(state, p, r, c) {
    if (!canPlace(state.board, p, r, c)) return null;
    const board = state.board.slice();
    for (const [dr, dc] of p.cells) board[(r + dr) * N + c + dc] = p.tile || 1;
    const { rows, cols } = fullLines(board);
    const set = new Set();
    rows.forEach(i => { for (let j = 0; j < N; j++) set.add(i * N + j); });
    cols.forEach(i => { for (let j = 0; j < N; j++) set.add(j * N + i); });
    const cleared = [...set].sort((a, b) => a - b);
    cleared.forEach(i => { board[i] = 0; });

    const lines = rows.length + cols.length;
    let combo = state.combo || 0, sinceClear = state.sinceClear || 0;
    if (lines) { combo += 1; sinceClear = 0; }
    else if (++sinceClear >= COMBO_WINDOW) { combo = 0; sinceClear = 0; }
    const perfect = lines > 0 && board.every(v => !v);
    const points = p.cells.length + lineBonus(lines) * Math.max(1, combo) + (perfect ? PERFECT_BONUS : 0);
    return { board, score: (state.score || 0) + points, combo, sinceClear, points, rows, cols, cleared, perfect };
  }

  // Game over: none of the remaining pieces fits.
  const isStuck = (board, tray) => !tray.some(p => p && fitsAnywhere(board, p));

  // Continue after game over: clears the two middle rows and the two middle columns.
  function clearCross(board) {
    const b = board.slice();
    for (let i = 0; i < N; i++)
      for (let j = N / 2 - 1; j <= N / 2; j++) { b[j * N + i] = 0; b[i * N + j] = 0; }
    return b;
  }

  // ---------------------------------------------------------------------
  // Solvability: can all pieces be placed one after another, in some order,
  // counting the lines they clear? Bitboard search (8 row masks).
  // ---------------------------------------------------------------------
  function toMasks(board) {
    const m = Array(N).fill(0);
    for (let i = 0; i < N * N; i++) if (board[i]) m[(i / N) | 0] |= 1 << (i % N);
    return m;
  }
  function placeMasks(m, s, r, c) {
    for (let i = 0; i < s.h; i++) if (m[r + i] & (s.rows[i] << c)) return null;
    const b = m.slice();
    for (let i = 0; i < s.h; i++) b[r + i] |= s.rows[i] << c;
    let colFull = FULL;
    for (let i = 0; i < N; i++) colFull &= b[i];
    for (let i = 0; i < N; i++) b[i] = b[i] === FULL ? 0 : b[i] & ~colFull;
    return b;
  }
  function solvable(board, pieces, limit) {
    const shapes = pieces.filter(Boolean).map(shapeOf);
    let budget = limit || 30000;
    const go = (m, left) => {
      if (!left.length) return true;
      for (let k = 0; k < left.length; k++) {
        const s = left[k], rest = left.slice(0, k).concat(left.slice(k + 1));
        for (let r = 0; r <= N - s.h; r++)
          for (let c = 0; c <= N - s.w; c++) {
            if (--budget < 0) return true;   // too costly to prove: assume yes
            const b = placeMasks(m, s, r, c);
            if (b && go(b, rest)) return true;
          }
      }
      return false;
    };
    return go(toMasks(board), shapes);
  }

  // Does some piece clear at least one line somewhere?
  function helps(board, p) {
    for (let r = 0; r <= N - p.h; r++)
      for (let c = 0; c <= N - p.w; c++)
        if (canPlace(board, p, r, c)) {
          const l = linesAfter(board, p, r, c);
          if (l.rows.length + l.cols.length) return true;
        }
    return false;
  }

  // ---------------------------------------------------------------------
  // Generator
  // ---------------------------------------------------------------------
  /* How kind the generator is, from the number of sets dealt so far (0 = first set).
       solve  chance that the whole set is guaranteed to fit, in some order
       fit    chance that at least one piece is guaranteed to fit
       bulky  weight multiplier for big shapes (tier 2)
       help   chance to insist on a piece that clears a line, when one exists */
  function difficulty(sets) {
    const d = Math.min(1, sets / 60);
    return {
      solve: sets < 12 ? 1 : Math.max(0.55, 1 - (sets - 12) * 0.012),
      fit: sets < 30 ? 1 : Math.max(0.85, 1 - (sets - 30) * 0.004),
      bulky: 0.25 + 0.75 * d,
      medium: 0.6 + 0.4 * d,
      help: sets < 8 ? 0.6 : Math.max(0.15, 0.6 - (sets - 8) * 0.01),
    };
  }

  function pickShape(rnd, diff, pool) {
    const list = pool || SHAPES;
    const wt = s => s.weight * (s.tier === 2 ? diff.bulky : s.tier === 1 ? diff.medium : 1);
    let total = 0;
    for (const s of list) total += wt(s);
    let x = rnd() * total;
    for (const s of list) { x -= wt(s); if (x <= 0) return s; }
    return list[list.length - 1];
  }

  /* Deals 3 pieces for this board.
     opts: { sets: number of sets dealt before, assist: true to force a fully placeable set
             (used by the "new pieces" and "continue" rewards) } */
  function dealSet(board, rnd, opts) {
    opts = opts || {};
    const diff = difficulty(opts.sets || 0);
    const needSolve = opts.assist || rnd() < diff.solve;
    const needFit = needSolve || rnd() < diff.fit;
    const wantHelp = rnd() < diff.help;
    const tile = () => 1 + Math.floor(rnd() * TILES);
    const make = shapes => shapes.map(s => piece(s, tile()));

    let fallback = null;
    for (let attempt = 0; attempt < 40; attempt++) {
      const pool = attempt >= 25 ? SHAPES.filter(s => s.size <= 3) : null;   // getting desperate: small ones
      const set = make([pickShape(rnd, diff, pool), pickShape(rnd, diff, pool), pickShape(rnd, diff, pool)]);
      const okFit = !needFit || set.some(p => fitsAnywhere(board, p));
      if (!okFit) continue;
      if (needSolve && !solvable(board, set)) continue;
      if (!fallback) fallback = set;
      if (wantHelp && attempt < 20 && !set.some(p => helps(board, p))) continue;
      return set;
    }
    if (fallback) return fallback;
    // Last resort for guaranteed sets: single squares fit wherever there is one free cell.
    if (needFit) {
      const free = board.filter(v => !v).length;
      const o1 = SHAPE_BY_ID.o1_0;
      if (free > 0) return make([o1, free > 1 ? o1 : pickShape(rnd, diff), free > 2 ? o1 : pickShape(rnd, diff)]);
    }
    return make([pickShape(rnd, diff), pickShape(rnd, diff), pickShape(rnd, diff)]);
  }

  // Small seeded random generator for tests and replays.
  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // A saved run is valid if its board and tray look sane (old or broken saves are dropped).
  function validRun(run) {
    if (!run || !Array.isArray(run.board) || run.board.length !== N * N) return false;
    if (!run.board.every(v => Number.isInteger(v) && v >= 0 && v <= TILES)) return false;
    if (!Array.isArray(run.tray) || run.tray.length !== 3) return false;
    return run.tray.every(p => p === null || (p && Array.isArray(p.cells) && shapeForCells(p.cells)));
  }

  return {
    N, TILES, SHAPES, BASE, COMBO_WINDOW, PERFECT_BONUS,
    rotateCells, rotatePiece, shapeForCells, emptyBoard, canPlace, fitsAnywhere, linesAfter, fullLines,
    lineBonus, place, isStuck, clearCross, solvable, helps, difficulty, dealSet, rng, validRun,
  };
})();
if (typeof window !== 'undefined') window.LOGIC = LOGIC;
if (typeof module !== 'undefined') module.exports = LOGIC;
