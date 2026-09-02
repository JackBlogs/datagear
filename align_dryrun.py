# -*- coding: utf-8 -*-
"""对齐 prd_extracted.md / prd_v41.md 的元素序列与 V4.0 docx 的 body 元素序列（干跑，不写文件）。"""
import re, sys
from docx import Document
from docx.oxml.ns import qn

def md_elements(path):
    """把 markdown 解析为元素序列：('h1'|'h2'|'h3'|'p', text) 或 ('tbl', [rows])，row 为 cell 列表。"""
    elems = []
    with open(path, encoding="utf-8") as f:
        lines = f.read().splitlines()
    i, n = 0, len(lines)
    while i < n:
        line = lines[i]
        s = line.strip()
        if not s:
            i += 1; continue
        if s.startswith("|") and s.endswith("|"):
            rows = []
            while i < n and lines[i].strip().startswith("|"):
                rows.append([c.strip() for c in lines[i].strip().strip("|").split("|")])
                i += 1
            elems.append(("tbl", rows))
            continue
        if s.startswith("### "):
            elems.append(("h3", s[4:].strip())); i += 1; continue
        if s.startswith("## "):
            elems.append(("h2", s[3:].strip())); i += 1; continue
        if s.startswith("# "):
            elems.append(("h1", s[2:].strip())); i += 1; continue
        elems.append(("p", s)); i += 1
    return elems

def docx_elements(doc):
    """body 顺序元素：('p', style, text, element) 或 ('tbl', rows_texts, element)。"""
    out = []
    for child in doc.element.body.iterchildren():
        if child.tag == qn('w:p'):
            # 样式
            pPr = child.find(qn('w:pPr'))
            style = None
            if pPr is not None:
                ps = pPr.find(qn('w:pStyle'))
                if ps is not None:
                    style = ps.get(qn('w:val'))
            text = "".join(t.text or "" for t in child.iter(qn('w:t')))
            out.append(("p", style, text, child))
        elif child.tag == qn('w:tbl'):
            rows = []
            for tr in child.findall(qn('w:tr')):
                cells = []
                for tc in tr.findall(qn('w:tc')):
                    cells.append("".join(t.text or "" for t in tc.iter(qn('w:t'))))
                rows.append(cells)
            out.append(("tbl", rows, child))
    return out

def norm(s):
    return re.sub(r"\s+", "", s or "")

def key_md(el):
    if el[0] == "tbl":
        return "T|" + "|".join("|".join(norm(c) for c in r) for r in el[1])
    return "P|" + norm(el[1])

def key_dx(el):
    if el[0] == "tbl":
        return "T|" + "|".join("|".join(norm(c) for c in r) for r in el[1])
    return "P|" + norm(el[2])

def main():
    old_md = md_elements("prd_extracted.md")
    new_md = md_elements("prd_v41.md")
    doc = Document("PRD-BI产品需求文档-V4.0-最终整合版.docx")
    dx = docx_elements(doc)
    print(f"old_md elems: {len(old_md)} (tbl {sum(1 for e in old_md if e[0]=='tbl')})")
    print(f"new_md elems: {len(new_md)} (tbl {sum(1 for e in new_md if e[0]=='tbl')})")
    print(f"docx elems: {len(dx)} (p {sum(1 for e in dx if e[0]=='p')}, tbl {sum(1 for e in dx if e[0]=='tbl')})")

    # 对齐 old_md -> docx（贪心前向匹配，跳过空段落）
    mapping = []  # old_md idx -> dx idx or None
    j = 0
    fails = []
    for i, el in enumerate(old_md):
        k = key_md(el)
        found = None
        jj = j
        while jj < len(dx):
            d = dx[jj]
            if d[0] == "p" and not norm(d[2]):
                jj += 1; continue  # 跳过空段落
            if key_dx(d) == k:
                found = jj; break
            # 表格容错：首行相同且行数相同
            if el[0] == "tbl" and d[0] == "tbl" and len(d[1]) == len(el[1]):
                if [norm(c) for c in d[1][0]] == [norm(c) for c in el[1][0]]:
                    found = jj; break
            jj += 1
        if found is None:
            fails.append((i, el[0], (el[1][:50] if el[0]!='tbl' else el[1][0]) if el[0]=='tbl' else el[1][:60]))
        else:
            mapping.append((i, found))
            j = found + 1
    print(f"aligned: {len(mapping)}/{len(old_md)}, fails: {len(fails)}")
    for f_ in fails[:20]:
        print("  FAIL", f_)
    # 检查 mapping 单调
    idxs = [m[1] for m in mapping]
    print("monotonic:", all(idxs[k] < idxs[k+1] for k in range(len(idxs)-1)))

    # diff old vs new
    import difflib
    ok = [key_md(e) for e in old_md]
    nk = [key_md(e) for e in new_md]
    sm = difflib.SequenceMatcher(None, ok, nk, autojunk=False)
    ops = sm.get_opcodes()
    from collections import Counter
    print("diff opcodes:", Counter(op[0] for op in ops))
    for tag, a, b, c, d in ops:
        if tag != "equal":
            print(f"  {tag} old[{a}:{b}] new[{c}:{d}]  old0={ok[a][:40] if a<len(ok) else ''}  new0={nk[c][:40] if c<len(nk) else ''}")

if __name__ == "__main__":
    main()
