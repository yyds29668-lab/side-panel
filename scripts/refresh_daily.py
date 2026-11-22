# -*- coding: utf-8 -*-
"""当日指南成稿后刷新天气、资讯与 GitHub 热点。"""
import argparse
import os
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent


def run(name):
    print("\n=== %s ===" % name, flush=True)
    env = os.environ.copy()
    env["PYTHONIOENCODING"] = "utf-8"
    r = subprocess.run([sys.executable, str(HERE / name)], capture_output=True, text=True, encoding="utf-8", errors="replace", env=env)
    if r.stdout:
        print(r.stdout.strip())
    if r.stderr:
        print(r.stderr.strip()[:800])
    print("exit", r.returncode, flush=True)
    return r.returncode


def main():
    try:
        sys.stdout.reconfigure(errors="replace")
    except Exception:
        pass
    ap = argparse.ArgumentParser()
    ap.add_argument("--news-only", action="store_true")
    ap.add_argument("--weather-only", action="store_true")
    args = ap.parse_args()
    codes = []
    if not args.news_only:
        codes.append(run("collect_weather.py"))
    if not args.weather_only:
        codes.append(run("collect_news.py"))
    if not args.news_only and not args.weather_only:
        codes.append(run("collect_github.py"))
    print("\n面板每 60 秒看一次缓存 mtime，落盘后自动重读；也可点面板上的 ↻。")
    raise SystemExit(0 if all(c == 0 for c in codes) else 1)


if __name__ == "__main__":
    main()
