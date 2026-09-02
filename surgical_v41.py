# -*- coding: utf-8 -*-
"""外科手术式生成 V4.1 docx：以 V4.0 docx 为底版，按 prd_extracted.md→prd_v41.md 的元素级 diff 就地修改/删除/插入，完整保留原样式体系。"""
import re, difflib
from copy import deepcopy
from docx import Document
from docx.oxml.ns import qn

SRC_DOCX = "PRD-BI产品需求文档-V4.0-最终整合版.docx"
DST_DOCX = "PRD-BI产品需求文档-V4.1-优化版.docx"

# ---------- md 解析（与 align_dryrun 一致） ----------
def md_elements(path):
    elems = []
    with open(path, encoding="utf-8") as f:
        lines = f.read().splitlines()
    i, n = 0, len(lines)
    while i < n:
        s = lines[i].strip()
        if not s:
            i += 1; continue
        if s.startswith("|") and s.endswith("|"):
            rows = []
            while i < n and lines[i].strip().startswith("|"):
                rows.append([c.strip() for c in lines[i].strip().strip("|").split("|")])
                i += 1
            elems.append(("tbl", rows)); continue
        if s.startswith("### "):
            elems.append(("h3", s[4:].strip())); i += 1; continue
        if s.startswith("## "):
            elems.append(("h2", s[3:].strip())); i += 1; continue
        if s.startswith("# "):
            elems.append(("h1", s[2:].strip())); i += 1; continue
        elems.append(("p", s)); i += 1
    return elems

def docx_elements(doc):
    out = []
    for child in doc.element.body.iterchildren():
        if child.tag == qn('w:p'):
            text = "".join(t.text or "" for t in child.iter(qn('w:t')))
            out.append(("p", text, child))
        elif child.tag == qn('w:tbl'):
            rows = []
            for tr in child.findall(qn('w:tr')):
                rows.append(["".join(t.text or "" for t in tc.iter(qn('w:t')))
                             for tc in tr.findall(qn('w:tc'))])
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
    return "P|" + norm(el[1])

def clean(s):
    return s.replace("**", "")

# ---------- XML 级文本设置（保留首 run 格式） ----------
def set_runs_text(container_p, text):
    """设置 w:p 段落文本：首 run 承载全部文本（保留其 rPr），删除其余 run。保留非 run 子元素。"""
    runs = container_p.findall(qn('w:r'))
    if not runs:
        # 新建一个 run（无格式，调用方应避免此路径）
        from docx.oxml import OxmlElement
        r = OxmlElement('w:r')
        t = OxmlElement('w:t'); t.text = text
        t.set(qn('xml:space'), 'preserve')
        r.append(t); container_p.append(r)
        return
    first = runs[0]
    ts = first.findall(qn('w:t'))
    if not ts:
        from docx.oxml import OxmlElement
        t = OxmlElement('w:t')
        first.append(t); ts = [t]
    ts[0].text = text
    ts[0].set(qn('xml:space'), 'preserve')
    for extra in ts[1:]:
        first.remove(extra)
    for r in runs[1:]:
        container_p.remove(r)

def set_para_text(p_el, text):
    set_runs_text(p_el, clean(text))

def set_toc_text(p_el, full_text):
    """toc 段落：first w:t = 条目文字，last w:t = 页码，其余置空。"""
    parts = full_text.split("\t")
    entry = clean(parts[0])
    page = parts[-1] if len(parts) > 1 else ""
    ts = list(p_el.iter(qn('w:t')))
    if not ts:
        set_para_text(p_el, entry)
        return
    ts[0].text = entry
    for t in ts[1:]:
        t.text = ""
    if len(ts) > 1:
        ts[-1].text = page

def set_cell_text(tc, text):
    """设置 w:tc 单元格文本：保留第一个段落，其余段落删除。"""
    ps = tc.findall(qn('w:p'))
    if not ps:
        from docx.oxml import OxmlElement
        p = OxmlElement('w:p'); tc.append(p); ps = [p]
    set_runs_text(ps[0], clean(text))
    for p in ps[1:]:
        tc.remove(p)

def update_table(tbl_el, new_rows):
    """就地更新表格：行数增删 + 单元格文本更新。"""
    trs = tbl_el.findall(qn('w:tr'))
    # 行数调整
    while len(trs) < len(new_rows):
        trs.append(deepcopy(trs[-1]))
        tbl_el.append(trs[-1])
    while len(trs) > len(new_rows):
        tbl_el.remove(trs.pop())
    for tr, row in zip(trs, new_rows):
        tcs = tr.findall(qn('w:tc'))
        for j, tc in enumerate(tcs):
            set_cell_text(tc, row[j] if j < len(row) else "")

