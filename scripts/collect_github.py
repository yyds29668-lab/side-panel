# -*- coding: utf-8 -*-
"""在指南刷新时保存 GitHub Trending 的每日榜单摘要。"""
import re
import sys
from datetime import date
from html.parser import HTMLParser
from pathlib import Path
from urllib.request import Request, urlopen

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "app"))
from data import CACHE, atomic_write, load_today, now_iso

TRENDING = "https://github.com/trending?since=daily"
REPOSITORY = re.compile(r"/([a-z0-9-]+/[a-z0-9_.-]+)", re.I | re.ASCII)
STARS = re.compile(r"([\d,]+)\s+stars? today\b", re.I)
PURPOSES = {
    "HKUDS/CLI-Anything": "把任意命令行工具封装成 AI Agent 可调用的工具",
    "jingyaogong/minimind": "从零训练一个 64M 参数的小语言模型",
    "elementalsouls/Claude-BugHunter": "一套 Claude Code 的漏洞挖掘与红队技能包",
    "obra/superpowers": "Agent 技能框架与软件开发方法",
    "cursor/plugins": "Cursor 插件规范与官方插件",
    "firecrawl/firecrawl": "为 Agent 提供搜索、抓取与数据接入的知识基础设施",
    "cathrynlavery/diagram-design": "给 AI 编程工具用的编辑级图表设计系统",
    "mvanhorn/last30days-skill": "跨 Reddit、X、YouTube 等平台做主题研究的 Agent 技能",
}

TOPICS = (
    ("AI Agent", r"\b(?:agent|agents|agentic|claude|codex|cursor|skill|skills)\b", "用于 AI Agent 工作流或技能"),
    ("设计工具", r"\b(?:design|figma|prototype|blender|typography)\b", "用于设计、原型或视觉制作"),
    ("AI 制作", r"\b(?:video generation|text.to.video|image generation|diffusion|comfyui)\b", "用于生成或编辑图像、视频等素材"),
    ("本地 AI", r"\b(?:llm|large language models?|inference|local ai|self.hosted ai)\b", "面向大模型运行或推理"),
    ("AI 应用", r"\b(?:ai|machine learning|agents?)\b", "面向 AI 应用开发或工作流"),
    ("开发工具", r"\b(?:cli|developer tools?|sdk|debugger|automation|editor)\b", "用于开发、调试或自动化"),
)


class TrendingParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.items = []
        self.article = None
        self.in_heading = False
        self.in_description = False

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "article" and "Box-row" in (attrs.get("class") or "").split():
            self.article = {"name": "", "description": [], "text": []}
        if self.article is None:
            return
        if tag == "h2":
            self.in_heading = True
        elif tag == "p":
            self.in_description = True
        elif tag == "a" and self.in_heading and not self.article["name"]:
            repo = REPOSITORY.fullmatch(attrs.get("href") or "")
            if repo:
                self.article["name"] = repo.group(1)

    def handle_data(self, text):
        if self.article is not None and text.strip():
            self.article["text"].append(text.strip())
            if self.in_description:
                self.article["description"].append(text.strip())

    def handle_endtag(self, tag):
        if tag == "h2":
            self.in_heading = False
        elif tag == "p":
            self.in_description = False
        elif tag == "article" and self.article is not None:
            row = self.article
            if row["name"]:
                desc = " ".join(row["description"])
                text = " ".join(row["text"])
                stars = STARS.search(text)
                self.items.append({
                    "name": row["name"],
                    "description": desc,
                    "stars_today": int(stars.group(1).replace(",", "")) if stars else None,
                })
            self.article = None
            self.in_heading = self.in_description = False


def select_projects(html):
    parser = TrendingParser()
    parser.feed(html)
    rows, seen = [], set()
    # Keep GitHub's own trending order; do not reorder by keyword match.
    for row in parser.items:
        name = row["name"]
        if name.lower() in seen:
            continue
        seen.add(name.lower())
        query = name + " " + row["description"]
        topic = next((t for t in TOPICS if re.search(t[1], query, re.I)), None)
        row["category"] = topic[0] if topic else "开源项目"
        if name in PURPOSES:
            row["summary"] = PURPOSES[name]
        elif re.search(r"[\u4e00-\u9fff]", row["description"]):
            row["summary"] = row["description"]
        else:
            row["summary"] = topic[2] if topic else "查看仓库介绍与使用方式"
        row["url"] = "https://github.com/" + name
        rows.append(row)
        if len(rows) >= 2:
            break
    return rows


def main():
    guide = load_today()
    if not isinstance(guide, dict) or not guide.get("date"):
        print("尚无指南摘要，保留 GitHub 上次榜单。")
        return 0
    guide_date = guide.get("date")
    try:
        req = Request(TRENDING, headers={"User-Agent": "Mozilla/5.0", "Accept": "text/html"})
        with urlopen(req, timeout=12) as res:
            items = select_projects(res.read().decode("utf-8"))
        if not items:
            raise ValueError("榜单未返回可用仓库")
        fetched_at = now_iso()
        atomic_write(CACHE / "github_trending.json", {
            "guide_date": guide_date, "fetched_at": fetched_at, "source": TRENDING, "items": items,
        })
        print("GitHub 热点已更新：%d 项 · %s" % (len(items), guide_date))
        return 0
    except (OSError, ValueError) as err:
        print("GitHub 热点刷新失败，保留上次快照：%s" % err, file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
