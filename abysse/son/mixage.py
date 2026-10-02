"""BANDE-SON de la bande-annonce ABYSSE (v2) → out/son/bande-son-brute.wav (48 kHz stéréo, durée exacte du film).

Tout part de partition.json : la musique est montée mesure par mesure, et chaque action de l'image joue sa note à
l'image près — la balle qui rebondit joue la mélodie de la musique, les lettres qui tombent font un arpège, chaque
logo a sa note, les logos qui coulent descendent la gamme, les mots qui se déchiffrent font une déchirure cryptée ;
sous l'eau, chaque objet du décor joue sa partie, placée dans l'espace d'après sa position vue de la caméra
(out/plates/spatial.json, exporté de Blender, en temps 3D = temps du film − decalage_3d).

Les trois « états » de la musique :
  clair    — la musique telle quelle ;
  sous_eau — on a plongé : la musique est restée au-dessus, étouffée, de plus en plus faible ;
  coque    — au fond, la musique de la station arrive à travers la coque… et le sas s'ouvre.

  python son/mixage.py        (pistes séparées dans out/son/pistes/, niveaux image par image dans assets/data/niveaux.js)
"""
import json
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import dsp as D                          # noqa: E402
from dsp import SR, db, place, hz        # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = json.load(open(os.path.join(ROOT, 'partition.json'), encoding='utf8'))
SFX = os.path.join(ROOT, 'media', 'sfx')
OUT = os.path.join(ROOT, 'out', 'son')
DUR = P['duree']
N = int(round(DUR * SR))
BAR, BEAT, FPS = P['mesure'], P['temps'], P['fps']
DEC = P['decalage_3d']                   # la 3D a été rendue 1,6 s plus tôt (v1)


def ev(kind=None, objet=None):
    return [e for e in P['evenements'] if (kind is None or e['type'] == kind) and (objet is None or e.get('objet') == objet)]


def ev1(kind, objet=None):
    return ev(kind, objet)[0]


def plan(pid):
    return next(p for p in P['plans'] if p['id'] == pid)


def sfx(name):
    return D.load(os.path.join(SFX, name + '.mp3'))


def boom(dur=1.3, k=2.6):
    """le BOOM généré tient 2 s à plein volume : on en fait un vrai impact (attaque, puis décroissance)"""
    x = sfx('BOOM')[:int(dur * SR)]
    t = np.arange(len(x)) / SR
    return D.fade(x * np.exp(-t * k)[:, None], 0.0, 0.15)


def kick808(freq, dur=0.55):
    """808 : attaque claquante, la hauteur tombe sur la fondamentale, saturation douce, longue queue grave"""
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = freq * (1 + 3.2 * np.exp(-t * 38))
    y = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 4.2)
    click = np.random.default_rng(int(freq)).standard_normal(n) * np.exp(-t * 700) * 0.25
    y = np.tanh((y + D.filt(click, 'hp', 3000)) * 2.2) * 0.75
    return D.fade(y, 0.0, 0.05)


SPATIAL = None


def az(obj, t):
    """angle (°) et distance de l'objet vu de la caméra à l'instant t du film (plongée et station seulement)"""
    global SPATIAL
    if SPATIAL is None:
        p = os.path.join(ROOT, 'out', 'plates', 'spatial.json')
        SPATIAL = json.load(open(p)) if os.path.exists(p) else {'premiere_image': 0, 'objets': {}}
    rows = SPATIAL['objets'].get(obj)
    if not rows:
        return 0.0, 6.0
    i = int(np.clip(round((t - DEC) * FPS) - SPATIAL['premiere_image'], 0, len(rows) - 1))
    return rows[i][0], rows[i][2]


def az_curve(obj, t0, n):
    ts = t0 + np.arange(n) / SR
    return np.array([az(obj, t)[0] for t in ts[::480]]).repeat(480)[:n]


def dist_gain(d, ref=5.0):
    return float(np.clip(ref / max(d, 1.0), 0.25, 1.4))