# ---------- 新元素创建（deepcopy 模板，继承原格式） ----------
def new_para(ref_el, text):
    el = deepcopy(ref_el)
    set_para_text(el, text)
    return el

def new_toc(ref_el, text):
    el = deepcopy(ref_el)
    set_toc_text(el, text)
    return el

def new_table(ref_tbl_el, rows):
    el = deepcopy(ref_tbl_el)
    trs = el.findall(qn('w:tr'))
    # 只保留首行
    for tr in trs[1:]:
        el.remove(tr)
    first = el.findall(qn('w:tr'))[0]
    ncols_ref = len(first.findall(qn('w:tc')))
    ncols_new = max(len(r) for r in rows)
    assert ncols_ref == ncols_new, f"模板列数 {ncols_ref} != 新表列数 {ncols_new}"
    update_table(el, rows)
    return el

def is_toc_el(el):
    pPr = el.find(qn('w:pPr'))
    if pPr is None: return False
    ps = pPr.find(qn('w:pStyle'))
    return ps is not None and ps.get(qn('w:val')) in ('29', '30', '31')  # toc 样式 id 待确认，按名称更稳

def para_style_id(el):
    pPr = el.find(qn('w:pPr'))
    if pPr is None: return None
    ps = pPr.find(qn('w:pStyle'))
    return ps.get(qn('w:val')) if ps is not None else None

