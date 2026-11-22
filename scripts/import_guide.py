# -*- coding: utf-8 -*-
"""Validate a harness-produced today.json and install it into data/cache."""
import argparse
import json
import os
import sys
import tempfile
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "data" / "cache" / "today.json"
BACKUP = ROOT / "data" / "backup"


def die(msg):
    print("ERROR:", msg, file=sys.stderr)
    raise SystemExit(2)


def check(g):
    if not isinstance(g, dict):
        die("top-level JSON must be an object")
    for k in ("date", "weekday", "lunar", "ganzhi", "grade", "score", "hexagram", "summary", "one_thing", "yi", "ji", "windows", "five", "hours", "warnings"):
        if k not in g:
            die("missing field: " + k)
    try:
        datetime.strptime(str(g["date"]), "%Y-%m-%d")
    except Exception:
        die("date must be YYYY-MM-DD")
    h = g["hexagram"]
    if not isinstance(h, dict) or not h.get("primary") or not h.get("changed"):
        die("hexagram.primary/changed required")
    try:
        float(g["score"])
    except Exception:
        die("score must be numeric")
    for k in ("yi", "ji", "windows", "five", "hours", "warnings"):
        if not isinstance(g[k], list):
            die(k + " must be an array")
    for f in g["five"]:
        if not isinstance(f, dict) or "key" not in f or "state" not in f:
            die("five items need key/state")
        if int(f["state"]) not in (-1, 0, 1):
            die("five.state must be -1/0/1")
    if g.get("todo") is not None and not isinstance(g["todo"], list):
        die("todo must be an array when present")
    return g


def read_input(args):
    if args.file:
        return json.loads(Path(args.file).read_text(encoding="utf-8"))
    raw = sys.stdin.read()
    if not raw.strip():
        die("no JSON on stdin")
    return json.loads(raw)


def write_atomic(path, obj):
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp = tempfile.mkstemp(prefix=path.name + ".", suffix=".tmp", dir=str(path.parent))
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            json.dump(obj, f, ensure_ascii=False, indent=2)
            f.flush()
            os.fsync(f.fileno())
        os.replace(tmp, path)
    finally:
        if os.path.exists(tmp):
            os.unlink(tmp)


def main():
    ap = argparse.ArgumentParser(description="Install a harness-generated today.json")
    ap.add_argument("--file", "-f", help="JSON file; omit to read stdin")
    args = ap.parse_args()
    g = check(read_input(args))
    old = None
    if OUT.exists():
        try:
            old = json.loads(OUT.read_text(encoding="utf-8")).get("date")
        except Exception:
            old = None
    if old:
        BACKUP.mkdir(parents=True, exist_ok=True)
        (BACKUP / ("today-" + str(old) + ".json")).write_text(OUT.read_text(encoding="utf-8"), encoding="utf-8")
    write_atomic(OUT, g)
    print("installed", OUT)
    print("date", g["date"], "grade", g["grade"], "hexagram", g["hexagram"]["primary"], "->", g["hexagram"]["changed"])
    print("The panel will pick it up within 60 seconds; click the refresh button for an immediate re-read.")


if __name__ == "__main__":
    main()
