# 安装与屏幕配置

## 1. 安装 Python

Windows 10/11，安装 Python 3.10 或更高版本，勾选 **Add python.exe to PATH**。

验证：

```powershell
python --version
```

## 2. 安装依赖

在项目根目录：

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```

推荐用项目自己的 `.venv`，不要和系统环境混。

## 3. 配置

```powershell
copy config.example.json config.json
```

`config.json` 已被 .gitignore 忽略，可以放自己的屏幕、城市和坐标。

```json
{
  "screen": "auto",
  "window": { "width": 1080, "height": null, "x": 0, "y": 0 },
  "weather": { "name": "北京", "lat": 39.9042, "lon": 116.4074 }
}
```

### screen 怎么选

- `auto`：有副屏就用副屏，没有就用主屏。
- `secondary`：明确用非主屏；没有副屏时回退主屏。
- `primary`：只用主屏。
- `0`、`1`：按 QScreen 序号。
- `"DELL U2415"`：按屏幕名称（不区分大小写）。

### 单屏 / 横屏

面板原生比例是 1080×1920。单屏横屏时默认取 **1080 宽 × 屏幕可用高度**，靠左放置；不会强行拉成横向。若你的主屏是 2560×1440，它会是一个 1080×1440 的竖条。

`window.height` 为 null 表示用可用高度；也可以写死，例如 1872。

### 双屏

系统显示设置里把副屏设为“扩展”，面板会自动找非主屏。若方向/坐标特殊，用 `screen` 指定序号或名称，必要时用 `window.x/y` 微调。

## 4. 初始化数据

```powershell
python scripts\bootstrap.py
python scripts\collect_weather.py
python scripts\collect_news.py
python scripts\collect_github.py
```

`bootstrap.py` 会：

- 创建 `data/cache`、`data/logs`、`data/state`、`data/backup`；
- 复制公开经典数据；
- 没有 config 时从示例复制。

第一次没有天气/新闻/GitHub 也能启动，只是对应卡片显示空态。

## 5. 启动

```powershell
.venv\Scripts\python.exe app\qt_main.py
```

或：

```powershell
python app\qt_main.py
```

启动后默认只显示左上角 64×64 小按钮，点它展开。双击顶部空白切全屏。

## 6. 开机自启（可选）

```powershell
powershell -ExecutionPolicy Bypass -File scripts\install_startup.ps1
```

注册 `SidePanel-Startup`，登录后延迟 20 秒启动。脚本会优先使用 `.venv\Scripts\pythonw.exe`。

看门狗和每日维护：

```powershell
powershell -ExecutionPolicy Bypass -File scripts\install_maintenance.ps1
```

- `SidePanel-Watchdog`：每 3 分钟检查心跳/内存，异常重启。
- `SidePanel-Maint`：每天 04:00 备份 memo、清临时文件、重启面板。

## 7. 更新

```powershell
git pull
.venv\Scripts\python.exe -m pip install -r requirements.txt
```

设计文件改动会在 4 秒内自动 reload；Python 改动需要重启面板（或等 04:00 维护）。

## 8. 卸载

```powershell
Disable-ScheduledTask -TaskName "SidePanel-Startup","SidePanel-Watchdog","SidePanel-Maint"
Unregister-ScheduledTask -TaskName "SidePanel-Startup","SidePanel-Watchdog","SidePanel-Maint" -Confirm:$false
```

然后删除项目目录。`data/` 是本机数据，删除前自行备份。

## 9. 常见问题

**只看到小圆点**：正常。点它展开。

**窗口跑到主屏**：把 `config.json` 的 `screen` 改成副屏序号或名称。

**任务栏被盖住**：确认没有把窗口设成无边框全屏；面板默认使用 `availableGeometry()`。

**PyQt5 装不上**：确认 Python 位数和版本，优先用 3.10–3.12 的 64 位；PyQt5 5.15.11 在 3.14 也可用。

**字体不对**：设计优先宋体/思源宋体；Windows 自带 SimSun 即可。

无需占卦也可使用面板。缺少当日 `today.json` 时，指南卡显示「未推算」。农历宜忌依赖可选的本地历法数据。
