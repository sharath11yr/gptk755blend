"""Finds a real, legally usable 3D model for any subject, fully automatically.

Sources (all free, commercial use allowed):
  * Objaverse (allenai/objaverse on Hugging Face): ~800k Sketchfab models with their
    licence. Only CC0 / CC-BY / CC-BY-SA are used (never NonCommercial / NoDerivs).
  * NASA 3D Resources (github.com/nasa/NASA-3D-Resources): public domain spacecraft.

Steps: keyword search in a compact index (built once, then cached by GitHub Actions) ->
download the best candidates -> Blender renders a preview of each -> a free NVIDIA vision
model scores realism and period accuracy -> the best model wins (credit line saved).

    python studio/asset_finder.py <out_dir> "<what>" "<period/context>" kw1 kw2 ...
"""
import base64, concurrent.futures as cf, gzip, json, os, re, subprocess, sys
from pathlib import Path
import httpx

HF = "https://huggingface.co/datasets/allenai/objaverse/resolve/main"
INDEX = Path(os.getenv("OBJAVERSE_INDEX", "cache/objaverse_index.jsonl.gz"))
OK_LICENCES = {"cc0": "CC0", "by": "CC BY 4.0", "by-sa": "CC BY-SA 4.0"}
BLENDER = os.getenv("BLENDER", "blender")
HERE = Path(__file__).parent
log = lambda *a: print(*a, file=sys.stderr, flush=True)


# ---------------- index ----------------
def _licence(lic: str) -> str | None:
    l = (lic or "").lower()
    if "noncommercial" in l or "-nc" in l or " nc" in l or "noderiv" in l or "-nd" in l:
        return None
    if "cc0" in l or "public domain" in l:
        return "cc0"
    if "sharealike" in l or "by-sa" in l:
        return "by-sa"
    if "attribution" in l or l in ("by", "cc-by", "cc by"):
        return "by"
    return None


def _shard(i: int) -> list[dict]:
    url = f"{HF}/metadata/000-{i:03d}.json.gz"
    for _ in range(3):
        try:
            data = json.loads(gzip.decompress(httpx.get(url, timeout=300, follow_redirects=True).content))
            break
        except Exception as exc:
            log("shard", i, "retry:", exc)
    else:
        return []
    rows = []
    for uid, m in data.items():
        lic = _licence(m.get("license", ""))
        faces = m.get("faceCount") or 0
        if not lic or faces > 1_500_000 or faces < 2000:
            continue
        rows.append({"u": uid, "n": m.get("name", ""), "l": lic, "f": faces,
                     "k": m.get("likeCount") or 0, "a": (m.get("user") or {}).get("displayName", ""),
                     "t": " ".join(t.get("name", "") for t in m.get("tags", [])),
                     "d": (m.get("description") or "")[:200]})
    return rows


def build_index() -> None:
    if INDEX.exists():
        return
    log("Building the Objaverse index (once; cached afterwards)...")
    INDEX.parent.mkdir(parents=True, exist_ok=True)
    paths = json.loads(gzip.decompress(httpx.get(f"{HF}/object-paths.json.gz", timeout=300,
                                                 follow_redirects=True).content))
    n = 0
    with gzip.open(INDEX, "wt") as out, cf.ThreadPoolExecutor(12) as ex:
        for rows in ex.map(_shard, range(160)):
            for r in rows:
                if r["u"] in paths:
                    r["p"] = paths[r["u"]]
                    out.write(json.dumps(r) + "\n"); n += 1
    log("Index ready:", n, "commercially usable models")


def search(keywords: list[str], limit: int = 12) -> list[dict]:
    kws = [k.lower() for k in keywords]
    main = kws[0]
    hits = []
    with gzip.open(INDEX, "rt") as f:
        for line in f:
            r = json.loads(line)
            name, text = r["n"].lower(), f'{r["n"]} {r["t"]} {r["d"]}'.lower()
            score = sum(3 if k in name else 1 for k in kws if k in text)
            if main not in text or score < 3:
                continue
            if re.search(r"lego|minecraft|toy|cartoon|low ?poly|lowpoly|stylized|chibi|kit", text):
                score -= 4
            hits.append((score + min(r["k"], 200) / 40 + min(r["f"], 400_000) / 200_000, r))
    hits.sort(key=lambda x: -x[0])
    return [r for _, r in hits[:limit]]


