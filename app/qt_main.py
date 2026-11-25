# -*- coding: utf-8 -*-
"""侧屏面板 Qt 壳：Qt::Tool 无边框工作区窗口 + QtWebEngine。"""
import ctypes
import json
import re
import sys
import threading
import time
from urllib.parse import unquote
from pathlib import Path

from PyQt5.QtCore import Qt, QUrl, QRect, QPoint, QEvent, QTimer, QPropertyAnimation, QParallelAnimationGroup, QEasingCurve
from PyQt5.QtGui import QColor, QDesktopServices, QPainter, QBrush, QPen, QGuiApplication
from PyQt5.QtWidgets import QApplication, QWidget, QVBoxLayout, QMenu
from PyQt5.QtWebEngineWidgets import QWebEngineView, QWebEnginePage, QWebEngineSettings

import data as panel_data

QApplication.setAttribute(Qt.AA_ShareOpenGLContexts, True)
QApplication.setAttribute(Qt.AA_EnableHighDpiScaling, True)
QApplication.setAttribute(Qt.AA_UseHighDpiPixmaps, True)

BASE = Path(__file__).resolve().parents[1]
URL = QUrl.fromLocalFile(str(BASE / "design" / "规划图.html"))
URL.setFragment("app")
TITLE = "侧屏面板"
LOG = BASE / "data" / "logs" / "panel.log"
HEART = BASE / "data" / "state" / "heartbeat"


def load_config():
    try:
        return json.loads((BASE / "config.json").read_text(encoding="utf-8"))
    except Exception:
        return {}

CONFIG = load_config()


def pick_screen():
    screens = QGuiApplication.screens()
    if not screens:
        return None
    primary = QGuiApplication.primaryScreen()
    want = CONFIG.get("screen", "auto")
    if isinstance(want, int):
        return screens[want] if 0 <= want < len(screens) else primary
    text = str(want).strip()
    if text.isdigit():
        idx = int(text)
        return screens[idx] if 0 <= idx < len(screens) else primary
    lower = text.lower()
    if lower == "primary":
        return primary
    if lower in ("secondary", "auto", ""):
        return next((x for x in screens if x is not primary), primary)
    for scr in screens:
        if scr.name().lower() == lower:
            return scr
    return next((x for x in screens if x is not primary), primary)


def panel_rect(scr):
    avail = scr.availableGeometry()
    win = CONFIG.get("window", {}) or {}
    ww = min(int(win.get("width") or 1080), avail.width())
    hh = min(int(win.get("height") or avail.height()), avail.height())
    x = avail.x() + int(win.get("x", 0))
    y = avail.y() + int(win.get("y", 0))
    return QRect(x, y, max(320, ww), max(480, hh))


def log(msg):
    LOG.parent.mkdir(parents=True, exist_ok=True)
    with LOG.open("a", encoding="utf-8") as f:
        f.write(time.strftime("%Y-%m-%d %H:%M:%S ") + msg + "\n")


def keep_single():
    k32 = ctypes.windll.kernel32
    handle = k32.CreateMutexW(None, False, "Global\\DaoFaSidePanel")
    if k32.GetLastError() == 183:
        return None
    return handle


def beat():
    HEART.parent.mkdir(parents=True, exist_ok=True)
    while True:
        try:
            HEART.write_text(str(int(time.time())), encoding="utf-8")
        except Exception:
            pass
        time.sleep(10)


class PanelPage(QWebEnginePage):
    def __init__(self, on_msg, parent=None):
        super().__init__(parent)
        self.on_msg = on_msg

    def javaScriptConsoleMessage(self, level, message, line, source):
        if message.startswith("PANEL:"):
            self.on_msg(message[6:])
        else:
            super().javaScriptConsoleMessage(level, message, line, source)


