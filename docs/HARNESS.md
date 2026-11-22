# 用任意 harness 生成今日指南

面板不绑定模型、API 或平台。任何能输出 JSON 的 harness 都可以：

- Claude Code
- Codex
- Cursor
- Gemini CLI
- Aider
- 自建 agent / 脚本
- 在线模型网页（把提示词贴进去，保存 JSON）

## 1. 生成提示词

```powershell
python scripts\harness_prompt.py > prompt.txt
```

把 `prompt.txt` 交给 harness 执行。提示词要求它：

1. 三枚硬币掷六次（随机）；
2. 从初爻到上爻排本卦、动爻、变卦；
3. 结合当天农历/干支写今日指南；
4. **只输出一个 today.json 对象**。

不需要联网 API；随机性由 harness 自己完成。想要“在线随机卜卦”，直接让在线 harness 执行同一段提示词即可。

## 2. 保存并导入

把输出保存为 `today.json`，然后：

```powershell
python scripts\import_guide.py --file today.json
```

或者：

```powershell
Get-Content today.json -Raw | python scripts\import_guide.py
```

导入成功后，面板 60 秒内重读；点指南卡右上角刷新可立即读。

## 3. 最小示例

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
  "summary": "今天适合把要紧事往前推一步，但别临时加码。",
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
  "warnings": ["顺的时候留一步"],
  "todo": [
    { "k": "穿", "v": "舒适、保暖" },
    { "k": "办事", "v": "先做最重要的一件" }
  ],
  "updated_at": "2026-11-22T20:12:00+08:00",
  "source": "harness / 模型名",
  "report_url": ""
}
```

## 4. 不占卦

不生成 `today.json` 即可。面板会显示「未推算」印章和当天农历宜忌，其他卡片照常工作。

## 5. 边界

- 这是传统文化与自我整理工具，不是医疗、心理、法律或投资建议。
- 不要让 harness 编造历法/干支；不确定就留空或降低断言。
- 随机起卦结果只作参考，不承诺准确率。
