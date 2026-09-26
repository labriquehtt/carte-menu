// L'ALIGNEMENT DES SUSPECTS — quatre IA (évocations : ChatGPT, Gemini, Claude, DeepSeek), une par demi-temps,
// flash d'appareil photo à chaque coupe ; le robot détective les examine à la loupe au premier plan.
'use strict';
function suspect(parent, kind) {
  const s = g(parent);
  const body = g(s);
  const col = { gpt: '#EEF1F4', gem: '#DDE6FF', cla: '#F4E6DA', dsk: '#DCE8FF' }[kind];
  markup(body, `<rect x="-100" y="-40" width="200" height="260" rx="60" fill="${col}" stroke="${INK}" stroke-width="7"/>
    <rect x="-150" y="-20" width="50" height="170" rx="25" fill="${col}" stroke="${INK}" stroke-width="7"/><rect x="100" y="-20" width="50" height="170" rx="25" fill="${col}" stroke="${INK}" stroke-width="7"/>
    <rect x="-70" y="210" width="50" height="90" rx="20" fill="#3A3F4B" stroke="${INK}" stroke-width="6"/><rect x="20" y="210" width="50" height="90" rx="20" fill="#3A3F4B" stroke="${INK}" stroke-width="6"/>`);
  const head = g(s, { transform: 'translate(0 -150)' });
  if (kind === 'gpt') {
    markup(head, `<rect x="-120" y="-110" width="240" height="210" rx="60" fill="#10A37F" stroke="${INK}" stroke-width="8"/>`);
    const k = knot(head, 62, '#FFFFFF', '#FFFFFF'); attr(k, 'transform', 'translate(0 -5)');
  } else if (kind === 'gem') {
    const d = DEFS();
    if (!$('lnGem')) rectGrad(d, 'lnGem', [[0, '#4F8BFF'], [0.5, '#9B72FF'], [1, '#D96BFF']], 0, 0, 1, 1);
    markup(head, `<path d="M 0 -150 Q 14 -14 150 0 Q 14 14 0 150 Q -14 14 -150 0 Q -14 -14 0 -150 Z" fill="url(#lnGem)" stroke="${INK}" stroke-width="8" stroke-linejoin="round"/>
      <circle cx="-26" cy="-6" r="10" fill="${INK}"/><circle cx="26" cy="-6" r="10" fill="${INK}"/>`);
  } else if (kind === 'cla') {
    markup(head, `<circle cx="0" cy="0" r="120" fill="#FFF3EA" stroke="${INK}" stroke-width="8"/>
      <g fill="#D97757">${[...Array(12)].map((_, i) => `<rect x="-10" y="-100" width="20" height="78" rx="10" transform="rotate(${i * 30})"/>`).join('')}</g>
      <circle cx="0" cy="0" r="26" fill="#D97757"/><path d="M -40 60 Q 0 84 40 60" fill="none" stroke="${INK}" stroke-width="7" stroke-linecap="round"/>`);
  } else {
    markup(head, `<path d="M -140 20 Q -130 -90 0 -96 Q 110 -100 130 -30 L 180 -80 L 170 10 L 130 20 Q 100 100 -20 96 Q -130 90 -140 20 Z" fill="#4D6BFE" stroke="${INK}" stroke-width="8" stroke-linejoin="round"/>
      <circle cx="50" cy="-20" r="14" fill="#FFFFFF" stroke="${INK}" stroke-width="4"/><circle cx="54" cy="-20" r="6" fill="${INK}"/><path d="M -60 40 Q -10 60 60 40" fill="none" stroke="#FFFFFF" stroke-width="6" stroke-linecap="round" opacity="0.7"/>`);
  }
  // pancarte de l'identité judiciaire
  const plate = g(s, { transform: 'translate(0 90)' });
  markup(plate, `<path d="M -120 -110 L 0 -170 L 120 -110" fill="none" stroke="${INK}" stroke-width="4"/><rect x="-150" y="-110" width="300" height="100" rx="10" fill="#15161C" stroke="${INK}" stroke-width="6"/>`);
  const tx = mk('text', { x: 0, y: -46, 'text-anchor': 'middle', 'font-family': 'IBM Plex Mono', 'font-weight': 500, 'font-size': 46, fill: '#FFFFFF' }, plate);
  tx.textContent = { gpt: 'ChatGPT', gem: 'Gemini', cla: 'Claude', dsk: 'DeepSeek' }[kind];
  return s;
}

const LINEUP = {};
LINEUP.build = function (root) {
  const Lu = LINEUP;
  Lu.g = g(root);
  const d = DEFS();
  rectGrad(d, 'lnWall', [[0, '#2A3A44'], [1, '#1A2630']]);
  radGrad(d, 'lnSpot', [[0, '#FFF6D8', 0.55], [1, '#FFF6D8', 0]]);
  Lu.bg = g(Lu.g);
  mk('rect', { x: 0, y: 0, width: W, height: H, fill: 'url(#lnWall)' }, Lu.bg);
  for (let k = 0; k < 16; k++) { const y = 560 + k * 60; mk('path', { d: `M 0 ${y} L ${W} ${y}`, stroke: '#9FB3BF', 'stroke-width': k % 5 === 0 ? 5 : 2, opacity: 0.5 }, Lu.bg); }
  mk('ellipse', { cx: 640, cy: 900, rx: 520, ry: 700, fill: 'url(#lnSpot)' }, Lu.bg);
  mk('rect', { x: 0, y: 1520, width: W, height: 400, fill: '#10181E' }, Lu.bg);
  Lu.sus = ['gpt', 'gem', 'cla', 'dsk'].map(k => { const s = suspect(Lu.g, k); vis(s, false); return s; });
  Lu.rob = makeRobot(Lu.g);
  Lu.cap = makeCaption(Lu.g, ['ON', 'LES', 'A', 'TOUTES', '\n', "À", "L'ŒIL."], { size: 112, fill: GREEN, stroke: '#07140D', strokeW: 14 });
  Lu.flash = mk('rect', { x: 0, y: 0, width: W, height: H, fill: '#FFFFFF', opacity: 0 }, Lu.g);
  vis(Lu.g, false);
};
LINEUP.update = function (t) {
  const Lu = LINEUP, t0 = T_LINEUP, t1 = T_TITLE;
  const on = t >= t0 && t < t1 + 0.35;
  vis(Lu.g, on); if (!on) return;
  if (!Lu.laid) { Lu.cap.layout(); Lu.laid = true; }
  const half = BEAT / 2, k = Math.min(3, Math.floor((t - t0) / half)), local = t - t0 - k * half;
  Lu.sus.forEach((s, i) => {
    vis(s, i === k);
    if (i === k) { const z = 1.12 - 0.08 * E.out(clamp(local / half)); attr(s, 'transform', `translate(${r2(700 + (i % 2 ? -10 : 10))} ${r2(1060)}) scale(${r2(1.3 * z)}) rotate(${r2(i % 2 ? 2 : -2)})`); }
  });
  attr(Lu.flash, 'opacity', r2(Math.max(0, 1 - local / 0.09) * 0.85));
  // le détective, loupe à l'œil, au premier plan à gauche
  const lift = E.out(clamp((t - t0) / 0.2));
  poseRobot(Lu.rob, { x: 250, y: lerp(1900, 1420, lift), s: 1.35, rot: -4, face: k % 2 ? 'sceptique' : 'curieux', blink: 1, look: [14, -4], arms: ARMS.loupe, loupe: true, headRot: 4 });
  updateCaption(Lu.cap, t, t0 + 0.05, t1 - 0.02, 540, 400, { stagger: 0.04, from: 1.5 });
};
