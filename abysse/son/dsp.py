"""Boîte à outils audio (numpy/scipy, 48 kHz stéréo) pour la bande-son ABYSSE : lecture, filtres (fixes et
balayés), réverbération par convolution, spatialisation (panoramique + retard interaural + ombre de la tête),
modulation « sous l'eau », synthèse (sonar, verre, pixels, nappes, sub, souffles), compresseur et limiteur."""
import subprocess

import numpy as np
from scipy.io import wavfile
from scipy.signal import fftconvolve, lfilter, sosfilt, sosfilt_zi

SR = 48000
RNG = np.random.default_rng(1234)


# ------------------------------------------------------------------ fichiers
def load(path, start=0.0, dur=None, mono=False):
    cmd = ['ffmpeg', '-v', 'error']
    if start:
        cmd += ['-ss', f'{start:.4f}']
    if dur:
        cmd += ['-t', f'{dur:.4f}']
    cmd += ['-i', path, '-f', 'f32le', '-ac', '1' if mono else '2', '-ar', str(SR), '-']
    raw = subprocess.run(cmd, capture_output=True, check=True).stdout
    x = np.frombuffer(raw, np.float32).astype(np.float64)
    return x if mono else x.reshape(-1, 2)


def save(path, x, bits=24):
    y = np.clip(x, -1.0, 1.0)
    if bits == 16:
        wavfile.write(path, SR, (y * 32767).astype(np.int16))
    else:
        wavfile.write(path, SR, y.astype(np.float32))


def silence(sec):
    return np.zeros((int(round(sec * SR)), 2))


def stereo(x):
    return np.stack([x, x], axis=1) if x.ndim == 1 else x


def mono(x):
    return x.mean(axis=1) if x.ndim == 2 else x


def db(v):
    return 10 ** (v / 20)


def place(bus, x, t, gain=1.0):
    """ajoute x (mono ou stéréo) dans bus à l'instant t (s)"""
    x = stereo(x) * gain
    i = int(round(t * SR))
    if i >= len(bus):
        return
    if i < 0:
        x = x[-i:]
        i = 0
    n = min(len(x), len(bus) - i)
    bus[i:i + n] += x[:n]


def somme(*xs):
    """additionne des sons de longueurs différentes (mono)"""
    n = max(len(x) for x in xs)
    out = np.zeros(n)
    for x in xs:
        out[:len(x)] += x
    return out


def fade(x, fin=0.005, fout=0.01):
    x = x.copy()
    a, b = int(fin * SR), int(fout * SR)
    if a:
        x[:a] *= np.linspace(0, 1, a)[:, None] if x.ndim == 2 else np.linspace(0, 1, a)
    if b:
        x[-b:] *= np.linspace(1, 0, b)[:, None] if x.ndim == 2 else np.linspace(1, 0, b)
    return x


def env_curve(points, n):
    """courbe par points (t s, valeur) échantillonnée sur n échantillons (interpolation linéaire)"""
    ts = np.arange(n) / SR
    tp, vp = zip(*points)
    return np.interp(ts, tp, vp)


