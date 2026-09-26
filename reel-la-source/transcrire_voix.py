#!/usr/bin/env python3
"""Reconnaissance vocale de la voix enregistrée (mots + instants) → media/voix/asr.json.

  pip install sherpa-onnx
  curl -L -o fr.tar.bz2 https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/sherpa-onnx-streaming-zipformer-fr-2023-04-14.tar.bz2
  tar xjf fr.tar.bz2          # modèle français (Hugging Face est bloqué ici, GitHub non)
  ffmpeg -i export.mov -vn -ac 1 -ar 16000 media/voix/voix16k.wav
  python3 transcrire_voix.py --model sherpa-onnx-streaming-zipformer-fr-2023-04-14
  python3 transcrire_voix.py --model … --from 60.8 --to 66.2 --beam    # réécouter un passage douteux
  python3 transcrire_voix.py --whisper sherpa-onnx-whisper-turbo       # texte fidèle (Whisper large-v3-turbo,
      même dépôt GitHub : sherpa-onnx-whisper-turbo.tar.bz2), par tranches entre les silences

Ensuite `node aligne_voix.js` cale le texte de VOIX (ce qui a vraiment été dit) sur ces instants.
"""
import argparse
import json
import os
import wave

import numpy as np
import sherpa_onnx

HERE = os.path.dirname(os.path.abspath(__file__))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--model', required=True)
    ap.add_argument('--wav', default=os.path.join(HERE, 'media', 'voix', 'voix16k.wav'))
    ap.add_argument('--from', dest='t0', type=float)
    ap.add_argument('--to', dest='t1', type=float)
    ap.add_argument('--beam', action='store_true')
    ap.add_argument('--whisper')
    a = ap.parse_args()
    if a.whisper:
        return whisper(a)
    M = a.model.rstrip('/') + '/'
    rec = sherpa_onnx.OnlineRecognizer.from_transducer(
        tokens=M + 'tokens.txt', encoder=M + 'encoder-epoch-29-avg-9-with-averaged-model.int8.onnx',
        decoder=M + 'decoder-epoch-29-avg-9-with-averaged-model.int8.onnx',
        joiner=M + 'joiner-epoch-29-avg-9-with-averaged-model.int8.onnx',
        num_threads=4, sample_rate=16000, feature_dim=80, enable_endpoint_detection=False,
        decoding_method='modified_beam_search' if a.beam else 'greedy_search', max_active_paths=8)
    w = wave.open(a.wav)
    x = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768
    if a.t0 is not None:
        x = x[int(a.t0 * 16000):int((a.t1 or len(x) / 16000) * 16000)]
    s = rec.create_stream()
    for i in range(0, len(x), 1600):
        s.accept_waveform(16000, x[i:i + 1600])
        while rec.is_ready(s):
            rec.decode_stream(s)
    s.accept_waveform(16000, np.zeros(16000, dtype=np.float32))
    s.input_finished()
    while rec.is_ready(s):
        rec.decode_stream(s)
    r = rec.get_result_all(s)
    print(r.text)
    if a.t0 is None:
        with open(os.path.join(HERE, 'media', 'voix', 'asr.json'), 'w') as f:
            json.dump({'text': r.text, 'tokens': list(r.tokens), 'ts': list(r.timestamps)}, f, ensure_ascii=False)


def whisper(a):
    """Texte seul (Whisper ne donne pas d'instants fiables ici) : sert à corriger VOIX."""
    W = a.whisper.rstrip('/') + '/'
    rec = sherpa_onnx.OfflineRecognizer.from_whisper(
        encoder=W + 'turbo-encoder.int8.onnx', decoder=W + 'turbo-decoder.int8.onnx',
        tokens=W + 'turbo-tokens.txt', language='fr', task='transcribe', num_threads=4)
    w = wave.open(a.wav)
    x = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768
    asr = json.load(open(os.path.join(HERE, 'media', 'voix', 'asr.json')))
    starts = [t for tok, t in zip(asr['tokens'], asr['ts']) if tok.startswith(' ')]
    cuts = [0.0]
    for p, q in zip(starts, starts[1:]):
        if q - p >= 0.9 and (p + q) / 2 - cuts[-1] >= 4:
            cuts.append((p + 0.3 + q) / 2)
    cuts.append(len(x) / 16000)
    for c0, c1 in zip(cuts, cuts[1:]):
        s = rec.create_stream()
        s.accept_waveform(16000, x[int(c0 * 16000):int(c1 * 16000)])
        rec.decode_stream(s)
        print(f'{c0:6.2f}-{c1:6.2f}: {s.result.text.strip()}')


if __name__ == '__main__':
    main()
