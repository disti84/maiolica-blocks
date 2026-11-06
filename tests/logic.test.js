// Run: node --test tests/*.test.js
const test = require('node:test');
const assert = require('node:assert');
const L = require('../logic.js');
const { N } = L;

const fill = (b, cells, v = 1) => { cells.forEach(([r, c]) => { b[r * N + c] = v; }); return b; };
const shape = id => L.SHAPES.find(s => s.id === id);
const piece = (id, tile = 1) => { const s = shape(id); return { id: s.id, cells: s.cells, h: s.h, w: s.w, tile }; };

test('shapes: unique orientations, every rotation is a known shape', () => {
  const keys = new Set(L.SHAPES.map(s => JSON.stringify(s.cells)));
  assert.strictEqual(keys.size, L.SHAPES.length);
  for (const s of L.SHAPES) {
    const p = { id: s.id, cells: s.cells, h: s.h, w: s.w, tile: 3 };
    let q = p;
    for (let i = 0; i < 4; i++) { q = L.rotatePiece(q); assert.ok(q && q.id, 'rotation of ' + s.id); }
    assert.deepStrictEqual(q.cells, p.cells, 'four turns come back to ' + s.id);
    assert.strictEqual(q.tile, 3);
  }
  assert.ok(L.SHAPES.length >= 35);
});

test('canPlace respects edges and filled cells', () => {
  const b = L.emptyBoard();
  const i5 = piece('i5_0');
  assert.ok(L.canPlace(b, i5, 0, 3));
  assert.ok(!L.canPlace(b, i5, 0, 4));
  assert.ok(!L.canPlace(b, i5, -1, 0));
  fill(b, [[0, 5]]);
  assert.ok(!L.canPlace(b, i5, 0, 3));
});

test('place clears a full row and a full column together', () => {
  const b = L.emptyBoard();
  for (let c = 0; c < N; c++) if (c !== 7) fill(b, [[3, c]]);
  for (let r = 0; r < N; r++) if (r !== 3) fill(b, [[r, 7]]);
  const res = L.place({ board: b, score: 0, combo: 0, sinceClear: 0 }, piece('o1_0'), 3, 7);
  assert.deepStrictEqual(res.rows, [3]);
  assert.deepStrictEqual(res.cols, [7]);
  assert.strictEqual(res.cleared.length, 15);
  assert.ok(res.perfect, 'board empty afterwards');
  assert.strictEqual(res.combo, 1);
  assert.strictEqual(res.points, 1 + L.lineBonus(2) + L.PERFECT_BONUS);
});

test('combo grows with clears and resets after 3 placements without one', () => {
  let st = { board: L.emptyBoard(), score: 0, combo: 0, sinceClear: 0 };
  st.board[7 * N + 7] = 1;   // keeps the board from becoming empty (no perfect bonus)
  const row = r => { for (let c = 0; c < 7; c++) st.board[r * N + c] = 2; };
  row(0); st = L.place(st, piece('o1_0'), 0, 7); assert.strictEqual(st.combo, 1);
  row(1); st = L.place(st, piece('o1_0'), 1, 7); assert.strictEqual(st.combo, 2);
  assert.strictEqual(st.points, 1 + 10 * 2);
  st = L.place(st, piece('o1_0'), 5, 0); assert.strictEqual(st.combo, 2);
  st = L.place(st, piece('o1_0'), 5, 2); assert.strictEqual(st.combo, 2);
  st = L.place(st, piece('o1_0'), 5, 4); assert.strictEqual(st.combo, 0);
});

test('place refuses an invalid spot', () => {
  const b = fill(L.emptyBoard(), [[0, 0]]);
  assert.strictEqual(L.place({ board: b }, piece('o2_0'), 0, 0), null);
});

test('isStuck and clearCross', () => {
  const b = Array(N * N).fill(1);
  b[0] = 0;
  assert.ok(!L.isStuck(b, [piece('o1_0'), null, null]));
  assert.ok(L.isStuck(b, [piece('i2_0'), null, piece('o2_0')]));
  const c = L.clearCross(b);
  assert.strictEqual(c.filter(v => !v).length, 28 + 1);
  assert.ok(!L.isStuck(c, [piece('i5_0')]));
});

