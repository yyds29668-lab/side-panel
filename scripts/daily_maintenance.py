# -*- coding: utf-8 -*-
"""04:00 维护：备份 memo、清 .tmp、重启面板。"""
import json
import shutil
import time
from datetime import datetime
from pathlib import Path

import watchdog

ROOT = Path(__file__).resolve().parents[1]
MEMO = ROOT / "data" / "memo.json"
BACKUP = ROOT / "data" / "backup"
LOG = ROOT / "data" / "logs" / "maintenance.log"


def log(msg):
    LOG.parent.mkdir(parents=True, exist_ok=True)
    with LOG.open("a", encoding="utf-8") as f:
        f.write(time.strftime("%Y-%m-%d %H:%M:%S ") + msg + "\n")


def backup_memo():
    BACKUP.mkdir(parents=True, exist_ok=True)
    if MEMO.exists():
        dst = BACKUP / ("memo-%s.json" % datetime.now().strftime("%Y-%m-%d"))
        shutil.copy2(MEMO, dst)
        log("backup memo -> %s" % dst)
    files = sorted(BACKUP.glob("memo-*.json"))
    for f in files[:-30]:
        try:
            f.unlink()
        except Exception:
            pass


def clean_tmp():
    for d in (ROOT / "data", ROOT / "data" / "cache"):
        for f in d.glob("*.tmp"):
            try:
                f.unlink()
            except Exception:
                pass


def main():
    log("maintenance start")
    backup_memo()
    clean_tmp()
    watchdog.kill_panel()
    watchdog.start_panel()
    log("maintenance done")


if __name__ == "__main__":
    main()
