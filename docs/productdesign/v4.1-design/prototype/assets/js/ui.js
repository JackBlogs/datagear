/* ============================================================
   DataGear V4.1 原型 · 交互原语库（依赖 shell.js 的 DG 与 theme.css）
   提供：模态/抽屉/确认/表单对话框/校验/加载/分页/Toast类型化
   所有页面交互统一经由此层，保证行为一致（对齐交互规范 02）
   ============================================================ */
(function () {
  'use strict';
  const DG = window.DG = window.DG || {};

  function el(html) { const d = document.createElement('div'); d.innerHTML = html.trim(); return d.firstElementChild; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

  /* ---------- Toast（类型化：ok / err / warn / info） ---------- */
  function toast(msg, type) {
    let box = document.getElementById('dg-toast');
    if (!box) {
      box = document.createElement('div'); box.id = 'dg-toast';
      box.style.cssText = 'position:fixed;top:70px;left:50%;transform:translateX(-50%);z-index:300;display:flex;flex-direction:column;gap:8px;align-items:center;pointer-events:none';
      document.body.appendChild(box);
    }
    const item = document.createElement('div');
    item.className = type ? 't-' + type : '';
    item.style.cssText = 'background:rgba(17,26,42,.96);border:1px solid rgba(255,138,61,.35);color:#F2F5FA;padding:9px 18px;border-radius:10px;font-size:13px;box-shadow:0 8px 30px rgba(0,0,0,.45);backdrop-filter:blur(10px);transition:all .3s';
    item.textContent = msg;
    box.appendChild(item);
    setTimeout(() => { item.style.opacity = '0'; item.style.transform = 'translateY(-8px)'; setTimeout(() => item.remove(), 300); }, 3000);
  }

  /* ---------- 模态 ---------- */
  function modal(opt) {
    const mask = el(`<div class="modal-mask show"><div class="modal" style="${opt.width ? 'width:' + opt.width + 'px;' : ''}"></div></div>`);
    const box = mask.firstElementChild;
    box.innerHTML = `
      <div class="flex-between mb-2">
        <div style="font-size:15px;font-weight:600">${esc(opt.title || '')}</div>
        <button class="icon-btn" data-x>${DG.ICONS ? DG.ICONS.x : '✕'}</button>
      </div>
      <div class="m-body"></div>
      ${opt.footer === false ? '' : '<div class="m-foot" style="display:flex;justify-content:flex-end;gap:10px;margin-top:18px"></div>'}`;
    const bodyEl = box.querySelector('.m-body');
    if (typeof opt.body === 'string') bodyEl.innerHTML = opt.body; else if (opt.body) bodyEl.appendChild(opt.body);
    const foot = box.querySelector('.m-foot');
    const api = { el: mask, body: bodyEl, close() { mask.remove(); document.removeEventListener('keydown', onKey); } };
    (opt.buttons || [{ label: '确 定', primary: true }]).forEach(b => {
      const btn = el(`<button class="btn ${b.primary ? 'primary' : ''} ${b.danger ? 'danger' : ''}">${esc(b.label)}</button>`);
      btn.onclick = async () => {
        if (b.onClick) { const r = await b.onClick(api, btn); if (r === false) return; }
        if (!b.keepOpen) api.close();
      };
      foot && foot.appendChild(btn);
    });
    box.querySelector('[data-x]').onclick = () => api.close();
    mask.addEventListener('click', e => { if (e.target === mask && opt.maskClose !== false) api.close(); });
    function onKey(e) { if (e.key === 'Escape') api.close(); }
    document.addEventListener('keydown', onKey);
    document.body.appendChild(mask);
    return api;
  }

  /* ---------- 抽屉 ---------- */
  function drawer(opt) {
    const d = el(`<div class="drawer" style="${opt.width ? 'width:' + opt.width + 'px;' : ''}"></div>`);
    d.innerHTML = `
      <div class="flex-between" style="padding:16px 20px;border-bottom:1px solid var(--line-1);flex:none">
        <div style="font-size:15px;font-weight:600">${esc(opt.title || '')}</div>
        <button class="icon-btn" data-x>${DG.ICONS ? DG.ICONS.x : '✕'}</button>
      </div>
      <div class="d-body" style="flex:1;overflow-y:auto;padding:18px 20px"></div>
      ${opt.footer ? '<div class="d-foot" style="padding:12px 20px;border-top:1px solid var(--line-1);display:flex;justify-content:flex-end;gap:10px;flex:none"></div>' : ''}`;
    const bodyEl = d.querySelector('.d-body');
    if (typeof opt.body === 'string') bodyEl.innerHTML = opt.body; else if (opt.body) bodyEl.appendChild(opt.body);
    const api = { el: d, body: bodyEl, close() { d.classList.remove('show'); setTimeout(() => d.remove(), 300); } };
    if (opt.footer) {
      const foot = d.querySelector('.d-foot');
      (opt.buttons || []).forEach(b => {
        const btn = el(`<button class="btn ${b.primary ? 'primary' : ''} ${b.danger ? 'danger' : ''}">${esc(b.label)}</button>`);
        btn.onclick = async () => { if (b.onClick) { const r = await b.onClick(api, btn); if (r === false) return; } if (!b.keepOpen) api.close(); };
        foot.appendChild(btn);
      });
    }
    d.querySelector('[data-x]').onclick = () => api.close();
    document.body.appendChild(d);
    requestAnimationFrame(() => d.classList.add('show'));
    return api;
  }

  /* ---------- 危险操作二次确认（对齐交互规范 IX-FB-07） ---------- */
  function confirm(opt) {
    return new Promise(resolve => {
      const m = modal({
        title: '', footer: true, maskClose: false,
        body: `<div style="display:flex;gap:12px;align-items:flex-start">
                 <span style="color:${opt.danger ? 'var(--danger)' : 'var(--warn)'};width:22px;flex:none;margin-top:2px">${DG.ICONS ? DG.ICONS.alert : '!'}</span>
                 <div><div style="font-size:15px;font-weight:600;margin-bottom:6px">${esc(opt.title || '确认操作')}</div>
                 <div style="font-size:13px;color:var(--tx-2);line-height:1.7">${opt.content || ''}</div></div>
               </div>`,
        buttons: [
          { label: '取 消', onClick: () => { resolve(false); } },
          { label: opt.okLabel || '确 定', primary: !opt.danger, danger: !!opt.danger, onClick: () => { resolve(true); } }
        ]
      });
      m.el.querySelector('.modal').className = 'modal';
      m.el.querySelector('.modal').style.width = '420px';
    });
  }

  /* ---------- 表单对话框（声明式字段 + 校验） ----------
     fields: [{key,label,type:text|password|number|select|textarea|switch|date,
               required,placeholder,options:[{v,t}],value,hint,validate(v)->msg|null}] */
  function formModal(opt) {
    return new Promise(resolve => {
      const fieldsHtml = opt.fields.map(f => `
        <div class="form-item" data-f="${f.key}">
          <label class="form-label">${f.required ? '<span class="req">*</span>' : ''}${esc(f.label)}</label>
          ${f.type === 'select'
            ? `<select class="select" name="${f.key}">${(f.options || []).map(o => `<option value="${esc(o.v)}" ${o.v === f.value ? 'selected' : ''}>${esc(o.t)}</option>`).join('')}</select>`
            : f.type === 'textarea'
            ? `<textarea class="textarea" name="${f.key}" rows="${f.rows || 3}" placeholder="${esc(f.placeholder || '')}">${esc(f.value || '')}</textarea>`
            : `<input class="input" type="${f.type || 'text'}" name="${f.key}" value="${esc(f.value != null ? f.value : '')}" placeholder="${esc(f.placeholder || '')}" />`}
          ${f.hint ? `<div class="form-hint">${esc(f.hint)}</div>` : ''}
          <div class="field-error hidden"></div>
        </div>`).join('');
      const m = modal({
        title: opt.title, width: opt.width || 560, body: `<form autocomplete="off">${fieldsHtml}</form>`,
        buttons: [{ label: '取 消', onClick: () => resolve(null) }, {
          label: opt.okLabel || '保 存', primary: true, keepOpen: true,
          onClick: async (api, btn) => {
            const form = api.body.querySelector('form');
            const values = {}; let ok = true;
            opt.fields.forEach(f => {
              const inp = form.querySelector(`[name="${f.key}"]`);
              const errEl = form.querySelector(`[data-f="${f.key}"] .field-error`);
              const v = inp ? inp.value.trim() : '';
              values[f.key] = v;
              let msg = '';
              if (f.required && !v) msg = (f.label + '不能为空');
              else if (v && f.validate) msg = f.validate(v) || '';
              if (msg) { ok = false; inp && inp.classList.add('err'); errEl.textContent = msg; errEl.classList.remove('hidden'); }
              else { inp && inp.classList.remove('err'); errEl.classList.add('hidden'); }
            });
            if (!ok) return false;
            btnLoading(btn, true);
            try { const r = opt.onSubmit ? await opt.onSubmit(values) : true; if (r === false) return false; resolve(values); }
            catch (e) { toast(e && e.message ? e.message : '提交失败，请重试', 'err'); return false; }
            finally { btnLoading(btn, false); }
          }
        }]
      });
    });
  }

  /* ---------- 按钮加载态 ---------- */
  function btnLoading(btn, on) {
    if (on) { btn.classList.add('loading'); btn.dataset.old = btn.innerHTML; btn.innerHTML = '<span class="spin"></span> 处理中…'; }
    else if (btn.dataset.old) { btn.classList.remove('loading'); btn.innerHTML = btn.dataset.old; }
  }

  /* ---------- 区块/表格加载与三态 ---------- */
  function blockLoading(container) { const o = el('<div class="block-loading"><span class="spin"></span> 数据加载中…</div>'); container.appendChild(o); return () => o.remove(); }
  function emptyBlock(msg, actionLabel, onAction) {
    return `<div class="empty">
      <div class="e-icon">${DG.ICONS ? DG.ICONS.dataset : ''}</div>
      <div style="font-size:13.5px;color:var(--tx-2)">${esc(msg || '暂无数据')}</div>
      <div class="sm tx-3">可调整筛选条件，或创建第一条记录</div>
      ${actionLabel ? `<button class="btn primary sm" onclick="(${onAction})()">${esc(actionLabel)}</button>` : ''}
    </div>`;
  }
  function errorBlock(msg, onRetry) {
    const d = el(`<div class="empty">
      <div class="e-icon" style="color:var(--danger)">${DG.ICONS ? DG.ICONS.alert : ''}</div>
      <div style="font-size:13.5px;color:var(--danger)">${esc(msg || '加载失败')}</div>
      <button class="btn sm">重 试</button></div>`);
    d.querySelector('button').onclick = onRetry;
    return d;
  }

  /* ---------- 分页 ---------- */
  function pager(container, total, pageSize, cur, onPage) {
    const pages = Math.max(1, Math.ceil(total / pageSize));
    const nums = [];
    for (let i = 1; i <= pages; i++) { if (i === 1 || i === pages || Math.abs(i - cur) <= 2) nums.push(i); else if (nums[nums.length - 1] !== '…') nums.push('…'); }
    container.className = 'pagination';
    container.innerHTML = `<span>共 ${total} 条</span>
      <button class="pg-btn" ${cur <= 1 ? 'disabled' : ''} data-p="${cur - 1}">‹</button>
      ${nums.map(n => n === '…' ? '<span style="padding:0 4px">…</span>' : `<button class="pg-btn ${n === cur ? 'cur' : ''}" data-p="${n}">${n}</button>`).join('')}
      <button class="pg-btn" ${cur >= pages ? 'disabled' : ''} data-p="${cur + 1}">›</button>`;
    container.querySelectorAll('.pg-btn[data-p]').forEach(b => b.onclick = () => { const p = +b.dataset.p; if (p >= 1 && p <= pages && p !== cur) onPage(p); });
  }

  /* ---------- 表格通用渲染辅助（数据驱动，方便接 mock API） ---------- */
  function renderRows(tbody, rows, rowHtml) {
    tbody.innerHTML = rows.length ? rows.map(rowHtml).join('') : `<tr><td colspan="20" style="padding:0">${emptyBlock('没有符合条件的记录')}</td></tr>`;
  }

  DG.ui = { el, esc, toast, modal, drawer, confirm, formModal, btnLoading, blockLoading, emptyBlock, errorBlock, pager, renderRows };
  if (!DG.toast || DG.toast.length < 2) DG.toast = toast; // 覆盖 shell.js 旧版，统一类型化
})();