# ======================================================================= 1. la musique, montée et « mouillée »
def music_bus():
    sources = {}
    bus = np.zeros((N, 2))
    xf = int(0.008 * SR)
    for seg in P['musique']['montage']:
        f = seg['fichier']
        if f not in sources:
            sources[f] = D.load(os.path.join(ROOT, f))
        src = sources[f]
        a = int(round(seg['source'] * SR))
        n = int(round(seg['duree'] * SR))
        chunk = src[a:a + n + xf].copy()
        if len(chunk) < n + xf:
            chunk = np.vstack([chunk, np.zeros((n + xf - len(chunk), 2))])
        if seg['nom'] == 'intro':
            chunk *= db(3.5)                      # l'intro de B est plus douce : on la remonte (le master tasse)
        if seg['nom'] == 'bureau':
            chunk *= db(1.0)
        if seg['etat'] == 'sous_eau':
            chunk = underwater(chunk)
        elif seg['etat'] == 'coque':
            chunk = through_hull(chunk)
        chunk[:xf] *= np.linspace(0, 1, xf)[:, None]
        chunk[-xf:] *= np.linspace(1, 0, xf)[:, None]
        place(bus, chunk, seg['film'] - xf / SR / 2)
    return bus


def underwater(x):
    """la musique entendue d'en dessous : filtre qui se ferme d'un coup au plongeon puis encore en descendant,
    volume qui s'éloigne, image stéréo resserrée, ondulation de l'eau, réverbération sombre"""
    n = len(x)
    lp = D.env_curve([(0, 16000), (0.05, 950), (0.4, 700), (2.0, 430), (4.8, 260)], n)
    y = D.sweep(x, 'lp', lp, 0.9, order=2)
    y = D.filt(y, 'peak', 160, 0.8, 2.0)                       # le grave traverse l'eau
    y = D.width(y, 0.25)
    y = D.wobble(y, 2.2, 0.32)
    g = D.env_curve([(0, 1.0), (0.08, db(-3)), (1.6, db(-8)), (3.2, db(-17)), (4.4, db(-30)), (4.8, db(-60))], n)
    y = y * g[:, None]
    y = D.reverb(y, D.impulse(3.0, 2.6, 1800, 0.03, 0.8, seed=11), wet=0.45, dry=1.0)
    return y[:n]


def through_hull(x):
    """la musique de la station derrière sa coque : grave et étouffée, résonance métallique, de plus en plus fort"""
    n = len(x)
    lp = D.env_curve([(0, 280), (1.6, 420), (2.4, 700), (3.0, 1500), (3.2, 3200)], n)
    y = D.sweep(x, 'lp', lp, 1.1, order=2)
    y = D.filt(y, 'peak', 720, 1.6, 6.0)
    y = D.width(y, 0.35)
    g = D.env_curve([(0, db(-32)), (1.2, db(-22)), (2.4, db(-14)), (3.0, db(-9)), (3.2, db(-6))], n)
    y = y * g[:, None]
    y = D.reverb(y, D.impulse(1.2, 0.9, 2500, 0.01, 0.6, seed=12), wet=0.3)
    return y[:n]


# ======================================================================= 2. la plongée : nappes, battement, ambiance
def chords():
    """l'harmonie sous l'eau, en temps du film : on la cale sur le plongeon (la v1 plongeait à 8,0 s)"""
    d = ev1('plongeon')['t'] - 8.0
    base = [
        (8.25, 9.9, [50, 53, 57, 60, 64]),         # Rém9
        (9.6, 11.5, [46, 50, 53, 57]),             # Sib maj7
        (11.2, 13.1, [43, 46, 50, 53, 57]),        # Solm9
        (12.8, 13.9, [45, 49, 52, 57]),            # La  (do# la mi do# : la hook)
        (13.6, 14.7, [46, 50, 53, 57, 64]),        # Sib (sib la fa mi)
        (14.4, 16.3, [41, 45, 50, 53, 57]),        # Rém/Fa (le chœur)
        # la station : sa musique tourne autour de la (avec sib et mib qui grincent) → bourdon de la, sib qui pointe
        (16.0, 17.9, [45, 52, 57, 64]),
        (17.6, 19.2, [45, 52, 57, 58]),
    ]
    return [(a + d, b + d, n) for a, b, n in base]