class DotWindow(QWidget):
    SIZE = 44
    INSET = 16

    def __init__(self, on_expand, on_quit, origin):
        super().__init__(None, Qt.Tool | Qt.FramelessWindowHint | Qt.WindowStaysOnTopHint)
        self.setAttribute(Qt.WA_TranslucentBackground, True)
        self.setAttribute(Qt.WA_ShowWithoutActivating, True)
        self.move_to(origin)
        self.setCursor(Qt.PointingHandCursor)
        self.on_expand = on_expand
        self.on_quit = on_quit
        self.setToolTip("展开侧屏面板（右键菜单）")

    def move_to(self, origin):
        self.setGeometry(QRect(origin.x() + self.INSET, origin.y() + self.INSET,
                               self.SIZE, self.SIZE))

    def paintEvent(self, e):
        p = QPainter(self)
        p.setRenderHint(QPainter.Antialiasing)
        p.setPen(QPen(QColor(42, 95, 78, 55), 1))
        p.setBrush(QBrush(QColor(242, 239, 230, 238)))
        p.drawEllipse(4, 4, 36, 36)
        p.setPen(Qt.NoPen)
        p.setBrush(QColor(42, 95, 78))
        p.drawEllipse(17, 17, 10, 10)

    def mousePressEvent(self, e):
        if e.button() == Qt.LeftButton:
            self.on_expand()

    def contextMenuEvent(self, e):
        m = QMenu(self)
        a = m.addAction("展开面板")
        a.triggered.connect(self.on_expand)
        m.addSeparator()
        q = m.addAction("退出")
        q.triggered.connect(self.on_quit)
        m.exec_(e.globalPos())


