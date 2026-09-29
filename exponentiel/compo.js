// EXPONENTIEL — compositing image par image : décor Blender (bg) → robot officiel → premier plan (fg)
// → effets et textes 2D → sous-titres → transitions. renderAt(t) ne dépend que de t (rendu parallèle).
// Données injectées par render.js dans window.DATA : timing, subs, mouth, anchors (par plan), plates, step, root.
'use strict';
const D = () => window.DATA;
const K = () => D().timing.keys;
const YELLOW = '#FFD23C', WHITE = '#F4F1EA', RED = '#FF5A5A';
const plans = () => D().timing.plans;
const planAt = t => plans().find(p => t >= p.start && t < p.end) || plans()[plans().length - 1];

// ---------------- robot ----------------
let RB, TALK, SHADOW, MOTION = {};
const MOUTH = { f: 'ferm', m: 'mi', u: 'ouv', o: 'o' };
ARMS.surf = { L: [-62, 40, -130, 30, -176, 6], R: [62, 40, 130, 30, 176, -4] };            // bras écartés pour l'équilibre
ARMS.holdHat = { L: [-62, 40, -150, 20, -150, -40], R: [62, 40, 110, -40, 64, -196] };      // retient son chapeau
ARMS.pull = { L: [-62, 40, -150, -30, -150, -170], R: [62, 40, -40, -60, -120, -178] };     // suspendu au levier (à gauche)
ARMS.oar = { L: [-62, 40, -40, 110, 40, 120], R: [62, 40, 110, 80, 90, 120] };             // assis, mains sur les genoux

// Mise en scène du robot, plan par plan : { face, arms, loupe, sit, lean, hop, s (échelle), minS, dx, dy }
function direction(t) {
  const k = K(), p = planAt(t);
  const st = { face: 'curieux', arms: ARMS.down, loupe: false, sit: false, s: 1, minS: 0.42, dx: 0, dy: 0, rot: 0 };
  switch (p.id) {
    case 'P1':
      st.sit = true; st.arms = ARMS.oar;
      if (t > 1.3) { st.arms = ARMS.loupe; st.loupe = true; }
      if (t >= k.jour30 - 0.1) { st.face = 'surpris'; st.arms = ARMS.cheer; st.loupe = false; st.dy = -120 * pulse(t, k.jour30 - 0.05, 0.5); }
      break;
    case 'P2':
      st.sit = true; st.face = t < k.cinq_jours ? 'surpris' : 'perplexe';
      st.arms = ARMS.loupe; st.loupe = true; st.minS = 0.55;
      break;
    case 'P3':
      st.face = t < k.courbe + 0.3 ? 'curieux' : (t < k.deux_fois ? 'surpris' : 'satisfait');
      st.arms = ARMS.surf; st.rot = 6 * Math.sin(t * 5.3) - 8; st.s = 0.9; st.maxS = 0.75;
      st.dy = t < k.courbe ? 0 : -60 * pulse(t, k.courbe, 0.45);
      break;
    case 'P4':
      st.face = t < k.auto ? 'sceptique' : 'surpris'; st.arms = ARMS.surf; st.rot = 4 * Math.sin(t * 6.1); st.s = 0.9;
      break;
    case 'P5':
      st.face = 'surpris'; st.arms = t < k.une_seule ? ARMS.holdHat : ARMS.cheer; st.s = 0.95;
      st.rot = t < k.une_seule ? -6 : -14 + 4 * Math.sin(t * 30);
      break;
    case 'P6':
      st.face = t < k.openai ? 'sceptique' : 'perplexe'; st.arms = ARMS.pull; st.s = 1.1;
      st.rot = -8 + 5 * Math.sin(t * 7); st.dy = -40;
      break;
    case 'P7':
      st.face = 'sceptique'; st.arms = ARMS.loupe; st.loupe = true; st.s = 1; st.minS = 0;
      break;
    default:
      st.face = 'satisfait'; st.arms = ARMS.hat;
  }
  return st;
}

function anchorAt(pid, t) {
  const A = D().anchors[pid];
  if (!A) return null;
  const keys = Object.keys(A).map(Number).sort((a, b) => a - b);
  const fr = t * 30;
  let i = 0; while (i < keys.length - 1 && keys[i + 1] <= fr) i++;
  const a = A[keys[i]], b = A[keys[Math.min(keys.length - 1, i + 1)]];
  const q = keys[i + 1] !== undefined && keys[i + 1] !== keys[i] ? clamp((fr - keys[i]) / (keys[i + 1] - keys[i])) : 0;
  const out = {};
  for (const k in a) out[k] = typeof a[k] === 'number' && typeof b[k] === 'number' ? lerp(a[k], b[k], q) : a[k];
  return out;
}