# ------------------------------------------------------------------ filtres (formules RBJ)
def biquad(kind, f, q=0.707, gain_db=0.0):
    w = 2 * np.pi * min(f, SR * 0.49) / SR
    c, s = np.cos(w), np.sin(w)
    a = s / (2 * q)
    A = 10 ** (gain_db / 40)
    if kind == 'lp':
        b = [(1 - c) / 2, 1 - c, (1 - c) / 2]; aa = [1 + a, -2 * c, 1 - a]
    elif kind == 'hp':
        b = [(1 + c) / 2, -(1 + c), (1 + c) / 2]; aa = [1 + a, -2 * c, 1 - a]
    elif kind == 'bp':
        b = [a, 0, -a]; aa = [1 + a, -2 * c, 1 - a]
    elif kind == 'peak':
        b = [1 + a * A, -2 * c, 1 - a * A]; aa = [1 + a / A, -2 * c, 1 - a / A]
    elif kind == 'lowshelf':
        sq = 2 * np.sqrt(A) * a
        b = [A * ((A + 1) - (A - 1) * c + sq), 2 * A * ((A - 1) - (A + 1) * c), A * ((A + 1) - (A - 1) * c - sq)]
        aa = [(A + 1) + (A - 1) * c + sq, -2 * ((A - 1) + (A + 1) * c), (A + 1) + (A - 1) * c - sq]
    elif kind == 'highshelf':
        sq = 2 * np.sqrt(A) * a
        b = [A * ((A + 1) + (A - 1) * c + sq), -2 * A * ((A - 1) + (A + 1) * c), A * ((A + 1) + (A - 1) * c - sq)]
        aa = [(A + 1) - (A - 1) * c + sq, 2 * ((A - 1) - (A + 1) * c), (A + 1) - (A - 1) * c - sq]
    else:
        raise ValueError(kind)
    b, aa = np.array(b) / aa[0], np.array(aa) / aa[0]
    return np.array([[*b, *aa]])


def filt(x, kind, f, q=0.707, gain_db=0.0, order=1):
    sos = np.vstack([biquad(kind, f, q, gain_db)] * order)
    return sosfilt(sos, x, axis=0)


def sweep(x, kind, freqs, q=0.707, block=256, order=2):
    """filtre dont la fréquence suit la courbe freqs (une valeur par échantillon) ; traité par blocs avec état"""
    x2 = stereo(x)
    y = np.zeros_like(x2)
    zi = None
    for i in range(0, len(x2), block):
        f = float(np.mean(freqs[i:i + block]))
        sos = np.vstack([biquad(kind, f, q)] * order)
        if zi is None:
            zi = np.zeros((sos.shape[0], 2, 2))
        seg = x2[i:i + block]
        out, zi = sosfilt(sos, seg, axis=0, zi=zi)
        y[i:i + block] = out
    return y if x.ndim == 2 else y[:, 0]


# ------------------------------------------------------------------ réverbération et espace
def impulse(sec=2.5, t60=2.0, lp=6000.0, predelay=0.012, width=1.0, early=True, seed=3):
    rng = np.random.default_rng(seed)
    n = int(sec * SR)
    t = np.arange(n) / SR
    decay = np.exp(-6.91 * t / t60)
    ir = rng.standard_normal((n, 2)) * decay[:, None]
    # les aigus meurent plus vite (eau, roche)
    ir = filt(ir, 'lp', lp, 0.6)
    ir[:, 1] = width * ir[:, 1] + (1 - width) * ir[:, 0]
    if early:
        for d, g in ((0.011, 0.6), (0.019, 0.45), (0.031, 0.35), (0.043, 0.3), (0.061, 0.22)):
            k = int(d * SR)
            ir[k, 0] += g * rng.choice((-1, 1))
            ir[k + int(0.0013 * SR), 1] += g * rng.choice((-1, 1))
    pre = np.zeros((int(predelay * SR), 2))
    ir = np.vstack([pre, ir])
    return ir / np.sqrt((ir ** 2).sum() / 2)


def reverb(x, ir, wet=0.3, dry=1.0):
    x2 = stereo(x)
    w = np.stack([fftconvolve(x2[:, 0], ir[:, 0]), fftconvolve(x2[:, 1], ir[:, 1])], axis=1)
    out = np.zeros_like(w)
    out[:len(x2)] = x2 * dry
    return out + w * wet


def pan(x, az_deg, dist=1.0, el_deg=0.0):
    """spatialisation binaurale simplifiée : gain à puissance constante, retard entre les oreilles (≤ 0,6 ms),
    ombre de la tête (aigus atténués côté opposé), derrière la tête = un peu plus sombre"""
    m = mono(x)
    a = np.radians(np.clip(az_deg, -180, 180))
    side = np.sin(a)                                   # -1 gauche, +1 droite
    behind = np.cos(a) < 0
    g_l = np.sqrt(0.5 * (1 - 0.85 * side))
    g_r = np.sqrt(0.5 * (1 + 0.85 * side))
    itd = int(abs(side) * 0.00062 * SR)
    l, r = m * g_l, m * g_r
    far_cut = 9000 - 6500 * abs(side)
    if side > 0:
        l = filt(l, 'lp', far_cut, 0.6)
        l = np.concatenate([np.zeros(itd), l])[:len(m)]
    elif side < 0:
        r = filt(r, 'lp', far_cut, 0.6)
        r = np.concatenate([np.zeros(itd), r])[:len(m)]
    out = np.stack([l, r], axis=1)
    if behind:
        out = filt(out, 'highshelf', 4000, 0.7, -5.0)
    return out