def nasa(keywords: list[str], limit: int = 4) -> list[dict]:
    try:
        tree = httpx.get("https://api.github.com/repos/nasa/NASA-3D-Resources/git/trees/master?recursive=1",
                         timeout=120).json()["tree"]
    except Exception as exc:
        log("NASA list failed:", exc); return []
    out = []
    for t in tree:
        p = t["path"]
        if p.lower().endswith(".glb") and all(k.lower() in p.lower() for k in keywords[:1]):
            out.append({"u": "nasa-" + str(len(out)), "n": Path(p).stem, "l": "pd", "a": "NASA",
                        "url": f"https://raw.githubusercontent.com/nasa/NASA-3D-Resources/master/{p}"})
    return out[:limit]


# ---------------- judge ----------------
def preview(glb: Path, png: Path) -> bool:
    r = subprocess.run([BLENDER, "-b", "-noaudio", "-P", str(HERE / "preview_model.py"), "--",
                        str(glb), str(png)], capture_output=True, text=True, timeout=900)
    if not png.exists():
        log("preview failed:", r.stdout[-400:], r.stderr[-400:])
    return png.exists()


def judge(png: Path, what: str, period: str) -> float:
    img = base64.b64encode(png.read_bytes()).decode()
    q = (f"This is a render of a 3D model. We need: {what}. Period/context: {period}. "
         "Rate 0-10 how well it fits a realistic cinematic documentary: is it the right "
         "object, historically accurate for that period, detailed and realistic (not a toy, "
         "cartoon, low-poly or broken mesh)? Reply only JSON: {\"score\": <0-10>, \"why\": \"...\"}")
    for model in ("meta/llama-3.2-90b-vision-instruct", "meta/llama-3.2-11b-vision-instruct",
                  "microsoft/phi-3.5-vision-instruct"):
        try:
            r = httpx.post("https://integrate.api.nvidia.com/v1/chat/completions", timeout=180,
                           headers={"Authorization": f"Bearer {os.environ['NVIDIA_API_KEY']}"},
                           json={"model": model, "max_tokens": 300, "temperature": 0.1,
                                 "messages": [{"role": "user", "content": [
                                     {"type": "text", "text": q},
                                     {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{img}"}}]}]})
            r.raise_for_status()
            txt = r.json()["choices"][0]["message"]["content"]
            m = re.search(r'"score"\s*:\s*([0-9.]+)', txt) or re.search(r"([0-9.]+)\s*/\s*10", txt)
            log("  vision", model.split("/")[1], "->", txt.strip()[:200])
            if m:
                return float(m.group(1))
        except Exception as exc:
            log("  vision model failed:", model, str(exc)[:200])
    return -1.0  # no judge available: fall back to search ranking


def find(out: Path, what: str, period: str, keywords: list[str], tries: int = 6) -> dict | None:
    out.mkdir(parents=True, exist_ok=True)
    build_index()
    cands = nasa(keywords) if any(k in " ".join(keywords).lower() for k in
                                  ("apollo", "saturn", "shuttle", "rover", "iss", "lunar", "hubble")) else []
    cands += search(keywords)
    log("Candidates:", [(c["n"], c["l"], c.get("k")) for c in cands[:tries]])
    best, best_score = None, -99.0
    for i, c in enumerate(cands[:tries]):
        glb = out / f"cand_{i}.glb"
        try:
            url = c.get("url") or f"{HF}/{c['p']}"
            glb.write_bytes(httpx.get(url, timeout=600, follow_redirects=True).content)
        except Exception as exc:
            log("download failed:", c["n"], exc); continue
        png = out / f"cand_{i}.png"
        if not preview(glb, png):
            continue
        score = judge(png, what, period)
        score = score if score >= 0 else 5 - i * 0.5  # no vision: keep search order
        log(f"{c['n']}: score {score}")
        if score > best_score:
            best, best_score = (c, glb, png), score
        if score >= 8.5:
            break
    if not best or best_score < 4:
        log("No model good enough (best score", best_score, ")")
        return None
    c, glb, png = best
    final = out / "model.glb"; glb.replace(final); png.replace(out / "model_preview.png")
    src = ("https://nasa3d.arc.nasa.gov" if c["l"] == "pd" else f"https://sketchfab.com/3d-models/{c['u']}")
    credit = f'3D model: "{c["n"]}" by {c["a"]} ({OK_LICENCES.get(c["l"], "Public domain")}) - {src}'
    (out / "credit.txt").write_text(credit + "\n")
    for f in out.glob("cand_*"):
        f.unlink()
    log("Chosen:", credit, "score", best_score)
    return {"path": str(final), "credit": credit, "score": best_score}


if __name__ == "__main__":
    o, what, period, *kws = sys.argv[1:]
    sys.exit(0 if find(Path(o), what, period, kws) else 1)