def underwater_bus():
    bus = np.zeros((N, 2))
    t_sta = plan('P2')['debut']
    for i, (t0, t1, notes) in enumerate(chords()):
        cut = 850 if t0 < t_sta else 1100 + 900 * (t0 - t_sta) / 3
        p = D.pad(notes, t1 - t0 + 0.8, cutoff=cut, attack=1.0 if i == 0 else 0.45, release=0.8, seed=i)
        p = D.filt(p, 'hp', 120, 0.7)
        place(bus, p, t0, db(-13 if t0 < t_sta + 1.6 else -12))
    # battement grave (le cœur sous l'eau) sur les temps forts, qui accélère à l'approche de la station
    tp = ev1('plongeon')['t']
    beats = [tp + k * BAR for k in range(1, 5)] + [t_sta, t_sta + 0.8, t_sta + 1.6, t_sta + 2.0, t_sta + 2.4,
                                                     t_sta + 2.8, t_sta + 3.0]
    for t in beats:
        place(bus, D.sub_hit(73.4, 0.8), t, db(-9))
    # ambiance des profondeurs (boucle), qui s'assombrit, du plongeon jusqu'au sas
    ts = ev1('sas')['t']
    amb = sfx('AMBIANCE')
    amb = np.vstack([amb, amb])[:int((ts - tp + 0.2) * SR)]
    amb = D.filt(D.filt(amb, 'lp', 1400, 0.7), 'hp', 70, 0.7)
    L = len(amb) / SR
    g = D.env_curve([(0, 0), (0.4, 1), (L - 0.4, 1), (L, 0)], len(amb))
    place(bus, amb * g[:, None], tp, db(-17))
    return D.reverb(bus, D.impulse(3.2, 2.8, 2600, 0.02, 1.0, seed=21), wet=0.28)[:N]


# ======================================================================= 3. les interactions sous l'eau
CAVE = None


def cave():
    global CAVE
    if CAVE is None:
        CAVE = D.impulse(3.5, 3.0, 3200, 0.025, 1.0, seed=31)
    return CAVE


def wet(x, amount=0.4, ir=None):
    return D.reverb(x, ir if ir is not None else cave(), wet=amount)


