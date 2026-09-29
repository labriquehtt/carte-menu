#!/usr/bin/env python3
"""Aperçu rapide d'EXPONENTIEL (script v2, voix Hugo) : voix + musique basse + sous-titres + schémas 2D.
Ce n'est pas l'animatique Blender : juste de quoi juger le texte, le rythme et l'enchaînement des idées.

  PYTHONUTF8=1 python apercu.py        → out/EXPONENTIEL-apercu.mp4 (720×1280, 30 i/s)

Polices : media/fonts/*.ttf (converties depuis ../parano-ia/assets/*.woff2 avec fontTools).
"""
import math
import os
import random
import subprocess

from PIL import Image, ImageDraw, ImageFilter, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
W, H, FPS, DUR = 720, 1280, 30, 29.0
S = W / 1080                       # échelle par rapport au 1080×1920 final
BG, NIGHT, GREEN, YELLOW, WHITE, INK, RED = '#0B1230', '#131C45', '#4DFF8F', '#FFD23C', '#F4F1EA', '#1B1620', '#FF5A5A'
FONT = lambda name, px: ImageFont.truetype(os.path.join(HERE, 'media', 'fonts', name + '.ttf'), int(px))
FRED, GROT, MONO = 'Fredoka-700', 'SpaceGrotesk-700', 'IBMPlexMono-500'

# sous-titres : (début en s, texte) ; *mot* = en vert. Instants tirés de la reconnaissance vocale de voix.wav.
SUBS = [
    (0.20, 'Un nénuphar *double* chaque jour.'),
    (2.45, 'Le *30e jour*, il couvre tout l’étang.'),
    (4.70, 'La veille ? *La moitié*.'),
    (5.95, '5 jours avant ? *3 %*.'),
    (7.65, 'L’IA suit cette *courbe* :'),
    (8.95, 'tous les 4 mois, des tâches *2 fois plus longues*.'),
    (11.85, 'Et elle commence à faire sa propre recherche :'),
    (14.05, 'c’est l’*auto-amélioration*.'),
    (15.75, 'Un doublement pourrait prendre *quelques semaines*…'),
    (18.15, 'voire *une seule*.'),
    (19.30, 'Et l’*alignement* ?'),
    (20.15, 'Qui garantit qu’elle fera encore ce qu’on veut ?'),
    (22.10, 'Même OpenAI admet *ne pas encore savoir*.'),
    (24.75, 'Alors… on est à *quel jour* ?'),
    (26.15, 'Affaire à suivre.'),
]
T_CHART, T_RSI, T_ALIGN, T_QUESTION, T_CARD = 7.65, 11.85, 19.30, 24.75, 26.45

# étang : 1024 feuilles tirées au hasard (graine fixe), triées par distance à un coin → la zone couverte grandit en tache
CX, CY, R = W / 2, 520 * S * 1.5, 300
rng = random.Random(30)
PADS = []
while len(PADS) < 1024:
    a, d = rng.random() * 2 * math.pi, R * math.sqrt(rng.random())
    PADS.append((CX + d * math.cos(a), CY + d * 0.62 * math.sin(a), rng.uniform(9, 14), rng.random() * 360))
SEED = (CX - R * 0.7, CY + R * 0.3)
PADS.sort(key=lambda p: (p[0] - SEED[0]) ** 2 + (p[1] - SEED[1]) ** 2)


def ease(x):
    x = min(1, max(0, x))
    return x * x * (3 - 2 * x)


def pond_day(t):
    if t < 3.25:
        return 1 + 29 * ease((t - 0.2) / 3.05)
    if t < 4.7:
        return 30
    if t < 5.95:
        return 29
    return 25