def pan_moving(x, az_curve):
    """panoramique qui suit une courbe d'angles (une valeur par échantillon) : gains + léger filtrage"""
    m = mono(x)
    a = np.radians(np.clip(az_curve[:len(m)], -180, 180))
    side = np.sin(a)
    out = np.stack([m * np.sqrt(0.5 * (1 - 0.85 * side)), m * np.sqrt(0.5 * (1 + 0.85 * side))], axis=1)
    return out


def width(x, k):
    x2 = stereo(x)
    mid = (x2[:, 0] + x2[:, 1]) / 2
    sd = (x2[:, 0] - x2[:, 1]) / 2 * k
    return np.stack([mid + sd, mid - sd], axis=1)


def wobble(x, depth_ms=1.6, rate=0.35, seed=0):
    """vibrato lent de hauteur (ligne à retard modulée) : la sensation d'eau"""
    x2 = stereo(x)
    n = len(x2)
    t = np.arange(n) / SR
    out = np.zeros_like(x2)
    for ch in range(2):
        ph = seed + ch * 1.3
        d = (depth_ms / 1000 * SR) * (0.5 + 0.5 * np.sin(2 * np.pi * rate * t + ph)) + 2
        idx = np.arange(n) - d
        out[:, ch] = np.interp(idx, np.arange(n), x2[:, ch], left=0)
    return out


def pitch(x, semitones):
    """transposition par rééchantillonnage (la durée change, comme sur un échantillonneur)"""
    k = 2 ** (semitones / 12)
    x2 = stereo(x)
    n = int(len(x2) / k)
    src = np.arange(n) * k
    return np.stack([np.interp(src, np.arange(len(x2)), x2[:, c]) for c in range(2)], axis=1)


def trim_start(x, thresh_db=-40):
    m = np.abs(mono(x))
    i = int(np.argmax(m > m.max() * db(thresh_db)))
    return x[max(0, i - int(0.002 * SR)):]


def normalize(x, peak_db=-1.0):
    p = np.abs(x).max()
    return x * (db(peak_db) / p) if p > 0 else x


def rms_db(x):
    return 20 * np.log10(np.sqrt(np.mean(np.asarray(x) ** 2)) + 1e-12)


# ------------------------------------------------------------------ dynamique
def compress(x, thr_db=-18, ratio=3.0, attack=0.005, release=0.12, makeup_db=0.0, knee=6.0):
    x2 = stereo(x)
    lvl = np.maximum(np.abs(x2[:, 0]), np.abs(x2[:, 1])) + 1e-9
    ldb = 20 * np.log10(lvl)
    over = ldb - thr_db
    gr = np.where(over <= -knee / 2, 0.0,
                  np.where(over >= knee / 2, over * (1 - 1 / ratio),
                           (1 - 1 / ratio) * (over + knee / 2) ** 2 / (2 * knee)))
    a_att, a_rel = np.exp(-1 / (attack * SR)), np.exp(-1 / (release * SR))
    # suiveur d'enveloppe (attaque/relâchement) sur la réduction de gain
    g = np.empty_like(gr)
    prev = 0.0
    for i in range(0, len(gr), 64):                         # par blocs de 64 : assez fin, beaucoup plus rapide
        target = gr[i:i + 64].max()
        coef = a_att ** 64 if target > prev else a_rel ** 64
        prev = target + (prev - target) * coef
        g[i:i + 64] = prev
    return x2 * db(-g + makeup_db)[:, None]


