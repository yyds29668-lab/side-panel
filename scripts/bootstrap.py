# -*- coding: utf-8 -*-
"""Create data/ from the public demo data and a config from the example."""
import json
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
CACHE = DATA / "cache"
DEMO = ROOT / "data.demo"


def main():
    for d in (CACHE, DATA / "logs", DATA / "state", DATA / "backup"):
        d.mkdir(parents=True, exist_ok=True)
    src = DEMO / "cache" / "quotes.json"
    dst = CACHE / "quotes.json"
    if src.exists() and not dst.exists():
        shutil.copy2(src, dst)
        print("seeded data/cache/quotes.json")
    cfg = ROOT / "config.json"
    example = ROOT / "config.example.json"
    if not cfg.exists() and example.exists():
        shutil.copy2(example, cfg)
        print("created config.json")
    print("data ready:", DATA)
    print("Next: run collect_weather.py / collect_news.py / collect_github.py")
    print("Guide: python scripts\\import_guide.py --file today.json")


if __name__ == "__main__":
    main()
