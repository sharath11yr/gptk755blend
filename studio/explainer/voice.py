"""Voice every scene (free Edge TTS), time each scene to its narration, make a music bed.
  python voice.py <episode.json> <public_dir> <props_out.json>"""
import json, subprocess, sys, time
from pathlib import Path
ep_file, pub, props = sys.argv[1], Path(sys.argv[2]), sys.argv[3]
ep = json.load(open(ep_file)); (pub / "audio").mkdir(parents=True, exist_ok=True)
FPS = 30
def dur(f):
    return float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(f)],
                                capture_output=True, text=True, check=True).stdout)
import re as _re
if not ep.get("short_scenes"):  # fallback: first sentences of the picked scenes, about 60 seconds
    picked, words = [], 0
    for i in (ep.get("short") or [0, 1, 2, 3]):
        if 0 <= i < len(ep["scenes"]) and ep["scenes"][i].get("type") != "question":
            sc = dict(ep["scenes"][i]); first = " ".join(_re.findall(r"[^.!?]+[.!?]", sc.get("narration", ""))[:2]) or sc.get("narration", "")
            sc["narration"] = first; words += len(first.split()); picked.append(sc)
            if words > 130: break
    ep["short_scenes"] = picked
if ep.get("short_scenes"):
    if ep["short_scenes"][-1].get("type") not in ("lab-outro", "outro") and not ep.get("story"):
        ep["short_scenes"].append({"type": "lab-outro" if ep.get("style") == "lab" else "outro", "title": (ep.get("title") or "").upper()[:40],
            "lines": [], "cta": "Full video on our channel", "narration": "For the detailed explanation, watch the full video on our channel."})
    if ep.get("style") == "lab":  # first frame = bold cover (Shorts thumbnail / Reel cover)
        order = ["stick", "rectifier", "image", "code", "network", "story", "screen", "installer", "chart", "diagram", "array", "terminal", "capacitor", "wave", "phone", "flow"]
        pool = [x for x in ep["short_scenes"] + ep["scenes"] if x.get("type") in order]
        best = min(pool, key=lambda x: order.index(x["type"]), default=None)
        ep["short_scenes"].insert(0, {"type": "cover", "cover": ep.get("cover") or ep.get("title", ""), "cover_highlight": ep.get("cover_highlight", ""),
                                      "narration": "", "visual": dict(best, frames=300) if best else None})
jobs = [(f"s{i}", s) for i, s in enumerate(ep["scenes"])] + [(f"sh{i}", s) for i, s in enumerate(ep.get("short_scenes", []))]
KOKORO = None
def kokoro_say(text, voice, speed, wav):
    """Kokoro: free, open-source voice that runs on this machine (default: af_heart)."""
    global KOKORO
    from kokoro import KPipeline
    import soundfile as sf, numpy as np
    if KOKORO is None:
        KOKORO = KPipeline(lang_code=voice[0])
    audio = np.concatenate([a for _, _, a in KOKORO(text, voice=voice, speed=speed)])
    sf.write(str(wav), audio, 24000)

engine = ep.get("engine", "kokoro")
for key, s in jobs:
    i = key
    if s.get("type") == "cover":
        s["frames"] = 24; s["audio"] = False; continue  # silent 0.8 s cover
    f = pub / "audio" / f"{key}.mp3"
    if engine == "kokoro":
        wav = f.with_suffix(".wav")
        kokoro_say(s["narration"], ep.get("kokoro_voice", "af_heart"), float(ep.get("speed", 1.05)), wav)
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(wav), "-b:a", "160k", str(f)], check=True); wav.unlink()
    else:
      for attempt in range(8):
        v = ep.get("voice", "en-US-AndrewMultilingualNeural") if attempt < 5 else "en-US-GuyNeural"
        r = subprocess.run(["edge-tts", "--voice", v, f"--rate={ep.get('rate', '+4%')}", "--text", s["narration"], "--write-media", str(f)], capture_output=True, text=True)
        if r.returncode == 0 and f.exists() and f.stat().st_size > 2000:
            break
        print("voice retry", i, r.stderr[-150:]); time.sleep(3 * (attempt + 1))
    d = dur(f); s["audio"] = True; s["audio_key"] = key
    pad = 0.9 if s["type"] in ("title", "outro", "lab-title", "lab-outro") else 0.3
    if s["type"] == "question" and not s.get("reveal"):
        pad = 3.4  # silent on-screen 3-2-1 after the question is asked
    s["frames"] = int((d + pad) * FPS)
    print(f"scene {key:5s} {s['type']:9s} {d:5.1f}s")