class PanelWindow(QWidget):
    def __init__(self):
        super().__init__(None, Qt.Window | Qt.FramelessWindowHint)
        self.setWindowTitle(TITLE)
        self.setStyleSheet("background:#F2EFE6;")

        scr = pick_screen() or QGuiApplication.primaryScreen()
        self.work = panel_rect(scr)
        self.full_rect = scr.geometry()
        self.full = False
        self.animating = False
        self.anim = None
        self.screen_missing = False
        self.collapsed = False
        self.setGeometry(self.work)

        self.view = QWebEngineView(self)
        self.page = PanelPage(self.handle_msg, self.view)
        self.view.setPage(self.page)
        st = self.view.settings()
        st.setAttribute(QWebEngineSettings.LocalContentCanAccessFileUrls, True)
        st.setAttribute(QWebEngineSettings.LocalContentCanAccessRemoteUrls, False)
        self.page.setBackgroundColor(QColor("#F2EFE6"))

        lay = QVBoxLayout(self)
        lay.setContentsMargins(0, 0, 0, 0)
        lay.setSpacing(0)
        lay.addWidget(self.view)
        self.view.load(URL)
        self.view.loadFinished.connect(self.after_load)

        self.dot = DotWindow(self.expand, QApplication.quit, self.work)
        app = QGuiApplication.instance()
        try:
            app.screenAdded.connect(self.on_screens)
            app.screenRemoved.connect(self.on_screens)
        except Exception as e:
            log("screen signal failed: " + repr(e))
        self._mtimes = panel_data.mtimes()
        self.data_timer = QTimer(self)
        self.data_timer.timeout.connect(self.check_data)
        self.data_timer.start(60000)
        self._design_files = [BASE / "design" / "规划图.html", BASE / "design" / "ui.js", BASE / "design" / "plan-data.js"]
        self._design_mtimes = self.design_mtimes()
        self.design_timer = QTimer(self)
        self.design_timer.timeout.connect(self.check_design)
        self.design_timer.start(4000)
        self.hb_timer = QTimer(self)
        self.hb_timer.timeout.connect(self.write_heartbeat)
        self.hb_timer.start(10000)
        self.write_heartbeat()
        log("qt work %s,%s %sx%s full %sx%s" % (
            self.work.x(), self.work.y(), self.work.width(), self.work.height(),
            self.full_rect.width(), self.full_rect.height()))

    def after_load(self, ok):
        js = ("setTimeout(function(){window.dispatchEvent(new Event('resize'));},80);"
              "var out={w:innerWidth,h:innerHeight,cls:document.body.className};"
              "['.top','.top-l','.lunar','.three-days','.artboard'].forEach(function(s){"
              "var el=document.querySelector(s); if(el){var r=el.getBoundingClientRect();"
              "out[s]=[Math.round(r.x),Math.round(r.y),Math.round(r.width),Math.round(r.height)];}"
              "else{out[s]='missing';}});"
              "JSON.stringify(out)")
        self.view.page().runJavaScript(js, self.on_metrics)

    def on_metrics(self, res):
        log("load metrics " + str(res))
        self.focus_panel()
        self.apply_data()

    def apply_data(self):
        try:
            versions = panel_data.mtimes()
            payload = panel_data.payload()
            self._mtimes = versions
            js = "if(window.applyPanelData){window.applyPanelData(" + json.dumps(payload, ensure_ascii=False) + ");}"
            self.view.page().runJavaScript(js)
        except Exception as e:
            log("apply_data failed: " + repr(e))

    def check_data(self):
        try:
            cur = panel_data.mtimes()
        except Exception:
            return
        if cur != self._mtimes:
            self.apply_data()
            log("data mtime changed, reload")

    def design_mtimes(self):
        out = {}
        for p in self._design_files:
            try:
                out[str(p)] = p.stat().st_mtime
            except OSError:
                out[str(p)] = 0
        return out

    def check_design(self):
        cur = self.design_mtimes()
        if cur != self._design_mtimes:
            self._design_mtimes = cur
            log("design files changed; reload page")
            try:
                self.view.reload()
            except Exception as e:
                log("design reload failed: " + repr(e))

    def refit(self):
        try:
            self.view.page().runJavaScript("window.dispatchEvent(new Event('resize'));")
        except Exception:
            pass

    def design_mtimes(self):
        out = {}
        for p in self._design_files:
            try:
                out[str(p)] = p.stat().st_mtime
            except OSError:
                out[str(p)] = 0
        return out

    def check_design(self):
        cur = self.design_mtimes()
        if cur != self._design_mtimes:
            self._design_mtimes = cur
            log("design files changed; reload page")
            try:
                self.view.reload()
            except Exception as e:
                log("design reload failed: " + repr(e))

    def refit(self):
        try:
            self.view.page().runJavaScript("window.dispatchEvent(new Event('resize'));")
        except Exception:
            pass

    def write_heartbeat(self):
        try:
            HEART.parent.mkdir(parents=True, exist_ok=True)
            HEART.write_text(str(int(time.time())), encoding="utf-8")
        except Exception:
            pass

    def on_screens(self, *args):
        QTimer.singleShot(500, self.refresh_screen)

    def refresh_screen(self):
        scr = pick_screen()
        if self.anim is not None:
            self.anim.stop()
            self.anim.deleteLater()
            self.anim = None
            self.animating = False
        self.setWindowOpacity(1.0)
        self.dot.setWindowOpacity(1.0)
        if scr is None:
            if self.full:
                self.showNormal()
                self.full = False
            self.hide()
            self.dot.hide()
            self.screen_missing = True
            log("no screen available; panel hidden")
            return
        self.work = panel_rect(scr)
        self.full_rect = scr.geometry()
        self.screen_missing = False
        self.dot.move_to(self.work)
        if self.collapsed:
            self.hide()
            self.dot.show()
            self.dot.raise_()
            log("screen changed; dot")
            return
        self.dot.hide()
        self.showNormal()
        self.setGeometry(self.work)
        self.full = False
        self.show()
        self.focus_panel()
        log("screen changed: %s,%s %sx%s" % (self.work.x(), self.work.y(), self.work.width(), self.work.height()))

    def changeEvent(self, e):
        super().changeEvent(e)
        if e.type() == QEvent.ActivationChange and self.isActiveWindow():
            self.focus_panel()

    def showEvent(self, e):
        super().showEvent(e)
        QTimer.singleShot(80, self.refit)
        QTimer.singleShot(120, self.focus_panel)
        QTimer.singleShot(200, self.hide_taskbar)

    def hide_taskbar(self):
        hwnd = int(self.winId())
        ex = ctypes.windll.user32.GetWindowLongW(hwnd, -20)
        ex = (ex | 0x00000080) & ~0x00040000
        ctypes.windll.user32.SetWindowLongW(hwnd, -20, ex)

    def focus_panel(self):
        if not self.isVisible() or self.collapsed or self.animating:
            return
        self.raise_()
        self.activateWindow()
        self.view.setFocus()
        proxy = self.view.focusProxy()
        if proxy is not None:
            proxy.setFocus()

    def handle_msg(self, msg):
        if msg == "toggle":
            self.toggle_full()
        elif msg == "collapse":
            self.collapse()
        elif msg == "quit":
            QApplication.quit()
        elif msg == "refresh":
            self.apply_data()
            log("manual refresh")
        elif msg.startswith("github-link:"):
            url = QUrl(unquote(msg[12:]))
            path = url.path()
            if url.scheme() == "https" and url.host() == "github.com" and not url.userInfo() and (
                path == "/trending" or re.fullmatch(r"/[A-Za-z0-9-]+/[A-Za-z0-9_.-]+", path)
            ):
                QDesktopServices.openUrl(url)
        elif msg.startswith("memo-add:"):
            panel_data.add_memo(unquote(msg[9:]))
            self.apply_data()
        elif msg.startswith("memo-done:"):
            panel_data.set_done(unquote(msg[10:]), True)
            self.apply_data()
        elif msg.startswith("memo-undone:"):
            panel_data.set_done(unquote(msg[12:]), False)
            self.apply_data()
        elif msg.startswith("memo-del:"):
            panel_data.delete_memo(unquote(msg[9:]))
            self.apply_data()
        elif msg.startswith("news-click:"):
            try:
                info = json.loads(unquote(msg[11:]))
                panel_data.add_click(info.get("u", ""), info.get("t", ""), info.get("s", ""), info.get("cat", ""))
                self.apply_data()
            except Exception as e:
                log("news click failed: " + repr(e))

    def toggle_full(self):
        if self.animating:
            return
        if self.full:
            self.showNormal()
            self.setGeometry(self.work)
            self.full = False
            log("fullscreen off")
        else:
            self.setGeometry(self.full_rect)
            self.showFullScreen()
            self.full = True
            log("fullscreen on")
        self.focus_panel()

    def collapse(self):
        if self.animating or self.collapsed or self.screen_missing:
            return
        self.collapsed = True
        self.dot.setWindowOpacity(0.0)
        self.dot.show()
        self.dot.raise_()
        self.animate_panel(expanding=False)

    def expand(self):
        if self.animating or not self.collapsed or self.screen_missing:
            return
        self.collapsed = False
        # The native dot must disappear immediately; otherwise it sits above
        # the HTML collapse dot and swallows the click while already expanded.
        self.dot.hide()
        self.dot.setWindowOpacity(1.0)
        self.setWindowState(Qt.WindowNoState)
        self.setGeometry(self.work)
        self.full = False
        self.setWindowOpacity(0.0)
        self.show()
        self.raise_()
        QTimer.singleShot(80, self.refit)
        self.animate_panel(expanding=True)

    def animate_panel(self, expanding):
        self.animating = True
        self.view.page().runJavaScript(
            "if(window.animatePanel){window.animatePanel(%s);}" % ("true" if expanding else "false")
        )
        grp = QParallelAnimationGroup(self)
        for widget, opacity, duration in (
            (self, 1.0 if expanding else 0.0, 180 if expanding else 140),
            (self.dot, 0.0 if expanding else 1.0, 110 if expanding else 140),
        ):
            anim = QPropertyAnimation(widget, b"windowOpacity", grp)
            anim.setStartValue(widget.windowOpacity())
            anim.setEndValue(opacity)
            anim.setDuration(duration)
            anim.setEasingCurve(QEasingCurve.OutCubic if expanding else QEasingCurve.InOutQuad)
            grp.addAnimation(anim)

        def done():
            if expanding:
                self.dot.hide()
            else:
                self.hide()
                self.setWindowState(Qt.WindowNoState)
                self.full = False
            self.setWindowOpacity(1.0)
            self.dot.setWindowOpacity(1.0)
            self.animating = False
            self.anim = None
            grp.deleteLater()
            if expanding:
                self.focus_panel()
            log("expanded" if expanding else "collapsed")

        grp.finished.connect(done)
        self.anim = grp
        grp.start()

    def start_collapsed(self):
        self.collapsed = True
        self.hide()
        self.dot.show()
        self.dot.raise_()
        log("started collapsed")

    def keyPressEvent(self, e):
        if e.key() == Qt.Key_Escape and self.full:
            self.toggle_full()
        elif e.key() == Qt.Key_Q and (e.modifiers() & Qt.ControlModifier):
            QApplication.quit()
        else:
            super().keyPressEvent(e)

    def closeEvent(self, e):
        QApplication.quit()


def main():
    if not keep_single():
        return
    log("boot qt")
    app = QApplication(sys.argv)
    app.setQuitOnLastWindowClosed(False)
    win = PanelWindow()
    win.start_collapsed()
    log("shown")
    sys.exit(app.exec_())


if __name__ == "__main__":
    main()