def draw_pond(img, d, t, day, label=None):
    d.ellipse([CX - R - 18, CY - R * 0.62 - 18, CX + R + 18, CY + R * 0.62 + 18], fill='#2B3B2A')   # berge
    d.ellipse([CX - R, CY - R * 0.62, CX + R, CY + R * 0.62], fill='#10254A')
    mx, my = CX + 120, CY - 80                                                                       # reflet de lune
    d.ellipse([mx - 30, my - 12, mx + 30, my + 12], fill='#2A4A7A')
    n = int(round(1024 * 2 ** (day - 30)))
    for x, y, r, rot in PADS[:n]:
        d.ellipse([x - r, y - r * 0.62, x + r, y + r * 0.62], fill='#2FBF6A', outline=INK)
        a = math.radians(rot)
        d.line([x, y, x + r * math.cos(a), y + r * 0.62 * math.sin(a)], fill=INK, width=2)
    for i in range(14):                                                                              # lucioles
        a = t * 0.6 + i * 1.7
        fx, fy = CX + math.cos(a * 1.3 + i) * (R + 40), CY - 60 + math.sin(a + i * 2) * 170
        d.ellipse([fx - 3, fy - 3, fx + 3, fy + 3], fill=GREEN)
    # panneau en bois
    sx, sy = CX + R - 190, CY - R * 0.62 - 150
    d.rectangle([sx + 50, sy + 70, sx + 62, sy + 190], fill='#6B4A2B', outline=INK, width=3)
    d.rounded_rectangle([sx - 30, sy, sx + 142, sy + 80], 10, fill='#8B6139', outline=INK, width=4)
    txt = label or f'JOUR {int(day)}'
    f = FONT(FRED, 34)
    d.text((sx + 56, sy + 40), txt, font=f, fill=WHITE, anchor='mm')
    pct = 2 ** (day - 30) * 100
    if label is None:
        s = f'{pct:.0f} %' if pct >= 1 else f'{pct:.2f} %'.replace('.', ',')
        d.text((CX - 150, CY - R * 0.62 - 90), s, font=FONT(GROT, 72), fill=GREEN, anchor='mm')


def draw_chart(img, d, t):
    """Données METR (horizon à 50 %), axe vertical LINÉAIRE en heures : la courbe colle au sol puis décolle."""
    x0, x1, y0, y1 = 90, W - 70, 720, 310
    k = ease((t - T_CHART) / 3.6)
    for i in range(6):
        y = y0 - (y0 - y1) * i / 5
        d.line([x0, y, x1, y], fill='#1E2A5E', width=1)
        d.text((x0 - 12, y), f'{int(18 * i / 5)} h', font=FONT(MONO, 18), fill='#7C86B8', anchor='rm')
    for yr in range(2019, 2027):
        x = x0 + (x1 - x0) * (yr - 2019) / 7.5
        d.text((x, y0 + 26), str(yr), font=FONT(MONO, 18), fill='#7C86B8', anchor='mm')
    X = lambda yr: x0 + (x1 - x0) * (yr - 2019) / 7.5
    Y = lambda h: y0 - (y0 - y1) * h / 18
    pts = []                                              # ajustement exponentiel entre les trois mesures
    for i in range(301):
        yr = 2019.12 + (2026.27 - 2019.12) * i / 300
        h = (3 / 3600) * (17.4 / (3 / 3600)) ** ((yr - 2019.12) / (2026.27 - 2019.12)) ** 1.35
        pts.append((X(yr), Y(min(h, 17.4))))
    m = max(2, int(len(pts) * k))
    for w, c in ((14, '#1F6B45'), (6, GREEN)):
        d.line(pts[:m], fill=c, width=w, joint='curve')
    for yr, h, lab, tk in ((2019.12, 3 / 3600, '2019 · 3 s', 0.05), (2025.15, 1.0, '2025 · 1 h', 0.75),
                           (2026.27, 17.4, '2026 · 16 h+', 0.99)):
        if k >= tk:
            x, y = X(yr), Y(h)
            d.ellipse([x - 9, y - 9, x + 9, y + 9], fill=YELLOW, outline=INK, width=3)
            d.text((x - 14, y - 26), lab, font=FONT(GROT, 30), fill=WHITE, anchor='rs' if yr > 2024 else 'ls')
    d.text((W / 2, 200), 'DURÉE DES TÂCHES RÉUSSIES', font=FONT(GROT, 34), fill=WHITE, anchor='mm')
    d.text((W / 2, 960), 'METR, 2025-2026 · réussite 1 fois sur 2', font=FONT(MONO, 18), fill='#9AA3D0', anchor='mm')
    if t > 9.5:
        d.text((W / 2, 248), '×2 tous les ~4 mois', font=FONT(GROT, 30), fill=GREEN, anchor='mm')


