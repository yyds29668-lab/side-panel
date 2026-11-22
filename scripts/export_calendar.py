# -*- coding: utf-8 -*-
"""把 祈福求财月历/data.json 转成面板用的紧凑 JS。"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT.parent / "祈福求财月历" / "data.json"
OUT = ROOT / "design" / "plan-data.js"

data = json.loads(SRC.read_text(encoding="utf-8"))
cal = {}
for d in data["days"]:
    cal[d["date"]] = {
        "w": d["weekday"],
        "l": d["lunar"],
        "g": d["ganzhi"],
        "mw": d["ming_wu"],
        "aw": d["an_wu"],
        "s": [
            {
                "b": s["branch"],
                "t": s["time"],
                "g": s["ganzhi"],
                "k": s["luck"],
                "y": s["yi"],
                "j": s["ji"],
                "p": s["priority"],
                "m": s["matched_rituals"],
            }
            for s in d["slots"]
        ],
    }

OUT.write_text(
    "/* generated from 工具/祈福求财月历/data.json — do not edit */\n"
    "window.CAL=" + json.dumps(cal, ensure_ascii=False, separators=(",", ":")) + ";\n",
    encoding="utf-8",
)

print("days:", len(cal), "bytes:", OUT.stat().st_size)
for d in ("2026-11-21", "2026-11-22", "2026-11-23"):
    v = cal[d]
    print(d, v["w"], v["l"], v["g"], "ming_wu" if v["mw"] else "", "an_wu" if v["aw"] else "", "slots:", [(s["b"], s["t"], s["k"], s["p"]) for s in v["s"]])
nov = [v for k, v in cal.items() if k.startswith("2026-11")]
print("Nov days:", len(nov), "with slots:", sum(1 for v in nov if v["s"]), "total slots:", sum(len(v["s"]) for v in nov))
