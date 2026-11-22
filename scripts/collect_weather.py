# -*- coding: utf-8 -*-
"""天气：Open-Meteo 当前 + 5 日 + AQI，写 data/cache/weather.json。"""
import json
import os
import urllib.parse
import urllib.request
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "data" / "cache" / "weather.json"
def load_weather_cfg():
    try:
        cfg = json.loads((ROOT / "config.json").read_text(encoding="utf-8"))
        w = cfg.get("weather", {}) or {}
        return float(w.get("lat", 39.9042)), float(w.get("lon", 116.4074)), str(w.get("name", "北京"))
    except Exception:
        return 39.9042, 116.4074, "北京"

LAT, LON, PLACE = load_weather_cfg()
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) SidePanel/1.0"}

WEEK = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"]
CODES = {
    0: "晴", 1: "多云", 2: "多云", 3: "阴",
    45: "雾", 48: "雾",
    51: "毛毛雨", 53: "毛毛雨", 55: "毛毛雨",
    56: "冻雨", 57: "冻雨",
    61: "小雨", 63: "中雨", 65: "大雨",
    66: "冻雨", 67: "冻雨",
    71: "小雪", 73: "中雪", 75: "大雪", 77: "雪粒",
    80: "阵雨", 81: "阵雨", 82: "强阵雨",
    85: "阵雪", 86: "阵雪",
    95: "雷阵雨", 96: "雷暴冰雹", 99: "雷暴冰雹",
}
DIRS = ["北风", "东北风", "东风", "东南风", "南风", "西南风", "西风", "西北风"]


def get_json(url):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=25) as r:
        return json.loads(r.read().decode("utf-8"))


def beaufort(kmh):
    v = float(kmh or 0)
    for limit, level in [(1, 0), (5, 1), (11, 2), (19, 3), (28, 4), (38, 5), (49, 6), (61, 7), (74, 8), (88, 9), (102, 10), (117, 11)]:
        if v <= limit:
            return level
    return 12


def wind_text(deg, kmh):
    try:
        d = DIRS[int((float(deg) + 22.5) // 45) % 8]
    except Exception:
        d = "风"
    return "%s %d 级" % (d, beaufort(kmh))


def aqi_text(v):
    try:
        v = int(v)
    except Exception:
        return "—"
    if v <= 50: return "优"
    if v <= 100: return "良"
    if v <= 150: return "轻度污染"
    if v <= 200: return "中度污染"
    if v <= 300: return "重度污染"
    return "严重污染"


def atomic_write(path, obj):
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_name(path.name + ".tmp")
    with tmp.open("w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, indent=2)
    os.replace(tmp, path)


def main():
    q = urllib.parse.urlencode({
        "latitude": LAT, "longitude": LON,
        "current": "temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,wind_direction_10m",
        "daily": "weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset",
        "hourly": "temperature_2m",
        "timezone": "Asia/Shanghai",
        "forecast_days": 7,
    })
    data = get_json("https://api.open-meteo.com/v1/forecast?" + q)
    cur = data.get("current") or {}
    daily = data.get("daily") or {}
    hourly = data.get("hourly") or {}
    old = {}
    try:
        with OUT.open("r", encoding="utf-8") as f:
            old = json.load(f)
    except Exception:
        old = {}
    aqi = None
    try:
        aq = get_json("https://air-quality-api.open-meteo.com/v1/air-quality?" + urllib.parse.urlencode({
            "latitude": LAT, "longitude": LON, "current": "us_aqi", "timezone": "Asia/Shanghai"
        }))
        aqi = (aq.get("current") or {}).get("us_aqi")
    except Exception as e:
        print("AQI 失败:", e)
    if aqi is None and old.get("aqi") is not None:
        aqi = old.get("aqi")

    times = daily.get("time") or []
    days = []
    for i in range(1, min(6, len(times))):
        dt = datetime.strptime(times[i], "%Y-%m-%d")
        label = "明天" if i == 1 else WEEK[dt.weekday()]
        days.append({
            "d": label,
            "hi": round(daily["temperature_2m_max"][i]),
            "lo": round(daily["temperature_2m_min"][i]),
            "cond": CODES.get(int(daily["weather_code"][i]), "—"),
        })

    htimes = hourly.get("time") or []
    htemps = hourly.get("temperature_2m") or []
    hours = []
    for i in range(0, min(len(htimes), len(htemps)), 3):
        try:
            h = int(htimes[i][11:13])
        except Exception:
            continue
        hours.append({"h": h, "t": round(htemps[i])})

    now = datetime.now().astimezone()
    out = {
        "fetched_at": now.isoformat(timespec="seconds"),
        "offline": False,
        "lat": LAT, "lon": LON, "place": PLACE,
        "temp": round(cur.get("temperature_2m", 0)),
        "feels": round(cur.get("apparent_temperature", 0)),
        "cond": CODES.get(int(cur.get("weather_code", -1)), "—"),
        "wind": wind_text(cur.get("wind_direction_10m"), cur.get("wind_speed_10m")),
        "humidity": round(cur.get("relative_humidity_2m", 0)),
        "aqi": round(aqi) if aqi is not None else None,
        "aqi_text": aqi_text(aqi) if aqi is not None else "—",
        "sunrise": (daily.get("sunrise") or [""])[0][11:16],
        "sunset": (daily.get("sunset") or [""])[0][11:16],
        "hourly": hours,
        "daily": days,
    }
    atomic_write(OUT, out)
    print("weather:", out["temp"], out["cond"], out["wind"], "AQI", out["aqi"], "->", OUT)


if __name__ == "__main__":
    main()
