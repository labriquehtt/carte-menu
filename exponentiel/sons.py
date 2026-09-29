#!/usr/bin/env python3
"""Bande-son d'EXPONENTIEL : bruitages placés depuis timing.json, musique, mixage final.

  PYTHONUTF8=1 python sons.py            → out/bruitages.wav, out/musique.wav, out/bande-son.wav (-14 LUFS)

Bruitages (table du BRIEF) : sons de LA SOURCE (../reel-la-source/media/sfx), 5 sons ElevenLabs (media/sfx_expo,
flow https://elevenlabs.io/app/flows/my2I2EZxu63yKmSuJ8Hr) et des sons synthétisés ici : l'exponentielle s'entend,
chaque doublement monte d'une octave (pops d'eau du P1, souffle de glisse du P3 au P5).
Voix devant ; bruitages 8 à 10 dB dessous, qui s'effacent quand elle parle (sidechain) ; musique GROOVE 118 BPM,
~20 dB sous la voix, étouffée dans le labo, coupée net sur « on est à quel jour ? », accord final sur le chapeau.
"""
import json
import os
import subprocess

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
SR = 44100
T = json.load(open(os.path.join(HERE, 'timing.json'), encoding='utf8'))
K = T['keys']
PL = {p['id']: p for p in T['plans']}
DUR = T['duration']
SFX = os.path.join(HERE, '..', 'reel-la-source', 'media', 'sfx')
SFX2 = os.path.join(HERE, 'media', 'sfx_expo')
FF = 'ffmpeg'
rng = np.random.default_rng(30)


def load(path, sr=SR):
    raw = subprocess.run([FF, '-v', 'error', '-i', path, '-ac', '2', '-ar', str(sr), '-f', 'f32le', '-'],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).reshape(-1, 2).copy()


def db(x):
    return 10 ** (x / 20)


class Track:
    def __init__(self):
        self.x = np.zeros((int(DUR * SR) + SR, 2), np.float32)

    def put(self, snd, t, gain_db=0.0, pan=0.0, fade_out=None, length=None):
        if snd.ndim == 1:
            snd = np.stack([snd, snd], 1)
        if length:
            snd = snd[:int(length * SR)]
        snd = snd * db(gain_db)
        if fade_out:
            n = min(len(snd), int(fade_out * SR))
            snd = snd.copy()
            snd[-n:] *= np.linspace(1, 0, n)[:, None]
        l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
        snd = snd * np.array([l, r], np.float32) * np.sqrt(2)
        i = int(t * SR)
        if i < 0:
            snd, i = snd[-i:], 0
        j = min(len(self.x), i + len(snd))
        self.x[i:j] += snd[:j - i]


def env(n, a=0.005, d=None):
    e = np.ones(n, np.float32)
    na = max(1, int(a * SR))
    e[:na] = np.linspace(0, 1, na)
    if d:
        e *= np.exp(-np.arange(n) / (d * SR))
    return e


def water_pop(freq):
    """« plop » d'eau : sinus dont la hauteur remonte vite (bulle), plus un petit bruit"""
    n = int(0.22 * SR)
    t = np.arange(n) / SR
    f = freq * (1 + 1.8 * (1 - np.exp(-t * 40)))
    ph = 2 * np.pi * np.cumsum(f) / SR
    s = np.sin(ph) * env(n, 0.002, 0.05)
    s += 0.15 * rng.standard_normal(n) * env(n, 0.001, 0.01)
    return (s * 0.6).astype(np.float32)


def whoosh(dur, f0, f1, amp=0.5):
    """souffle filtré dont la hauteur monte (glisse, vitesse)"""
    n = int(dur * SR)
    noise = rng.standard_normal(n).astype(np.float32)
    out = np.zeros(n, np.float32)
    y1 = y2 = 0.0
    for k in range(0, n, 256):                        # passe-bande qui glisse de f0 à f1 (résonateur 2 pôles)
        f = f0 * (f1 / f0) ** (k / n)
        r = 0.985
        c1, c2 = 2 * r * np.cos(2 * np.pi * f / SR), -r * r
        seg = noise[k:k + 256]
        o = np.empty_like(seg)
        for i, v in enumerate(seg):
            y = v * (1 - r) + c1 * y1 + c2 * y2
            y2, y1 = y1, y
            o[i] = y
        out[k:k + 256] = o
    e = np.sin(np.linspace(0, np.pi, n)) ** 1.5
    return (out / (np.abs(out).max() + 1e-9) * e * amp).astype(np.float32)


