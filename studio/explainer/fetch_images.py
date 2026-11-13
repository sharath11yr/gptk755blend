"""Before voicing: download a freely licensed photo (Wikimedia Commons) for every "image" scene.
  python fetch_images.py <episode.json>   (writes public/img/*.jpg and updates the episode, credits -> credits.txt)"""
import json, re, sys, time
from pathlib import Path
import httpx
ep_file = Path(sys.argv[1]); ep = json.loads(ep_file.read_text())
pub = Path("public/img"); pub.mkdir(parents=True, exist_ok=True)
OK = ("cc0", "public domain", "cc by", "cc-by", "pd")
UA = {"User-Agent": "GetYrStudio/1.0 (https://github.com/sharath11yr; educational videos)"}
credits, n = [], 0
for sc in ep.get("scenes", []):
    if sc.get("type") != "image" or sc.get("src"):
        continue
    try:
        r = httpx.get("https://commons.wikimedia.org/w/api.php", timeout=30, headers=UA, params={
            "action": "query", "format": "json", "generator": "search", "gsrnamespace": 6, "gsrlimit": 10,
            "gsrsearch": f"filetype:bitmap {sc['query']}", "prop": "imageinfo", "iiprop": "url|extmetadata|size", "iiurlwidth": 1600})
        pages = sorted((r.json().get("query") or {}).get("pages", {}).values(), key=lambda p: p.get("index", 99))
        for pg in pages:
            ii = (pg.get("imageinfo") or [{}])[0]; md = ii.get("extmetadata") or {}
            lic = (md.get("LicenseShortName", {}).get("value") or "").lower()
            if not any(x in lic for x in OK) or ii.get("width", 0) < 800:
                continue
            img = None
            for wait in (0, 4, 10, 20):
                time.sleep(wait + 1.5)
                img = httpx.get(ii.get("thumburl") or ii["url"], timeout=60, headers=UA, follow_redirects=True)
                if img.status_code != 429:
                    break
            if img is None or img.status_code >= 400:
                continue
            n += 1; name = f"img/{n}.jpg"; (Path("public") / name).write_bytes(img.content)
            artist = re.sub(r"<[^>]+>", "", md.get("Artist", {}).get("value") or "Wikimedia Commons").strip()[:60]
            sc["src"] = name; sc["credit"] = f"{artist} / {md.get('LicenseShortName', {}).get('value', '')}"
            credits.append(f"{pg.get('title', '').replace('File:', '')} - {sc['credit']} - {ii.get('descriptionurl', '')}")
            print("image:", sc["query"], "->", pg.get("title")); break
    except Exception as exc:
        print("image search failed:", sc.get("query"), exc)
    if not sc.get("src"):
        print("NO IMAGE for", sc.get("query"), "- shown as a diagram card")
        sc.update({"type": "diagram", "parts": [{"id": "a", "label": sc.get("label") or sc["query"], "x": 50, "y": 50, "shape": "pill"}], "arrows": [], "steps": [{"highlight": ["a"], "note": ""}]})
ep_file.write_text(json.dumps(ep, ensure_ascii=False, indent=1))
Path("out").mkdir(exist_ok=True); Path("out/credits.txt").write_text("\n".join(credits))
