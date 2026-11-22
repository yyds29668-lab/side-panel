# -*- coding: utf-8 -*-
"""侧屏面板数据层：只读展示 + 只写备忘。"""
import json
import os
import tempfile
import time
import uuid
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT / "data" / "cache"
DATA = ROOT / "data"
MEMO = DATA / "memo.json"
CLICKS = DATA / "clicks.json"

SEED_ACTIVE = [
    ("整理桌面", "今天"),
    ("读完手边一章", "本周"),
    ("把本周要交的东西列出来", "清单"),
    ("给家人打个电话", "今天"),
    ("散步 20 分钟", "今天"),
    ("整理一张灵感图", "清单"),
    ("把一件拖了很久的小事做完", "本周"),
    ("留半小时不看手机", "习惯"),
]
SEED_DONE = [
    ("整理桌面", "2026-11-21T22:10:00+08:00"),
    ("给家人打个电话", "2026-11-21T20:05:00+08:00"),
    ("散步 20 分钟", "2026-11-20T21:40:00+08:00"),
    ("读完手边一章", "2026-11-20T07:20:00+08:00"),
    ("整理一张灵感图", "2026-11-19T23:10:00+08:00"),
    ("留半小时不看手机", "2026-11-19T18:30:00+08:00"),
]

def now_iso():
    return datetime.now().astimezone().isoformat(timespec="seconds")


def atomic_write(path, obj):
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = None
    try:
        with tempfile.NamedTemporaryFile(mode="w", encoding="utf-8", dir=path.parent,
                                         prefix=path.name + ".", suffix=".tmp", delete=False) as f:
            tmp = Path(f.name)
            json.dump(obj, f, ensure_ascii=False, indent=2)
            f.flush()
            os.fsync(f.fileno())
        os.replace(tmp, path)
    finally:
        if tmp is not None:
            tmp.unlink(missing_ok=True)


def read_json(path, default=None):
    try:
        with path.open("r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return default


def seed_memo():
    items = []
    for i, (text, tag) in enumerate(SEED_ACTIVE, 1):
        items.append({
            "id": "m%d" % i, "text": text, "tag": tag,
            "created_at": "2026-11-18T09:00:00+08:00",
            "done": False, "done_at": None,
        })
    for j, (text, done_at) in enumerate(SEED_DONE, len(items) + 1):
        items.append({
            "id": "m%d" % j, "text": text, "tag": "清单",
            "created_at": done_at, "done": True, "done_at": done_at,
        })
    atomic_write(MEMO, {"updated_at": now_iso(), "items": items})


def ensure_memo():
    if not MEMO.exists():
        seed_memo()
    doc = read_json(MEMO, None)
    if not isinstance(doc, dict) or not isinstance(doc.get("items"), list):
        seed_memo()
        doc = read_json(MEMO, {"items": []})
    return doc


def memo_items():
    return ensure_memo().get("items", [])


def memo_parts():
    items = memo_items()
    active = [x for x in items if not x.get("done")]
    done = [x for x in items if x.get("done")]
    done.sort(key=lambda x: x.get("done_at") or "", reverse=True)

    def ad(x):
        return {"id": x.get("id"), "text": x.get("text", ""), "tag": x.get("tag", "")}

    def dd(x):
        dt = x.get("done_at") or ""
        return {
            "id": x.get("id"), "text": x.get("text", ""),
            "date": dt[5:10] if len(dt) >= 10 else "",
            "time": dt[11:16] if len(dt) >= 16 else "",
            "done_at": dt,
        }

    return {"active": [ad(x) for x in active], "done": [dd(x) for x in done]}


def add_memo(text, tag="新"):
    text = (text or "").strip()
    if not text:
        return
    doc = ensure_memo()
    doc["items"].insert(0, {
        "id": "m" + uuid.uuid4().hex[:10],
        "text": text, "tag": tag or "新",
        "created_at": now_iso(), "done": False, "done_at": None,
    })
    doc["updated_at"] = now_iso()
    atomic_write(MEMO, doc)


def set_done(mid, done=True):
    doc = ensure_memo()
    for x in doc["items"]:
        if x.get("id") == mid:
            x["done"] = bool(done)
            x["done_at"] = now_iso() if done else None
            break
    doc["updated_at"] = now_iso()
    atomic_write(MEMO, doc)


def delete_memo(mid):
    doc = ensure_memo()
    doc["items"] = [x for x in doc["items"] if x.get("id") != mid]
    doc["updated_at"] = now_iso()
    atomic_write(MEMO, doc)


def add_click(url, title="", source="", cat=""):
    if not url:
        return
    clicks = read_json(CLICKS, []) or []
    if not isinstance(clicks, list):
        clicks = []
    clicks.append({
        "url": url, "title": title, "source": source, "cat": cat,
        "clicked_at": now_iso(),
    })
    atomic_write(CLICKS, clicks)


def load_today():
    return read_json(CACHE / "today.json", None)


def load_news():
    doc = read_json(CACHE / "news.json", None)
    if not isinstance(doc, dict):
        return None
    clicked = read_json(CLICKS, []) or []
    read_urls = {x.get("url") for x in clicked if isinstance(x, dict)}
    out = []
    for cat, rows in (doc.get("categories") or {}).items():
        for r in rows or []:
            if not isinstance(r, dict) or not r.get("title"):
                continue
            out.append({
                "cat": cat, "t": r.get("title", ""), "s": r.get("source", ""),
                "u": r.get("url", ""), "p": r.get("published", ""),
                "why": r.get("why", ""), "read": r.get("url") in read_urls,
            })
    if out:
        picks = [p for p in (doc.get("picks") or []) if p]
        out.sort(key=lambda n: 0 if n["u"] in picks else 1)
        return out
    return None


def load_quotes():
    doc = read_json(CACHE / "quotes.json", None)
    if not isinstance(doc, list):
        return None
    out = []
    for q in doc:
        if not isinstance(q, dict) or not q.get("text"):
            continue
        out.append({
            "text": q.get("text", ""), "src": q.get("src", ""), "ref": q.get("ref", ""),
            "a": q.get("analysis", ""), "u": q.get("usage", ""),
        })
    return out or None


def load_weather():
    doc = read_json(CACHE / "weather.json", None)
    return doc if isinstance(doc, dict) else None


def load_github():
    doc = read_json(CACHE / "github_trending.json")
    return doc if isinstance(doc, dict) and isinstance(doc.get("items"), list) else None


def payload():
    return {
        "today": load_today(),
        "memo": memo_parts(),
        "news": load_news(),
        "quotes": load_quotes(),
        "weather": load_weather(),
        "github": load_github(),
    }


def mtimes():
    files = [MEMO, *(CACHE / name for name in (
        "today.json", "news.json", "weather.json", "quotes.json", "github_trending.json"
    ))]
    out = {}
    for p in files:
        try:
            out[str(p)] = p.stat().st_mtime_ns
        except OSError:
            out[str(p)] = 0
    return out