def tick(freq=2600):
    n = int(0.05 * SR)
    t = np.arange(n) / SR
    return (np.sin(2 * np.pi * freq * t) * env(n, 0.0005, 0.008) * 0.7).astype(np.float32)


def snap_string():
    """le fil qui se tend et s'arrache de l'eau : glissando + claquement"""
    n = int(0.6 * SR)
    t = np.arange(n) / SR
    f = 90 * 2 ** (t * 5)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, 0.01, 0.25) * 0.5
    s[:int(0.03 * SR)] += rng.standard_normal(int(0.03 * SR)) * 0.6
    return s.astype(np.float32)


def sfx(name):
    for d in (SFX2, SFX):
        p = os.path.join(d, name + '.mp3')
        if os.path.exists(p):
            return load(p)
    raise FileNotFoundError(name)


def bruitages():
    B = Track()
    has = lambda n: os.path.exists(os.path.join(SFX2, n + '.mp3'))
    # S01 ambiance d'étang (P1, P2, P7)
    if has('ETANG'):
        amb = sfx('ETANG')
        B.put(amb, 0.0, -14, fade_out=0.5)                              # 6 s d'ambiance : relayée une fois
        B.put(amb, 5.5, -14, length=PL['P2']['end'] + 0.3 - 5.5, fade_out=0.4)
    # S02 pops d'eau : les jours 1 → 20 en petites gouttes, puis un pop par doublement, une octave au-dessus à chaque fois
    for k in range(10):
        B.put(tick(3000 + 150 * k) * 0.35, 0.25 + k * (K['doublements_P1'][0] - 0.3) / 10, -16, pan=0.3 * np.sin(k))
    for k, tp in enumerate(K['doublements_P1']):
        f = 110 * 2 ** (k * 0.5)                      # 10 doublements sur 5 octaves (une octave tous les 2 : l'oreille suit)
        B.put(water_pop(min(f, 1800)), tp, -9 + 0.4 * k, pan=0.4 * np.sin(k * 1.7))
    # S03 étang plein : gerbe d'eau, barque soulevée
    B.put(sfx('DROP'), K['jour30'] - 0.02, -6)
    B.put(sfx('LAND_BIG'), K['jour30'] + 0.02, -10)
    B.put(sfx('WOOD'), K['jour30'] + 0.25, -12)
    # S04 rembobinage (deux fois, le 2e plus fort) + panneau de bois qui pivote
    if has('REWIND'):
        B.put(sfx('REWIND'), PL['P2']['start'] - 0.08, -11, length=0.7, fade_out=0.2)
        B.put(sfx('REWIND'), K['cinq_jours'] - 0.08, -7, length=1.0, fade_out=0.25)
    B.put(sfx('WOOD'), PL['P2']['start'] + 0.05, -13)
    B.put(sfx('WOOD'), K['cinq_jours'] + 0.1, -12)
    B.put(sfx('GLINT'), K['trois_pct'], -14)
    # S05 le fil s'arrache de l'eau, puis glisse qui monte d'une octave par panneau (METR)
    B.put(snap_string(), K['courbe'] - 0.1, -8)
    B.put(sfx('DROP'), K['courbe'] - 0.05, -12)
    t0, t1 = K['courbe'], PL['P5']['end']
    B.put(whoosh(t1 - t0, 180, 180 * 2 ** 3.5, 0.45), t0, -13)
    for k, ts in enumerate((8.35, K['quatre_mois'] + 0.5, K['deux_fois'])):
        B.put(sfx('SWISH'), ts, -12 + k, pan=0.6)
    # S06 labo
    if has('SERVEURS'):
        B.put(sfx('SERVEURS'), PL['P4']['start'] - 0.05, -13, length=PL['P4']['end'] - PL['P4']['start'] + 0.1, fade_out=0.2)
    B.put(sfx('ZOOM_IN'), K['auto'] - 0.2, -9)
    # S07 calendrier + montée + « braaam » sur « une seule »
    if has('PAGES'):
        B.put(sfx('PAGES'), PL['P5']['start'] + 0.2, -12, length=K['une_seule'] - PL['P5']['start'], fade_out=0.2)
    B.put(sfx('RISER'), K['une_seule'] - 3.3, -12, length=3.4, fade_out=0.1)
    B.put(sfx('LAND_BIG'), K['une_seule'], -7)
    B.put(sfx('WARP_OUT'), K['une_seule'] + 0.05, -10)
    # S08 levier qui résiste ; fiche épinglée
    if has('LEVIER'):
        B.put(sfx('LEVIER'), PL['P6']['start'] + 0.3, -11, length=2.6, fade_out=0.4)
        B.put(sfx('LEVIER'), K['pas_savoir'] - 1.0, -13, length=1.2, fade_out=0.3)
    B.put(sfx('SNAP'), K['openai'], -11)
    B.put(sfx('PAPER'), K['openai'] + 0.05, -14)
    # cartes « capture » du billet d'OpenAI (mêmes instants que SHOT_TIMES dans compo.js) : entrée, zoom, sortie
    shots = [(K['openai'] - 0.05, K['openai'] + 0.5, PL['P6']['end'] - 0.25)]   # P6 seulement (P4 : plus de capture)
    for tin, tzoom, tout in shots:
        B.put(sfx('WARP_IN'), tin - 0.05, -10, length=0.7, fade_out=0.2)             # la carte monte
        B.put(sfx('GLINT'), tin + 0.3, -8)                                          # tintement quand elle se pose (reflet)
        B.put(sfx('SWISH'), tzoom, -11)                                             # zoom sur la phrase surlignée
        if tout:
            B.put(sfx('SWISH'), tout, -10, pan=0.3)                                 # elle file vers la caméra
    # typo animée « C'EST / L'AUTO / AMÉLIORATION » : un impact par mot (la musique se tait)
    for i, kk in enumerate(('cest', 'lauto', 'amelio')):
        B.put(sfx('LAND_BIG'), K[kk] - 0.03, -6 + i)
        B.put(sfx('SNAP'), K[kk] - 0.02, -12)
    # sortie du décor 3D : arrachement, envol de la photo, atterrissage dans l'arène
    B.put(sfx('PAPER'), K['sortie'] - 0.05, -8)
    B.put(sfx('WARP_OUT'), K['sortie'], -9)
    B.put(sfx('SWISH'), K['sortie'] + 0.35, -8)
    B.put(sfx('LAND'), K['align'] - 0.12, -7)
    # l'arène « alignement »
    B.put(sfx('HOLO'), K['align'] + 0.1, -16, length=1.6, fade_out=0.4)
    B.put(sfx('GLINT'), K['veut2'] - 0.25, -10)                          # l'orbe se pose au centre de la cible
    for tw in (K['probleme'] - 0.05, K['alors_elle'] + 0.05, K['comme'], K['align2']):
        B.put(sfx('SWISH'), tw, -9)                                      # fouettés de caméra
    B.put(sfx('PAPER'), K['probleme'] + 0.9, -11)                        # « objectifs » barrés
    for i in range(6):                                                   # cases cochées une à une
        B.put(sfx('POP'), K['recompense'] + 0.2 + i * 0.22, -15 + i * 0.5)
    B.put(sfx('PAPER'), K['decrocher'] - 0.15, -9)                       # le crayon trafique la copie
    B.put(sfx('DATA'), K['decrocher'], -13, length=1.6, fade_out=0.3)    # le score s'emballe
    B.put(sfx('QUESTION'), K['sans'], -11)
    B.put(sfx('LAND_BIG'), K['triche'] - 0.05, -6)                       # tampon TRICHE
    B.put(sfx('WARP_IN'), K['align2'] + 0.05, -12, length=1.0, fade_out=0.3)
    B.put(sfx('CHIME'), K['video'] - 0.05, -8)                           # la cloche
    # S10 carton : iris, coup de chapeau, clic S'ABONNER
    p8 = PL['P8']['start']
    B.put(sfx('DEZOOM'), p8 - 0.05, -12)
    B.put(sfx('HOP'), p8 + 1.75, -12)
    B.put(sfx('CLINK'), p8 + 2.2, -10)
    # transitions : fouetté à chaque changement de plan
    for p in T['plans'][1:-1]:
        if p['id'] != 'M1':
            B.put(sfx('SWISH'), p['start'] - 0.12, -15, pan=-0.5)
    return B.x