def draw_rsi(img, d, t):
    u = t - T_RSI - 3.9   # 3,9 s : « c'est l'auto-amélioration » → « Un doublement… »
    x0, y0 = 60, 740
    pts = []
    for i in range(200):
        x = i / 199
        y = (2 ** (x * (6 + 10 * ease(max(0, u) / 2.6)))) / 2 ** (6 + 10 * ease(max(0, u) / 2.6))
        pts.append((x0 + x * (W - 2 * x0), y0 - y * 420))
    shake = (math.sin(t * 90) * 5 if u > 2.4 else 0)
    pts = [(x + shake, y) for x, y in pts]
    d.line(pts, fill='#1F6B45', width=16)
    d.line(pts, fill=GREEN, width=7)
    d.text((W / 2, 190), 'AUTO-AMÉLIORATION' if u < 0 else 'UN DOUBLEMENT =', font=FONT(GROT, 36), fill=WHITE, anchor='mm')
    if u < 0:
        d.text((W / 2, 260), 'l’IA fait la recherche en IA', font=FONT(GROT, 34), fill=GREEN, anchor='mm')
        return
    lab = '4 mois' if u < 0.9 else ('quelques semaines' if u < 2.45 else '1 semaine ?')
    col = WHITE if u < 0.9 else (YELLOW if u < 2.45 else GREEN)
    d.text((W / 2, 260), lab, font=FONT(FRED, 64 if u < 2.45 else 84), fill=col, anchor='mm')
    d.text((W / 2, 960), 'hypothèse · Forethought, 2025 (×2 à ×32 plus vite)', font=FONT(MONO, 17), fill='#9AA3D0',
           anchor='mm')


def draw_align(img, d, t):
    u = t - T_ALIGN
    d.text((W / 2, 180), 'ALIGNEMENT', font=FONT(FRED, 88), fill=YELLOW, anchor='mm')
    d.text((W / 2, 245), 'fait-elle ce qu’on veut ?', font=FONT(GROT, 30), fill=WHITE, anchor='mm')
    x0, x1, yb = 70, W - 70, 740
    want = [(x0 + (x1 - x0) * i / 99, yb - 220 * (i / 99)) for i in range(100)]
    for i in range(0, 99, 4):                                                        # « ce qu'on veut » en pointillés
        d.line([want[i], want[i + 2]], fill=WHITE, width=4)
    k = ease(u / 3.5)
    drift = [(x0 + (x1 - x0) * i / 99, yb - 220 * (i / 99) - 200 * k * ((i / 99) ** 3)) for i in range(100)]
    d.line(drift, fill='#1F6B45', width=14)
    d.line(drift, fill=GREEN, width=6)
    d.text((x1, yb - 236), 'ce qu’on veut', font=FONT(MONO, 20), fill=WHITE, anchor='rs')
    d.text((x1 - 60, drift[-1][1] - 4), 'ce qu’elle fait', font=FONT(MONO, 20), fill=GREEN, anchor='rs')
    if u > 2.8:  # citation
        d.rounded_rectangle([60, 300, W - 60, 400], 14, fill='#2A1020', outline=RED, width=3)
        d.text((W / 2, 335), '« pas encore » de méthode sûre', font=FONT(GROT, 30), fill=WHITE, anchor='mm')
        d.text((W / 2, 375), 'OpenAI, sept. 2026 (via Fortune)', font=FONT(MONO, 17), fill='#C9A0A8', anchor='mm')


def draw_card(img, d, t):
    u = t - T_CARD
    word = 'EXPONENTIEL'
    sizes = [16 * 1.2 ** i * ease(u * 3 - i * 0.12) for i in range(len(word))]   # lettres qui grandissent en ×1,2
    fonts = [FONT(FRED, max(2, px)) for px in sizes]
    x = W / 2 - sum(d.textlength(c, font=f) for c, f in zip(word, fonts)) / 2
    for ch, f, px in zip(word, fonts, sizes):
        if px >= 2:
            d.text((x, 470), ch, font=f, fill=GREEN, anchor='ls')
        x += d.textlength(ch, font=f)
    if u > 0.9:
        d.text((W / 2, 550), 'L’IA SOUS ENQUÊTE', font=FONT(GROT, 44), fill=WHITE, anchor='mm')
    if u > 1.4:
        d.rounded_rectangle([W / 2 - 150, 620, W / 2 + 150, 690], 35, fill=RED if u < 2.2 else '#555', outline=INK, width=3)
        d.text((W / 2, 655), 'S’ABONNER' if u < 2.2 else 'ABONNÉ ✓', font=FONT(FRED, 34), fill=WHITE, anchor='mm')