def fx_bus():
    bus = np.zeros((N, 2))
    tp = ev1('plongeon')['t']
    # --- le plongeon
    place(bus, sfx('SPLASH_2'), tp - 0.40, db(-1))
    place(bus, D.filt(sfx('BULLES'), 'lp', 5000), tp + 0.05, db(-7))
    # --- bouée Hugging Face : sa cloche sonne (accordée sur ré)
    e = ev1('cloche')
    bell = D.filt(D.pitch(sfx('CLOCHE_1'), 2.24), 'lp', 3500, 0.7)
    a, d = az('cloche', e['t'])
    place(bus, wet(D.pan(bell, a), 0.5), e['t'], db(-5) * dist_gain(d, 4))
    # --- coups de fouet de la caméra : souffles d'eau qui traversent de gauche à droite
    for e in ev('fouet'):
        w = D.noise_sweep(0.42, 220, 1500, 1.0, seed=int(e['t'] * 10))
        place(bus, D.pan_moving(w, np.linspace(-70, 70, len(w))), e['t'] - 0.08, db(-9))
    # --- baleine (DeepSeek) : son chant suit sa trajectoire ; le scan du logo, discret, au-dessus
    e = ev1('chant')
    wh = D.filt(D.pitch(sfx('BALEINE_1'), -1.0), 'lp', 2600, 0.7)
    place(bus, wet(D.pan_moving(wh, az_curve('baleine', e['t'] - 0.15, len(wh))), 0.55), e['t'] - 0.15, db(-4))
    ps = sfx('PASSAGE')
    tpass = ev1('passage')['t'] - 0.3
    place(bus, D.pan_moving(ps, az_curve('baleine', tpass, len(ps))), tpass, db(-6))
    ds = ev1('deepseek')                                     # le sonar révèle le logo sur la baleine qui passe
    scan = D.noise_sweep(0.6, 300, 3200, 3.0, shape='hump', seed=77)
    place(bus, wet(D.pan(scan, az('baleine', ds['t'] + 0.2)[0]), 0.5), ds['t'] - 0.05, db(-20))
    for j, m in enumerate(ds['notes']):                      # trois petites notes de verre, une par croche
        place(bus, wet(D.pan(D.glass(hz(m), 1.4), az('baleine', ds['t'] + j * 0.2)[0]), 0.6), ds['t'] + j * 0.2,
              db(-21))
    for j in range(6):                                       # il s'égrène : des grains de verre qui filent avec elle
        g = D.glass(hz(98 - (j % 3) * 5), 0.35)
        place(bus, wet(D.pan(g, az('baleine', ds['fin'] + j * 0.06)[0]), 0.7), ds['fin'] + j * 0.06, db(-29))
    # --- voilier Midjourney : la coque grince
    e = ev1('grincement')
    a, d = az('voilier', e['t'] + 0.5)
    place(bus, wet(D.pan(D.filt(sfx('COQUE'), 'lp', 2500), a), 0.4), e['t'] - 0.2, db(-11))
    # --- plancton Gemini : notes de cristal (croches)
    rng = np.random.default_rng(7)
    for e in ev('etincelle'):
        a, _ = az('voilier', e['t'])
        place(bus, wet(D.pan(D.glass(hz(e['note']), 1.6), a + rng.uniform(-35, 35)), 0.55), e['t'], db(-13))
    # --- piano SUNO : la mélodie de la musique, touche par touche ; les applis de musique IA s'allument
    pn = D.normalize(D.trim_start(sfx('PIANO_1')), -1)
    for e in ev('touche'):
        note = D.fade(D.pitch(pn, e['note'] - 60)[:int(1.6 * SR)], 0.002, 0.3)
        note = D.wobble(D.filt(note, 'lp', 5200, 0.7), 1.0, 0.5, seed=e['index'])
        a, d = az('piano', e['t'])
        place(bus, wet(D.pan(note, a), 0.42), e['t'], db(-3))
    for e in ev('appli_musique'):
        a, _ = az('piano', e['t'])
        place(bus, wet(D.pan(D.glass(hz(e['note'] + 24), 0.9), a + 25), 0.6), e['t'] + 0.05, db(-24))
    # --- colonnes ElevenLabs : le chœur (ré mineur), qui frémit comme les colonnes
    e = ev1('choeur')
    ch = D.normalize(D.trim_start(sfx('CHOEUR_1')), -1)
    for k, m in enumerate(e['notes']):
        v = D.pitch(ch, m - 67)[:int(2.6 * SR)]
        n = len(v)
        trem = 1 - 0.25 * (0.5 + 0.5 * np.sin(2 * np.pi * 7.5 * np.arange(n) / SR + k))
        v = v * (D.env_curve([(0, 0), (0.18, 1), (1.6, 0.9), (2.6, 0)], n) * trem)[:, None]
        a, _ = az('colonne_0' if k % 2 == 0 else 'colonne_1', e['t'] + 0.4)
        place(bus, wet(D.pan(v, a + (-12 if k % 2 == 0 else 12)), 0.5), e['t'] - 0.05, db(-10))
    # --- étincelle Claude
    e = ev1('etincelle_claude')
    a, _ = az('claude', e['t'])
    place(bus, wet(D.pan(D.somme(D.glass(hz(74), 2.2), 0.5 * D.glass(hz(81), 2.2)), a), 0.5), e['t'], db(-8))
    place(bus, wet(D.pan(D.pad([53, 57, 60, 65], 1.4, cutoff=2200, attack=0.12, release=0.8, seed=40), a), 0.4),
          e['t'], db(-15))
    # --- la station : câble ∞ (Meta), LED (Mistral), verrou du sas (OpenAI), sonar
    e = ev1('boucle')
    w = D.noise_sweep(1.7, 400, 2600, 1.4, shape='hump', seed=9)
    place(bus, D.pan_moving(w, 75 * np.sin(2 * np.pi * (np.arange(len(w)) / SR) / 0.85)), e['t'], db(-12))
    for e in ev('led'):
        a, _ = az('panneau_led', e['t'])
        place(bus, wet(D.pan(D.blip(hz(e['note'] + 12)), a), 0.3), e['t'], db(-11))
    e = ev1('trappe')
    place(bus, wet(D.pan(sfx('TRAPPE'), az('sas', e['t'])[0]), 0.35), e['t'], db(-5))
    for e in ev('sonar'):
        k = e['index']
        p = D.pan(D.sonar_ping(hz(e['note']), 1.4, bright=0.6 + 0.04 * k), 0)
        echo = np.zeros((len(p) + int(0.5 * SR), 2))
        echo[:len(p)] += p
        for dly, g, side in ((0.19, 0.35, -1), (0.31, 0.22, 1), (0.46, 0.12, -1)):
            i = int(dly * SR)
            e2 = D.filt(p, 'lp', 2500) * g
            echo[i:i + len(p)] += D.width(e2[:, ::-1] if side < 0 else e2, 1.4)
        place(bus, wet(echo, 0.45), e['t'], db(-9 + 0.35 * k))
    # --- le sas s'ouvre : clac + souffle de pression + impact ; la caméra du bureau se met à tourner (bips)
    e = ev1('sas')
    place(bus, D.fade(sfx('SAS')[:int(1.0 * SR)], 0.0, 0.2), e['t'] - 0.15, db(-2))
    place(bus, boom(1.4, 2.2), e['t'], db(-6))
    for j in range(2):
        place(bus, D.bip(2400), e['t'] + 0.55 + j * 0.12, db(-17))
    return bus