def voice():
    return load(os.path.join(HERE, 'media', 'voix_ia', 'voix.wav'))


def sidechain(x, v, depth_db=6.0, attack=0.02, release=0.25):
    """baisse x quand la voix parle (enveloppe de la voix, lissée)"""
    e = np.abs(v).mean(1)
    hop = 441
    n = len(e) // hop
    lvl = e[:n * hop].reshape(n, hop).max(1)
    on = (lvl > db(-38)).astype(np.float32)
    g = np.ones(n, np.float32)
    a, r = np.exp(-1 / (attack * 100)), np.exp(-1 / (release * 100))
    cur = 1.0
    for i in range(n):
        target = db(-depth_db) if on[i] else 1.0
        k = a if target < cur else r
        cur = target + (cur - target) * k
        g[i] = cur
    g = np.repeat(g, hop)
    g = np.concatenate([g, np.full(max(0, len(x) - len(g)), g[-1] if len(g) else 1)])[:len(x)]
    return x * g[:, None]


def musique():
    m = load(os.path.join(HERE, '..', 'reel-la-source', 'media', 'music2', 'GROOVE.mp3'))
    out = np.zeros((int(DUR * SR) + SR, 2), np.float32)
    cut = int((K['iris'] + 0.1) * SR)                     # jusqu'au carton final
    seg = m[:cut].copy()
    n = int(0.3 * SR)
    seg[:n] *= np.linspace(0, 1, n)[:, None]
    seg[-int(0.05 * SR):] *= np.linspace(1, 0, int(0.05 * SR))[:, None]
    out[:len(seg)] += seg
    # « C'EST / L'AUTO / AMÉLIORATION » : la musique s'arrête net, puis repart
    a0, a1 = int((K['cest'] - 0.06) * SR), int((K['amelio'] + 0.75) * SR)
    out[a0:a1] = 0
    nf = int(0.02 * SR)
    out[a0 - nf:a0] *= np.linspace(1, 0, nf)[:, None]
    out[a1:a1 + nf] *= np.linspace(0, 1, nf)[:, None]
    # labo (P4) : musique étouffée (passe-bas) → rendu par ffmpeg sur la tranche
    a, b = int(PL['P4']['start'] * SR), int(PL['P4']['end'] * SR)
    tranche = out[a:b].copy()
    filt = subprocess.run([FF, '-v', 'error', '-f', 'f32le', '-ac', '2', '-ar', str(SR), '-i', '-', '-af', 'lowpass=f=700',
                           '-f', 'f32le', '-ac', '2', '-ar', str(SR), '-'], input=tranche.astype('<f4').tobytes(),
                          capture_output=True, check=True).stdout
    out[a:b] = np.frombuffer(filt, np.float32).reshape(-1, 2)[:b - a] * 1.3
    # accord final sur le coup de chapeau : la fin du morceau (dernières mesures), posée au carton
    end = m[-int(3.2 * SR):].copy()
    end[:int(0.02 * SR)] *= np.linspace(0, 1, int(0.02 * SR))[:, None]
    i = int((PL['P8']['start'] + 0.2) * SR)
    j = min(len(out), i + len(end))
    out[i:j] += end[:j - i] * 0.9
    return out