function drawRobot(t) {
  const p = planAt(t);
  vis(FX.robotT.root, false);
  if (p.id === 'P8') { vis(RB.root, false); vis(SHADOW, false); return drawTitleRobot(t); }
  if (p.id === 'M1') {                                      // séquence motion design : position donnée par motion.js
    const M = MOTION.robot;
    if (!M) { vis(RB.root, false); vis(SHADOW, false); return; }
    vis(RB.root, true); vis(SHADOW, true);
    poseRobot(RB, { x: M.x, y: M.y - 166 * M.s, s: M.s, rot: M.rot, face: M.face, blink: blinkAt(t), arms: M.arms, loupe: M.loupe });
    attr(SHADOW, 'transform', `translate(${r2(M.x)} ${r2(M.y + 6 * M.s)}) scale(${r2(M.s * 1.1)} ${r2(M.s * 0.25)})`);
    return drawMouth(t, M.face);
  }
  const A = anchorAt(p.id, t);
  if (!A || A.z <= 0) { vis(RB.root, false); vis(SHADOW, false); return; }
  vis(RB.root, true);
  const st = direction(t);
  let s = Math.min(Math.max(A.s * st.s, st.minS), st.maxS || 9);
  let x = A.x + st.dx, y = A.y + st.dy, rot = (A.rot || 0) + st.rot;
  poseRobot(RB, { x, y: y - 166 * s, s, rot, face: st.face, blink: blinkAt(t), sit: st.sit, arms: st.arms, loupe: st.loupe,
    hatLift: p.id === 'P5' && t > K().une_seule ? 0.25 * Math.abs(Math.sin(t * 25)) : 0 });
  // ombre portée sur le décor (le papier découpé posé dans la 3D)
  vis(SHADOW, true);
  attr(SHADOW, 'transform', `translate(${r2(x + 14 * s)} ${r2(y + 4 * s)}) scale(${r2(s * 1.1)} ${r2(s * 0.28)})`);
  drawMouth(t, st.face);
}

function drawMouth(t, face) {
  const m = D().mouth;
  const c = m[Math.min(m.length - 1, Math.round(t * 30))];
  const sh = MOUTH[c] || null;
  for (const n in RB.faces) { const fm = RB.faces[n].g.children[3]; if (fm) vis(fm, !(sh && n === face)); }
  vis(TALK.g, !!sh);
  if (sh) for (const k in TALK.m) vis(TALK.m[k], k === sh);
}