# keep the Short at 60 seconds or less: drop middle scenes (never the hook, cover or ending)
sh = ep.get("short_scenes") or []
while len(sh) > 4 and sum(x["frames"] for x in sh) / FPS > 60:
    sh.pop(len(sh) - 2)
total = sum(s["frames"] for s in ep["scenes"]) / FPS
json.dump({"ep": ep}, open(props, "w"))
json.dump({"ep": ep, "short": True}, open(props.replace(".json", "_short.json"), "w"))
# ---------------------------------------------------------------- music bed + sound effects (made here: no copyright)
import numpy as np
import soundfile as sf
SR = 48000
theme = (ep.get("theme") or "").split("-")[0]
def music(seconds):  # noqa
    if not ep.get("music"):  # no background music unless an episode asks for it (viewers found it irritating)
        return np.zeros(int(seconds * SR), dtype=np.float32)
    """Soft background bed. Lessons: calm major pad with a gentle pulse. News (ent): low tense pulse."""
    t = np.arange(int(seconds * SR)) / SR
    if theme == "ent":
        chords = [[110, 130.81, 164.81], [98, 116.54, 146.83], [87.31, 110, 130.81], [98, 123.47, 146.83]]
        bar = 4.0
    else:
        chords = [[130.81, 164.81, 196.0], [110, 130.81, 164.81], [87.31, 110, 130.81], [98, 123.47, 146.83]]
        bar = 4.0
    out = np.zeros_like(t)
    idx = (t // bar).astype(int) % len(chords)
    for k in range(3):
        f = np.array([c[k] for c in chords])[idx]
        out += 0.18 * np.sin(2 * np.pi * f * t) + 0.06 * np.sin(4 * np.pi * f * t)
    pulse = 0.55 + 0.45 * (0.5 + 0.5 * np.cos(2 * np.pi * t / (0.5 if theme == "ent" else 1.0)))
    out *= pulse
    fade = np.minimum(1, np.minimum(t / 3, (seconds - t) / 3)).clip(0, 1)
    return (out * fade * 0.5).astype(np.float32)

def tone(f, d, vol=0.5, decay=8.0):
    t = np.arange(int(d * SR)) / SR
    return (vol * np.sin(2 * np.pi * f * t) * np.exp(-decay * t)).astype(np.float32)

rng = np.random.default_rng(7)
def whoosh(d=0.45, vol=0.22):
    n = int(d * SR); x = rng.standard_normal(n).astype(np.float32)
    k = 40; x = np.convolve(x, np.ones(k) / k, mode="same")          # soften the noise
    env = np.sin(np.linspace(0, np.pi, n)) ** 2
    return (x * env * vol * 6).astype(np.float32)

def layer(*xs):
    n = max(len(x) for x in xs); out = np.zeros(n, dtype=np.float32)
    for x in xs: out[: len(x)] += x
    return out
SFX = {"whoosh": whoosh(), "tick": tone(1400, 0.07, 0.35, 60), "ding": layer(tone(1318.5, 0.7, 0.35, 5), tone(1760, 0.7, 0.2, 6)),
       "thump": layer(tone(70, 0.4, 0.6, 9), tone(140, 0.25, 0.3, 14)), "pop": tone(880, 0.12, 0.3, 30)}
def sfx_track(scenes, seconds, offset=0):
    track = np.zeros(int((seconds + 1) * SR), dtype=np.float32)
    def put(name, at):
        a = int(at * SR); x = SFX[name]; b = min(len(track), a + len(x))
        if 0 <= a < len(track): track[a:b] += x[: b - a]
    at = offset
    for i, sc in enumerate(scenes):
        d = sc["frames"] / FPS
        if i > 0: put("whoosh", max(0, at - 0.15))
        tp = sc.get("type")
        if tp == "question" and not sc.get("reveal"):
            for k in range(3): put("tick", at + d - (95 - 30 * k) / FPS)
        if tp == "question" and sc.get("reveal"): put("ding", at + 0.1)
        if tp == "stamp": put("thump", at + 0.15)
        if tp in ("steps", "phone"): put("pop", at + 0.3)
        at += d
    return track

def bed(scenes, path, offset=0):
    seconds = offset + sum(sc["frames"] for sc in scenes) / FPS
    m = music(seconds + 1); fx = sfx_track(scenes, seconds, offset)
    n = min(len(m), len(fx)); mix = m[:n] * 0.9 + fx[:n]
    mix = mix / max(1.0, float(np.abs(mix).max()) / 0.85)   # never clip
    sf.write(str(path), np.stack([mix, mix], axis=1), SR)

# ---------------- story (saga) soundtrack: mood music per scene + scene sound effects
def _noise(d, k=60):
    x = rng.standard_normal(int(d * SR)).astype(np.float32); return np.convolve(x, np.ones(k) / k, mode="same")
def heartbeat(d):
    out = np.zeros(int(d * SR), np.float32); b = layer(tone(55, 0.18, 0.9, 18), tone(110, 0.1, 0.3, 25))
    for t0 in np.arange(0, d, 0.8):
        for off in (0, 0.22):
            a = int((t0 + off) * SR); e = min(len(out), a + len(b)); out[a:e] += b[: e - a]
    return out
def growl(d=1.6):
    t = np.arange(int(d * SR)) / SR; n = _noise(d, 20) * 3
    return (n * (0.6 + 0.4 * np.sin(2 * np.pi * 28 * t)) * np.sin(np.pi * t / d) * 0.5).astype(np.float32)
def howl(d=2.2):
    t = np.arange(int(d * SR)) / SR; f = 420 + 260 * np.sin(np.pi * t / d)
    return (0.25 * np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * t / d)).astype(np.float32)
