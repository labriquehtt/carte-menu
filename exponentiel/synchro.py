#!/usr/bin/env python3
"""Synchro d'EXPONENTIEL : bouche du robot et sous-titres mot à mot, depuis la voix finale.

  PYTHONUTF8=1 python synchro.py      # après timing.py (media/voix_ia/asr.json) → bouche.json, subs.json

- bouche.json : une lettre par image (30 i/s), même code que LA SOURCE (analyse_voix.py) : '.' repos,
  'f' fermée, 'm' mi-ouverte, 'u' ouverte, 'o' ronde.
- subs.json : [{"t0", "t1", "txt", "words": [instant de chaque mot]}], texte de SCRIPT.md §2. Chaque mot
  est calé sur la dernière attaque du son juste avant l'instant donné par la reconnaissance (qui arrive tard).
"""
import difflib
import json
import os
import re
import sys
import unicodedata

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'reel-la-source'))
from mix_sons import SR, load   # noqa: E402

V = os.path.join(HERE, 'media', 'voix_ia')
FPS = 30
LEAD, HOLD = 0.06, 0.8


def script_subs():
    t = open(os.path.join(HERE, 'SCRIPT.md'), encoding='utf8').read()
    block = t[t.index('## 2.'):t.index('## 3.')]
    return [l.strip() for l in block.split('```')[1].strip().split('\n') if l.strip()]


def norm(w):
    w = unicodedata.normalize('NFD', w.replace('*', '')).encode('ascii', 'ignore').decode().lower()
    return re.sub(r'[^a-z0-9]', '', w)


def main():
    x = load(os.path.join(V, 'voix.wav')).mean(axis=1)
    asr = json.load(open(os.path.join(V, 'asr.json'), encoding='utf8'))
    heard = []
    for tok, t in zip(asr['tokens'], asr['ts']):
        if tok.startswith(' ') or not heard:
            heard.append([tok.strip(), t])
        else:
            heard[-1][0] += tok
    words_t = np.array([t for _, t in heard])

    hop = SR // 100
    n = len(x) // hop
    e = 10 * np.log10((x[:n * hop].reshape(n, hop) ** 2).mean(axis=1) + 1e-12)
    floor = np.percentile(e, 15)
    rise = np.zeros(n)
    rise[5:] = e[5:] - e[:-5]
    onsets = [i / 100 for i in range(5, n) if rise[i] > 6 and e[i] > floor + 14 and rise[i - 1] <= 6]

    # ---- bouche (repris d'analyse_voix.py)
    speaking = np.zeros(n, bool)
    for k, t in enumerate(words_t):
        b = min(words_t[k + 1] - 0.02 if k + 1 < len(words_t) else t + 0.7, t + 0.75)
        speaking[max(0, int((t - 0.25) * 100)):int(b * 100)] = True
    speaking &= e > floor + 8
    frames = int(len(x) / SR * FPS)
    idx = lambda f: min(n - 1, int(f / FPS * 100))
    lv = np.array([e[max(0, idx(f) - 2):idx(f) + 3].max() for f in range(frames)])
    sp = np.array([speaking[idx(f)] for f in range(frames)])

    def centroid(f):
        c0 = int(f / FPS * SR)
        seg = x[max(0, c0 - 882):c0 + 882]
        S = np.abs(np.fft.rfft(seg * np.hanning(len(seg)))) ** 2
        fr = np.fft.rfftfreq(len(seg), 1 / SR)
        band = (fr > 150) & (fr < 4000)
        return (S[band] * fr[band]).sum() / (S[band].sum() + 1e-12)
    cen = np.array([centroid(f) if sp[f] else 0 for f in range(frames)])
    p30, p65, c15 = np.percentile(lv[sp], 30), np.percentile(lv[sp], 65), np.percentile(cen[sp], 15)
    s = ''.join('.' if not sp[f] else 'f' if lv[f] < p30 else 'o' if cen[f] < c15 else 'm' if lv[f] < p65 else 'u'
                for f in range(frames))
    s = ''.join(s[i] if 0 < i < len(s) - 1 and not (s[i - 1] == s[i + 1] != s[i]) else (s[i - 1] if i else s[i])
                for i in range(len(s)))
    json.dump({'fps': FPS, 'mouth': s}, open(os.path.join(HERE, 'bouche.json'), 'w'))

    # ---- sous-titres : alignement lettre à lettre entre le texte affiché et ce que la reconnaissance a entendu
    lines = script_subs()
    shown = [(c, w) for c, line in enumerate(lines) for w in line.split(' ')]
    sc = [(k, ch) for k, (_, w) in enumerate(shown) for ch in norm(w)]
    hc = []
    for k, (w, t) in enumerate(heard):
        w = norm(w)
        t1 = heard[k + 1][1] if k + 1 < len(heard) else t + 0.4
        step = min(0.07, (t1 - t) / max(1, len(w)))
        hc += [(ch, t + q * step) for q, ch in enumerate(w)]
    sm = difflib.SequenceMatcher(None, ''.join(c for _, c in sc), ''.join(c for c, _ in hc), autojunk=False)
    first = {}
    for a, b, size in sm.get_matching_blocks():
        for q in range(size):
            k = sc[a + q][0]
            if k not in first:
                pos = a + q - next(i for i, (kk, _) in enumerate(sc) if kk == k)
                first[k] = hc[b + q][1] - pos * 0.05
    ts = [first.get(k) for k in range(len(shown))]
    for i, t in enumerate(ts):                       # mots non retrouvés : interpolés entre voisins
        if t is None:
            p = next((j for j in range(i - 1, -1, -1) if ts[j] is not None), None)
            q = next((j for j in range(i + 1, len(ts)) if ts[j] is not None), None)
            tp = ts[p] if p is not None else ts[q] - 0.3
            tq = ts[q] if q is not None else tp + 0.3
            ts[i] = tp + (tq - tp) * (i - (p if p is not None else i - 1)) / ((q if q is not None else i + 1) - (p if p is not None else i - 1))
    prev = -1
    for i, t in enumerate(ts):                       # recalage sur l'attaque du son
        c = [o for o in onsets if t - 0.24 <= o <= t + 0.03 and o > prev + 0.09]
        ts[i] = c[-1] if c else max(t - 0.1, prev + 0.09)
        prev = ts[i]
    subs = []
    for c, line in enumerate(lines):
        wt = [round(ts[k], 2) for k, (cc, _) in enumerate(shown) if cc == c]
        subs.append({'txt': line, 't0': round(wt[0] - LEAD, 2), 'words': wt})
    for i, sb in enumerate(subs):
        nxt = subs[i + 1]['t0'] if i + 1 < len(subs) else sb['words'][-1] + 1.4
        sb['t1'] = round(min(nxt, sb['words'][-1] + HOLD) if nxt - (sb['words'][-1] + HOLD) >= 0.3 else nxt, 2)
    json.dump(subs, open(os.path.join(HERE, 'subs.json'), 'w', encoding='utf8'), ensure_ascii=False, indent=1)
    talk = sum(ch != '.' for ch in s) / FPS
    print(f'bouche.json : {len(s)} images, bouche active {talk:.1f} s ; subs.json : {len(subs)} morceaux')
    for sb in subs:
        print(f"  {sb['t0']:6.2f} → {sb['t1']:6.2f}  {sb['txt']}")


if __name__ == '__main__':
    main()