# ======================================================================= 4. le motion design (surface et logo)
def md_bus():
    bus = np.zeros((N, 2))
    # --- 0 s : impact, la ligne se trace
    place(bus, boom(0.9, 3.5), 0.0, db(-6))
    place(bus, D.zip_(0.16), ev1('ligne_trace')['t'], db(-12))
    # --- la 808 sous la surface (B n'a pas de basse dans l'intro) : temps 1 et 3, la puis sib une mesure sur deux
    for bar in range(5):
        root = 55.0 if bar % 2 == 0 else 58.27
        for beat in (0, 2):
            if bar == 0 and beat == 0:
                continue                                    # 0 s : l'impact suffit
            place(bus, kick808(root), bar * BAR + beat * BEAT, db(-7 if beat == 0 else -9))
    # --- la balle : chaque rebond joue la note de la mélodie (marimba) + un petit choc
    for e in ev('balle'):
        x = (e['index'] - 1) * 30
        place(bus, D.pan(D.pluck(hz(e['note']), 0.9, 0.55, seed=e['index']), x), e['t'], db(-4))
        place(bus, D.pan(D.thump(95), x), e['t'], db(-8))
    e = ev1('balle_ecrase')
    place(bus, D.pluck(hz(e['note']), 1.2, 0.4, seed=9), e['t'], db(-4))
    place(bus, D.thump(70, 0.25), e['t'], db(-4))
    place(bus, D.noise_sweep(0.3, 1800, 300, 1.2, shape='decay', seed=12), e['t'], db(-14))
    # --- les lettres : un tic accordé chacune (arpège), placé de gauche à droite
    for e in ev('lettre'):
        n = len(e['mot'])
        x = -60 + 120 * e['index'] / max(1, n - 1)
        tic = D.somme(D.pluck(hz(e['note'] + 12), 0.25, 0.9, seed=100 + e['index']) * 0.8, D.pop(hz(e['note'] + 24), 0.04))
        place(bus, D.pan(tic, x), e['t'], db(-12))
    # --- les phrases qui s'étirent : élastique
    for e in ev('etire'):
        place(bus, D.boing(150, 620, 0.42, seed=3), e['t'], db(-11))
    # --- les mots qui se déchiffrent : déchirure cryptée
    for k, e in enumerate(ev('crypte')):
        place(bus, D.crypte(0.42, seed=k), e['t'] - 0.02, db(-7))
    for e in ev('rebond'):
        place(bus, D.thump(80, 0.18), e['t'], db(-8))
        place(bus, D.pluck(hz(62), 0.5, 0.5, seed=5), e['t'], db(-12))
    # --- « IA. » vole en éclats ; les logos apparaissent un par un (pop + note de l'arpège)
    e = ev1('eclat')
    for j in range(10):
        place(bus, D.pan(D.tick(0.03, seed=500 + j), (j - 5) * 14), e['t'] + j * 0.018, db(-16))
    for e in ev('logo_ia'):
        x = [-50, 0, 50][e['index'] % 3]
        place(bus, D.pan(D.somme(D.pluck(hz(e['note']), 0.5, 0.75, seed=200 + e['index']), D.pop(hz(e['note'] + 12))),
                         x), e['t'], db(-10))
    # --- les logos se posent sur la surface et flottent (gouttes accordées)
    e = ev1('surface_ligne')
    place(bus, D.noise_sweep(0.35, 2500, 500, 1.0, seed=31), e['t'] - 0.15, db(-13))
    for e in ev('bouee'):
        for j in range(3):                                     # la vague passe de gauche à droite
            place(bus, D.pan(D.goutte(hz(e['note'] + 12 + 2 * j)), -50 + 50 * j), e['t'] + j * 0.05, db(-13))
    # --- « NOUS, » ; les logos coulent un à un (gouttes qui descendent)
    place(bus, D.thock(), ev1('mot')['t'], db(-8))
    for e in ev('coule'):
        x = -60 + 120 * e['index'] / 11
        place(bus, D.pan(D.goutte(hz(e['note']), 0.3), x), e['t'], db(-12))
    e = ev1('surface')
    for j, m in enumerate((86, 93, 98)):
        place(bus, D.glass(hz(m), 1.2), e['t'] + j * 0.1, db(-21))
    e = ev1('chute')
    place(bus, D.noise_sweep(0.5, 2600, 280, 0.9, shape='rise', seed=6), e['t'] - 0.1, db(-7))
    # --- l'écran du bureau : un petit grésillement à chaque coupe
    for e in ev('coupe_ecran')[1:]:
        place(bus, D.tick(0.03, seed=400 + e['index']), e['t'], db(-21))
    # --- le logo : impact + le ping du sonar qui signe la fin
    e = ev1('logo')
    place(bus, boom(1.8, 1.6), e['t'], db(-7))
    place(bus, D.reverb(D.sonar_ping(hz(74), 2.4, 0.8), D.impulse(4.0, 3.5, 4000, 0.03, 1.0, seed=41), wet=0.6),
          e['t'] + 0.02, db(-9))
    return bus


