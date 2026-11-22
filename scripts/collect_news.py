# -*- coding: utf-8 -*-
"""资讯采集：7 个 RSS，按 clicks.json 排序，写 data/cache/news.json。
只在你出完当日指南后手动跑一次，不设定时。"""
import email.utils
import html
import json
import os
import re
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT / "data" / "cache"
OUT = CACHE / "news.json"
CLICKS = ROOT / "data" / "clicks.json"
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) SidePanel/1.0"}

FEEDS = [
    ("IT之家", "https://www.ithome.com/rss/", "tech"),
    ("爱范儿", "https://www.ifanr.com/feed", "tech"),
    ("少数派", "https://sspai.com/feed", "tech"),
    ("Smashing", "https://smashingmagazine.com/feed/", "design"),
    ("Design Milk", "https://design-milk.com/feed/", "design"),
    ("FT中文网", "https://www.ftchinese.com/rss/news", "finance"),
    ("界面新闻", "https://a.jiemian.com/index.php?m=article&a=rss", "finance"),
]
KEYWORDS = ["AI", "人工智能", "设计", "独立开发", "产品", "开源", "模型", "美股", "英伟达", "苹果", "工具", "效率", "字体", "前端"]
CATS = {"tech": 5, "design": 4, "finance": 4}


def clean(s):
    s = re.sub(r"<[^>]+>", "", s or "")
    return html.unescape(s).strip()


def parse_date(s):
    s = (s or "").strip()
    if not s:
        return datetime.now(timezone.utc)
    try:
        dt = email.utils.parsedate_to_datetime(s)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc)
    except Exception:
        pass
    try:
        return datetime.fromisoformat(s.replace("Z", "+00:00")).astimezone(timezone.utc)
    except Exception:
        return datetime.now(timezone.utc)


def tag_text(el, names):
    for n in names:
        e = el.find(n)
        if e is not None and (e.text or "").strip():
            return e.text.strip()
    return ""


def fetch(name, url, cat):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=25) as r:
        data = r.read()
    root = ET.fromstring(data)
    out = []
    rss_items = root.findall(".//item")
    atom_items = root.findall("{http://www.w3.org/2005/Atom}entry")
    for it in rss_items + atom_items:
        title = clean(tag_text(it, ["title"]))
        if not title or len(title) < 5:
            continue
        link = ""
        le = it.find("link")
        if le is not None:
            link = (le.text or "").strip() if le.text else (le.attrib.get("href") or "").strip()
        if not link:
            link = tag_text(it, ["guid", "id"])
        if not link.startswith("http"):
            continue
        pub = tag_text(it, ["pubDate", "published", "updated", "dc:date"])
        out.append({
            "title": title, "url": link, "source": name, "cat": cat,
            "published": parse_date(pub).isoformat().replace("+00:00", "Z"),
        })
    return out


def load_clicks():
    try:
        with CLICKS.open("r", encoding="utf-8") as f:
            x = json.load(f)
        return x if isinstance(x, list) else []
    except Exception:
        return []


def rank(rows, clicks):
    if not rows:
        return []
    src_count, cat_count, kw_count = {}, {}, {k: 0 for k in KEYWORDS}
    for c in clicks:
        if not isinstance(c, dict):
            continue
        s = c.get("source") or ""
        cat = c.get("cat") or ""
        t = c.get("title") or ""
        if s: src_count[s] = src_count.get(s, 0) + 1
        if cat: cat_count[cat] = cat_count.get(cat, 0) + 1
        for k in KEYWORDS:
            if k.lower() in t.lower():
                kw_count[k] += 1
    total_clicks = max(1, sum(cat_count.values()))
    max_src = max([1] + list(src_count.values()))
    now = datetime.now(timezone.utc)
    for r in rows:
        src_w = src_count.get(r["source"], 0) / max_src
        hits = 0
        best_kw = ""
        for k in KEYWORDS:
            if k.lower() in r["title"].lower():
                hits += 1
                if not best_kw:
                    best_kw = k
        kw_w = min(hits, 3) / 3
        cat_w = cat_count.get(r["cat"], 0) / total_clicks if cat_count else 0.5
        try:
            days = max(0, (now - datetime.fromisoformat(r["published"].replace("Z", "+00:00"))).total_seconds() / 86400)
        except Exception:
            days = 0
        r["_score"] = 1.0 * src_w + 0.8 * kw_w + 0.5 * cat_w - 0.3 * min(days, 30)
        r["why"] = ""
        if src_count.get(r["source"], 0):
            r["why"] = "最近点过 %d 次 %s" % (src_count[r["source"]], r["source"])
        elif best_kw:
            r["why"] = "标题命中你常点的「%s」" % best_kw
    rows.sort(key=lambda x: (-x["_score"], x["published"]), reverse=False)
    return rows


def main():
    all_rows = []
    failed = []
    for name, url, cat in FEEDS:
        try:
            rows = fetch(name, url, cat)
            all_rows.extend(rows)
            print("%s: %d" % (name, len(rows)))
        except Exception as e:
            failed.append(name)
            print("%s: FAIL %s" % (name, repr(e)))
    if not all_rows:
        raise SystemExit("all feeds failed; keep old news.json")

    seen = set()
    uniq = []
    for r in all_rows:
        key = re.sub(r"\s+", "", r["title"]).lower()
        if key in seen:
            continue
        seen.add(key)
        uniq.append(r)

    clicks = load_clicks()
    rows = rank(uniq, clicks)
    cats = {k: [] for k in CATS}
    for r in rows:
        c = r.get("cat")
        if c in cats and len(cats[c]) < CATS[c]:
            cats[c].append({
                "title": r["title"], "url": r["url"], "source": r["source"],
                "published": r["published"], "why": r.get("why", ""),
            })
    picked = [x for c in cats.values() for x in c]
    if not picked:
        raise SystemExit("no picks; keep old news.json")
    picked.sort(key=lambda x: x["published"], reverse=True)
    out = {
        "fetched_at": datetime.now().astimezone().isoformat(timespec="seconds"),
        "offline": False,
        "picks": [picked[0]["url"]],
        "categories": cats,
    }
    CACHE.mkdir(parents=True, exist_ok=True)
    tmp = OUT.with_name(OUT.name + ".tmp")
    with tmp.open("w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)
    os.replace(tmp, OUT)
    print("news:", {k: len(v) for k, v in cats.items()}, "failed:", failed, "->", OUT)


if __name__ == "__main__":
    main()