// ---------------- effets et textes 2D, plan par plan ----------------
let FX = {};
function txt(parent, o) {
  const el = mk('text', { 'font-family': o.font || 'Fredoka', 'font-weight': o.weight || 700, 'font-size': o.size || 60,
    fill: o.fill || WHITE, 'text-anchor': o.anchor || 'middle', 'dominant-baseline': 'middle' }, parent);
  if (o.stroke) { attr(el, 'stroke', o.stroke); attr(el, 'stroke-width', o.sw || 10); attr(el, 'paint-order', 'stroke'); attr(el, 'stroke-linejoin', 'round'); }
  if (o.filter) attr(el, 'filter', o.filter);
  return el;
}
function buildFX() {
  const fx = $('fx');
  FX.sign = txt(g(fx), { size: 62, fill: WHITE, stroke: INK, sw: 8 });                 // « JOUR n » sur le panneau
  FX.big = txt(g(fx), { font: 'Space Grotesk', size: 170, fill: GREEN, stroke: INK, sw: 14, filter: 'url(#glow)' });
  FX.rew = g(fx);                                                                       // rembobinage
  for (let i = 0; i < 7; i++) mk('rect', { x: 0, width: 1080, height: 6, fill: '#FFFFFF', opacity: 0.25 }, FX.rew);
  FX.rewIcon = txt(FX.rew, { font: 'Space Grotesk', size: 90, fill: WHITE, anchor: 'start' });
  FX.rewIcon.textContent = '◀◀';
  FX.speed = g(fx, { stroke: '#FFFFFF', 'stroke-linecap': 'round' });                   // traînées de vitesse
  FX.lines = [...Array(26)].map(() => mk('line', {}, FX.speed));
  FX.cal = txt(g(fx), { font: 'Space Grotesk', size: 64, fill: INK });
  FX.calSrc = txt(g(fx), { font: 'IBM Plex Mono', weight: 500, size: 26, fill: '#C9D2FF', stroke: INK, sw: 6 });
  FX.calSrc.textContent = 'hypothèse · Forethought, 2025';
  FX.auto = txt(g(fx), { size: 96, fill: GREEN, stroke: INK, sw: 12, filter: 'url(#glow)' });
  FX.auto.textContent = 'AUTO-AMÉLIORATION';
  FX.lever = txt(g(fx), { font: 'Space Grotesk', size: 44, fill: YELLOW, stroke: INK, sw: 9 });
  FX.lever.textContent = 'ALIGNEMENT';
  FX.want = txt(g(fx), { font: 'IBM Plex Mono', weight: 500, size: 44, fill: WHITE, stroke: INK, sw: 7 });
  FX.want.textContent = 'ce qu’on veut';
  FX.does = txt(g(fx), { font: 'IBM Plex Mono', weight: 500, size: 44, fill: GREEN, stroke: INK, sw: 7 });
  FX.does.textContent = 'ce qu’elle fait';
  FX.card = g(fx);                                                                      // fiche d'enquête épinglée
  mk('rect', { x: -330, y: -95, width: 660, height: 190, rx: 16, fill: '#F4EAD2', stroke: INK, 'stroke-width': 7 }, FX.card);
  mk('circle', { cx: 0, cy: -80, r: 16, fill: RED, stroke: INK, 'stroke-width': 5 }, FX.card);
  const c1 = txt(FX.card, { font: 'Space Grotesk', size: 46, fill: INK }); c1.textContent = 'Pas encore de méthode sûre'; attr(c1, 'y', -8);
  const c2 = txt(FX.card, { font: 'IBM Plex Mono', weight: 500, size: 26, fill: '#6B5A45' }); c2.textContent = 'd’après OpenAI, septembre 2026'; attr(c2, 'y', 52);
  // captures d'écran du billet d'OpenAI (media/captures, faites par l'utilisateur), en « carte navigateur »
  const shot = (file, w, h, src) => {
    const G = g(fx), W = 960, ih = W * h / w;
    mk('rect', { x: -W / 2 - 20, y: -ih / 2 - 86, width: W + 40, height: ih + 170, rx: 26, fill: '#FFFFFF', stroke: INK, 'stroke-width': 7, filter: 'url(#shadow)' }, G);
    mk('rect', { x: -W / 2 - 20, y: -ih / 2 - 86, width: W + 40, height: 66, rx: 26, fill: '#E9ECF2' }, G);
    [0, 1, 2].forEach(i => mk('circle', { cx: -W / 2 + 14 + i * 30, cy: -ih / 2 - 53, r: 9, fill: ['#FF5F57', '#FEBC2E', '#28C840'][i] }, G));
    mk('rect', { x: -W / 2 + 120, y: -ih / 2 - 72, width: W - 150, height: 38, rx: 19, fill: '#FFFFFF' }, G);
    const u = txt(G, { font: 'IBM Plex Mono', weight: 500, size: 22, fill: '#5A6070', anchor: 'start' });
    u.textContent = 'openai.com/index/research-acceleration-view-inside-openai'; attr(u, 'x', -W / 2 + 140); attr(u, 'y', -ih / 2 - 52);
    mk('image', { href: `${D().root}/media/captures/${file}`, x: -W / 2, y: -ih / 2, width: W, height: ih, preserveAspectRatio: 'xMidYMid meet' }, G);
    const s = txt(G, { font: 'IBM Plex Mono', weight: 500, size: 26, fill: '#3A3F4B' }); s.textContent = src; attr(s, 'y', ih / 2 + 44);
    return G;
  };
  FX.shotRsi = shot('rsi_crop.png', 1376, 504, 'OpenAI, « Research acceleration », septembre 2026');
  FX.shotFr = shot('stagiaire_crop.png', 1344, 504, 'OpenAI, « Research acceleration », septembre 2026');
  // les cartes passent au-dessus du monde (qui devient flou et s'assombrit derrière elles)
  FX.shots = g(null); $('stage').insertBefore(FX.shots, $('subs'));
  FX.dim = mk('rect', { width: 1080, height: 1920, fill: '#05070F', opacity: 0 }, FX.shots);
  for (const S of [FX.shotRsi, FX.shotFr]) {
    FX.shots.appendChild(S);
    const box = S.firstChild, id = 'clip' + Math.round(Math.random() * 1e9);   // reflet lumineux qui balaie la carte
    const cp = mk('clipPath', { id }, DEFS());
    mk('rect', { x: box.getAttribute('x'), y: box.getAttribute('y'), width: box.getAttribute('width'), height: box.getAttribute('height'), rx: 26 }, cp);
    S.sweep = mk('rect', { x: -170, y: -1000, width: 110, height: 2000, fill: '#FFFFFF', opacity: 0.55, 'clip-path': `url(#${id})` }, S);
  }
  const bf = mk('filter', { id: 'worldBlur', x: '-5%', y: '-5%', width: '110%', height: '110%' }, DEFS());
  FX.blurG = mk('feGaussianBlur', { stdDeviation: 0 }, bf);
  FX.lens = g(fx);                                                                      // « JOUR ?? » dans la loupe
  FX.lensTxt = txt(FX.lens, { size: 1, fill: GREEN, filter: 'url(#glow)' });
  FX.metr = txt(g(fx), { font: 'IBM Plex Mono', weight: 500, size: 26, fill: '#C9D2FF', stroke: INK, sw: 6 });
  FX.metr.textContent = 'METR, 2025-2026 · réussite 1 fois sur 2';
  FX.title = g(fx);
  buildTitle(FX.title);
}