def main():
    old_md = md_elements("prd_extracted.md")
    new_md = md_elements("prd_v41.md")
    doc = Document(SRC_DOCX)
    dx = docx_elements(doc)

    # 样式 id 名称表
    style_names = {s.style_id: s.name for s in doc.styles}
    toc_ids = {sid for sid, nm in style_names.items() if nm and nm.startswith('toc')}
    h1_ids = {sid for sid, nm in style_names.items() if nm == 'Heading 1'}
    h2_ids = {sid for sid, nm in style_names.items() if nm == 'Heading 2'}
    print("toc style ids:", toc_ids, "h1:", h1_ids, "h2:", h2_ids)

    # 1. 对齐 old_md -> dx
    mapping = {}
    j = 0
    for i, el in enumerate(old_md):
        k = key_md(el)
        while j < len(dx):
            d = dx[j]
            if d[0] == "p" and not norm(d[1]):
                j += 1; continue
            if key_dx(d) == k:
                mapping[i] = j; j += 1; break
            if el[0] == "tbl" and d[0] == "tbl" and len(d[1]) == len(el[1]) and \
               [norm(c) for c in d[1][0]] == [norm(c) for c in el[1][0]]:
                mapping[i] = j; j += 1; break
            j += 1
        if i not in mapping:
            raise RuntimeError(f"old_md[{i}] 未对齐: {el[0]} {str(el[1])[:60]}")
    print(f"对齐 {len(mapping)}/{len(old_md)}")

    # 2. 模板元素
    def dx_el(i): return dx[mapping[i]][-1]
    # 正文参考段：old_md 中 "随着企业数字化转型深入..."
    ref_normal = ref_bold = ref_h1 = ref_h2 = ref_toc1 = ref_toc2 = None
    tbl_templates = {}
    for i, el in enumerate(old_md):
        e = dx_el(i)
        if el[0] == "p":
            sid = para_style_id(e)
            sname = style_names.get(sid)
            if sname == 'toc 1' and ref_toc1 is None: ref_toc1 = e
            elif sname == 'toc 2' and ref_toc2 is None: ref_toc2 = e
            elif ref_normal is None and not sid and len(el[1]) > 20: ref_normal = e
            if el[1] == '修订记录': ref_bold = e
        elif el[0] == "h1" and ref_h1 is None and el[1] == '产品概述': ref_h1 = e
        elif el[0] == "h2" and ref_h2 is None: ref_h2 = e
        elif el[0] == "tbl":
            nc = max(len(r) for r in el[1])
            tbl_templates.setdefault(nc, e)
    print("模板列数:", sorted(tbl_templates.keys()))
    assert all(x is not None for x in (ref_normal, ref_bold, ref_h1, ref_h2, ref_toc1, ref_toc2))

    # 3. diff 并执行
    ok = [key_md(e) for e in old_md]
    nk = [key_md(e) for e in new_md]
    ops = difflib.SequenceMatcher(None, ok, nk, autojunk=False).get_opcodes()
    stats = {"para_update": 0, "toc_update": 0, "tbl_update": 0, "delete": 0, "insert": 0}

    def anchor_of(old_idx):
        """old_idx 处之后最近的有映射元素的 docx 元素。"""
        return dx_el(old_idx) if old_idx < len(old_md) else None

    def make_el(nel):
        kind = nel[0]
        if kind == "tbl":
            nc = max(len(r) for r in nel[1])
            tmpl = tbl_templates.get(nc)
            assert tmpl is not None, f"无 {nc} 列模板表"
            return new_table(tmpl, nel[1])
        if kind == "h1": return new_para(ref_h1, nel[1])
        if kind == "h2": return new_para(ref_h2, nel[1])
        if kind == "h3": return new_para(ref_bold, nel[1])  # 原文档无 H3，用加粗正文段保持标题体系
        # 普通段：toc 条目（含 \t 且形如 'N. xxx\t页码'）用 toc 模板
        if "\t" in nel[1] and re.match(r"^\d+(\.\d+)*\.", nel[1]):
            level2 = nel[1].startswith(("1.", "2.", "3.", "4.", "5.", "6.", "7.", "8.", "9.")) and "." in nel[1].split("\t")[0] and len(nel[1].split("\t")[0].split(".")) >= 3
            # toc 1: '14. xxx'（两段式编号），toc 2: '14.1. xxx'（三段式）
            head = nel[1].split("\t")[0].rstrip(".")
            depth = head.count(".")
            return new_toc(ref_toc2 if depth >= 1 and not re.match(r"^\d+\.\s", nel[1]) else ref_toc1, nel[1])
        return new_para(ref_normal, nel[1])

    for tag, a, b, c, d in ops:
        if tag == "equal":
            continue
        anchor = anchor_of(b)  # 插入锚点（块后第一个 old 元素）
        olds = list(range(a, b)); news = list(range(c, d))
        # 块内配对：段落配段落（顺序），表配表（顺序）
        o_paras = [i for i in olds if old_md[i][0] != "tbl"]
        o_tbls  = [i for i in olds if old_md[i][0] == "tbl"]
        n_paras = [i for i in news if new_md[i][0] != "tbl"]
        n_tbls  = [i for i in news if new_md[i][0] == "tbl"]
        # 段落配对更新
        for oi, ni in zip(o_paras, n_paras):
            pel = dx_el(oi)
            if para_style_id(pel) in toc_ids:
                set_toc_text(pel, new_md[ni][1]); stats["toc_update"] += 1
            else:
                set_para_text(pel, new_md[ni][1]); stats["para_update"] += 1
        # 表配对更新
        for oi, ni in zip(o_tbls, n_tbls):
            update_table(dx_el(oi), new_md[ni][1]); stats["tbl_update"] += 1
        # 多余 old 删除
        for oi in o_paras[len(n_paras):] + o_tbls[len(n_tbls):]:
            el = dx_el(oi)
            el.getparent().remove(el); stats["delete"] += 1
        # 多余 new 按块内顺序插入：锚点 = 其后最近一个"已配对 new"对应的 docx 元素；
        # 若其后无已配对元素，则锚点 = 块后第一个 old 元素（插在块尾）
        paired_new = set(n_paras[:len(o_paras)]) | set(n_tbls[:len(o_tbls)])
        pair_old_of = {}
        for oi, ni in zip(o_paras, n_paras): pair_old_of[ni] = oi
        for oi, ni in zip(o_tbls, n_tbls): pair_old_of[ni] = oi
        for idx_n, ni in enumerate(news):
            if ni in paired_new: continue
            anchor_el = anchor
            for ni2 in news[idx_n + 1:]:
                if ni2 in pair_old_of:
                    anchor_el = dx_el(pair_old_of[ni2]); break
            assert anchor_el is not None, "文末插入未支持"
            anchor_el.addprevious(make_el(new_md[ni])); stats["insert"] += 1

    print("操作统计:", stats)

    # 4. settings.xml 加 updateFields
    from docx.oxml import OxmlElement
    settings = doc.settings.element
    if settings.find(qn('w:updateFields')) is None:
        uf = OxmlElement('w:updateFields')
        uf.set(qn('w:val'), 'true')
        settings.insert(0, uf)
        print("updateFields 已设置")

    doc.save(DST_DOCX)
    print("saved:", DST_DOCX)

if __name__ == "__main__":
    main()
