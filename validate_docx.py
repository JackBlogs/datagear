# -*- coding: utf-8 -*-
"""重新打开生成的 docx 校验：段落数、表格数、标题层级分布、空表格、乱码检测。"""
from docx import Document

doc = Document("PRD-BI产品需求文档-V4.1-优化版.docx")

h1 = [p.text for p in doc.paragraphs if p.style.name == "Heading 1"]
h2 = [p.text for p in doc.paragraphs if p.style.name == "Heading 2"]
h3 = [p.text for p in doc.paragraphs if p.style.name == "Heading 3"]
normal = [p for p in doc.paragraphs if p.style.name == "Normal"]

print(f"总段落数: {len(doc.paragraphs)}（正文 {len(normal)}）")
print(f"表格数: {len(doc.tables)}")
print(f"Heading 1: {len(h1)} / Heading 2: {len(h2)} / Heading 3: {len(h3)}")

empty_tables = [i for i, t in enumerate(doc.tables) if len(t.rows) == 0]
print(f"空表格数: {len(empty_tables)} {empty_tables if empty_tables else ''}")

# 表格列数一致性 & 空单元格比例抽样
bad = []
for i, t in enumerate(doc.tables):
    ncols = len(t.columns)
    for r in t.rows:
        if len(r.cells) != ncols:
            bad.append((i, "列数不一致"))
            break
print(f"表格结构异常: {len(bad)} {bad if bad else ''}")

# 乱码/替换字符检测
import itertools
texts = [p.text for p in doc.paragraphs] + [c.text for t in doc.tables for r in t.rows for c in r.cells]
garbled = [t for t in texts if "" in t]
print(f"乱码(含替换符)文本数: {len(garbled)}")

# 新增章节是否进入文档
for kw in ["商业模式与投入测算", "指标字典", "埋点与使用分析方案", "用户旅程地图", "数据迁移与升级兼容", "资源与团队假设", "ROI与投入测算"]:
    hit = kw in h1 or kw in h2 or any(kw in h for h in h3)
    print(f"章节存在[{kw}]: {hit}")

print("\n--- Heading 1 列表 ---")
for t in h1: print("  ", t)
print("\n--- Heading 2 列表 ---")
for t in h2: print("  ", t)