// instants des cartes « capture » : entrée, zoom (images clés), sortie — repris par sons.py (mêmes formules)
const SHOT_TIMES = () => {
  const k = K(), P4 = plans().find(q => q.id === 'P4'), P6 = plans().find(q => q.id === 'P6');
  return {
    fr: { tin: P4.start + 0.2, tzoom: P4.start + 0.85, tout: k.cest - 0.04 },
    rsi: { tin: k.openai - 0.05, tzoom: k.openai + 0.5, tout: P6.end },
  };
};
// carte « capture » : monte du bas en tournant (rebond, reflet), zoom par images clés sur la phrase surlignée,
// puis file vers la caméra. Renvoie l'intensité du flou du décor (0 → 1).
function animShot(S, t, T, z) {
  if (t < T.tin || t >= T.tout) { vis(S, false); return 0; }
  const qi = seg(t, T.tin, T.tin + 0.42), qo = seg(t, T.tout - 0.28, T.tout);
  const zq = E.io(seg(t, T.tzoom, T.tzoom + 0.55));                     // zoom sur la phrase
  const drift = seg(t, T.tzoom + 0.55, T.tout);                           // puis la caméra continue de glisser le long de la ligne
  const s = lerp(0.5, 1, E.back(qi)) * (1 + z.s * zq + 0.05 * drift) * (1 + 0.9 * E.in(qo));
  const x = 540 + z.dx * zq - 40 * drift;
  const y = 720 + 900 * (1 - E.out(qi)) + z.dy * zq - 160 * E.in(qo);
  const rot = -12 * (1 - E.out(qi)) + 3 * E.in(qo);
  place(S, x, y, s, rot, 1 - qo);
  attr(S.sweep, 'x', r2(-700 + 1500 * E.io(seg(t, T.tin + 0.25, T.tin + 0.8))));
  attr(S.sweep, 'transform', 'skewX(-20)');
  return clamp(qi * 1.6) * (1 - qo);
}

function place(el, x, y, s = 1, rot = 0, op = 1) {
  vis(el, op > 0.01);
  if (op > 0.01) { attr(el, 'transform', `translate(${r2(x)} ${r2(y)}) rotate(${r2(rot)}) scale(${r2(s)})`); attr(el, 'opacity', r2(op)); }
}

