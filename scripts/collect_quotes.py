# -*- coding: utf-8 -*-
"""Validate the local classic quote cache and mark it refreshed."""
import json
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
Q = ROOT / "data" / "cache" / "quotes.json"


def main():
    if not Q.exists():
        print("missing", Q, file=sys.stderr)
        return 1
    data = json.loads(Q.read_text(encoding="utf-8"))
    if not isinstance(data, list) or not data:
        print("quotes.json must be a non-empty array", file=sys.stderr)
        return 1
    for i, q in enumerate(data, 1):
        for k in ("text", "src", "analysis", "usage"):
            if not isinstance(q, dict) or not q.get(k):
                print("quote %d missing %s" % (i, k), file=sys.stderr)
                return 1
    os.utime(Q, None)
    print("classics: %d quotes validated; mtime refreshed" % len(data))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