# ======================================================================= master
def master(stems):
    tp, t_sta, ts = ev1('plongeon')['t'], plan('P2')['debut'], ev1('sas')['t']
    # sous l'eau, l'ambiance est plus douce (« une ambiance beaucoup plus douce ») ; le drop plus fort
    doux = D.env_curve([(0, 1), (tp + 1.2, 1), (tp + 1.8, db(-2.5)), (t_sta - 0.4, db(-2.5)), (t_sta + 0.2, 1),
                        (DUR, 1)], N)
    fort = D.env_curve([(0, 1), (ts - 0.05, 1), (ts, db(1.5)), (DUR, db(1.5))], N)
    stems = dict(stems)
    stems['plongee'] = stems['plongee'] * doux[:, None]
    stems['interactions'] = stems['interactions'] * doux[:, None]
    stems['musique'] = stems['musique'] * fort[:, None]
    mix = sum(stems.values())
    mix = D.filt(mix, 'hp', 28, 0.7)
    mix = D.compress(mix, thr_db=-16, ratio=2.2, attack=0.012, release=0.16, makeup_db=1.5)
    mix = D.limiter(mix, -1.2)
    n_fade = int(0.9 * SR)
    mix[-n_fade:] *= np.linspace(1, 0, n_fade)[:, None] ** 1.5
    return mix


def niveaux(mix):
    """niveau gauche/droite de chaque image (vumètres du viseur de caméra au bureau)"""
    spf = SR // FPS
    rows = []
    for f in range(int(DUR * FPS)):
        seg = mix[f * spf:(f + 1) * spf]
        r = np.sqrt(np.mean(seg ** 2, axis=0)) + 1e-9
        rows.append([round(float(np.clip((20 * np.log10(v) + 42) / 40, 0, 1)), 3) for v in r])
    with open(os.path.join(ROOT, 'assets', 'data', 'niveaux.js'), 'w', encoding='utf8') as f:
        f.write('window.NIVEAUX = ' + json.dumps(rows) + ';\n')


def main():
    os.makedirs(os.path.join(OUT, 'pistes'), exist_ok=True)
    stems = {}
    for name, fn in (('musique', music_bus), ('plongee', underwater_bus), ('interactions', fx_bus),
                     ('motion', md_bus)):
        print('piste', name, flush=True)
        stems[name] = fn()[:N]
        D.save(os.path.join(OUT, 'pistes', name + '.wav'), stems[name])
        print(f'   RMS {D.rms_db(stems[name]):.1f} dB, crête {20 * np.log10(np.abs(stems[name]).max() + 1e-9):.1f} dB')
    mix = master(stems)
    D.save(os.path.join(OUT, 'bande-son-brute.wav'), mix)
    niveaux(mix)
    print(f'mix : {len(mix) / SR:.2f} s, RMS {D.rms_db(mix):.1f} dB, crête {20 * np.log10(np.abs(mix).max()):.1f} dB')


if __name__ == '__main__':
    main()