function drawFX(t) {
  const k = K(), p = planAt(t), A = anchorAt(p.id, t) || {};
  for (const el of [FX.sign.parentNode, FX.big.parentNode, FX.rew, FX.speed, FX.cal.parentNode, FX.calSrc.parentNode, FX.auto.parentNode,
    FX.lever.parentNode, FX.want.parentNode, FX.does.parentNode, FX.card, FX.lens, FX.metr.parentNode, FX.title, FX.shotRsi, FX.shotFr]) vis(el, false);
  if ((p.id === 'P1' || p.id === 'P2') && A.sign_z > 0) {
    const day = p.id === 'P1' ? Math.floor(A.day) : (t < k.cinq_jours ? 29 : Math.round(A.day));
    FX.sign.textContent = `JOUR ${day}`;
    place(FX.sign.parentNode, A.sign_x, A.sign_y, clamp(15 / A.sign_z, 0.7, 1.6));
  }
  if (p.id === 'P2') {
    const big = t < k.cinq_jours ? '50 %' : '3 %', t0 = t < k.cinq_jours ? k.moitie - 0.1 : k.trois_pct - 0.1;
    FX.big.textContent = big;
    place(FX.big.parentNode, 540, 520, E.back(seg(t, t0, t0 + 0.3)), 0, seg(t, t0, t0 + 0.1));
    const rw = Math.max(pulse(t, p.start - 0.05, 0.45), 1.4 * pulse(t, k.cinq_jours - 0.05, 0.75));
    vis(FX.rew, rw > 0.02);
    [...FX.rew.children].forEach((r, i) => { if (r.tagName === 'rect') attr(r, 'y', r2((i * 311 + t * 2400) % 1920)); });
    attr(FX.rewIcon, 'x', 70); attr(FX.rewIcon, 'y', 300); attr(FX.rew, 'opacity', r2(clamp(rw)));
  }
  if (p.id === 'P3' || p.id === 'P4' || p.id === 'P5') {                   // traînées : plus nombreuses quand ça accélère
    const sp = p.id === 'P3' ? seg(t, k.courbe, p.end) : (p.id === 'P4' ? 0.7 : 1);
    vis(FX.speed, sp > 0.05);
    const R = rng(7 + Math.floor(t * 30));
    FX.lines.forEach((l, i) => {
      const on = i < 26 * sp, ang = R() * PI2, r0 = 380 + R() * 500, len = 60 + 260 * sp * R();
      const cx = 540, cy = 900;
      attr(l, 'x1', r2(cx + Math.cos(ang) * r0)); attr(l, 'y1', r2(cy + Math.sin(ang) * r0));
      attr(l, 'x2', r2(cx + Math.cos(ang) * (r0 + len))); attr(l, 'y2', r2(cy + Math.sin(ang) * (r0 + len)));
      attr(l, 'stroke-width', r2(2 + 4 * R())); attr(l, 'opacity', on ? r2(0.25 + 0.5 * R()) : 0);
    });
  }
  if (p.id === 'P3' && t > k.courbe) place(FX.metr.parentNode, 540, 1450, 1, 0, seg(t, k.courbe + 0.4, k.courbe + 0.7));
  let blur = 0;
  // P4 : pas de capture (demande de l'utilisateur : on garde le data center et le nénuphar à l'écran)
  if (p.id === 'P5' && A.cal_z > 0) {
    const lab = t < k.semaines - 0.25 ? '4 mois' : (t < k.une_seule ? 'quelques semaines' : '1 semaine ?');
    FX.cal.textContent = lab;
    const s = clamp(14 / A.cal_z, 0.4, 1.6) * (lab.length > 10 ? 0.75 : 1);
    place(FX.cal.parentNode, A.cal_x, A.cal_y, s, -3, t < k.une_seule + 0.4 ? 1 : 1 - seg(t, k.une_seule + 0.4, k.une_seule + 0.7));
    if (t >= k.une_seule) {
      FX.big.textContent = '1 semaine ?';
      place(FX.big.parentNode, 540, 470, 0.62 * E.back(seg(t, k.une_seule, k.une_seule + 0.3)), -5, 1);
    }
    place(FX.calSrc.parentNode, 540, 1460, 1, 0, seg(t, p.start + 0.4, p.start + 0.7));
  }
  if (p.id === 'P6') {
    if (A.lever_z > 0) place(FX.lever.parentNode, clamp(A.lever_x, 170, 910), A.lever_y - 70, 1, -6, seg(t, p.start + 0.2, p.start + 0.4));
    if (A.want_z > 0) place(FX.want.parentNode, clamp(A.want_x, 200, 880), A.want_y - 40, 1, 0, seg(t, k.garantit, k.garantit + 0.3));
    if (A.fork_z > 0) place(FX.does.parentNode, clamp(A.fork_x, 200, 880), A.fork_y - 40, 1, 0, seg(t, k.garantit + 0.6, k.garantit + 0.9));
    // la vraie phrase d'OpenAI (capture) : entrée, zoom sur la phrase surlignée, sortie
    blur = animShot(FX.shotRsi, t, SHOT_TIMES().rsi, { s: 0.4, dx: 125, dy: 30 });
  }
  // monde flou et assombri derrière les cartes
  attr(FX.dim, 'opacity', r2(0.45 * blur));
  attr(FX.blurG, 'stdDeviation', r2(16 * blur));
  attr($('world'), 'filter', blur > 0.01 ? 'url(#worldBlur)' : '');
  if (p.id === 'P8') drawTitle(t);
}

