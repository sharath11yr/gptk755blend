"""Turn a voiced saga episode (props_short.json from voice.py) into a 3D shot list with fast cuts.
python saga_shots.py <props_short.json> <shots.json>"""
import json, sys
ep = json.load(open(sys.argv[1]))["ep"]; scenes = ep["short_scenes"]
ROLE = {"kai": "john", "mia": "mia", "leo": "leo", "nana": "nana", "zor": "zor"}
ACT = {"walk": "walk", "scared": "scared", "brave": "raise", "point": "point", "hug": "hug", "crouch": "scared"}
shots = []; start = 0
for sc in scenes:
    n = max(12, round(sc.get("frames", 60) / 30 * 24))
    if sc.get("type") != "saga":           # the opening cover: an establishing shot of the first scene
        nxt = next((s for s in scenes if s.get("type") == "saga"), None)
        if not nxt: start += n; continue
        sc = dict(nxt, expr="calm")
    cast = sc.get("cast") or []
    chars = []
    for i, c in enumerate(cast):
        x = (c.get("x", 540) - 540) / 540 * 2.2
        chars.append({"who": ROLE.get(c.get("role", "kai"), "john"), "x": x, "rot": (0.35 if x < 0 else -0.35) if len(cast) > 1 else 0,
                      "expr": "love" if c.get("expr") == "love" else c.get("expr", "calm"), "act": ACT.get(c.get("pose", "stand"), "idle"),
                      "dx": 0.8 if c.get("pose") == "walk" else 0})
    base = {"set": sc.get("bg", "savanna"), "chars": chars, "animal": sc.get("animal", "none"), "fire": sc.get("fire", False),
            "firex": ((sc.get("firex") or 760) - 540) / 540 * 2.2, "heart": sc.get("heart", False)}
    # cut every ~1.5-2 s: wide -> close on the lead -> reaction / low angle
    plan = ["wide", "close", "two" if len(chars) > 1 else "low", "close"]
    k = max(1, min(4, round(n / 42))); parts = [n // k + (1 if i < n % k else 0) for i in range(k)]
    for i, m in enumerate(parts):
        foc = (i // 2) % max(1, len(chars))
        shots.append({**base, "start": start, "len": m, "cam": plan[i % 4], "focus": foc}); start += m
json.dump(shots, open(sys.argv[2], "w"), indent=0); print(len(shots), "shots,", start, "frames")
