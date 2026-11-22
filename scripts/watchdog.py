# -*- coding: utf-8 -*-
"""看门狗：心跳 >90 秒或进程树 >600MB 就重启面板。"""
import os
import subprocess
import sys
import time
from pathlib import Path

import psutil

ROOT = Path(__file__).resolve().parents[1]
PANEL = ROOT / "app" / "qt_main.py"
HEART = ROOT / "data" / "state" / "heartbeat"
LOG = ROOT / "data" / "logs" / "watchdog.log"
PY = Path(sys.executable)
if PY.name.lower() == "python.exe":
    _pw = PY.with_name("pythonw.exe")
    if _pw.exists():
        PY = _pw


def log(msg):
    LOG.parent.mkdir(parents=True, exist_ok=True)
    with LOG.open("a", encoding="utf-8") as f:
        f.write(time.strftime("%Y-%m-%d %H:%M:%S ") + msg + "\n")


def roots():
    out = []
    for p in psutil.process_iter(["pid", "name", "cmdline"]):
        try:
            cmd = " ".join(p.info.get("cmdline") or [])
            if "qt_main.py" in cmd and (p.info.get("name") or "").lower().startswith("python"):
                out.append(p)
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            pass
    return out


def tree_mem(p):
    total = 0
    try:
        procs = [p] + p.children(recursive=True)
    except Exception:
        procs = [p]
    for x in procs:
        try:
            total += x.memory_info().rss
        except Exception:
            pass
    return total


def kill_panel():
    rs = roots()
    for r in rs:
        try:
            for c in r.children(recursive=True):
                try:
                    c.kill()
                except Exception:
                    pass
            r.kill()
            log("killed pid %d" % r.pid)
        except Exception as e:
            log("kill failed %s: %r" % (getattr(r, "pid", "?"), e))
    time.sleep(0.6)


def start_panel():
    try:
        flags = getattr(subprocess, "DETACHED_PROCESS", 0) | getattr(subprocess, "CREATE_NO_WINDOW", 0)
        subprocess.Popen([str(PY), str(PANEL)], cwd=str(ROOT), creationflags=flags,
                         stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        log("started panel")
    except Exception as e:
        log("start failed: %r" % e)


def main():
    rs = roots()
    if len(rs) > 1:
        log("multiple panels (%d), restart one" % len(rs))
        kill_panel()
        start_panel()
        return
    if not rs:
        log("panel not running, start")
        start_panel()
        return
    p = rs[0]
    mem = tree_mem(p)
    try:
        age = time.time() - HEART.stat().st_mtime
    except Exception:
        age = 99999
    if age > 90:
        log("heartbeat stale %.0fs, restart" % age)
        kill_panel()
        start_panel()
    elif mem > 600 * 1024 * 1024:
        log("memory %.0fMB > 600MB, restart" % (mem / 1048576))
        kill_panel()
        start_panel()


if __name__ == "__main__":
    main()
