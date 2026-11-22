# 数据格式

## 目录

```text
data/
  cache/
    today.json          今日指南（可选）
    quotes.json         经典 36 条
    weather.json        天气
    news.json           资讯
    github_trending.json GitHub 热点
  memo.json             备忘
  clicks.json           阅读记录
  logs/                 运行日志
  state/heartbeat       看门狗心跳
  backup/               本机备份
```

`data/` 已被 .gitignore 忽略。仓库只带 `data.demo/cache/quotes.json`。

## 可选的本地历法

将可使用的历法数据保存为 `design/plan-data.js`，文件应设置 `window.CAL`，以 `YYYY-MM-DD` 为键。每天可提供星期 `w`、农历 `l`、日干支 `g`、明戊 `mw`、暗戊 `aw` 和时辰数组 `s`。时辰项所用字段见 `scripts/export_calendar.py`。本地历法文件由 Git 忽略。缺数据的日期仍可用公历浏览，界面会显示「暂无历法数据」。

## today.json

面板只认 `date == 本地今天` 的指南。缺失或日期不符时显示「未推算」，有本地历法数据时同时展示当天农历宜忌。

```json
{
  "schema": 2,
  "date": "2026-11-22",
  "weekday": "周日",
  "lunar": "十月十四",
  "ganzhi": "丙午年 己亥月 庚子日",
  "grade": "吉",
  "score": 8.4,
  "hexagram": { "primary": "地天泰", "changed": "地泽临", "moving": "九三" },
  "summary": "两句话内的总原则，只进详情",
  "one_thing": "小往大来，吉亨。",
  "one_source": "《周易·泰卦》",
  "one_note": "舍小得大；今天适合把要紧事往前推。",
  "yi": ["推进", "谈事", "签约"],
  "ji": ["拖延", "熬夜"],
  "windows": [{ "branch": "巳", "time": "09:00–10:59", "note": "适合谈事" }],
  "five": [
    { "key": "钱", "state": 0, "note": "按预算" },
    { "key": "事业", "state": 1, "note": "推进一件小事" },
    { "key": "感情", "state": 0, "note": "把话说清楚" },
    { "key": "家庭", "state": 0, "note": "问一句近况" },
    { "key": "身体", "state": 0, "note": "走 6000 步" }
  ],
  "hours": [
    { "branch": "巳", "time": "09–11", "note": "一句说明" },
    { "branch": "午", "time": "11–13", "note": "一句说明" }
  ],
  "warnings": ["一条具体提醒"],
  "todo": [
    { "k": "穿", "v": "舒适、保暖" },
    { "k": "办事", "v": "先做最重要的一件" }
  ],
  "color": { "seed": "#B23A2F", "name": "红·橙·米白" },
  "updated_at": "2026-11-22T20:12:00+08:00",
  "source": "生成方式",
  "report_url": ""
}
```

规则：

- `grade` 七档；`score` 0–10，与 grade 一致。
- `five[].state` 只能是 -1 / 0 / 1。
- `one_source` 为空时，卡片按普通“今日一件”显示；有值时显示卦辞出处。
- `summary` 只在详情，不在卡片重复。
- 文案用完整现代汉语，不写压缩到看不懂的句子。

## memo.json

```json
{
  "active": [
    { "id": "m1", "text": "整理桌面", "tag": "今天", "created_at": "..." }
  ],
  "done": [
    { "id": "m2", "text": "散步 20 分钟", "tag": "今天", "created_at": "...", "done_at": "..." }
  ]
}
```

第一次运行没有 memo.json 时，会用 `app/data.py` 里的示例 8 条待办初始化。完成不删除，`done_at` 驱动已完成/周柱/月热力。

## 其他缓存

- `quotes.json`：36 条，字段 `text/src/ref/analysis/usage`。
- `weather.json`：`place/temp/cond/aqi/aqi_text/sunrise/sunset/daily/hourly`。
- `news.json`：数组，字段 `t/s/u/p/cat/why/read`。
- `github_trending.json`：`guide_date/fetched_at/source/items[]`。

## 导入指南

```powershell
python scripts\import_guide.py --file today.json
```

或从 stdin：

```powershell
Get-Content today.json -Raw | python scripts\import_guide.py
```

导入前会校验字段、日期和 five.state；不通过不会覆盖现有指南。