def limiter(x, ceiling_db=-1.0, release=0.06, lookahead=0.004):
    x2 = stereo(x)
    c = db(ceiling_db)
    peak = np.maximum(np.abs(x2[:, 0]), np.abs(x2[:, 1]))
    need = np.minimum(1.0, c / np.maximum(peak, 1e-9))
    la = int(lookahead * SR)
    # minimum glissant sur la fenêtre d'anticipation
    from scipy.ndimage import minimum_filter1d
    need = minimum_filter1d(need, size=2 * la + 1, origin=0)
    g = np.empty_like(need)
    a_rel = np.exp(-1 / (release * SR))
    prev = 1.0
    for i in range(0, len(need), 32):
        target = need[i:i + 32].min()
        prev = target if target < prev else target + (prev - target) * a_rel ** 32
        g[i:i + 32] = prev
    y = x2 * g[:, None]
    return np.clip(y, -c, c)


# ------------------------------------------------------------------ synthèse
def adsr(n, a=0.005, d=0.1, s=0.7, r=0.2, sustain_len=None):
    a_n, d_n, r_n = int(a * SR), int(d * SR), int(r * SR)
    s_n = max(0, n - a_n - d_n - r_n) if sustain_len is None else int(sustain_len * SR)
    e = np.concatenate([np.linspace(0, 1, a_n, endpoint=False), np.linspace(1, s, d_n, endpoint=False),
                        np.full(s_n, s), np.linspace(s, 0, r_n)])
    if len(e) < n:
        e = np.concatenate([e, np.zeros(n - len(e))])
    return e[:n]


def hz(midi):
    return 440.0 * 2 ** ((midi - 69) / 12)


def sonar_ping(freq=587.33, dur=1.6, bright=1.0):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = freq * (1 - 0.012 * (1 - np.exp(-t * 3)))           # la hauteur glisse un peu (effet Doppler/eau)
    ph = 2 * np.pi * np.cumsum(f) / SR
    tone = np.sin(ph) + 0.25 * bright * np.sin(2 * ph) * np.exp(-t * 6) + 0.08 * np.sin(3.01 * ph) * np.exp(-t * 9)
    env = (1 - np.exp(-t * 900)) * np.exp(-t * 3.2)
    click = RNG.standard_normal(n) * np.exp(-t * 400) * 0.15
    return (tone * env + click) * 0.6


def glass(freq, dur=1.8):
    """note de verre/cristal : synthèse FM (rapport 3,5) dont l'indice s'éteint vite"""
    n = int(dur * SR)
    t = np.arange(n) / SR
    idx = 2.2 * np.exp(-t * 7)
    mod = np.sin(2 * np.pi * freq * 3.5 * t) * idx
    car = np.sin(2 * np.pi * freq * t + mod)
    env = (1 - np.exp(-t * 2000)) * np.exp(-t * 2.4)
    shimmer = 0.15 * np.sin(2 * np.pi * freq * 2.0 * t + 0.7) * np.exp(-t * 4)
    return (car + shimmer) * env * 0.5


def blip(freq, dur=0.16, crush=7):
    """« pixel » : carré court, réduit en résolution (son numérique)"""
    n = int(dur * SR)
    t = np.arange(n) / SR
    sq = np.sign(np.sin(2 * np.pi * freq * t)) * 0.5 + 0.5 * np.sign(np.sin(2 * np.pi * freq * 2 * t)) * 0.3
    env = np.exp(-t * 28) * (1 - np.exp(-t * 3000))
    y = sq * env
    step = 2 ** crush
    y = np.round(y * step) / step
    hold = 3                                                  # sous-échantillonnage (aliasing volontaire)
    y = np.repeat(y[::hold], hold)[:n]
    return filt(y, 'lp', 7000) * 0.35