// ---------------- carton final (look de la miniature : courbe néon ×2 … ×64 face à la droite linéaire) ----------------
function buildTitle(G) {
  mk('rect', { width: 1080, height: 1920, fill: '#0B1230' }, G);
  FX.lin = mk('path', { fill: 'none', stroke: '#8E97C8', 'stroke-width': 8, 'stroke-dasharray': '18 16', 'stroke-linecap': 'round' }, G);
  FX.linTxt = txt(G, { font: 'IBM Plex Mono', weight: 500, size: 30, fill: '#8E97C8', anchor: 'start' }); FX.linTxt.textContent = 'linéaire';
  FX.expo = mk('path', { fill: 'none', stroke: GREEN, 'stroke-width': 14, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', filter: 'url(#neon)' }, G);
  FX.dots = [...Array(7)].map((_, i) => {
    const d = g(G);
    mk('circle', { r: 14, fill: YELLOW, stroke: INK, 'stroke-width': 5 }, d);
    const l = txt(d, { font: 'Space Grotesk', size: 36, fill: WHITE, stroke: INK, sw: 7 }); l.textContent = '×' + 2 ** i; attr(l, 'x', -52); attr(l, 'y', -30);
    return d;
  });
  FX.word = g(G);
  FX.letters = [...'EXPONENTIEL'].map(c => { const l = txt(FX.word, { size: 100, fill: GREEN, stroke: INK, sw: 10, anchor: 'start', filter: 'url(#glow)' }); l.textContent = c; return l; });
  FX.slogan = txt(G, { font: 'Space Grotesk', size: 60, fill: WHITE }); FX.slogan.textContent = 'L’IA SOUS ENQUÊTE';
  FX.sub = g(G);
  mk('rect', { x: -190, y: -48, width: 380, height: 96, rx: 48, fill: RED, stroke: INK, 'stroke-width': 6 }, FX.sub);
  FX.subTxt = txt(FX.sub, { size: 46, fill: WHITE }); FX.subTxt.textContent = 'S’ABONNER';
  FX.robotT = makeRobot($('fx'));
}
function curvePts(u) {   // courbe qui double à chaque pas, de (130, 1180) jusqu'à crever le haut
  const pts = [];
  for (let i = 0; i <= 120 * u; i++) {
    const x = i / 120, y = Math.pow(2, x * 7) - 1;
    pts.push([130 + x * 800, 1180 - y * 7.2]);
  }
  return pts;
}
function drawTitle(t) {
  const k = K(), T0 = planAt(t).start, u = t - T0;
  vis(FX.title, true);
  const iris = E.io(seg(u, 0, 0.45));                         // ouverture en iris depuis la loupe
  attr(FX.title, 'clip-path', iris < 1 ? 'url(#irisClip)' : '');
  let c = document.getElementById('irisClip');
  if (!c) { c = mk('clipPath', { id: 'irisClip' }, DEFS()); mk('circle', { cx: 540, cy: 900 }, c); }
  attr(c.firstChild, 'r', r2(20 + 1300 * iris));
  const cu = E.out(seg(u, 0.2, 1.3));
  attr(FX.lin, 'd', `M 130 1180 L ${r2(130 + 800 * cu)} ${r2(1180 - 330 * cu)}`);
  attr(FX.linTxt, 'x', 700); attr(FX.linTxt, 'y', 1100); attr(FX.linTxt, 'opacity', r2(seg(u, 1.0, 1.3)));
  const pts = curvePts(cu);
  attr(FX.expo, 'd', 'M ' + pts.map(p => `${r2(p[0])} ${r2(p[1])}`).join(' L '));
  FX.dots.forEach((d, i) => {
    const x = i / 6, px = 130 + x * 800, py = 1180 - (Math.pow(2, x * 7) - 1) * 7.2;
    place(d, px, py, E.back(seg(u, 0.25 + i * 0.12, 0.45 + i * 0.12)), 0, cu >= x ? 1 : 0);
  });
  // lettres qui grandissent de façon exponentielle
  let x = 0; const sizes = FX.letters.map((_, i) => 0.42 * Math.pow(1.17, i) * E.back(seg(u, 0.5 + i * 0.05, 0.75 + i * 0.05)));
  const widths = FX.letters.map((l, i) => FX.letterW[i] * sizes[i]);
  const total = widths.reduce((a, b) => a + b, 0);
  x = 540 - total / 2;
  FX.letters.forEach((l, i) => { place(l, x, 360 - 40 * sizes[i], sizes[i], 0, sizes[i] > 0.02 ? 1 : 0); x += widths[i]; });
  place(FX.slogan, 540, 480, 1, 0, seg(u, 1.2, 1.5));
  const click = seg(u, 2.2, 2.3);
  FX.subTxt.textContent = u < 2.25 ? 'S’ABONNER' : 'ABONNÉ ✓';
  attr(FX.sub.firstChild, 'fill', u < 2.25 ? RED : '#4A4F5E');
  place(FX.sub, 540, 1520, (1 - 0.12 * pulse(u, 2.15, 0.2)) * E.back(seg(u, 1.4, 1.7)), 0, seg(u, 1.4, 1.5));
}
function drawTitleRobot(t) {
  const u = t - planAt(t).start;
  const s = 0.95, x = 800 + 260 * (1 - E.out(seg(u, 0.5, 1.1))), y = 1400;
  poseRobot(FX.robotT, { x, y: y - 166 * s, s, face: u < 1.9 ? 'curieux' : 'satisfait', blink: blinkAt(t), arms: u > 1.7 ? ARMS.hat : ARMS.down,
    hatLift: u > 1.7 ? E.back(seg(u, 1.7, 2.0)) * (1 - seg(u, 2.5, 2.8)) : 0 });
  vis(FX.robotT.root, u > 0.4);
}

// ---------------- sous-titres (mot à mot, mots-clés en vert) ----------------
let SUBS = [];
function buildSubs() {
  const G = $('subs');
  SUBS = D().subs.map(s => {
    const words = s.txt.split(' ');
    const el = g(G), ws = [];
    const tx = mk('text', { 'font-family': 'Fredoka', 'font-weight': 700, 'font-size': 66, 'text-anchor': 'middle', stroke: INK, 'stroke-width': 12,
      'paint-order': 'stroke', 'stroke-linejoin': 'round' }, el);
    words.forEach((w, i) => {
      const green = w.includes('*');
      const sp = mk('tspan', { fill: green ? GREEN : WHITE }, tx);
      sp.textContent = w.replace(/\*/g, '') + (i < words.length - 1 ? ' ' : '');
      ws.push(sp);
    });
    return { ...s, el, tx, ws };
  });
}
function layoutSubs() {   // coupe en 2 lignes si trop long (zone sûre des Reels : 900 px de large)
  for (const S of SUBS) {
    const full = S.tx.getComputedTextLength();
    if (full <= 900) continue;
    let acc = 0, cut = 0;
    const lens = S.ws.map(w => w.getComputedTextLength());
    for (let i = 0; i < lens.length; i++) { acc += lens[i]; if (acc > full / 2) { cut = i; break; } }
    attr(S.ws[cut], 'x', 540); attr(S.ws[cut], 'dy', 78);
    S.two = true;
  }
}
function drawSubs(t) {
  for (const S of SUBS) {
    const on = t >= S.t0 && t < S.t1 && planAt(t).id !== 'P8' && !MOTION.kin;
    vis(S.el, on);
    if (!on) continue;
    S.ws.forEach((w, i) => attr(w, 'opacity', t >= S.words[i] - 0.03 ? 1 : 0));
    const pop = E.back(seg(t, S.t0, S.t0 + 0.18));
    attr(S.el, 'transform', `translate(540 ${S.two ? 1240 : 1290}) scale(${r2(0.85 + 0.15 * pop)}) translate(-540 0)`);
    attr(S.tx, 'x', 540);
  }
}

// ---------------- plaques Blender ----------------
function plateSrc(pid, layer, t) {
  const P = plans().find(p => p.id === pid), st = D().step;
  let fr = Math.round(t * 30);
  fr = Math.min(P.frames[1] - 1, Math.max(P.frames[0], fr));
  fr = P.frames[0] + Math.floor((fr - P.frames[0]) / st) * st;
  return `${D().root}/out/${D().plates}/${pid}/${layer}/${String(fr).padStart(4, '0')}.png`;
}

// ---------------- transitions : flash + fouetté à chaque changement de plan ----------------
function drawTransitions(t) {
  let fl = 0, whip = 0;
  for (const p of plans().slice(1).filter(q => q.id !== 'M1')) {
    fl = Math.max(fl, pulse(t, p.start - 0.02, 0.16) * (p.id === 'P8' ? 0 : 0.55));
    whip += (t < p.start ? -1 : 1) * pulse(t, p.start - 0.12, 0.24);
  }
  attr($('flash'), 'opacity', r2(fl));
  const k = K(), shake = planAt(t).id === 'P5' && t > k.une_seule ? 14 * pulse(t, k.une_seule, 0.6) : 0;
  const ox = whip * 90 + shake * noise1(t * 40, 1), oy = shake * noise1(t * 40, 2);
  attr($('world'), 'transform', whip || shake ? `translate(${r2(ox)} ${r2(oy)})` : '');
}

// ---------------- entrée ----------------
window.init = function () {
  const layer = $('robotLayer');
  SHADOW = mk('ellipse', { cx: 0, cy: 0, rx: 100, ry: 100, fill: '#000', opacity: 0.35, filter: 'url(#b3)' }, layer);
  RB = makeRobot(layer);
  TALK = { g: g(RB.face, { filter: 'url(#glow)', fill: GREEN, transform: 'translate(0 -59)' }) };
  TALK.m = {
    ferm: mk('rect', { x: -12, y: -2.5, width: 24, height: 5, rx: 2.5 }, TALK.g),
    mi: mk('rect', { x: -12, y: -5.5, width: 24, height: 11, rx: 5.5 }, TALK.g),
    ouv: mk('rect', { x: -14, y: -10, width: 28, height: 20, rx: 9 }, TALK.g),
    o: mk('ellipse', { cx: 0, cy: 0, rx: 8, ry: 11, fill: 'none', stroke: GREEN, 'stroke-width': 5 }, TALK.g),
  };
  buildFX();
  window.buildMotion();
  buildSubs();
  return document.fonts.ready.then(() => {
    layoutSubs();
    vis(FX.title, true); FX.letterW = FX.letters.map(l => l.getComputedTextLength()); vis(FX.title, false);
    vis(FX.robotT.root, false);
    window.READY = true;
  });
};

window.renderAt = async function (t) {
  const p = planAt(t);
  const bg = $('bg'), fg = $('fg');
  MOTION = window.drawMotion(t);
  if (p.id === 'M1') {
    vis(bg, false); vis(fg, false);
    const src = window.motionPhotoSrc(t);
    if (MO.photoImg.getAttribute('href') !== src) MO.photoImg.setAttribute('href', src);
  } else if (p.id === 'P8') { vis(bg, false); vis(fg, false); }
  else {
    vis(bg, true);
    const sb = plateSrc(p.id, 'bg', t), sf = plateSrc(p.id, 'fg', t);
    const loads = [];
    if (bg.getAttribute('href') !== sb) { bg.setAttribute('href', sb); loads.push(bg.decode ? null : null); }
    const hasFg = D().fg[p.id] && p.id !== 'P7';   // P7 : rien devant la loupe
    vis(fg, !!hasFg);
    if (hasFg && fg.getAttribute('href') !== sf) fg.setAttribute('href', sf);
  }
  drawRobot(t);
  drawFX(t);
  drawSubs(t);
  drawTransitions(t);
  $('grainT').setAttribute('seed', String(1 + Math.round(t * 30) % 97));   // grain de film animé
  attr($('robotLayer'), 'filter', p.id === 'P8' || (p.id === 'M1' && t > K().align - 0.1) ? '' : 'url(#grade)');
  // attend que les images soient décodées
  await Promise.all([bg, fg, MO.photoImg].filter(im => im.style.display !== 'none' && im.getAttribute('href')).map(im => new Promise(res => {
    const img = new Image(); img.onload = img.onerror = res; img.src = im.getAttribute('href');
  })));
};