def draw_subs(d, t):
    cur = [i for i, (s, _) in enumerate(SUBS) if s <= t]
    if not cur:
        return
    i = cur[-1]
    start, txt = SUBS[i]
    end = SUBS[i + 1][0] if i + 1 < len(SUBS) else DUR
    if t > end - 0.05 or (i == len(SUBS) - 1 and t > 28.0):
        return
    words = txt.split(' ')
    shown = max(1, math.ceil(len(words) * min(1, (t - start) / max(0.3, (end - start) * 0.7))))
    f = FONT(FRED, 42)
    lines, line = [], []
    for w in words:                                                  # coupe en lignes de 600 px max
        if line and d.textlength(' '.join(x.strip('*') for x in line + [w]), font=f) > 600:
            lines.append(line)
            line = []
        line.append(w)
    lines.append(line)
    y = 830 - (len(lines) - 1) * 26
    n = 0
    for ln in lines:
        wtot = d.textlength(' '.join(x.replace('*', '') for x in ln), font=f)
        x = W / 2 - wtot / 2
        for w in ln:
            n += 1
            green = '*' in w
            s = w.replace('*', '')
            if n <= shown:
                d.text((x, y), s, font=f, fill=GREEN if green else WHITE, anchor='lm', stroke_width=5, stroke_fill=INK)
            x += d.textlength(s + ' ', font=f)
        y += 54


def frame(t):
    img = Image.new('RGB', (W, H), BG)
    d = ImageDraw.Draw(img)
    for i in range(0, H, 8):                                         # dégradé de nuit
        c = int(11 + 10 * i / H)
        d.line([0, i, W, i], fill=(c, c + 7, 48 + int(20 * i / H)))
    rs = random.Random(7)
    for _ in range(70):                                              # étoiles
        x, y = rs.random() * W, rs.random() * 520
        b = 120 + int(100 * (0.5 + 0.5 * math.sin(t * 3 + x)))
        d.point((x, y), fill=(b, b, b))
    if t < T_CHART:
        draw_pond(img, d, t, pond_day(t))
    elif t < T_RSI:
        draw_chart(img, d, t)
    elif t < T_ALIGN:
        draw_rsi(img, d, t)
    elif t < T_QUESTION:
        draw_align(img, d, t)
    elif t < T_CARD:
        draw_pond(img, d, t, 27, label=f'JOUR {int(t * 23) % 30 + 1:02d}' if t < T_CARD - 0.3 else 'JOUR ??')
    else:
        draw_card(img, d, t)
    draw_subs(d, t)
    d.text((W / 2, 1238), 'APERÇU · pas encore l’animation finale', font=FONT(MONO, 16), fill='#56608F', anchor='mm')
    # flash aux changements d'idée
    for tc in (T_CHART, T_RSI, T_ALIGN, T_QUESTION, T_CARD):
        if 0 <= t - tc < 0.12:
            img = Image.blend(img, Image.new('RGB', (W, H), WHITE), 0.5 * (1 - (t - tc) / 0.12))
    return img


def main():
    out = os.path.join(HERE, 'out')
    os.makedirs(out, exist_ok=True)
    voix = os.path.join(HERE, 'media', 'voix_ia', 'voix.wav')
    music = os.path.join(HERE, '..', 'reel-la-source', 'media', 'music2', 'GROOVE.mp3')
    dst = os.path.join(out, 'EXPONENTIEL-apercu.mp4')
    # musique 20 dB sous la voix, coupée net sur « on est à quel jour ? », accord final avec le carton
    af = (f'[1:a]atrim=0:{T_QUESTION},volume=-20dB,afade=t=in:d=0.4,afade=t=out:st={T_QUESTION - 0.3}:d=0.3,apad[m];'
          f'[0:a][m]amix=inputs=2:duration=first:normalize=0,apad,atrim=0:{DUR},loudnorm=I=-14:TP=-1.5[a]')
    p = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}',
                          '-r', str(FPS), '-i', '-', '-i', voix, '-i', music, '-filter_complex',
                          af.replace('[1:a]', '[2:a]').replace('[0:a]', '[1:a]'), '-map', '0:v', '-map', '[a]',
                          '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '21', '-preset', 'medium',
                          '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', '-t', str(DUR), dst],
                         stdin=subprocess.PIPE)
    for i in range(int(DUR * FPS)):
        p.stdin.write(frame(i / FPS).tobytes())
    p.stdin.close()
    p.wait()
    print(dst)


if __name__ == '__main__':
    main()