test('solvable counts line clears between pieces', () => {
  // Only row 7 has room (8 cells). Two 4-long bars fill it, clear it, then the 2x2 fits.
  const b = Array(N * N).fill(1);
  for (let c = 0; c < N; c++) b[7 * N + c] = 0;
  assert.ok(L.solvable(b, [piece('i4_0'), piece('o2_0'), piece('i4_0')]));
  assert.ok(!L.solvable(b, [piece('o2_0'), piece('o2_0'), piece('o2_0')]));
});

test('generator: early sets are always fully placeable', () => {
  for (let seed = 1; seed <= 40; seed++) {
    const rnd = L.rng(seed);
    // A messy random board with ~45% filled and no full lines.
    let b = L.emptyBoard();
    for (let i = 0; i < N * N; i++) if (rnd() < 0.45) b[i] = 1;
    const { rows, cols } = L.fullLines(b);
    rows.forEach(r => { b[r * N] = 0; }); cols.forEach(c => { b[c] = 0; });
    for (let sets = 0; sets < 12; sets++) {
      const set = L.dealSet(b, rnd, { sets });
      assert.strictEqual(set.length, 3);
      assert.ok(L.solvable(b, set), 'seed ' + seed + ' set ' + sets);
      set.forEach(p => assert.ok(p.tile >= 1 && p.tile <= L.TILES));
    }
  }
});

test('generator: assist always gives a placeable set when one exists', () => {
  const rnd = L.rng(7);
  const b = Array(N * N).fill(1);
  [[2, 2], [2, 3], [5, 6]].forEach(([r, c]) => { b[r * N + c] = 0; });
  const set = L.dealSet(b, rnd, { sets: 200, assist: true });
  assert.ok(L.solvable(b, set));
});

test('simulated games: no early dead ends, games do end eventually', () => {
  let lengths = [];
  for (let seed = 1; seed <= 25; seed++) {
    const rnd = L.rng(seed * 97);
    let st = { board: L.emptyBoard(), score: 0, combo: 0, sinceClear: 0 }, sets = 0, moves = 0;
    while (sets < 400) {
      const tray = L.dealSet(st.board, rnd, { sets: sets++ });
      if (sets <= 12) assert.ok(L.solvable(st.board, tray), 'seed ' + seed + ': set ' + sets + ' not placeable');
      let dead = false;
      for (let k = 0; k < 3 && !dead; k++) {
        // bot: the move that clears most lines while keeping the rest of the tray placeable
        let best = null;
        tray.forEach((p, i) => {
          if (!p) return;
          const rest = tray.filter((q, j) => q && j !== i);
          for (let r = 0; r <= N - p.h; r++) for (let c = 0; c <= N - p.w; c++) {
            const res = L.place(st, p, r, c);
            if (!res) continue;
            const v = res.cleared.length + (L.solvable(res.board, rest, 3000) ? 100 : 0);
            if (!best || v > best.v) best = { res, i, v };
          }
        });
        if (!best) { dead = true; break; }
        st = best.res; tray[best.i] = null; moves++;
      }
      if (dead) break;
    }
    lengths.push(sets);
    assert.ok(st.score >= moves);
  }
  assert.ok(Math.min(...lengths) > 12, 'shortest game ' + Math.min(...lengths));
});

test('validRun rejects broken saves', () => {
  assert.ok(!L.validRun(null));
  assert.ok(!L.validRun({ board: [1, 2], tray: [] }));
  const s = shape('l3_0');
  assert.ok(L.validRun({ board: L.emptyBoard(), tray: [{ id: s.id, cells: s.cells, h: s.h, w: s.w, tile: 1 }, null, null] }));
  assert.ok(!L.validRun({ board: L.emptyBoard(), tray: [{ cells: [[0, 0], [5, 5]] }, null, null] }));
});
