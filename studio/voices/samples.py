"""Make the same lesson paragraph in many free voices, so we can pick one by ear."""
import subprocess, sys
from pathlib import Path
out = Path("voice-samples"); out.mkdir(exist_ok=True)
TEXT = ("Now the negative half-cycle. The right side of the source becomes positive. This time D3 and D4 conduct, "
        "and D1 and D2 switch off. Here's the clever part. The current still flows through the load in the same "
        "direction. Quick question: which two diodes conduct now? Pause and think.")
EDGE = {"01_edge_IN_Prabhat_male": "en-IN-PrabhatNeural", "02_edge_IN_Neerja_female": "en-IN-NeerjaExpressiveNeural",
        "03_edge_US_Brian_male": "en-US-BrianMultilingualNeural", "04_edge_US_Christopher_male": "en-US-ChristopherNeural",
        "05_edge_US_Guy_male": "en-US-GuyNeural", "06_edge_US_Ava_female": "en-US-AvaMultilingualNeural",
        "07_edge_US_Emma_female": "en-US-EmmaMultilingualNeural", "08_edge_UK_Ryan_male": "en-GB-RyanNeural",
        "09_edge_UK_Sonia_female": "en-GB-SoniaNeural", "10_edge_US_Andrew_current": "en-US-AndrewMultilingualNeural"}
for name, v in EDGE.items():
    r = subprocess.run(["edge-tts", "--voice", v, "--rate=+4%", "--text", TEXT, "--write-media", str(out / f"{name}.mp3")], capture_output=True, text=True)
    print(name, "ok" if r.returncode == 0 else r.stderr[-200:])
try:
    from kokoro import KPipeline
    import soundfile as sf, numpy as np
    KOK = {"11_kokoro_US_Heart_female": ("a", "af_heart"), "12_kokoro_US_Michael_male": ("a", "am_michael"),
           "13_kokoro_US_Fenrir_male": ("a", "am_fenrir"), "14_kokoro_UK_George_male": ("b", "bm_george"),
           "15_kokoro_UK_Emma_female": ("b", "bf_emma")}
    pipes = {}
    for name, (lang, v) in KOK.items():
        p = pipes.setdefault(lang, KPipeline(lang_code=lang))
        audio = np.concatenate([a for _, _, a in p(TEXT, voice=v, speed=1.05)])
        sf.write(str(out / f"{name}.wav"), audio, 24000)
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(out / f"{name}.wav"), "-b:a", "128k", str(out / f"{name}.mp3")])
        (out / f"{name}.wav").unlink(); print(name, "ok")
except Exception as e:
    print("kokoro failed:", e)