def thunder(d=2.5):
    t = np.arange(int(d * SR)) / SR; return (_noise(d, 200) * 9 * np.exp(-1.5 * t)).astype(np.float32)
def crackle(d):
    out = np.zeros(int(d * SR), np.float32)
    for a in rng.integers(0, len(out) - 500, int(d * 14)): out[a:a + 300] += rng.standard_normal(300).astype(np.float32) * 0.08 * np.exp(-np.arange(300) / 60)
    return out + _noise(d, 400) * 0.6
def wind(d):
    t = np.arange(int(d * SR)) / SR; return (_noise(d, 300) * 2.2 * (0.6 + 0.4 * np.sin(2 * np.pi * t / 3))).astype(np.float32)
def drums(d):
    out = np.zeros(int(d * SR), np.float32); k = layer(tone(60, 0.35, 0.9, 10), tone(120, 0.2, 0.4, 16))
    for i, t0 in enumerate(np.arange(0, d, 0.36)):
        a = int(t0 * SR); e = min(len(out), a + len(k)); out[a:e] += k[: e - a] * (1 if i % 4 in (0, 3) else 0.55)
    return out
MOODS = {  # chords (Hz) + level
    "mystery": ([[110, 130.81, 164.81], [103.83, 130.81, 155.56]], 0.20),
    "fear":    ([[73.42, 87.31, 103.83], [69.30, 82.41, 103.83]], 0.24),
    "action":  ([[82.41, 98, 123.47], [73.42, 92.5, 110]], 0.22),
    "love":    ([[261.63, 329.63, 392], [220, 261.63, 329.63], [174.61, 220, 261.63], [196, 246.94, 293.66]], 0.16),
    "hope":    ([[196, 246.94, 293.66], [261.63, 329.63, 392]], 0.16),
    "sad":     ([[220, 261.63, 329.63], [174.61, 220, 261.63]], 0.15),
}
def scene_mood(sc):
    t = (sc.get("caption", "") + " " + sc.get("narration", "")).lower()
    if sc.get("heart") or any(w in t for w in ("kiss", "love", "smiled", "hand", "arms", "baby")): return "love"
    if sc.get("animal") in ("lion", "wolf") or any(w in t for w in ("charge", "leapt", "club", "fight", "raid", "attack")): return "action"
    if any(w in t for w in ("blood", "dark", "scream", "howl", "watching", "storm", "fell", "taken", "shake")): return "fear"
    if any(w in t for w in ("peace", "home", "together", "fire.", "journey")): return "hope"
    return "mystery"
