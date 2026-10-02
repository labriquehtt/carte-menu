/* ABYSSE (v2) — motion design de la bande-annonce PARANO-IA.
 *
 * Une seule horloge, seekable image par image ; tous les instants viennent de la partition (assets/data/partition.js).
 * Le début est rythmique : une balle rebondit sur une ligne (elle joue la mélodie), les lettres jaillissent et tombent,
 * les phrases s'étirent, les mots clés se déchiffrent en lettres de caractères (façon « APP » de la référence, incurvés,
 * franges de couleur — les caractères sont des noms de modèles : références cachées), des logos d'IA dessinés
 * apparaissent puis flottent sur la ligne, la surface, et coulent quand on plonge.
 * Pendant la plongée (plaque Blender) : tableau de bord ; la baleine révèle le logo DeepSeek au sonar ; le piano fait
 * monter, sombres, les logos des applis de musique IA (Suno d'abord). Au bureau : viseur de caméra (REC). Fin : logo.
 */
(function () {
  'use strict';
  const P = window.PARTITION;
  const ECRAN = window.ECRAN;
  const SPATIAL = window.SPATIAL || { premiere_image: 0, objets: {} };
  const NIVEAUX = window.NIVEAUX || [];
  const W = 1080, H = 1920, FPS = P.fps, DUR = P.duree, BEAT = P.temps, BAR = P.mesure, DEC = P.decalage_3d;
  const COL = { fond: '#05090b', texte: '#eef4f1', vert: '#4dff8f', menthe: '#bfffd9', encre: '#1b1620', creme: '#fffdf7' };
  const TITRE = '"Space Grotesk"', MONO = '"IBM Plex Mono"';
  const evs = (type, objet) => P.evenements.filter((e) => e.type === type && (!objet || e.objet === objet));
  const ev1 = (type, objet) => evs(type, objet)[0];
  const plan = (id) => P.plans.find((p) => p.id === id);

  const bg = document.getElementById('bg').getContext('2d');
  const fg = document.getElementById('fg').getContext('2d');
  const lg = document.getElementById('logo').getContext('2d');
  const ecranEl = document.getElementById('ecran');
  const robotPose = document.getElementById('robot-pose');
  const robotAntenne = document.getElementById('robot-antenne');

  // ------------------------------------------------------------------ outils
  const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
  const lerp = (a, b, k) => a + (b - a) * k;
  const smooth = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
  const expoOut = (x) => { x = clamp(x); return x >= 1 ? 1 : 1 - Math.pow(2, -10 * x); };
  const expoIn = (x) => { x = clamp(x); return x <= 0 ? 0 : Math.pow(2, 10 * x - 10); };
  const cubicInOut = (x) => { x = clamp(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
  const backOut = (x, s = 1.70158) => { x = clamp(x); const c3 = s + 1; return 1 + c3 * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2); };
  const elasticOut = (x) => { x = clamp(x); if (x === 0 || x === 1) return x; return Math.pow(2, -10 * x) * Math.sin((x * 10 - 0.75) * (2 * Math.PI / 3)) + 1; };
  const bounceOut = (x) => {
    x = clamp(x); const n1 = 7.5625, d1 = 2.75;
    if (x < 1 / d1) return n1 * x * x;
    if (x < 2 / d1) return n1 * (x -= 1.5 / d1) * x + 0.75;
    if (x < 2.5 / d1) return n1 * (x -= 2.25 / d1) * x + 0.9375;
    return n1 * (x -= 2.625 / d1) * x + 0.984375;
  };
  function hash(a, b = 0, c = 0) {
    let h = (a * 374761393 + b * 668265263 + c * 2147483647) | 0;
    h = (h ^ (h >>> 13)) * 1274126177 | 0;
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }
  function mulberry32(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function pulse(t, from, to, decay = 9) {
    if (t < from || t > to + 1) return 0;
    const k = Math.floor((t - from) / BEAT);
    return Math.exp(-(t - (from + k * BEAT)) * decay);
  }
  const NOTE = ['do', 'do#', 'ré', 'mib', 'mi', 'fa', 'fa#', 'sol', 'sol#', 'la', 'sib', 'si'];
  const nomNote = (m) => NOTE[m % 12] + Math.floor(m / 12 - 1);

  // ------------------------------------------------------------------ champ de points noir et blanc (le fond)
  const NIV = 16;
  const teintes = [];
  function prepareTeintes() {
    for (let i = 0; i < NIV; i++) {
      const k = i / (NIV - 1);
      const r = Math.round(lerp(18, 205, k * k)), g = Math.round(lerp(120, 255, k)), b = Math.round(lerp(110, 222, k * k));
      teintes.push(`rgb(${r},${g},${b})`);
    }
  }
  function champPoints(ctx, t, crete, alpha, battement, opts = {}) {
    const pas = opts.pas || 18;
    const seaux = Array.from({ length: NIV }, () => []);
    for (let y = Math.max(0, Math.floor(crete / pas) * pas - 120); y < H; y += pas) {
      for (let x = pas / 2; x < W; x += pas) {
        const h = 0.5 * Math.sin(0.011 * x + 1.7 * t) + 0.35 * Math.sin(0.019 * y - 1.15 * t + 0.004 * x) +
          0.25 * Math.sin(0.027 * (x + y) + 2.3 * t);
        const bord = crete + 46 * Math.sin(0.006 * x + t * 1.3) + 30 * Math.sin(0.017 * x - t * 2.1);
        if (y < bord) continue;
        const prox = Math.exp(-(y - bord) / 420);
        let v = (0.18 + 0.82 * (h + 1.1) / 2.2) * (0.25 + 0.75 * prox) * alpha * (1 + 0.6 * battement * prox);
        v = clamp(v);
        if (v < 0.04) continue;
        seaux[Math.min(NIV - 1, Math.floor(v * NIV))].push(x, y, 1.2 + 2.6 * v * (1 + 0.4 * battement));
      }
    }
    for (let i = 0; i < NIV; i++) {
      const s = seaux[i];
      if (!s.length) continue;
      ctx.fillStyle = teintes[i];
      ctx.beginPath();
      for (let j = 0; j < s.length; j += 3) ctx.rect(s[j] - s[j + 2] / 2, s[j + 1] - s[j + 2] / 2, s[j + 2], s[j + 2]);
      ctx.fill();
    }
  }

  // ------------------------------------------------------------------ texte incurvé (sur un cylindre)
  // fort : les mots en caractères, nettement incurvés (comme le « APP » de la référence) ; sinon une légère courbure
  function cylindre(cx, cy, lx, ly, fort) {
    const R = fort ? 600 : 760;                        // rayon du cylindre : plus petit = plus incurvé
    const th = clamp(lx / R, -1.35, 1.35);
    const prof = fort ? 0.70 + 0.30 * Math.cos(th) : 0.80 + 0.20 * Math.cos(th);   // les bords reculent
    return { x: cx + R * Math.sin(th), y: cy + ly * prof - (1 - Math.cos(th)) * (fort ? 70 : 40), s: prof, sx: Math.cos(th) };
  }

  // lettres pleines (mots de liaison) : chaque lettre posée sur le cylindre, transformations par lettre
  function motPlein(ctx, texte, cx, cy, taille, couleur, lettre, opts = {}) {
    ctx.save();
    ctx.font = `700 ${taille}px ${TITRE}`;
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'center';
    const esp = -taille * 0.02;
    const larg = [...texte].map((ch) => ctx.measureText(ch).width);
    const total = larg.reduce((a, b) => a + b, 0) + esp * (texte.length - 1);
    const etire = opts.etire === undefined ? 1 : opts.etire;
    let x = -total / 2;
    [...texte].forEach((ch, i) => {
      const lx = (x + larg[i] / 2) * etire;
      x += larg[i] + esp;
      if (ch === ' ') return;
      const L = lettre ? lettre(i) : { dx: 0, dy: 0, sx: 1, sy: 1, a: 1, rot: 0 };
      if (!L || L.a <= 0) return;
      const c = cylindre(cx, cy, lx + L.dx, L.dy);
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.rotate(L.rot || 0);
      ctx.scale(c.sx * L.sx * (opts.etireLettre || 1), c.s * L.sy);
      ctx.globalAlpha = clamp(L.a);
      if (opts.frange) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = 'rgba(255,40,80,0.5)'; ctx.fillText(ch, -opts.frange, 0);
        ctx.fillStyle = 'rgba(40,220,255,0.5)'; ctx.fillText(ch, opts.frange, 0);
        ctx.globalCompositeOperation = 'source-over';
      }
      ctx.fillStyle = couleur;
      ctx.fillText(ch, 0, 0);
      ctx.restore();
    });
    ctx.restore();
  }

  // lettres de caractères (mots clés, comme « APP » dans la référence) : chaque lettre est remplie de caractères ;
  // à l'intérieur, les caractères épellent des noms de modèles d'IA (il faut faire pause pour les lire)
  const NOMS = (P.noms_caches.join('·') + '·').replace(/ /g, '');
  const MOTS = {};
  function prepareMot(texte, taille) {
    const cle = texte + taille;
    if (MOTS[cle]) return MOTS[cle];
    const c = document.createElement('canvas');
    const ctx = c.getContext('2d');
    ctx.font = `700 ${taille}px ${TITRE}`;
    const esp = taille * 0.012;
    const lettres = [];
    let x = 24;
    for (const ch of texte) { const w = ctx.measureText(ch).width; lettres.push({ ch, x0: x, w }); x += w + esp; }
    c.width = Math.ceil(x + 24); c.height = Math.ceil(taille * 1.25);
    // le masque est épaissi (contour) : des lettres grasses et rondes, comme le « APP » de la référence
    ctx.font = `700 ${taille}px ${TITRE}`;
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#fff'; ctx.strokeStyle = '#fff';
    ctx.lineWidth = taille * 0.06; ctx.lineJoin = 'round';
    const base = taille * 0.97;
    lettres.forEach((l) => { ctx.fillText(l.ch, l.x0, base); ctx.strokeText(l.ch, l.x0, base); });
    const data = ctx.getImageData(0, 0, c.width, c.height).data;
    const cw = Math.max(8, Math.round(taille * 0.056)), chh = Math.round(cw * 1.3);
    const plein = (px, py) => {
      px = Math.round(px); py = Math.round(py);
      return px >= 0 && py >= 0 && px < c.width && py < c.height && data[(py * c.width + px) * 4 + 3] > 110;
    };
    const centreY = base - taille * 0.36;              // milieu des capitales
    const cells = [];
    let k = 0;
    for (let y = chh / 2; y < c.height; y += chh) {
      for (let x2 = cw / 2; x2 < c.width; x2 += cw) {
        if (!plein(x2, y)) continue;
        const bord = !plein(x2 - cw, y) || !plein(x2 + cw, y) || !plein(x2, y - chh) || !plein(x2, y + chh);
        let li = 0;
        lettres.forEach((l, i) => { if (x2 >= l.x0 - esp) li = i; });
        cells.push({ x: x2 - c.width / 2, y: y - centreY, l: li, bord, k: k, r: hash(k, taille, 3) });
        k++;
      }
    }
    const mot = { texte, taille, cells, cw, chh, base: base - centreY,
      lettres: lettres.map((l) => ({ ch: l.ch, cx: l.x0 + l.w / 2 - c.width / 2 })) };
    MOTS[cle] = mot;
    return mot;
  }
  const GLYPHES = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*+=<>/\\';
  const BORD = '#@%&$';
  // dessine un mot de caractères, incurvé, en relief. o : { f (image), decode 0→1 (les grains apparaissent puis se
  // fixent), dechire 1→0 (déchirure : bandes décalées + franges rouge/cyan), accent (index de lettre à partir duquel
  // c'est vert), lettre(i) → transformation par lettre, eclat (s depuis l'éclat) + cibleEclat(cell) → {x, y, duree},
  // alpha, profondeur }
  function motCaracteres(ctx, mot, cx, cy, o) {
    const f = o.f;
    const bandes = [];
    if (o.dechire > 0) {
      for (let b = 0; b < 6; b++) {
        bandes.push({ y0: (hash(f, b, 1) - 0.6) * mot.taille, h: 8 + hash(b, f, 2) * 46, dx: (hash(f, b, 7) - 0.5) * 220 * o.dechire });
      }
    }
    const pts = [];
    for (const c of mot.cells) {
      if (c.r > o.decode * 1.3) continue;
      const L = o.lettre ? o.lettre(c.l) : null;
      if (L && L.a <= 0) continue;
      let lx = c.x, ly = c.y;
      if (L) {
        const lcx = mot.lettres[c.l].cx;
        lx = lcx + (lx - lcx) * L.sx + L.dx;
        ly = mot.base + (ly - mot.base) * L.sy + L.dy;
      }
      let a = (o.alpha === undefined ? 1 : o.alpha) * (L ? clamp(L.a) : 1);
      let cible = null, u = 0;
      if (o.eclat > 0) {                                  // les grains s'envolent : chacun rejoint un logo
        cible = o.cibleEclat(c);
        u = cubicInOut(clamp(o.eclat / cible.duree));
        a *= 1 - smooth((u - 0.65) / 0.35);
      }
      for (const b of bandes) if (ly > b.y0 && ly < b.y0 + b.h) lx += b.dx;
      if (a <= 0.01) continue;
      const p = cylindre(cx, cy, lx, ly, true);
      if (cible) {
        p.x = lerp(p.x, cible.x, u);
        p.y = lerp(p.y, cible.y, u) - Math.sin(Math.PI * u) * 160 * (c.r - 0.3);
        p.s = lerp(p.s, 1, u); p.sx = lerp(p.sx, 1, u);
      }
      const fixe = c.r < o.decode * 1.3 - 0.3 && hash(c.k, Math.floor(f / 2)) > 0.03;
      let ch;
      if (!fixe) ch = GLYPHES[Math.floor(hash(c.k, f, 5) * GLYPHES.length)];
      else if (c.bord) ch = BORD[c.k % BORD.length];
      else ch = NOMS[c.k % NOMS.length];
      pts.push({ x: p.x, y: p.y, s: p.s, sx: p.sx, ch, bord: c.bord,
        a: a * (c.bord ? 1 : 0.78) * (0.82 + 0.18 * hash(c.k, Math.floor(f / 3))),
        vert: o.accent !== undefined && c.l >= o.accent });
    }
    ctx.save();
    ctx.font = `500 ${Math.round(mot.chh * 1.12)}px ${MONO}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // le relief : quatre couches de plus en plus sombres, vers le bas et vers le centre (des lettres « deep »)
    const prof = o.profondeur === undefined ? 1 : o.profondeur;
    if (prof > 0) {
      for (let k = 4; k >= 1; k--) {
        ctx.fillStyle = `rgba(40,150,110,${(0.34 - k * 0.06) * prof})`;
        const e = 1 - 0.014 * k;
        for (const q of pts) {
          ctx.globalAlpha = q.a;
          ctx.setTransform(q.sx * e, 0, 0, q.s * e, q.x - (q.x - cx) * 0.012 * k, q.y + k * 5 * q.s);
          ctx.fillText(q.ch, 0, 0);
        }
      }
    }
    // un aplat léger derrière les caractères : la forme de la lettre se lit d'un coup d'œil
    for (const q of pts) {
      ctx.globalAlpha = q.a * 0.13;
      ctx.fillStyle = q.vert ? COL.vert : COL.texte;
      ctx.setTransform(q.sx, 0, 0, q.s, q.x, q.y);
      ctx.fillRect(-mot.cw / 2 - 0.5, -mot.chh / 2 - 0.5, mot.cw + 1, mot.chh + 1);
    }
    // franges rouge / cyan (fortes pendant la déchirure, légères ensuite : un signal crypté)
    const dxF = 1.5 + 14 * (o.dechire || 0);
    ctx.globalCompositeOperation = 'lighter';
    for (const [col, sens] of [['rgba(255,50,90,', -1], ['rgba(60,230,255,', 1]]) {
      ctx.fillStyle = col + (0.3 + 0.35 * (o.dechire || 0)) + ')';
      for (const q of pts) {
        ctx.globalAlpha = q.a;
        ctx.setTransform(q.sx, 0, 0, q.s, q.x + sens * dxF * q.s, q.y);
        ctx.fillText(q.ch, 0, 0);
      }
    }
    ctx.globalCompositeOperation = 'source-over';
    for (const q of pts) {
      ctx.globalAlpha = q.a;
      ctx.fillStyle = q.vert ? COL.vert : (q.bord ? '#ffffff' : (o.couleur || COL.texte));
      ctx.setTransform(q.sx, 0, 0, q.s, q.x, q.y);
      ctx.fillText(q.ch, 0, 0);
    }
    ctx.restore();
  }

  // ------------------------------------------------------------------ logos d'IA dessinés (pastilles « boutons »)
  const IMG = {};
  function chargeImage(nom, src) {
    const im = new Image();
    im.src = src;
    IMG[nom] = im;
    return im.decode().catch(() => null);
  }
  // les logos « en dessin » (même dessin que alignement/logos.js, validé par l'utilisateur) : pastille-bouton crème
  // cerclée d'encre, logo dans un repère -50 → 50. u (0 → 1) : le logo se dessine, trait par trait, puis se remplit.
  function logoDessin(ctx, nom, r, u = 1) {
    const v = clamp((u - 0.25) / 0.75);                // avancée du trait
    const plein = clamp(v * 1.6 - 0.45);               // les aplats arrivent après le trait
    const trait = (L) => ctx.setLineDash(v >= 1 ? [] : [v * L, L]);
    ctx.save();
    // le bouton : tranche plus sombre dessous, face crème, cercle d'encre qui se trace
    ctx.globalAlpha *= clamp(u * 4);
    ctx.fillStyle = '#b9b2a2';
    ctx.beginPath(); ctx.arc(0, r * 0.13, r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = COL.creme;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = COL.encre;
    ctx.lineWidth = r * 0.07;
    ctx.beginPath(); ctx.arc(0, 0, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * clamp(u * 2.2)); ctx.stroke();
    const k = r / 62;
    ctx.scale(k, k);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const a0 = ctx.globalAlpha;
    if (nom === 'chatgpt') {
      ctx.strokeStyle = COL.encre; ctx.lineWidth = 6; trait(140);
      for (let i = 0; i < 6; i++) {
        ctx.save(); ctx.rotate(i * Math.PI / 3); ctx.translate(10, 0);
        ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(-9, -40, 22, 46, 11); else ctx.rect(-9, -40, 22, 46); ctx.stroke();
        ctx.restore();
      }
    } else if (nom === 'claude') {
      const R = mulberry32(12);
      ctx.strokeStyle = '#D97757'; ctx.lineWidth = 9; trait(40);
      for (let i = 0; i < 12; i++) {
        const a = i / 12 * Math.PI * 2 + (R() - 0.5) * 0.12, l = 30 + R() * 12;
        ctx.beginPath(); ctx.moveTo(Math.cos(a) * 5, Math.sin(a) * 5); ctx.lineTo(Math.cos(a) * l, Math.sin(a) * l); ctx.stroke();
      }
      ctx.globalAlpha = a0 * plein;
      ctx.fillStyle = '#D97757'; ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI * 2); ctx.fill();
    } else if (nom === 'gemini') {
      const g = ctx.createLinearGradient(-44, -44, 44, 44);
      g.addColorStop(0, '#4796E3'); g.addColorStop(1, '#9B72CB');
      const p = new Path2D('M 0 -44 C 4 -12 12 -4 44 0 C 12 4 4 12 0 44 C -4 12 -12 4 -44 0 C -12 -4 -4 -12 0 -44 Z');
      ctx.globalAlpha = a0 * plein; ctx.fillStyle = g; ctx.fill(p);
      ctx.globalAlpha = a0; ctx.strokeStyle = COL.encre; ctx.lineWidth = 3.5; trait(260); ctx.stroke(p);
    } else if (nom === 'grok') {
      ctx.strokeStyle = COL.encre; ctx.lineWidth = 9; trait(200);
      ctx.stroke(new Path2D('M 22 -26 A 34 34 0 1 0 28 20'));
      ctx.beginPath(); ctx.moveTo(-36, 36); ctx.lineTo(38, -38); ctx.stroke();
    } else if (nom === 'deepseek') {
      const p = new Path2D('M -40 6 C -40 -18 -8 -26 16 -14 C 26 -9 30 -2 34 -12 C 38 -24 44 -30 46 -22 C 42 -14 40 -4 34 4 C 26 20 4 28 -14 26 C -30 24 -40 18 -40 6 Z');
      ctx.globalAlpha = a0 * plein; ctx.fillStyle = '#4D6BFE'; ctx.fill(p);
      ctx.globalAlpha = a0; ctx.strokeStyle = COL.encre; ctx.lineWidth = 4; trait(280); ctx.stroke(p);
      ctx.globalAlpha = a0 * plein * 0.8;
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 4; ctx.setLineDash([]);
      ctx.stroke(new Path2D('M -30 12 C -16 22 6 22 22 10'));
      ctx.globalAlpha = a0 * plein;
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-18, -4, 4.5, 0, Math.PI * 2); ctx.fill();
    } else if (nom === 'mistral') {                    // le « M » en pixels, posé rangée par rangée
      const rows = ['X...X', 'XX.XX', 'XXXXX', 'X.X.X', 'X...X'];
      const cols = ['#FFD800', '#FFAF00', '#FF8205', '#FA500F', '#E10500'];
      rows.forEach((row, ri) => [...row].forEach((c, ci) => {
        if (c !== 'X') return;
        const w = clamp(v * 5 - ri);
        if (w <= 0) return;
        ctx.fillStyle = cols[ri]; ctx.fillRect(-40 + ci * 16, -40 + ri * 16 + 15 * (1 - w), 15, 15 * w);
      }));
    } else if (nom === 'meta') {
      const g = ctx.createLinearGradient(-44, 0, 44, 0);
      g.addColorStop(0, '#0064E0'); g.addColorStop(1, '#0082FB');
      ctx.strokeStyle = g; ctx.lineWidth = 9; trait(330);
      ctx.beginPath();
      for (let i = 0; i <= 64; i++) {
        const a = i / 64 * Math.PI * 2, s = Math.sin(a);
        const x = 42 * Math.cos(a) / (1 + s * s), y = 42 * Math.sin(a) * Math.cos(a) / (1 + s * s) * 1.2;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    } else if (nom === 'suno' && IMG.suno) {           // l'icône de l'appli, qui s'ouvre en iris
      ctx.save();
      ctx.beginPath(); ctx.arc(0, 0, 50 * Math.max(0.01, v), 0, Math.PI * 2); ctx.clip();
      ctx.drawImage(IMG.suno, -50, -50, 100, 100);
      ctx.restore();
    } else if (nom === 'elevenlabs') {                 // les deux barres « II » qui montent
      ctx.fillStyle = COL.encre;
      const h = 68 * clamp(v * 1.3), h2 = 68 * clamp(v * 1.3 - 0.25);
      ctx.beginPath();
      if (ctx.roundRect) { ctx.roundRect(-20, 34 - h, 12, h, 4); ctx.roundRect(8, 34 - h2, 12, h2, 4); } else { ctx.rect(-20, 34 - h, 12, h); ctx.rect(8, 34 - h2, 12, h2); }
      ctx.fill();
    } else if (nom === 'midjourney') {                 // le voilier : la coque, puis les voiles se gonflent
      ctx.fillStyle = COL.encre;
      ctx.globalAlpha = a0 * clamp(v * 3);
      ctx.fill(new Path2D('M -38 24 L 38 24 C 30 36 -30 36 -38 24 Z'));
      ctx.save(); ctx.translate(0, 18); ctx.scale(1, clamp(v * 1.5 - 0.3)); ctx.translate(0, -18);
      ctx.globalAlpha = a0;
      ctx.fill(new Path2D('M -2 -40 C 18 -20 28 0 26 18 L -2 18 Z'));
      ctx.fill(new Path2D('M -8 -26 C -20 -10 -24 4 -24 18 L -8 18 Z'));
      ctx.restore();
    } else if (nom === 'perplexity') {
      ctx.strokeStyle = '#20808D'; ctx.lineWidth = 6; trait(180);
      ctx.beginPath();
      ctx.moveTo(0, -40); ctx.lineTo(0, 40);
      ctx.moveTo(-30, -30); ctx.lineTo(0, -8); ctx.lineTo(30, -30);
      ctx.moveTo(-30, 30); ctx.lineTo(0, 8); ctx.lineTo(30, 30);
      ctx.rect(-30, -14, 60, 28);
      ctx.stroke();
    } else if (nom === 'huggingface') {
      ctx.globalAlpha = a0 * plein; ctx.fillStyle = '#FFD21E';
      ctx.beginPath(); ctx.arc(0, -4, 38, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = a0; ctx.strokeStyle = COL.encre; ctx.lineWidth = 4; trait(250);
      ctx.beginPath(); ctx.arc(0, -4, 38, 0, Math.PI * 2); ctx.stroke();
      ctx.lineWidth = 5; trait(30);
      ctx.beginPath(); ctx.arc(-14, -12, 7, Math.PI, 0); ctx.stroke();
      ctx.beginPath(); ctx.arc(14, -12, 7, Math.PI, 0); ctx.stroke();
      ctx.globalAlpha = a0 * plein;
      ctx.fillStyle = '#3B2412'; ctx.beginPath(); ctx.arc(0, 4, 14, 0, Math.PI); ctx.fill();
      ctx.fillStyle = '#FFD21E'; ctx.setLineDash([]);
      [[-30, 22], [30, 22]].forEach(([x, y]) => { ctx.beginPath(); ctx.ellipse(x, y, 13, 10, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); });
    }
    ctx.restore();
  }

  // ------------------------------------------------------------------ la surface : ligne, balle, lettres, logos
  const Y_LIGNE = 1290;
  const LOGOS = P.logos;
  const R_LOGO = 82;
  const GRILLE = LOGOS.map((n, i) => ({ x: 165 + (i % 4) * 250, y: 800 + Math.floor(i / 4) * 190 }));
  const RANGEE = LOGOS.map((n, i) => ({ x: 67 + i * 86.0, y: Y_LIGNE - 40 }));

  // la ligne se trace, rebondit sous les chocs (trampoline), vibre pendant la montée
  function ligne(ctx, t, f) {
    const t0 = ev1('ligne_trace').t;
    if (t < t0) return;
    const tLigne = ev1('ligne').t, tSurf = ev1('surface').t;
    if (t > tSurf + 0.25) return;
    const trace = expoOut((t - t0) / 0.14);
    const chocs = evs('balle').concat([ev1('balle_ecrase')]).map((e, i) => ({ t: e.t, x: BALLE_X[i + 1], a: i === 3 ? 34 : 22 }));
    evs('coule').forEach((e) => chocs.push({ t: e.t + 0.12, x: RANGEE[e.index].x, a: 16 }));
    const montee = t >= tLigne ? clamp((t - tLigne) / (tSurf - tLigne)) : 0;
    const dc = Math.floor(t / (BEAT / 4));
    ctx.save();
    ctx.globalAlpha = 1 - clamp((t - tSurf) / 0.25);
    ctx.strokeStyle = COL.texte;
    ctx.lineWidth = 3;
    ctx.shadowColor = 'rgba(191,255,217,0.8)';
    ctx.shadowBlur = 14;
    ctx.beginPath();
    for (let i = 0; i <= 216; i++) {
      const x = i * 5;
      if (x > W * trace) break;
      let y = Y_LIGNE;
      for (const c of chocs) {
        const age = t - c.t;
        if (age < 0 || age > 0.9) continue;
        const g = (x - c.x) / 95;
        y += c.a * Math.exp(-g * g) * Math.exp(-age * 7) * Math.cos(age * 40);
      }
      if (montee > 0) {
        const env = Math.sin(Math.PI * i / 216);
        y += (6 + 70 * montee * montee) * env * (Math.sin(i * 0.31 + dc * 1.7) * 0.6 + (hash(i, dc) - 0.5) * 0.9);
      }
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.restore();
  }

  // la balle verte : tombe, rebondit sur chaque temps (elle joue la mélodie), s'écrase et devient le premier mot
  const R_BALLE = 30;
  const BALLE_X = [210, 300, 400, 480, 540];
  function balle(ctx, t, f) {
    const chocs = evs('balle').map((e) => e.t).concat([ev1('balle_ecrase').t]);
    const fin = chocs[3];
    if (t > fin + 0.35) return;
    const yb = Y_LIGNE - R_BALLE;
    let x, y, sx = 1, sy = 1;
    if (t < chocs[0]) {
      const u = t / chocs[0];
      x = lerp(BALLE_X[0], BALLE_X[1], u); y = lerp(-80, yb, u * u); sy = 1 + 0.25 * u * u; sx = 1 / sy;
    } else if (t < fin) {
      let i = 0;
      while (i < 2 && t >= chocs[i + 1]) i++;
      const u = (t - chocs[i]) / (chocs[i + 1] - chocs[i]);
      const haut = [430, 330, 250][i];
      x = lerp(BALLE_X[i + 1], BALLE_X[i + 2], u);
      y = yb - 4 * haut * u * (1 - u);
      const v = Math.abs(1 - 2 * u);
      sy = 1 + 0.18 * v * v; sx = 1 / sy;
    } else {
      x = BALLE_X[4]; y = yb + R_BALLE * 0.85;
    }
    // écrasement au contact
    for (let i = 0; i < chocs.length; i++) {
      const d = t - chocs[i];
      if (d >= 0 && d < 0.07) {
        const k = 1 - d / 0.07;
        sx = lerp(sx, i === 3 ? 3.2 : 1.45, k); sy = lerp(sy, i === 3 ? 0.18 : 0.62, k);
        y = yb + R_BALLE * (1 - sy) * 0.95;
      }
    }
    let alpha = 1;
    if (t >= fin) { const d = t - fin; sx = lerp(3.2, 5.5, clamp(d / 0.35)); sy = 0.16; alpha = 1 - clamp(d / 0.35); y = yb + R_BALLE * 0.85; }
    // traînée en pointillés (la trajectoire, comme un logiciel d'animation)
    ctx.save();
    ctx.fillStyle = 'rgba(238,244,241,0.35)';
    for (let k = 1; k <= 18; k++) {
      const tp = t - k * 0.03;
      if (tp < 0) break;
      const p = posBalle(tp, chocs, yb);
      if (!p) continue;
      ctx.globalAlpha = 0.5 * (1 - k / 18);
      ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
    // la balle
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y);
    ctx.scale(sx, sy);
    ctx.shadowColor = 'rgba(77,255,143,0.8)'; ctx.shadowBlur = 30;
    ctx.fillStyle = COL.vert;
    ctx.beginPath(); ctx.arc(0, 0, R_BALLE, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    // annotations des chocs : la note jouée (la balle joue la mélodie de la musique)
    evs('balle').concat([ev1('balle_ecrase')]).forEach((e, i) => {
      const d = t - e.t;
      if (d < 0 || d > 0.42) return;                    // une étiquette à la fois (un temps chacune)
      const a = clamp(d / 0.05) * (1 - clamp((d - 0.26) / 0.16));
      ctx.save();
      ctx.globalAlpha = a * 0.9;
      ctx.strokeStyle = 'rgba(238,244,241,0.6)'; ctx.lineWidth = 2;
      const xi = BALLE_X[i + 1];
      ctx.beginPath(); ctx.moveTo(xi, Y_LIGNE + 10); ctx.lineTo(xi + 26, Y_LIGNE + 48); ctx.lineTo(xi + 120, Y_LIGNE + 48); ctx.stroke();
      ctx.font = `500 26px ${MONO}`; ctx.textAlign = 'left'; ctx.fillStyle = COL.texte;
      ctx.fillText(nomNote(e.note).toUpperCase(), xi + 32, Y_LIGNE + 40);
      ctx.restore();
      // onde sur la ligne
      ctx.save();
      ctx.globalAlpha = (1 - clamp(d / 0.4)) * 0.7;
      ctx.strokeStyle = COL.vert; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(xi, Y_LIGNE, 20 + d * 260, 6 + d * 40, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    });
  }
  function posBalle(t, chocs, yb) {
    if (t < chocs[0]) { const u = t / chocs[0]; return { x: lerp(BALLE_X[0], BALLE_X[1], u), y: lerp(-80, yb, u * u) }; }
    if (t >= chocs[3]) return null;
    let i = 0;
    while (i < 2 && t >= chocs[i + 1]) i++;
    const u = (t - chocs[i]) / (chocs[i + 1] - chocs[i]);
    return { x: lerp(BALLE_X[i + 1], BALLE_X[i + 2], u), y: yb - 4 * [430, 330, 250][i] * u * (1 - u) };
  }

  // transformation d'une lettre qui jaillit de la ligne (ressort) ou tombe du haut (rebonds)
  function lettreJaillit(t, te, yMot) {
    const d = t - te;
    if (d < 0) return { a: 0 };
    const u = clamp(d / 0.32);
    const dy = (Y_LIGNE - yMot) * (1 - backOut(u, 2.4));
    const squash = d < 0.32 ? 1 : 1 + 0.18 * Math.exp(-(d - 0.32) * 14) * Math.cos((d - 0.32) * 40);
    return { dx: 0, dy, sx: 1 / squash, sy: squash, a: clamp(d / 0.06), rot: 0 };
  }
  function lettreTombe(t, te) {
    const chute = 0.24;
    const d = t - (te - chute);
    if (d < 0) return { a: 0 };
    if (d < chute) { const u = d / chute; return { dx: 0, dy: -700 * (1 - u * u), sx: 0.9, sy: 1.15, a: 1, rot: 0 }; }
    const da = d - chute;
    const hop = Math.abs(Math.sin(da * 16)) * 26 * Math.exp(-da * 7);
    const sq = da < 0.06 ? lerp(0.7, 1, da / 0.06) : 1;
    return { dx: 0, dy: -hop, sx: 1 / sq, sy: sq, a: 1, rot: 0 };
  }
  // sortie : les mots tombent (gravité), légèrement en rotation
  function sortieChute(t, ts, i, n) {
    const d = t - ts - i * 0.02;
    if (d <= 0) return null;
    return { dy: 1800 * d * d * 2.2, rot: (i - n / 2) * 0.12 * d, a: 1 - clamp(d / 0.45) };
  }

  const ETAPES = {};
  function prepareEtapes() {
    const lettres = (mot) => evs('lettre').filter((e) => e.mot === mot);
    ETAPES.chaque = lettres('CHAQUE');
    ETAPES.semaine = lettres('SEMAINE,');
    ETAPES.regarde = lettres('REGARDE');
    const cr = evs('crypte');
    ETAPES.cIA = cr[0]; ETAPES.cSurface = cr[1]; ETAPES.cPlonge = cr[2];
    const et = evs('etire');
    ETAPES.eActu = et[0]; ETAPES.eMonde = et[1];
    // « DE NOUVELLES ACTUS » sur deux lignes : le pluriel se lit d'un coup d'œil
    const tx = ETAPES.eActu.texte, cut = tx.lastIndexOf(' ');
    ETAPES.actu = [tx.slice(0, cut), tx.slice(cut + 1)];
    ETAPES.mIA = prepareMot("SUR L'IA.", 205);
    ETAPES.mSurface = prepareMot('LA SURFACE.', 158);
    ETAPES.mPlonge = prepareMot('ON PLONGE.', 160);
  }

  // une phrase qui s'étire comme un élastique : elle part d'un trait, file trop loin, revient (sur le « boing »)
  function etirement(d) {
    const s = d <= 0 ? 0.02 : 0.02 + 0.98 * elasticOut(d / 0.62);
    return { etire: s, etireLettre: Math.max(0.05, s), sy: clamp(1 / Math.sqrt(Math.max(s, 0.05)), 0.8, 1.9) };
  }
  // composer une sortie (chute) avec la transformation d'entrée d'une lettre
  function avecSortie(L, o) {
    if (!o) return L;
    return { ...L, dy: (L.dy || 0) + o.dy, rot: o.rot, a: (L.a === undefined ? 1 : L.a) * o.a };
  }

  function surface(t, f) {
    const tB2 = ev1('etire').t;                       // 3,2 s
    const tEclat = ev1('eclat').t;                    // 4,8 s
    const tSurf = ev1('surface_ligne').t;             // 6,4 s
    const tNous = ev1('mot').t;                       // 8,0 s
    const tSurface = ev1('surface').t, tp = ev1('plongeon').t;
    // fond : le champ de points noir et blanc, qui bat sur la musique
    const monte = expoOut(t / 0.55);
    const crete = lerp(H + 60, 1420, monte);
    const fadeChamp = 1 - smooth((t - tSurface) / 0.4);
    if (fadeChamp > 0) champPoints(bg, t, crete, 0.85 * fadeChamp, pulse(t, 0, tp));
    ligne(fg, t, f);
    balle(fg, t, f);
    const r = nappe(fg, t);
    const decalChute = r ? -1500 * Math.pow(r.kChute, 2.4) : 0;

    // mesure 1 : CHAQUE jaillit de la ligne, SEMAINE, tombe du haut ; à 3,2 s tout tombe (gravité)
    if (t >= ETAPES.chaque[0].t && t < tB2 + 0.6) {
      const out = (i, n) => (t >= tB2 ? sortieChute(t, tB2, i, n) : null);
      motPlein(fg, 'CHAQUE', W / 2, 820, 178, COL.texte, (i) => avecSortie(lettreJaillit(t, ETAPES.chaque[i].t, 820), out(i, 6)));
      motPlein(fg, 'SEMAINE,', W / 2, 1010, 160, COL.texte, (i) => avecSortie(lettreTombe(t, ETAPES.semaine[i].t), out(i + 6, 14)));
    }
    // mesure 2 : DE NOUVELLES / ACTUS s'étirent, « SUR L'IA. » se déchiffre (déchirure), rebondit, éclate en logos
    if (t >= tB2 && t < tEclat + 0.6) {
      const d = t - tB2;
      const sortie = t >= tEclat ? sortieChute(t, tEclat, 0, 1) : null;
      const [l1, l2] = ETAPES.actu;
      const e1 = etirement(d), e2 = etirement(d - 0.05);
      motPlein(fg, l1, W / 2, 640, 124, COL.texte, (i) => avecSortie({ dx: 0, dy: 0, sx: 1, sy: e1.sy, a: 1 }, sortie && sortieChute(t, tEclat, i, l1.length)), e1);
      motPlein(fg, l2, W / 2, 850, 232, COL.texte, (i) => avecSortie({ dx: 0, dy: 0, sx: 1, sy: e2.sy, a: d >= 0.05 ? 1 : 0 }, sortie && sortieChute(t, tEclat + 0.03, i, l2.length)), e2);
      const c = ETAPES.cIA, tc = c.t;
      if (t >= tc - 1 / FPS) {
        const dd = t - tc;
        const tr = ev1('rebond').t;
        let dy = -300 * (1 - expoOut(dd / 0.16)), sq = 1;
        if (dd < 0.08) sq = lerp(0.72, 1, dd / 0.08);
        if (t >= tr) { const dr = t - tr; dy -= Math.max(0, 50 * Math.sin(Math.PI * clamp(dr / 0.3))); if (dr < 0.06) sq = lerp(0.85, 1, dr / 0.06); }
        const pops = evs('logo_ia');
        motCaracteres(fg, ETAPES.mIA, W / 2, 1065 + dy, {
          f, decode: clamp(dd / 0.22), dechire: 1 - clamp(dd / 0.2), accent: 4,
          lettre: () => ({ dx: 0, dy: 0, sx: 1 / sq, sy: sq, a: 1 }),
          eclat: t >= tEclat ? t - tEclat : 0,
          // chaque grain rejoint un logo et y arrive pile quand ce logo apparaît (sur sa note)
          cibleEclat: (cell) => { const j = cell.k % LOGOS.length; return { x: GRILLE[j].x, y: GRILLE[j].y, duree: 0.12 + pops[j].t - tEclat }; },
        });
      }
    }
    // mesures 3-4 : TOUT LE MONDE s'étire, REGARDE tombe, les logos se dessinent, LA SURFACE., les logos se posent
    const dissout = t >= tNous - 0.2 ? clamp((t - (tNous - 0.2)) / 0.25) : 0;
    if (t >= tEclat && dissout < 1) {
      const d = t - tEclat;
      const e = etirement(d);
      motPlein(fg, 'TOUT LE MONDE', W / 2, 330, 118, COL.texte, () => ({ dx: 0, dy: -dissout * 220, sx: 1, sy: e.sy, a: 1 - dissout }), e);
      motPlein(fg, 'REGARDE', W / 2, 490, 142, COL.texte, (i) => {
        const L = lettreTombe(t, ETAPES.regarde[i].t);
        return { ...L, dy: (L.dy || 0) - dissout * 220, a: (L.a === undefined ? 1 : L.a) * (1 - dissout) };
      });
      const c = ETAPES.cSurface;
      if (t >= c.t - 1 / FPS) {
        const dd = t - c.t;
        motCaracteres(fg, ETAPES.mSurface, W / 2, 630 - dissout * 220, {
          f, decode: clamp(dd / 0.22), dechire: 1 - clamp(dd / 0.2), alpha: 1 - dissout,
          lettre: (i) => ({ dx: 0, dy: dd < 0.4 ? -Math.max(0, 40 * Math.sin(Math.PI * clamp((dd - i * 0.02) / 0.3))) : 0, sx: 1, sy: 1, a: 1 }),
        });
      }
    }
    if (t >= tEclat && t < tp) logos(fg, t, f, decalChute);
    // mesure 5 : NOUS, / ON PLONGE. ; les logos coulent ; la ligne vibre, devient la mer ; on tombe dedans
    if (t >= tNous - 0.3 && t < tp) {
      motPlein(fg, 'NOUS,', W / 2, 760 + decalChute, 178, COL.texte, () => lettreTombe(t, tNous));
      const c = ETAPES.cPlonge;
      if (t >= c.t - 1 / FPS) {
        const dd = t - c.t;
        motCaracteres(fg, ETAPES.mPlonge, W / 2, 950 + decalChute, {
          f, decode: clamp(dd / 0.22), dechire: 1 - clamp(dd / 0.2), accent: 3,
          lettre: () => ({ dx: 0, dy: 0, sx: 1, sy: 1, a: 1 }),
        });
      }
    }
    coinsDiscrets(fg, t, f);
  }

  // les douze logos : se dessinent (grille), se posent sur la ligne (rangée), flottent, coulent
  function logos(ctx, t, f, decal) {
    const tSurf = ev1('surface_ligne').t;
    const pops = evs('logo_ia'), coule = evs('coule'), bouees = evs('bouee');
    LOGOS.forEach((nom, i) => {
      const tp = pops[i].t;
      if (t < tp) return;
      const d = t - tp;
      let s = backOut(clamp(d / 0.26), 2.2);
      let x = GRILLE[i].x, y = GRILLE[i].y + decal, r = R_LOGO;
      if (t >= tSurf) {                                   // vers la ligne (vol courbe, décalé selon l'index)
        const u = expoOut(clamp((t - tSurf - i * 0.018) / 0.34));
        x = lerp(GRILLE[i].x, RANGEE[i].x, u);
        y = lerp(GRILLE[i].y, RANGEE[i].y, u) - Math.sin(Math.PI * u) * 120 + decal;
        r = lerp(R_LOGO, 38, u);
      }
      // flottaison : la vague passe sur les temps
      let hop = 0;
      for (const b of bouees) {
        const db = t - (b.t + (i / LOGOS.length) * 0.12);
        if (db >= 0 && db < 0.35) hop = Math.max(hop, 34 * Math.sin(Math.PI * db / 0.35));
      }
      y -= hop;
      if (t >= tSurf + 0.3) y += 4 * Math.sin(t * 5 + i);
      // coule
      const ec = coule[i];
      let a = 1, rot = 0;
      if (t >= ec.t) {
        const dc = t - ec.t;
        y += 520 * dc * dc * 2 + 40 * dc;
        rot = (i % 2 ? 1 : -1) * dc * 1.4;
        a = 1 - clamp(dc / 0.5);
      }
      if (a <= 0) return;
      // anneau d'apparition
      if (d < 0.35 && t < tSurf) {
        ctx.save();
        ctx.globalAlpha = (1 - d / 0.35) * 0.8;
        ctx.strokeStyle = COL.vert; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(x, y, r * (1 + d * 2.2), 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
      }
      ctx.save();
      ctx.globalAlpha = a;
      ctx.translate(x, y);
      ctx.rotate(rot);
      ctx.scale(s, s * (1 + 0.12 * Math.exp(-d * 9) * Math.sin(d * 30)));
      logoDessin(ctx, nom, r, clamp(d / 0.34));
      ctx.restore();
      // reflet sous la ligne (la surface de l'eau)
      if (t >= tSurf + 0.2 && a > 0.2 && t < ec.t) {
        ctx.save();
        ctx.globalAlpha = 0.18 * a;
        ctx.translate(x, 2 * Y_LIGNE - y + 6 * Math.sin(t * 7 + i));
        ctx.scale(s, -s);
        logoDessin(ctx, nom, r);
        ctx.restore();
      }
    });
  }

  // nappe de points en perspective : la surface de l'eau ; la caméra bascule et tombe dedans
  function nappe(ctx, t) {
    const ts = ev1('surface').t, tc = ev1('chute').t, tp = ev1('plongeon').t;
    if (t < ts || t >= tp) return null;
    const kApp = smooth((t - ts) / 0.3);
    const kChute = clamp((t - tc) / (tp - tc));
    const pitch = -Math.pow(kChute, 2.4) * 1.25 - 0.05 * smooth((t - ts) / 0.4);
    const h = lerp(0.9, 0.05, Math.pow(kChute, 1.3));
    const F = 1100, cx = W / 2, cy = Y_LIGNE;
    const avance = (t - ts) * 3.0 + kChute * kChute * 6;
    const sp = Math.sin(pitch), cp = Math.cos(pitch);
    const seaux = Array.from({ length: NIV }, () => []);
    for (let zi = 0; zi < 150; zi++) {
      const Z = 0.25 * Math.pow(1.032, zi) + zi * 0.05;
      const dX = Math.max(0.05, Z * 0.034);
      const demi = (W / 2 + 40) / F * Z * 1.15 + 0.2;
      for (let X = -demi - (zi % 2) * dX / 2; X <= demi; X += dX) {
        const Y = 0.16 * Math.sin(0.6 * X + 1.6 * t) + 0.13 * Math.sin(0.8 * (Z + avance) - 2.2 * t) +
          0.06 * Math.sin(1.7 * (X + Z) + 3 * t);
        const dy = Y - h;
        const prof = dy * sp + Z * cp;
        if (prof < 0.15) continue;
        const vert = dy * cp - Z * sp;
        const sx = cx + F * X / prof, sy = cy - F * vert / prof;
        if (sx < -10 || sx > W + 10 || sy < -10 || sy > H + 10) continue;
        let v = (0.4 + 0.6 * (Y + 0.35) / 0.7) * Math.exp(-Z / 38) * kApp * 1.5;
        v = clamp(v * (1 + 1.2 * kChute));
        if (v < 0.04) continue;
        seaux[Math.min(NIV - 1, Math.floor(v * NIV))].push(sx, sy, clamp(5.5 / prof, 1.3, 20));
      }
    }
    for (let i = 0; i < NIV; i++) {
      const s = seaux[i];
      if (!s.length) continue;
      ctx.fillStyle = teintes[i];
      ctx.beginPath();
      for (let j = 0; j < s.length; j += 3) ctx.rect(s[j] - s[j + 2] / 2, s[j + 1] - s[j + 2] / 2, s[j + 2], s[j + 2]);
      ctx.fill();
    }
    return { kChute };
  }

  function coinsDiscrets(ctx) {
    ctx.save();
    ctx.strokeStyle = 'rgba(238,244,241,0.45)';
    ctx.lineWidth = 3;
    const m = 44, L = 30;
    [[m, m, 1, 1], [W - m, m, -1, 1], [m, H - m, 1, -1], [W - m, H - m, -1, -1]].forEach(([x, y, sx, sy]) => {
      ctx.beginPath(); ctx.moveTo(x, y + sy * L); ctx.lineTo(x, y); ctx.lineTo(x + sx * L, y); ctx.stroke();
    });
    ctx.restore();
  }

  // ------------------------------------------------------------------ plongée : tableau de bord, DeepSeek, Suno
  function timecode(sec) {
    const fr = Math.max(0, Math.round(sec * FPS)), s = Math.floor(fr / FPS), ff = fr % FPS;
    const p = (n) => String(n).padStart(2, '0');
    return `00:00:${p(s)}:${p(ff)}`;
  }
  function profondeur(t) {
    const t0 = ev1('plongeon').t, t1 = ev1('sas').t;
    return 3812 * Math.pow(clamp((t - t0) / (t1 - t0)), 2.1);
  }
  function tableauBord(ctx, t, f) {
    let saut = 0;
    for (const e of evs('fouet')) if (t >= e.t && t < e.t + 3 / FPS) saut = (hash(f) - 0.5) * 18;
    ctx.save();
    ctx.translate(saut, 0);
    const x = W - 70, d = profondeur(t);
    ctx.strokeStyle = 'rgba(191,255,217,0.55)';
    ctx.lineWidth = 2;
    const off = (d * 2.0) % 40;
    for (let y = 300 - off; y < H - 300; y += 40) {
      const grand = Math.round((y + off) / 40) % 5 === 0;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - (grand ? 34 : 18), y); ctx.stroke();
    }
    ctx.beginPath(); ctx.moveTo(x, 300); ctx.lineTo(x, H - 300); ctx.stroke();
    ctx.fillStyle = 'rgba(5,9,11,0.6)';
    ctx.fillRect(x - 290, H / 2 - 44, 250, 70);
    ctx.strokeStyle = COL.vert;
    ctx.strokeRect(x - 290, H / 2 - 44, 250, 70);
    ctx.font = `500 40px ${MONO}`;
    ctx.textAlign = 'right';
    ctx.fillStyle = COL.vert;
    const n = Math.round(d);
    ctx.fillText('−' + (n >= 1000 ? Math.floor(n / 1000) + ' ' + String(n % 1000).padStart(3, '0') : String(n)) + ' m', x - 58, H / 2 + 6);
    ctx.font = `500 20px ${MONO}`;
    ctx.fillStyle = 'rgba(191,255,217,0.8)';
    ctx.fillText('PROFONDEUR', x - 58, H / 2 - 54);
    ctx.restore();
    const pings = evs('sonar');
    const actif = t >= pings[0].t;
    let dernier = null;
    for (const p of pings) if (t >= p.t) dernier = p;
    ctx.save();
    const rx = 140, ry = H - 230;
    ctx.strokeStyle = 'rgba(191,255,217,0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(rx, ry, 56, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(rx, ry, 28, 0, Math.PI * 2); ctx.stroke();
    if (actif) {
      const ang = (t * 4) % (Math.PI * 2);
      ctx.strokeStyle = COL.vert;
      ctx.beginPath(); ctx.moveTo(rx, ry); ctx.lineTo(rx + 56 * Math.cos(ang), ry + 56 * Math.sin(ang)); ctx.stroke();
      for (const p of pings) {
        const age = t - p.t;
        if (age < 0 || age > 0.6) continue;
        ctx.strokeStyle = `rgba(77,255,143,${1 - age / 0.6})`;
        ctx.beginPath(); ctx.arc(rx, ry, 10 + age * 160, 0, Math.PI * 2); ctx.stroke();
      }
    }
    // la baleine (DeepSeek) : le sonar accroche un contact, un point bleu sur l'écran radar
    const contact = fenetreDeepseek(t);
    if (contact) {
      const b = ecranObjet('baleine', t);
      const ang = b ? Math.atan2(b.y - H / 2, b.x - W / 2) : 0;
      ctx.fillStyle = (f % 6 < 4) ? '#7f95ff' : 'rgba(127,149,255,0.3)';
      ctx.beginPath(); ctx.arc(rx + 40 * Math.cos(ang), ry + 40 * Math.sin(ang), 6, 0, Math.PI * 2); ctx.fill();
    }
    ctx.font = `500 24px ${MONO}`;
    ctx.textAlign = 'left';
    ctx.fillStyle = contact ? '#9aabff' : actif ? COL.vert : 'rgba(238,244,241,0.6)';
    ctx.fillText(contact ? 'SONAR · CONTACT' : actif ? `SONAR · ACTIF${dernier && t - dernier.t < 0.15 ? ' · PING' : ''}` : 'SONAR · VEILLE', 222, ry + 9);
    // enregistrement (comme une caméra sous-marine)
    ctx.font = `500 26px ${MONO}`;
    ctx.fillStyle = (f % 30 < 18) ? '#ff3b3b' : 'rgba(255,59,59,0.25)';
    ctx.fillText('●', 80, 110);
    ctx.fillStyle = 'rgba(238,244,241,0.85)';
    ctx.fillText('REC', 112, 110);
    ctx.textAlign = 'right';
    ctx.fillText(timecode(t - ev1('plongeon').t), W - 80, 110);
    ctx.restore();
  }

  // position à l'écran d'un objet 3D (angle vu de la caméra → pixels ; objectif 19 mm, capteur 36 mm en hauteur)
  function ecranObjet(nom, t) {
    const rows = SPATIAL.objets[nom];
    if (!rows) return null;
    const i = Math.round((t - DEC) * FPS) - SPATIAL.premiere_image;
    if (i < 0 || i >= rows.length) return null;
    const [az, el, dist] = rows[i];
    const a = az * Math.PI / 180, e = el * Math.PI / 180;
    if (Math.abs(az) > 80) return null;
    return { x: W / 2 + (W / 2) * Math.tan(a) / 0.5329, y: H / 2 - (H / 2) * (Math.tan(e) / Math.cos(a)) / 0.9474, d: dist };
  }

  // DeepSeek : la baleine passe devant la caméra ; le sonar la verrouille et la balaie, et le logo (la baleine bleue)
  // apparaît sur elle en matrice de points, comme le reste de la DA ; il la suit, puis s'égrène quand elle sort du cadre
  let pointsDS = [];
  function prepareDeepseek() {
    const im = IMG.deepseek;
    if (!im || !im.width) return;
    const N = 60;
    const c = document.createElement('canvas');
    c.width = N; c.height = N;
    const x = c.getContext('2d');
    x.drawImage(im, 0, 0, N, N);
    const d = x.getImageData(0, 0, N, N).data;
    for (let gy = 0; gy < N; gy++) {
      for (let gx = 0; gx < N; gx++) {
        if (d[(gy * N + gx) * 4 + 3] > 120) pointsDS.push({ u: (gx + 0.5) / N - 0.5, v: (gy + 0.5) / N - 0.5, r: hash(gx, gy, 9) });
      }
    }
  }
  function fenetreDeepseek(t) {
    const e = ev1('deepseek');
    return t >= e.t - 0.05 && t < e.fin + 0.5;
  }
  function deepseek(ctx, t, f) {
    const e = ev1('deepseek');
    const t0 = e.t - 0.05, t1 = e.fin;
    if (!fenetreDeepseek(t)) return;
    const p = ecranObjet('baleine', t);
    if (!p) return;
    const taille = clamp(3600 / p.d, 280, 480);
    const cx = p.x, cy = p.y - taille * 0.1;
    const scan = clamp((t - t0) / 0.42);                // la ligne du sonar balaie le logo de haut en bas
    const sortie = clamp((t - t1) / 0.5);
    const ys = -0.55 + scan * 1.1;
    const cote = Math.max(2, (taille / 60) * 0.62);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    // verrouillage : quatre coins qui se resserrent sur la baleine
    const k = expoOut(clamp((t - t0) / 0.3));
    const demi = taille * lerp(0.95, 0.6, k);
    ctx.globalAlpha = 0.65 * (1 - sortie);
    ctx.strokeStyle = 'rgb(140,165,255)';
    ctx.lineWidth = 2;
    [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([sx, sy]) => {
      const x = cx + sx * demi, y = cy + sy * demi;
      ctx.beginPath(); ctx.moveTo(x, y - sy * 26); ctx.lineTo(x, y); ctx.lineTo(x - sx * 26, y); ctx.stroke();
    });
    // le logo en points bleus : plus vifs au passage de la ligne, puis ils filent avec la baleine
    for (const q of pointsDS) {
      if (q.v > ys) continue;
      const prox = scan < 1 ? Math.exp(-Math.abs(ys - q.v) * 16) : 0;
      let x = cx + q.u * taille, y = cy + q.v * taille;
      let a = (0.34 + 0.6 * prox) * (0.85 + 0.15 * Math.sin(t * 30 + q.r * 20));
      if (sortie > 0) {
        const u = clamp(sortie * 1.4 - q.r * 0.4);
        x += u * (140 + 260 * q.r); y -= u * (30 + 80 * q.r); a *= 1 - u;
      }
      if (a <= 0.02) continue;
      ctx.globalAlpha = a;
      ctx.fillStyle = prox > 0.45 ? '#c9d4ff' : '#4D6BFE';
      ctx.fillRect(x - cote / 2, y - cote / 2, cote, cote);
    }
    if (scan < 1) {
      const y = cy + ys * taille;
      const g = ctx.createLinearGradient(cx - taille * 0.75, 0, cx + taille * 0.75, 0);
      g.addColorStop(0, 'rgba(120,150,255,0)'); g.addColorStop(0.5, 'rgba(170,195,255,0.85)'); g.addColorStop(1, 'rgba(120,150,255,0)');
      ctx.globalAlpha = 1;
      ctx.fillStyle = g;
      ctx.fillRect(cx - taille * 0.75, y - 1.5, taille * 1.5, 3);
    }
    ctx.restore();
  }

  // les applis de musique IA : à chaque note du piano, une pastille sombre monte du piano (Suno d'abord)
  const APPLIS = {
    suno: null, udio: ['udio', '#1E1B4B'], stableaudio: ['stable audio', '#3B1F5C'], aiva: ['AIVA', '#0F2F3A'],
    mubert: ['mubert', '#2A1630'], elevenmusic: ['II music', '#111111'], riffusion: ['riffusion', '#2B1D10'],
    soundraw: ['SOUNDRAW', '#0C2433'],
  };
  function applisMusique(ctx, t, f) {
    for (const e of evs('appli_musique')) {
      const d = t - e.t;
      if (d < 0 || d > 1.6) continue;
      const p = ecranObjet('piano', e.t);
      if (!p) continue;
      const k = e.index;
      const cote = k % 2 ? 1 : -1;
      const x = p.x + cote * (90 + 60 * (k % 4)) * expoOut(d / 0.8) + 20 * Math.sin(d * 3 + k);
      const y = p.y - 120 - 260 * expoOut(d / 1.2) - 40 * d;
      const s = (k === 0 ? 136 : 86) * backOut(clamp(d / 0.25), 2.0);
      const lueur = Math.exp(-d * 5);
      const a = (0.42 + 0.42 * lueur) * (1 - clamp((d - 1.0) / 0.6));
      ctx.save();
      ctx.globalAlpha = a;
      ctx.translate(x, y);
      ctx.rotate(cote * 0.12 * d);
      // sombre et discret : une pastille foncée, à peine éclairée par la note
      ctx.shadowColor = `rgba(191,255,242,${0.6 * lueur})`;
      ctx.shadowBlur = 30 * lueur;
      if (e.logo === 'suno' && IMG.suno) {
        ctx.filter = `brightness(${0.42 + 0.48 * lueur}) saturate(0.75)`;
        ctx.drawImage(IMG.suno, -s / 2, -s / 2, s, s);
        ctx.filter = 'none';
      } else {
        const [nom, fond] = APPLIS[e.logo] || [e.logo, '#111'];
        ctx.fillStyle = fond;
        ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(-s / 2, -s / 2, s, s, s * 0.22); else ctx.rect(-s / 2, -s / 2, s, s);
        ctx.fill();
        ctx.strokeStyle = `rgba(191,255,242,${0.25 + 0.5 * lueur})`; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = `rgba(238,244,241,${0.7 + 0.3 * lueur})`;
        ctx.font = `700 ${Math.round(s * 0.2)}px ${TITRE}`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(nom, 0, 2);
      }
      ctx.restore();
    }
  }

  // ------------------------------------------------------------------ bureau : viseur de caméra (REC)
  function viseur(ctx, t, f) {
    const t0 = ev1('sas').t, t1 = ev1('logo_montee').t;
    if (t < t0 || t >= t1) return;
    const tRec = t0 + 0.55;
    const k = clamp((t - t0) / 0.2) * (1 - smooth((t - (t1 - 0.35)) / 0.3));
    if (k <= 0) return;
    ctx.save();
    ctx.globalAlpha = k;
    ctx.strokeStyle = 'rgba(255,255,255,0.92)';
    ctx.lineWidth = 5;
    const m = 70, L = 80;
    [[m, m + 40, 1, 1], [W - m, m + 40, -1, 1], [m, H - m - 40, 1, -1], [W - m, H - m - 40, -1, -1]].forEach(([x, y, sx, sy]) => {
      ctx.beginPath(); ctx.moveTo(x, y + sy * L); ctx.lineTo(x, y); ctx.lineTo(x + sx * L, y); ctx.stroke();
    });
    ctx.font = `500 34px ${MONO}`;
    ctx.textBaseline = 'middle';
    // ● REC (clignote une fois par seconde, à partir des bips)
    if (t >= tRec) {
      ctx.fillStyle = (Math.floor((t - tRec) * 2) % 2 === 0) ? '#ff2a2a' : 'rgba(255,42,42,0.15)';
      ctx.beginPath(); ctx.arc(m + 34, m + 104, 13, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffffff'; ctx.textAlign = 'left';
      ctx.fillText('REC', m + 58, m + 105);
      ctx.textAlign = 'left';
      ctx.fillText(timecode(t - tRec), m + 24, H - m - 104);
    } else {
      ctx.fillStyle = '#ffffff'; ctx.textAlign = 'left';
      ctx.fillText('STBY', m + 24, m + 105);
    }
    // batterie et format
    ctx.textAlign = 'right';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('1080p · 30', W - m - 24, m + 105);
    const bx = W - m - 110, by = m + 150;
    ctx.lineWidth = 3;
    ctx.strokeRect(bx, by - 14, 70, 28);
    ctx.fillRect(bx + 70, by - 6, 6, 12);
    for (let i = 0; i < 3; i++) ctx.fillRect(bx + 6 + i * 21, by - 9, 16, 18);
    // collimateur de mise au point
    const s = 70 + 6 * Math.sin(t * 6);
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(255,255,255,0.75)';
    [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([sx, sy]) => {
      const x = W / 2 + sx * s, y = H / 2 + sy * s;
      ctx.beginPath(); ctx.moveTo(x, y - sy * 22); ctx.lineTo(x, y); ctx.lineTo(x - sx * 22, y); ctx.stroke();
    });
    // vumètres gauche / droite (le vrai niveau de la bande-son à cette image)
    const nv = NIVEAUX[Math.round(t * FPS)] || [0, 0];
    ['L', 'R'].forEach((c, j) => {
      const y = H - m - 190 + j * 34;
      ctx.fillStyle = '#ffffff'; ctx.textAlign = 'left';
      ctx.font = `500 22px ${MONO}`;
      ctx.fillText(c, m + 24, y + 2);
      const n = Math.round(nv[j] * 20);
      for (let i = 0; i < 20; i++) {
        ctx.fillStyle = i < n ? (i > 16 ? '#ff3b3b' : i > 12 ? '#ffd23c' : '#4dff8f') : 'rgba(255,255,255,0.15)';
        ctx.fillRect(m + 54 + i * 15, y - 9, 11, 18);
      }
    });
    ctx.restore();
  }

  // ------------------------------------------------------------------ l'écran du bureau (homographie)
  function homographie(q) {
    const [[x0, y0], [x1, y1], [x2, y2], [x3, y3]] = q;
    const dx1 = x1 - x2, dx2 = x3 - x2, dx3 = x0 - x1 + x2 - x3;
    const dy1 = y1 - y2, dy2 = y3 - y2, dy3 = y0 - y1 + y2 - y3;
    const den = dx1 * dy2 - dx2 * dy1;
    const g = (dx3 * dy2 - dx2 * dy3) / den, h = (dx1 * dy3 - dx3 * dy1) / den;
    const a = x1 - x0 + g * x1, b = x3 - x0 + h * x3, c = x0;
    const d = y1 - y0 + g * y1, e = y3 - y0 + h * y3, ff = y0;
    const m = [a / W, d / W, 0, g / W, b / H, e / H, 0, h / H, 0, 0, 1, 0, c, ff, 0, 1];
    return `matrix3d(${m.map((v) => v.toFixed(9)).join(',')})`;
  }
  function ecranPose(t, f) {
    const tDrop = ev1('sas').t, tLogo = ev1('logo_montee').t;
    if (t < tDrop - 0.5 / FPS) { ecranEl.style.opacity = 0; return; }
    ecranEl.style.opacity = 1;
    const q = ECRAN && ECRAN.coins[String(f - Math.round(DEC * FPS))];
    ecranEl.style.transform = (t >= tLogo || !q) ? 'none' : homographie(q);
  }

  // ------------------------------------------------------------------ le logo final (dans l'écran, puis plein cadre)
  const cibles = [];
  const LOGO = { y: 860 };
  function prepareLogo() {
    const off = document.createElement('canvas');
    off.width = W; off.height = 400;
    const c = off.getContext('2d');
    c.font = `700 178px ${TITRE}`;
    if ('letterSpacing' in c) c.letterSpacing = '-5px';
    c.textBaseline = 'middle';
    const wP = c.measureText('PARANO').width, wI = c.measureText('-IA').width;
    const x0 = (W - wP - wI) / 2;
    c.fillStyle = '#fff'; c.fillText('PARANO', x0, 200);
    c.fillStyle = '#0f0'; c.fillText('-IA', x0 + wP, 200);
    const img = c.getImageData(0, 0, W, 400).data;
    const rnd = mulberry32(77);
    for (let y = 0; y < 400; y += 7) {
      for (let x = 0; x < W; x += 7) {
        const i = (y * W + x) * 4;
        if (img[i + 3] < 128) continue;
        cibles.push({ x, y: y - 200, vert: img[i] < 128, sx: rnd() * W, sy: 1350 + rnd() * 560, d: rnd() * 0.35 + (x / W) * 0.45 });
      }
    }
    LOGO.x0 = x0; LOGO.wP = wP;
  }
  function logoScene(t, f) {
    const tLogo = ev1('logo_montee').t, tHit = ev1('logo').t;
    lg.clearRect(0, 0, W, H);
    if (t < tLogo) {
      const g = lg.createLinearGradient(0, 0, W, H);
      g.addColorStop(0, 'rgba(255,255,255,0.10)'); g.addColorStop(0.35, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(255,255,255,0.03)');
      lg.fillStyle = g; lg.fillRect(0, 0, W, H);
      lg.fillStyle = 'rgba(0,0,0,0.10)';
      for (let y = (f * 3) % 6; y < H; y += 6) lg.fillRect(0, y, W, 2);
      return;
    }
    lg.fillStyle = COL.fond;
    lg.fillRect(0, 0, W, H);
    champPoints(lg, t, 1360 + 40 * Math.sin(t), 0.75, pulse(t, tLogo, DUR, 7), { pas: 18 });
    const k = clamp((t - tLogo) / (tHit - tLogo));
    if (t < tHit) {
      for (const p of cibles) {
        const u = cubicInOut(clamp((k - p.d * 0.6) / 0.55));
        const x = lerp(p.sx, p.x, u), y = lerp(p.sy, LOGO.y + p.y, u);
        lg.fillStyle = p.vert ? COL.vert : COL.texte;
        const r = lerp(3.5, 6.2, u);
        lg.globalAlpha = lerp(0.55, 1, u);
        lg.fillRect(x - r / 2, y - r / 2, r, r);
        lg.globalAlpha = 1;
      }
    } else {
      const age = t - tHit;
      lg.save();
      lg.font = `700 178px ${TITRE}`;
      if ('letterSpacing' in lg) lg.letterSpacing = '-5px';
      lg.textBaseline = 'middle';
      lg.textAlign = 'left';
      const dec = age < 0.1 ? 16 * (1 - age / 0.1) : 0;
      if (dec > 0) {
        lg.globalCompositeOperation = 'lighter';
        lg.fillStyle = 'rgba(255,40,80,0.6)'; lg.fillText('PARANO-IA', LOGO.x0 - dec, LOGO.y);
        lg.fillStyle = 'rgba(40,220,255,0.6)'; lg.fillText('PARANO-IA', LOGO.x0 + dec, LOGO.y);
        lg.globalCompositeOperation = 'source-over';
      }
      lg.shadowColor = 'rgba(77,255,143,0.6)';
      lg.shadowBlur = 30;
      lg.fillStyle = COL.texte; lg.fillText('PARANO', LOGO.x0, LOGO.y);
      lg.fillStyle = COL.vert; lg.fillText('-IA', LOGO.x0 + LOGO.wP, LOGO.y);
      lg.restore();
      const slogan = 'L\'IA SOUS ENQUÊTE';
      const n = Math.floor(clamp((age - 0.15) / 0.55) * slogan.length);
      lg.font = `500 48px ${MONO}`;
      if ('letterSpacing' in lg) lg.letterSpacing = '6px';
      lg.textAlign = 'center';
      lg.fillStyle = COL.menthe;
      lg.fillText(slogan.slice(0, n) + (n < slogan.length && f % 8 < 5 ? '▌' : ''), W / 2, LOGO.y + 150);
      if ('letterSpacing' in lg) lg.letterSpacing = '0px';
    }
  }
  function robot(t) {
    const t0 = ev1('logo').t + 0.42;
    const k = backOut(clamp((t - t0) / 0.5));
    const y = lerp(2450, 1680, k) + (t > t0 + 0.5 ? 10 * Math.sin((t - t0) * 3.2) : 0);
    robotPose.setAttribute('transform', `translate(540 ${y.toFixed(1)}) scale(1.55) rotate(${(2 * Math.sin(t * 2.1)).toFixed(2)})`);
    robotAntenne.setAttribute('transform', `rotate(${(6 * Math.sin(t * 9)).toFixed(2)} 22 -236)`);
  }

  // ------------------------------------------------------------------ juste sous la surface, éclairs, grain
  function surfaceSousEau(ctx, t) {
    const t0 = ev1('plongeon').t;
    const k = 1 - smooth((t - (t0 + 1.0)) / 0.6);
    if (t < t0 || k <= 0) return;
    ctx.save();
    const g = ctx.createLinearGradient(0, 0, 0, 900);
    g.addColorStop(0, `rgba(4,48,58,${0.62 * k})`); g.addColorStop(0.7, `rgba(4,48,58,${0.25 * k})`); g.addColorStop(1, 'rgba(4,48,58,0)');
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, 900);
    ctx.globalCompositeOperation = 'screen';
    ctx.lineWidth = 3;
    for (let i = 0; i < 26; i++) {
      const y0 = 40 + i * 26;
      ctx.strokeStyle = `rgba(190,255,245,${0.16 * k * (1 - i / 26)})`;
      ctx.beginPath();
      for (let x = 0; x <= W; x += 18) {
        const y = y0 + 9 * Math.sin(x * 0.013 + t * 3.1 + i * 1.7) + 5 * Math.sin(x * 0.031 - t * 2.3 + i);
        if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.restore();
  }
  const grains = [];
  function prepareGrain() {
    for (let k = 0; k < 6; k++) {
      const c = document.createElement('canvas');
      c.width = 540; c.height = 960;
      const x = c.getContext('2d');
      const im = x.createImageData(540, 960);
      const rnd = mulberry32(1000 + k);
      for (let i = 0; i < im.data.length; i += 4) {
        const v = 128 + (rnd() - 0.5) * 255;
        im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255;
      }
      x.putImageData(im, 0, 0);
      grains.push(c);
    }
  }
  function finition(ctx, t, f) {
    ctx.save();
    ctx.globalAlpha = 0.07;
    ctx.globalCompositeOperation = 'overlay';
    ctx.drawImage(grains[f % grains.length], 0, 0, W, H);
    ctx.restore();
    const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.32, W / 2, H / 2, H * 0.72);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,0.42)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    let blanc = 0;
    const tp = ev1('plongeon').t, ts = ev1('sas').t, tl = ev1('logo').t;
    if (t >= tp - 0.07 && t < tp) blanc = (t - (tp - 0.07)) / 0.07;
    if (t >= tp && t < tp + 0.22) blanc = 1 - (t - tp) / 0.22;
    if (t >= ts - 0.06 && t < ts) blanc = Math.max(blanc, 0.6 + 0.4 * (t - (ts - 0.06)) / 0.06);
    if (t >= ts && t < ts + 0.3) blanc = Math.max(blanc, 1 - (t - ts) / 0.3);
    if (t >= tl && t < tl + 0.12) blanc = Math.max(blanc, 0.55 * (1 - (t - tl) / 0.12));
    if (blanc > 0) {
      ctx.fillStyle = `rgba(240,255,250,${clamp(blanc)})`;
      ctx.fillRect(0, 0, W, H);
    }
  }

  // ------------------------------------------------------------------ image complète à l'instant t
  function dessiner(t) {
    t = clamp(t, 0, DUR - 1e-6);
    const f = Math.round(t * FPS);
    bg.clearRect(0, 0, W, H);
    fg.clearRect(0, 0, W, H);
    const tp = ev1('plongeon').t, ts = ev1('sas').t, tLogo = ev1('logo_montee').t;
    if (t < tp) {
      surface(t, f);
    } else if (t < ts) {
      surfaceSousEau(fg, t);
      deepseek(fg, t, f);
      applisMusique(fg, t, f);
      tableauBord(fg, t, f);
    } else if (t < tLogo) {
      viseur(fg, t, f);
    }
    ecranPose(t, f);
    if (t >= ts - 1 / FPS) logoScene(t, f);
    robot(t);
    finition(fg, t, f);
  }

  // ------------------------------------------------------------------ horloge et timeline (une seule, en pause)
  const horloge = { t: 0 };
  window.ABYSSE = {
    pret: Promise.all([
      document.fonts.load(`700 100px ${TITRE}`),
      document.fonts.load(`500 40px ${MONO}`),
      chargeImage('suno', 'assets/logos/suno.png'),
      chargeImage('deepseek', 'assets/logos/deepseek.png'),
    ]).then(() => {
      prepareTeintes();
      prepareGrain();
      prepareLogo();
      prepareEtapes();
      prepareDeepseek();
    }),
    timeline() {
      const tl = gsap.timeline({ paused: true });
      tl.to(horloge, { t: DUR, duration: DUR, ease: 'none', onUpdate: () => dessiner(horloge.t) }, 0);
      dessiner(0);
      return tl;
    },
  };
})();