def loud(path_in, path_out, target):
    af = f'loudnorm=I={target}:TP=-1.5:LRA=11'
    r = subprocess.run([FF, '-hide_banner', '-i', path_in, '-af', af + ':print_format=json', '-f', 'null', '-'],
                       capture_output=True, text=True).stderr
    mj = json.loads(r[r.rindex('{'):r.rindex('}') + 1])
    subprocess.run([FF, '-v', 'error', '-y', '-i', path_in, '-af', af + f":measured_I={mj['input_i']}:measured_TP={mj['input_tp']}"
                    f":measured_LRA={mj['input_lra']}:measured_thresh={mj['input_thresh']}:offset={mj['target_offset']}:linear=true",
                    '-ar', str(SR), path_out], check=True)


def write(x, path):
    subprocess.run([FF, '-v', 'error', '-y', '-f', 'f32le', '-ac', '2', '-ar', str(SR), '-i', '-', '-c:a', 'pcm_s16le', path],
                   input=np.clip(x, -1, 1).astype('<f4').tobytes(), check=True)


def main():
    os.makedirs(os.path.join(HERE, 'out'), exist_ok=True)
    v = voice()
    n = int(DUR * SR)
    V = np.zeros((n, 2), np.float32)
    V[:min(n, len(v))] = v[:n]
    B = bruitages()[:n]
    M = musique()[:n]
    B = sidechain(B, V, 5)
    M = sidechain(M, V, 6, 0.05, 0.4)
    write(B, os.path.join(HERE, 'out', 'bruitages.wav'))
    write(M, os.path.join(HERE, 'out', 'musique.wav'))
    # niveaux : voix -16 LUFS (déjà), bruitages ~10 dB dessous, musique ~20 dB dessous
    mix = V + B * db(3) + M * db(-17)
    write(mix, os.path.join(HERE, 'out', 'bande-son-brute.wav'))
    loud(os.path.join(HERE, 'out', 'bande-son-brute.wav'), os.path.join(HERE, 'out', 'bande-son.wav'), -14)
    print('out/bande-son.wav')


if __name__ == '__main__':
    main()
