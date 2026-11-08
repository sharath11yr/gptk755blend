"""Titanic test - step 1: narration (NVIDIA LLM + free Edge voice), a licensed 3D model
(Sketchfab, commercial-use licences only) and a night-sky HDRI (Poly Haven, CC0).
Prints frames=<n> for the render jobs."""
import json, math, os, subprocess, sys, zipfile, io
from pathlib import Path
import httpx

OUT = Path(sys.argv[1]); OUT.mkdir(parents=True, exist_ok=True)
log = lambda *a: print(*a, file=sys.stderr)

# 1. Narration
prompt = ("Write a 110-130 word cinematic documentary narration, present tense, for a scene: "
          "RMS Titanic sailing across the calm, freezing North Atlantic on the night of 14 April "
          "1912, moments before the iceberg. Only well-established historical facts (date, place, "
          "speed about 22 knots, around 2,200 people aboard, a calm, moonless night with a sky full of bright stars and a flat sea). No people "
          "speak. End with: 'Travel through history with GetYr Studio.' Return only the narration.")
r = httpx.post("https://integrate.api.nvidia.com/v1/chat/completions", timeout=300,
               headers={"Authorization": f"Bearer {os.environ['NVIDIA_API_KEY']}"},
               json={"model": "nvidia/nemotron-3.5-lightning-30b-a3b", "temperature": 0.5,
                     "max_tokens": 1500, "messages": [{"role": "user", "content": prompt}],
                     "chat_template_kwargs": {"thinking": False, "enable_thinking": False}})
r.raise_for_status()
text = r.json()["choices"][0]["message"]["content"].strip().strip('"')
(OUT / "narration.txt").write_text(text)
log("NARRATION:", text)
subprocess.run(["edge-tts", "--voice", "en-US-ChristopherNeural", "--rate=-8%",
                "--file", str(OUT / "narration.txt"), "--write-media", str(OUT / "narration.mp3")],
               check=True)
dur = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of",
                            "csv=p=0", str(OUT / "narration.mp3")], capture_output=True,
                           text=True, check=True).stdout)

# 2. Licensed 3D model from Sketchfab
H = {"Authorization": f"Token {os.environ['SKETCHFAB_API_TOKEN']}"}
LICENCES = {"cc0": "CC0 Public Domain", "by": "CC Attribution", "by-sa": "CC Attribution-ShareAlike"}
ok, seen = [], set()
for q in ("titanic", "titanic ship", "ocean liner", "steamship"):
    for lic, label in LICENCES.items():  # only licences that allow commercial use
        r = httpx.get("https://api.sketchfab.com/v3/search", timeout=60, follow_redirects=True,
                      headers={"User-Agent": "GetYrStudio/1.0"}, params={
                          "type": "models", "q": q, "downloadable": "true", "license": lic,
                          "count": 24})
        for m in (r.json().get("results", []) if r.status_code == 200 and r.content else []):
            faces = m.get("faceCount") or 0
            if m["uid"] not in seen and faces < 1_500_000:
                seen.add(m["uid"]); m["_licence"] = label; ok.append(m)
    log("Sketchfab search", q, "->", len(ok), "licensed models so far")
    if len(ok) >= 8:
        break
ok.sort(key=lambda m: -(m.get("likeCount") or 0))
log("Candidates:", [(m["name"], m["_licence"], m.get("faceCount")) for m in ok[:6]])
for m in ok:
    try:
        d = httpx.get(f"https://api.sketchfab.com/v3/models/{m['uid']}/download", headers=H,
                      timeout=60, follow_redirects=True).json()
        url = (d.get("gltf") or {}).get("url")
        if not url:
            continue
        zipfile.ZipFile(io.BytesIO(httpx.get(url, timeout=300).content)).extractall(OUT / "model")
        (OUT / "credit.txt").write_text(
            f'3D model: "{m["name"]}" by {m["user"]["displayName"]} '
            f'({m["_licence"]}) - https://sketchfab.com/3d-models/{m["uid"]}\n')
        log("Using model:", m["name"], "by", m["user"]["displayName"])
        break
    except Exception as exc:
        log("Model failed:", m["name"], exc)
else:
    sys.exit("No usable licensed Titanic model found")

# 3. Night sky (Poly Haven, CC0) - optional
try:
    files = httpx.get("https://api.polyhaven.com/files/dikhololo_night", timeout=60).json()
    (OUT / "sky.hdr").write_bytes(httpx.get(files["hdri"]["2k"]["hdr"]["url"], timeout=300).content)
except Exception as exc:
    log("HDRI skipped:", exc)

print(f"frames={math.ceil((dur + 3) * 24)}")