def saw(freq, n, detune_cents=0.0, phase=0.0):
    f = freq * 2 ** (detune_cents / 1200)
    t = np.arange(n) / SR
    p = (t * f + phase) % 1.0
    y = 2 * p - 1
    # petite correction polyBLEP pour éviter le crénelage
    dt = f / SR
    m1 = p < dt
    y[m1] -= ((p[m1] / dt) * 2 - (p[m1] / dt) ** 2 - 1)
    m2 = p > 1 - dt
    q = (p[m2] - 1) / dt
    y[m2] -= (q * q + 2 * q + 1)
    return y


def pad(notes, dur, cutoff=1400.0, attack=0.9, release=1.2, voices=5, seed=0):
    """nappe : scies désaccordées par note, filtrée, enveloppe lente, largeur stéréo"""
    n = int(dur * SR)
    rng = np.random.default_rng(seed)
    out = np.zeros((n, 2))
    for m in notes:
        for v in range(voices):
            det = (v - (voices - 1) / 2) * 7.0 + rng.uniform(-2, 2)
            s = saw(hz(m), n, det, rng.random())
            p = (v / max(1, voices - 1)) * 2 - 1
            out[:, 0] += s * np.sqrt(0.5 * (1 - 0.7 * p))
            out[:, 1] += s * np.sqrt(0.5 * (1 + 0.7 * p))
    out /= (len(notes) * voices) ** 0.5 * 2.5
    out = filt(out, 'lp', cutoff, 0.7, order=2)
    e = adsr(n, attack, 0.3, 0.85, release)
    return out * e[:, None]


def sub_hit(freq=48.0, dur=0.7, drop=2.2):
    """battement grave (cœur sous l'eau) : sinus avec chute de hauteur"""
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = freq * (1 + drop * np.exp(-t * 28))
    ph = 2 * np.pi * np.cumsum(f) / SR
    y = np.sin(ph) * np.exp(-t * 5.5) * (1 - np.exp(-t * 600))
    return np.tanh(y * 1.6) * 0.8


def noise_sweep(dur, f0, f1, q=1.2, kind='bp', shape='hump', seed=0):
    """souffle : bruit filtré dont la fréquence glisse de f0 à f1"""
    n = int(dur * SR)
    rng = np.random.default_rng(seed)
    x = rng.standard_normal(n)
    fr = np.geomspace(f0, f1, n)
    y = sweep(x, kind, fr, q, order=1)
    t = np.linspace(0, 1, n)
    if shape == 'hump':
        e = np.sin(np.pi * t) ** 1.5
    elif shape == 'rise':
        e = t ** 2
    else:
        e = np.exp(-t * 5)
    return y * e * 0.4


def thock(dur=0.25):
    """impact sourd pour les mots qui tombent : sinus grave qui chute + clic"""
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = 70 * (1 + 2.5 * np.exp(-t * 40))
    y = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 14)
    click = RNG.standard_normal(n) * np.exp(-t * 900) * 0.4
    return filt(y + filt(click, 'hp', 2000), 'lp', 9000) * 0.7


def pluck(freq, dur=0.6, bright=0.6, seed=0):
    """corde pincée (Karplus-Strong) : marimba/kalimba selon `bright` — les rebonds de la balle, les logos"""
    n = int(dur * SR)
    period = max(2, int(round(SR / freq)))
    rng = np.random.default_rng(seed)
    buf = rng.uniform(-1, 1, period)
    buf = filt(buf, 'lp', 1500 + 6000 * bright, 0.7)
    out = np.empty(n)
    damp = 0.996 - 0.006 * (1 - bright)
    for i in range(n):
        j = i % period
        out[i] = buf[j]
        buf[j] = damp * 0.5 * (buf[j] + buf[(j + 1) % period])
    t = np.arange(n) / SR
    body = np.sin(2 * np.pi * freq * t) * np.exp(-t * 9) * 0.5
    return fade((out * 0.7 + body) * (1 - np.exp(-t * 3000)), 0.0, 0.05) * 0.6


def thump(freq=90.0, dur=0.12):
    """petit choc sourd (la balle touche la ligne)"""
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = freq * (1 + 1.2 * np.exp(-t * 60))
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 32) * 0.8


