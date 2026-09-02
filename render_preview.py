# -*- coding: utf-8 -*-
"""把 textutil 转换的 HTML 切成若干片段，包装后用 Chrome headless 截图做视觉抽检。"""
import re, subprocess, os

HTML = "v41_preview/v41_full.html"
OUT = "v41_preview"
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

with open(HTML, encoding="utf-8") as f:
    html = f.read()

body_m = re.search(r"<body[^>]*>(.*)</body>", html, re.S)
body = body_m.group(1)

# 片段定义：(名称, 起点标记, 终点标记)
FRAGS = [
    ("01_cover_revision", "商业智能分析平台", "目录"),
    ("02_toc", "目录", "随着企业数字化转型深入"),
    ("03_new_chapter_biz", "本章为 V4.1 新增", "指标字典（新增）"),
    ("04_metric_dict", "本表为全文唯一指标口径来源", "功能使用率监控"),
    ("05_userstory_p2", "P2用户故事", "核心用例描述"),
    ("06_mvp_scope", "用最少的功能验证", "MVP范围（不做/后置）"),
]

CSS = """<style>
body{font-family:'FangSong','仿宋',serif;font-size:12pt;margin:24px;}
table{border-collapse:collapse;margin:8px 0;}
td,th{border:1px solid #333;padding:3px 8px;font-size:10.5pt;}
</style>"""

for name, start, end in FRAGS:
    si = body.find(start)
    ei = body.find(end, si + len(start)) if end else len(body)
    if si < 0 or ei < 0:
        print(f"[{name}] 标记未找到: start={si} end={ei}")
        continue
    frag = body[si:ei]
    page = f"<html><head><meta charset='utf-8'>{CSS}</head><body>{frag}</body></html>"
    fp = f"{OUT}/{name}.html"
    with open(fp, "w", encoding="utf-8") as f:
        f.write(page)
    png = f"{OUT}/{name}.png"
    r = subprocess.run([CHROME, "--headless", "--disable-gpu", "--force-device-scale-factor=1.5",
                        "--window-size=1100,1500", f"--screenshot={png}", f"file://{os.path.abspath(fp)}"],
                       capture_output=True, timeout=60)
    ok = os.path.exists(png)
    print(f"[{name}] screenshot: {'OK' if ok else 'FAIL'} ({os.path.getsize(png) if ok else 0} bytes)")
