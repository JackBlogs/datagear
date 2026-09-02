# -*- coding: utf-8 -*-
"""SDS docx → textutil HTML → 切片 → Chrome headless 截图（视觉抽检）。"""
import re, subprocess, os

DOCX = "SDS-软件开发说明书-V1.0.docx"
OUT = "sds_preview"
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
os.makedirs(OUT, exist_ok=True)

subprocess.run(["textutil", "-convert", "html", DOCX, "-output", f"{OUT}/sds_full.html"], check=True)
html = open(f"{OUT}/sds_full.html", encoding="utf-8").read()
orig_style = re.search(r"<style[^>]*>.*?</style>", html, re.S).group(0)
body = re.search(r"<body[^>]*>(.*)</body>", html, re.S).group(1)

FRAGS = [
    ("01_cover", "商业智能分析平台", "引言"),
    ("02_arch", "设计目标与约束", "核心数据模型设计"),
    ("03_semantics_module", "语义层与指标中心【全新建设 · 最高优先级】", "数据治理【全新建设"),
    ("04_security", "安全设计", "性能与容量设计"),
]
CSS = """<style>
body{font-family:'FangSong','仿宋',serif;font-size:12pt;margin:24px;}
table{border-collapse:collapse;margin:8px 0;}
td,th{border:1px solid #333;padding:3px 8px;font-size:10.5pt;}
</style>"""

def find_start(body, marker, end):
    """取 end 之前最后一次出现的 marker，并回退到所在标签的起点。"""
    ei = body.find(end)
    si = body.rfind(marker, 0, ei if ei > 0 else len(body))
    if si < 0:
        return -1, ei
    si = body.rfind("<", 0, si)  # 回退到包裹标签
    return si, ei

for name, start, end in FRAGS:
    if name == "01_cover":
        si, ei = 0, body.find(end)
    else:
        si, ei = find_start(body, start, end)
    if si < 0 or ei < 0:
        print(f"[{name}] 标记未找到 start={si} end={ei}")
        continue
    page = f"<html><head><meta charset='utf-8'>{orig_style}{CSS}</head><body>{body[si:ei]}</body></html>"
    fp = f"{OUT}/{name}.html"
    open(fp, "w", encoding="utf-8").write(page)
    png = f"{OUT}/{name}.png"
    subprocess.run([CHROME, "--headless", "--disable-gpu", "--force-device-scale-factor=1.5",
                    "--window-size=1100,1500", f"--screenshot={png}", f"file://{os.path.abspath(fp)}"],
                   capture_output=True, timeout=90)
    print(f"[{name}] {'OK' if os.path.exists(png) else 'FAIL'}")