def saga_bed(scenes, path, offset=0):
    seconds = offset + sum(sc["frames"] for sc in scenes) / FPS; n = int((seconds + 1) * SR)
    mus = np.zeros(n, np.float32); fx = np.zeros(n, np.float32)
    def put(buf, x, at, g=1.0):
        a = int(at * SR); e = min(len(buf), a + len(x))
        if 0 <= a < len(buf): buf[a:e] += x[: e - a] * g
    at = offset
    for i, sc in enumerate(scenes):
        d = sc["frames"] / FPS; mood = scene_mood(sc) if sc.get("type") == "saga" else "mystery"
        chords, lvl = MOODS[mood]; t = np.arange(int(d * SR)) / SR
        seg = np.zeros_like(t)
        idx = ((t + at) // 2.0).astype(int) % len(chords)
        for k in range(3):
            f = np.array([c[k] for c in chords])[idx]; seg += np.sin(2 * np.pi * f * t) + 0.3 * np.sin(4 * np.pi * f * t)
        seg += 1.4 * np.sin(2 * np.pi * chords[0][0] / 2 * t)                   # low drone
        env = np.minimum(1, np.minimum(t / 0.4, (d - t) / 0.4)).clip(0, 1)
        put(mus, (seg * env * lvl * 0.25).astype(np.float32), at)
        if mood == "fear": put(fx, heartbeat(d), at, 0.8)
        if mood == "action": put(fx, drums(d), at, 0.7)
        if sc.get("animal") == "lion": put(fx, growl(), at + 0.3, 1.0)
        if sc.get("animal") == "wolf": put(fx, howl(), at + 0.2, 1.0)
        if sc.get("fire"): put(fx, crackle(d), at, 0.7)
        if sc.get("bg") == "ice": put(fx, wind(d), at, 0.6)
        if "storm" in (sc.get("caption", "") + sc.get("narration", "")).lower() or "thunder" in sc.get("narration", "").lower(): put(fx, thunder(), at + 0.2, 1.0)
        if i > 0: put(fx, whoosh(0.4, 0.15), max(0, at - 0.1))
        at += d
    mix = mus + fx; mix = mix / max(1.0, float(np.abs(mix).max()) / 0.8)
    sf.write(str(path), np.stack([mix, mix], axis=1), SR)

if ep.get("saga"):
    saga_bed(ep.get("short_scenes", []), pub / "music_short.wav")
    print("saga soundtrack ready"); raise SystemExit
bed(ep["scenes"], pub / "music.wav")
if ep.get("short_scenes"):
    bed(ep["short_scenes"], pub / "music_short.wav")
print(f"total {total / 60:.1f} min")