def boing(f0=180.0, f1=720.0, dur=0.38, seed=0):
    """élastique qui s'étire : glissando avec ressort (vibrato qui s'amortit)"""
    n = int(dur * SR)
    t = np.arange(n) / SR
    k = t / dur
    f = f0 * (f1 / f0) ** (np.sin(np.pi / 2 * k)) * (1 + 0.06 * np.sin(2 * np.pi * 22 * t) * np.exp(-t * 6))
    ph = 2 * np.pi * np.cumsum(f) / SR
    y = 0.6 * np.sin(ph) + 0.25 * np.sign(np.sin(ph)) * 0.5
    y = filt(y, 'lp', 3000, 0.7)
    return y * np.sin(np.pi * k) ** 0.6 * 0.5


def crypte(dur=0.42, seed=0):
    """déchirure cryptée (les lettres se déchiffrent) : grains numériques bégayés, réduits en bits, qui montent,
    puis une déchirure qui descend, et un petit coup grave"""
    n = int(dur * SR)
    rng = np.random.default_rng(seed)
    out = np.zeros(n)
    g = int(0.016 * SR)
    src = rng.standard_normal(g) * np.hanning(g)
    pos = 0
    for k in range(int(dur / 0.024)):                         # bégaiement : le même grain, de plus en plus aigu
        rate = 1 + 0.12 * k
        idx = np.arange(int(g / rate)) * rate
        grain = np.interp(idx, np.arange(g), src) * (0.9 - 0.04 * k)
        a = pos
        out[a:a + len(grain)] += grain[:max(0, n - a)]
        pos += int(0.024 * SR)
        if pos >= n * 0.6:
            break
    t = np.arange(n) / SR
    f = 2600 * np.exp(-t * 9) + 90                            # déchirure : un carré qui dégringole
    tear = np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * np.exp(-((t - dur * 0.55) / (dur * 0.22)) ** 2) * 0.35
    y = out * 0.55 + tear
    y = np.round(y * 6) / 6                                   # 3 bits environ
    y = np.repeat(y[::4], 4)[:n]                              # échantillonnage grossier (aliasing)
    y = filt(y, 'bp', 2200, 0.5) * 1.6
    sub = np.zeros(n)
    th = thump(70, 0.2)
    sub[:len(th)] = th[:n]
    return fade(y * 0.6 + sub * 0.7, 0.0, 0.04)


def pop(freq=900.0, dur=0.07):
    """« pop » d'un bouton qui apparaît"""
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = freq * (1 + 1.5 * np.exp(-t * 90))
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 55) * 0.5


def goutte(freq=520.0, dur=0.22):
    """goutte d'eau accordée (sinus qui remonte vite) : les logos qui flottent ou coulent"""
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = freq * (0.55 + 0.45 * (1 - np.exp(-t * 70))) * (1 + 0.15 * np.exp(-t * 25))
    y = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 16) * (1 - np.exp(-t * 2000))
    return y * 0.55


def zip_(dur=0.14):
    """trait qui se trace (fermeture éclair numérique)"""
    n = int(dur * SR)
    t = np.arange(n) / SR
    x = RNG.standard_normal(n)
    y = sweep(x, 'bp', np.geomspace(800, 9000, n), 2.0, order=1)
    return y * (t / dur) ** 0.5 * np.exp(-(t / dur) * 1.5) * 0.4


def bip(freq=2400.0, dur=0.07):
    """bip de caméra (début d'enregistrement)"""
    n = int(dur * SR)
    t = np.arange(n) / SR
    return np.sign(np.sin(2 * np.pi * freq * t)) * 0.18 * np.exp(-t * 8) * (1 - np.exp(-t * 4000))


def tick(dur=0.05, seed=0):
    """tic numérique (glitch) pour les noms cachés qui défilent"""
    n = int(dur * SR)
    rng = np.random.default_rng(seed)
    y = rng.standard_normal(n) * np.exp(-np.arange(n) / SR * 120)
    y = np.round(y * 8) / 8
    return filt(y, 'bp', 3000 + 2000 * rng.random(), 1.5) * 0.5
