// LE COMBAT (monde des deepfakes) — façon Street Fighter : le détective contre son propre deepfake.
// Il se prend un coup dans l'oreille (qui pendra jusqu'à la fin), riposte (trois coups), lance une boule
// d'énergie verte… K.O. ; le clone éclate en pixels. Instants : TIMING.fight (en temps musicaux).
'use strict';
const FIGHT = {};
const FGY = 1420;   // sol de l'arène (écran)
FIGHT.build = function (layer, hudRoot) {
  const F = FIGHT;
  const tf = TIMING.fight, b = k => beat(k);
  F.t = { in: b(tf.cloneIn), text: b(tf.fightText), hit: b(tf.earHit), p: tf.punches.map(b), charge: b(tf.charge), fire: b(tf.fire), imp: b(tf.impact), ko: b(tf.ko), back: b(tf.runBack) };
  F.st = SEQ[1].stop;
  // le clone deepfake (le même robot officiel, passé au filtre deepfake, en miroir)
  F.cloneWrap = g(layer, { filter: 'url(#deepfakeFx)' });
  F.clone = makeRobot(F.cloneWrap);
  // effets : étincelles d'impact, boule d'énergie, pixels du clone qui éclate
  F.sparks = [0, 1, 2, 3].map(() => {
    const sg = g(layer);
    mk('path', { d: 'M 0 -70 L 16 -20 L 66 -30 L 26 6 L 50 56 L 0 26 L -50 56 L -26 6 L -66 -30 L -16 -20 Z', fill: '#FFE14D', stroke: '#FF6B1F', 'stroke-width': 6, 'stroke-linejoin': 'round' }, sg);
    mk('path', { d: 'M 0 -34 L 8 -10 L 32 -14 L 12 4 L 24 28 L 0 14 L -24 28 L -12 4 L -32 -14 L -8 -10 Z', fill: '#FFFFFF' }, sg);
    vis(sg, false); return sg;
  });
  F.ball = g(layer);
  mk('circle', { r: 110, fill: GREEN, opacity: 0.25, filter: 'url(#bloom)' }, F.ball);
  mk('circle', { r: 56, fill: GREEN, filter: 'url(#neon)' }, F.ball);
  mk('circle', { r: 30, fill: '#E9FFF1' }, F.ball);
  markup(F.ball, `<g stroke="#07140D" stroke-width="7" fill="none"><circle cx="-4" cy="-4" r="16"/><path d="M 8 8 L 22 22" stroke-linecap="round"/></g>`);
  F.trail = [0, 1, 2, 3].map(i => mk('circle', { r: 40 - i * 8, fill: GREEN, opacity: 0.35 - i * 0.07, filter: 'url(#b6)' }, layer));
  vis(F.ball, false);
  F.pix = [...Array(64)].map((_, i) => mk('rect', { width: 26, height: 26, fill: ['#FF2E88', '#19F0FF', '#B14DFF', '#FFFFFF'][i % 4] }, layer));
  F.ring = mk('circle', { fill: 'none', stroke: '#FFFFFF', 'stroke-width': 18, opacity: 0 }, layer);
  // interface façon jeu de combat (écran, pas de zoom caméra)
  F.hud = g(hudRoot);
  const bar = (x, dir, name, col) => {
    const gg = g(F.hud);
    mk('path', { d: dir > 0 ? `M ${x} 250 L ${x + 440} 250 L ${x + 420} 300 L ${x - 20} 300 Z` : `M ${x} 250 L ${x - 440} 250 L ${x - 420} 300 L ${x + 20} 300 Z`, fill: '#12091F', stroke: '#FFFFFF', 'stroke-width': 5, 'stroke-linejoin': 'round' }, gg);
    const dmg = mk('rect', { y: 258, height: 34, fill: '#FFFFFF' }, gg);
    const hp = mk('rect', { y: 258, height: 34, fill: col }, gg);
    const lab = mk('text', { x: dir > 0 ? x : x, y: 238, 'text-anchor': dir > 0 ? 'start' : 'end', 'font-family': 'Space Grotesk', 'font-weight': 700, 'font-size': 38, fill: '#FFFFFF', stroke: '#12091F', 'stroke-width': 8, 'paint-order': 'stroke', 'font-style': 'italic' }, gg);
    lab.textContent = name;
    return { g: gg, dmg, hp, x, dir };
  };
  F.barR = bar(80, 1, 'DÉTECTIVE', '#4DFF8F');
  F.barC = bar(1000, -1, 'DEEPFAKE', '#FF2E88');
  F.vs = mk('text', { x: 540, y: 296, 'text-anchor': 'middle', 'font-family': 'Space Grotesk', 'font-weight': 700, 'font-size': 60, fill: '#FFE14D', stroke: '#12091F', 'stroke-width': 10, 'paint-order': 'stroke', 'font-style': 'italic' }, F.hud);
  F.vs.textContent = 'VS';
  const big = (txt, fill, stroke) => { const tx = mk('text', { x: 0, y: 0, 'text-anchor': 'middle', 'font-family': 'Space Grotesk', 'font-weight': 700, 'font-size': 190, fill, stroke, 'stroke-width': 16, 'paint-order': 'stroke', 'font-style': 'italic', 'letter-spacing': -4 }, hudRoot); tx.textContent = txt; vis(tx, false); return tx; };
  F.fightTx = big('FIGHT!', '#FFE14D', '#C8161E');
  F.koTx = big('K.O.', '#FF2E2E', '#FFE14D');
  F.flash = mk('rect', { x: 0, y: 0, width: W, height: H, fill: '#FFFFFF', opacity: 0 }, hudRoot);
};
// santé (1 → 0) avec la partie blanche « dégâts récents » qui se vide après coup
FIGHT.hp = function (t) {
  const T = FIGHT.t;
  const rob = t < T.hit ? 1 : 0.62;
  let clo = 1; if (t >= T.p[0]) clo = 0.74; if (t >= T.p[1]) clo = 0.52; if (t >= T.p[2]) clo = 0.34; if (t >= T.imp) clo = 0;
  const lag = (v, evts) => { let last = 1; for (const [te, val] of evts) if (t >= te) last = val; return last; };
  const robD = t < T.hit + 0.35 ? 1 : 0.62;
  let cloD = 1; for (const [te, v] of [[T.p[0] + 0.3, 0.74], [T.p[1] + 0.3, 0.52], [T.p[2] + 0.3, 0.34], [T.imp + 0.4, 0]]) if (t >= te) cloD = v;
  return { rob, clo, robD, cloD };
};
FIGHT.shake = function (t) {
  const T = FIGHT.t; let shake = 0, punch = 0;
  for (const [te, a] of [[T.hit, 16], [T.p[0], 7], [T.p[1], 7], [T.p[2], 9], [T.imp, 22], [T.ko, 8], [T.text, 6]]) { const d = t - te; if (d >= 0 && d < 0.4) { shake += a * Math.exp(-d / 0.1); punch += a * 0.003 * Math.exp(-d / 0.1); } }
  return { shake, punch };
};
// pose du robot (repère écran) pendant l'arrêt
FIGHT.actor = function (t, cx, seat) {
  const T = FIGHT.t, st = FIGHT.st;
  const home = st.P + 250 - cx, gy = standY(FGY);
  const bounce = Math.abs(Math.sin(t * 9)) * 8;
  let x = home, y = gy - bounce, face = 'sceptique', arms = ARMS.guard, lay = { L: 'front', R: 'front' }, rot = 0, sx = 1, sy = 1, look = [14, -2], headRot = 4;
  if (t < st.off + 0.36) {   // il saute de la selle
    const j = jumpArc(t, st.off, st.off + 0.36, [seat[0], seat[1]], [home, gy], 170);
    x = j.x; y = j.y; face = 'curieux'; arms = ARMS.cheer; rot = lerp(-10, 0, j.u);
    if (j.u > 0.9) { sy = 0.9; sx = 1.08; }
  } else if (t >= T.hit - 0.02 && t < T.hit + 0.4) {   // il encaisse le coup dans l'oreille
    const u = clamp((t - T.hit) / 0.4);
    x = home - 70 * Math.sin(u * Math.PI * 0.8); rot = -14 * Math.sin(u * Math.PI); face = 'surpris'; arms = ARMS.hit; headRot = -12; look = [-6, 4];
  } else if (t >= T.p[0] - 0.12 && t < T.p[2] + 0.22) {   // riposte : trois coups
    const which = T.p.findIndex(tp => t < tp + 0.14);
    const tp = T.p[Math.max(0, which)];
    const ext = clamp(1 - Math.abs(t - tp) / 0.12);
    x = lerp(home, home + 170, clamp((t - (T.p[0] - 0.12)) / 0.1)) + ext * 30; face = 'sceptique';
    arms = ext > 0.3 ? (which === 1 ? ARMS.punchL : ARMS.punchR) : ARMS.guard; rot = ext * 6;
    lay = { L: 'front', R: 'front' };
  } else if (t >= T.p[2] + 0.22 && t < T.imp + 0.1) {   // charge et lance la boule d'énergie
    const u = clamp((t - (T.p[2] + 0.22)) / 0.2);
    x = lerp(home + 170, home, E.out(u)); face = 'sceptique'; arms = ARMS.blast; rot = t < T.fire ? -4 : 8; look = [16, 0];
    y = gy + (t < T.fire ? 6 : 0);
  } else if (t >= T.ko - 0.35 && t < T.back) {   // victoire (avec l'oreille qui pend)
    face = 'satisfait'; arms = ARMS.victory; rot = Math.sin(t * 7) * 3; y = gy - Math.abs(Math.sin(t * 8)) * 16; headRot = Math.sin(t * 6) * 6; look = [0, -4];
  } else if (t >= T.back) {   // il repart vers sa mobylette et remonte en selle
    const j = jumpArc(t, T.back, st.on, [home, gy], [seat[0], seat[1]], 210);
    x = j.x; y = j.y; face = 'satisfait'; arms = ARMS.run; rot = lerp(0, -12, j.u);
  }
  return { x, y, rot, sx, sy, face, look, arms, armLayer: lay, headRot };
};
FIGHT.update = function (t, cx) {
  const F = FIGHT, T = F.t, st = F.st;
  const active = t >= st.off - 0.1 && t < st.go + 0.3;
  const home = st.P + 700 - cx, gy = standY(FGY);
  // clone : apparaît en glitch, sautille, fonce, frappe l'oreille, recule, encaisse, éclate
  const cloneOn = active && t >= T.in && t < T.imp;
  vis(F.cloneWrap, cloneOn);
  if (cloneOn) {
    let x = home, y = gy - Math.abs(Math.sin(t * 9 + 1)) * 8, arms = ARMS.guard, rot = 0, face = 'sceptique';
    const appear = clamp((t - T.in) / 0.25);
    if (t >= T.hit - 0.28 && t < T.hit + 0.1) {   // il fonce et frappe
      const u = clamp((t - (T.hit - 0.28)) / 0.26);
      x = lerp(home, st.P + 250 + 190 - cx, E.in(u)); arms = u > 0.7 ? ARMS.punchR : ARMS.guard; rot = 8 * u;
    } else if (t >= T.hit + 0.1 && t < T.p[0] - 0.12) {
      x = lerp(st.P + 250 + 190 - cx, home - 40, E.out(clamp((t - T.hit - 0.1) / 0.3)));
    } else if (t >= T.p[0] - 0.12 && t < T.imp) {   // il encaisse les coups puis la boule
      x = home - 40 + T.p.reduce((a, tp) => a + (t > tp ? 24 * Math.exp(-(t - tp) / 0.2) : 0), 0);
      rot = T.p.reduce((a, tp) => a + (t > tp ? -10 * Math.exp(-(t - tp) / 0.12) : 0), 0);
      face = t > T.p[0] ? 'surpris' : 'sceptique'; arms = t > T.p[0] ? ARMS.hit : ARMS.guard;
    }
    // miroir : le clone regarde vers la gauche
    poseRobot(F.clone, { x, y, s: RS, sx: -1, rot: -rot, face, look: [14, -2], arms, blink: blinkAt(t, 7), headRot: 4 });
    attr(F.cloneWrap, 'opacity', r2(appear < 1 ? (Math.floor(t * 40) % 2 ? appear : appear * 0.3) : 1));
  }
  // étincelles d'impact
  const hits = [[T.hit, st.P + 250 + 90 - cx, gy - 100 * RS], ...T.p.map(tp => [tp, home - 40 - 60, gy - 60 * RS])];
  F.sparks.forEach((sg, i) => {
    let best = null;
    for (const [te, hx, hy] of hits) { const d = t - te; if (d >= 0 && d < 0.18) best = [d, hx, hy]; }
    const on = active && best && i === 0;
    vis(sg, !!on); if (!on) return;
    const [d, hx, hy] = best, s = (0.6 + d * 5) * (1 - d / 0.18 * 0.3);
    attr(sg, 'transform', `translate(${r2(hx)} ${r2(hy)}) scale(${r2(s)}) rotate(${r2(d * 400)})`); attr(sg, 'opacity', r2(1 - d / 0.18));
  });
  // boule d'énergie : grossit entre les mains, puis file vers le clone
  const hands = [st.P + 250 - cx + 170 * RS, gy + 14 * RS];
  const ballOn = active && t >= T.charge && t < T.imp;
  vis(F.ball, ballOn);
  if (ballOn) {
    const grow = clamp((t - T.charge) / (T.fire - T.charge)), fly = clamp((t - T.fire) / (T.imp - T.fire));
    const bx = lerp(hands[0] + 30, home - 30, E.in(fly)), by = lerp(hands[1] - 20, gy - 40 * RS, fly);
    attr(F.ball, 'transform', `translate(${r2(bx)} ${r2(by)}) scale(${r2((0.3 + 0.7 * grow) * (1 + 0.08 * Math.sin(t * 60)))})`);
    F.trail.forEach((c, i) => { vis(c, fly > 0); attr(c, 'cx', r2(bx - (i + 1) * 60 * fly)); attr(c, 'cy', r2(by)); });
  } else F.trail.forEach(c => vis(c, false));
  // le clone éclate en pixels
  F.pix.forEach((p, i) => {
    const d = t - T.imp, on = active && d >= 0 && d < 1.0;
    vis(p, on); if (!on) return;
    const a = hash(i * 3.1) * PI2, v = 300 + hash(i * 7.7) * 900;
    const x0 = home - 60 + (i % 8) * 16, y0 = gy - 180 * RS + Math.floor(i / 8) * 34;
    attr(p, 'x', r2(x0 + Math.cos(a) * v * d)); attr(p, 'y', r2(y0 + Math.sin(a) * v * d + 1400 * d * d));
    attr(p, 'opacity', r2(1 - d)); attr(p, 'transform', `rotate(${r2(d * 300 * (hash(i) - 0.5))} ${r2(x0)} ${r2(y0)})`);
  });
  const rd = t - T.imp;
  attr(F.ring, 'opacity', r2(rd >= 0 && rd < 0.35 ? 1 - rd / 0.35 : 0)); attr(F.ring, 'cx', r2(home - 30)); attr(F.ring, 'cy', r2(gy - 40 * RS)); attr(F.ring, 'r', r2(40 + rd * 1400));
  // interface
  const hudIn = E.out(seg(t, T.in, T.in + 0.3)) * (1 - E.in(seg(t, T.back, T.back + 0.25)));
  vis(F.hud, active && hudIn > 0.01);
  attr(F.hud, 'transform', `translate(0 ${r2(-160 * (1 - hudIn))})`);
  const hp = FIGHT.hp(t);
  const setBar = (B, v, dv) => {
    const w = 420 * v, wd = 420 * dv;
    if (B.dir > 0) { attr(B.hp, 'x', B.x); attr(B.hp, 'width', r2(Math.max(0, w))); attr(B.dmg, 'x', B.x); attr(B.dmg, 'width', r2(Math.max(0, wd))); }
    else { attr(B.hp, 'x', r2(B.x - w)); attr(B.hp, 'width', r2(Math.max(0, w))); attr(B.dmg, 'x', r2(B.x - wd)); attr(B.dmg, 'width', r2(Math.max(0, wd))); }
  };
  setBar(F.barR, hp.rob, hp.robD); setBar(F.barC, hp.clo, hp.cloD);
  const slam = (tx, t0, t1, y) => {
    const on = active && t >= t0 && t < t1; vis(tx, on); if (!on) return;
    const p = seg(t, t0, t0 + 0.14), q = seg(t, t1 - 0.12, t1);
    attr(tx, 'transform', `translate(540 ${y}) scale(${r2(lerp(2.4, 1, E.out(p)) * (1 + 0.5 * E.in(q)))}) rotate(-6)`);
    attr(tx, 'opacity', r2(clamp(p * 3) * (1 - q)));
  };
  slam(F.fightTx, T.text, T.text + 0.55, 700);
  slam(F.koTx, T.ko, T.back - 0.1, 720);
  attr(F.flash, 'opacity', r2(active ? Math.max(0, 1 - (t - T.imp) / 0.1) * (t >= T.imp ? 0.85 : 0) : 0));
};
