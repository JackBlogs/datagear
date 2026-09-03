/* ============================================================
   DataGear V4.1 原型 · 布局壳与公共脚本
   每个页面：<body data-page="home"> + <div id="app"></div>
   shell.js 注入 侧栏 + 顶栏，页面内容放入 .content
   ============================================================ */
(function () {
  'use strict';

  /* ---------- 图标库（内联SVG，离线可用） ---------- */
  const I = (p) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
  const ICONS = {
    home: I('<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M9 21v-6h6v6"/>'),
    metric: I('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>'),
    chat: I('<path d="M21 12a8 8 0 0 1-8 8H4l2.2-3.2A8 8 0 1 1 21 12Z"/><path d="M8.5 11h.01M12 11h.01M15.5 11h.01"/>'),
    board: I('<rect x="3" y="3" width="8" height="10" rx="1.5"/><rect x="13" y="3" width="8" height="6" rx="1.5"/><rect x="13" y="11" width="8" height="10" rx="1.5"/><rect x="3" y="15" width="8" height="6" rx="1.5"/>'),
    screen: I('<rect x="2" y="4" width="20" height="13" rx="2"/><path d="M8 21h8M12 17v4"/>'),
    db: I('<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5"/><path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>'),
    dataset: I('<path d="M4 4h16v5H4zM4 11h16v5H4zM4 18h16v2H4z"/><circle cx="7" cy="6.5" r=".8" fill="currentColor"/><circle cx="7" cy="13.5" r=".8" fill="currentColor"/>'),
    alert: I('<path d="M18 8a6 6 0 1 0-12 0c0 7-3 8-3 8h18s-3-1-3-8"/><path d="M10.3 21a2 2 0 0 0 3.4 0"/>'),
    govern: I('<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3Z"/><path d="m9 12 2 2 4-4"/>'),
    report: I('<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9l-6-6Z"/><path d="M14 3v6h6M8 13h8M8 17h5"/>'),
    api: I('<path d="m8 8-5 4 5 4M16 8l5 4-5 4M13 4l-2 16"/>'),
    system: I('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.9 2.9l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.9-2.9l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1.1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.9-2.9l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.9 2.9l-.1.1a1.7 1.7 0 0 0-.3 1.9v.1a1.7 1.7 0 0 0 1.5 1h.1a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/>'),
    mobile: I('<rect x="7" y="2" width="10" height="20" rx="2.5"/><path d="M11 18h2"/>'),
    search: I('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>'),
    bell: I('<path d="M18 8a6 6 0 1 0-12 0c0 7-3 8-3 8h18s-3-1-3-8"/><path d="M10.3 21a2 2 0 0 0 3.4 0"/>'),
    fold: I('<path d="M11 17l-5-5 5-5M18 17l-5-5 5-5"/>'),
    plus: I('<path d="M12 5v14M5 12h14"/>'),
    flame: I('<path d="M12 2c1 4-4 5.5-4 10a4 4 0 0 0 8 0c0-1.5-.5-2.5-1-3.5-1.5 1-2 2-2 3.5"/><path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-2.5-5.5C15 11 13 12 13 14"/>'),
    drill: I('<circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/>'),
    share: I('<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 10.7 6.8-4.4M8.6 13.3l6.8 4.4"/>'),
    star: I('<path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1L12 2Z"/>'),
    clock: I('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
    arrowR: I('<path d="M5 12h14M13 6l6 6-6 6"/>'),
    up: I('<path d="M12 19V5M5 12l7-7 7 7"/>'),
    down: I('<path d="M12 5v14M19 12l-7 7-7-7"/>'),
    spark: I('<path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1"/>'),
    safe: I('<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3Z"/>'),
    x: I('<path d="M18 6 6 18M6 6l12 12"/>'),
    dot: I('<circle cx="12" cy="12" r="4" fill="currentColor" stroke="none"/>')
  };

  /* ---------- 导航结构（对齐 PRD 9.2 信息架构） ---------- */
  const NAV = [
    { group: '概览', items: [
      { id: 'home',    name: '综合首页',   icon: 'home',   href: 'index.html' },
      { id: 'metrics', name: '指标中心',   icon: 'metric', href: 'metrics.html', badge: '新' },
      { id: 'chatbi',  name: '智能问数',   icon: 'chat',   href: 'chatbi.html',  badge: 'AI' }
    ]},
    { group: '数据资产', items: [
      { id: 'datasource', name: '数据源',   icon: 'db',      href: 'datasource.html' },
      { id: 'dataset',    name: '数据集',   icon: 'dataset', href: 'dataset.html' },
      { id: 'governance', name: '数据治理', icon: 'govern',  href: 'governance.html' }
    ]},
    { group: '分析展示', items: [
      { id: 'dashboards', name: '看板',     icon: 'board',  href: 'dashboards.html' },
      { id: 'designer',   name: '看板设计器', icon: 'plus',  href: 'designer.html' },
      { id: 'screen',     name: '数据大屏', icon: 'screen', href: 'screen.html' },
      { id: 'report',     name: '统计报表', icon: 'report', href: 'report.html' }
    ]},
    { group: '运营协同', items: [
      { id: 'alert',  name: '告警与订阅', icon: 'alert',  href: 'alert.html', badge: '3' },
      { id: 'api',    name: '开放与嵌入', icon: 'api',    href: 'api.html' },
      { id: 'mobile', name: '移动端',     icon: 'mobile', href: 'mobile.html' }
    ]},
    { group: '平台', items: [
      { id: 'system', name: '系统管理', icon: 'system', href: 'system.html' }
    ]}
  ];

  const PAGE_META = {
    home:       { crumbs: '综合首页' },
    metrics:    { crumbs: '指标中心' },
    chatbi:     { crumbs: '智能问数 · ChatBI' },
    dashboards: { crumbs: '分析展示 / 看板' },
    designer:   { crumbs: '分析展示 / 看板设计器' },
    screen:     { crumbs: '分析展示 / 数据大屏' },
    datasource: { crumbs: '数据资产 / 数据源' },
    dataset:    { crumbs: '数据资产 / 数据集' },
    governance: { crumbs: '数据资产 / 数据治理' },
    alert:      { crumbs: '运营协同 / 告警与订阅' },
    api:        { crumbs: '运营协同 / 开放与嵌入' },
    report:     { crumbs: '分析展示 / 统计报表' },
    mobile:     { crumbs: '运营协同 / 移动端 H5' },
    system:     { crumbs: '平台 / 系统管理' }
  };

  /* ---------- 布局注入 ---------- */
  function buildShell() {
    const body = document.body;
    if (body.dataset.noShell !== undefined) return;   // 大屏/登录/移动端等整页场景跳过
    const pageId = body.dataset.page || 'home';
    const meta = PAGE_META[pageId] || { crumbs: '' };

    const navHtml = NAV.map(g => `
      <div class="nav-group">
        <div class="nav-group-title">${g.group}</div>
        ${g.items.map(it => `
          <a class="nav-item ${it.id === pageId ? 'active' : ''}" href="${it.href}" title="${it.name}">
            ${ICONS[it.icon]}<span>${it.name}</span>${it.badge ? `<em class="nav-badge">${it.badge}</em>` : ''}
          </a>`).join('')}
      </div>`).join('');

    const shell = document.createElement('div');
    shell.className = 'layout';
    shell.innerHTML = `
      <aside class="sidebar" id="sidebar">
        <div class="side-logo">
          <div class="logo-mark">DG</div>
          <div class="side-logo-text">
            <div class="logo-name">DataGear <span style="color:var(--brand)">能源BI</span></div>
            <div class="logo-sub">ENERGY INTELLIGENCE · V4.1</div>
          </div>
        </div>
        <nav class="side-nav">${navHtml}</nav>
        <div class="side-foot">
          <div class="side-user" id="sideUser" title="账户菜单">
            <div class="avatar">李明</div>
            <div class="side-user-info">
              <div class="u-name">李明</div>
              <div class="u-role">数据分析师 · 华北油田</div>
            </div>
          </div>
          <button class="fold-btn" id="foldBtn" title="收起导航">${ICONS.fold}</button>
        </div>
      </aside>
      <div class="main">
        <header class="topbar">
          <div class="crumbs">${meta.crumbs.split('/').map((s, i, arr) => i === arr.length - 1 ? '<b>' + s.trim() + '</b>' : '<span>' + s.trim() + '</span>').join('<span style="margin:0 6px;color:var(--tx-4)">/</span>')}</div>
          <div class="top-search" id="topSearch" style="cursor:pointer">
            ${ICONS.search}
            <input placeholder="全局搜索：指标 / 看板 / 数据集，或直接向 AI 提问…" readonly />
            <kbd>⌘K</kbd>
          </div>
          <div class="top-actions">
            <span class="env-tag">生产环境 · 信创适配</span>
            <button class="icon-btn" id="bellBtn" title="告警通知">${ICONS.bell}<span class="dot"></span></button>
            <button class="icon-btn" title="帮助与新手引导" onclick="DG.toast('新手引导：角色化任务教学（FR-HOME-23）')">${ICONS.spark}</button>
          </div>
        </header>
        <main class="content" id="content"></main>
      </div>`;

    const pageContent = document.getElementById('page-content');
    body.insertBefore(shell, body.firstChild);
    if (pageContent) {
      shell.querySelector('#content').appendChild(pageContent);
      pageContent.style.display = '';
    }
    document.getElementById('foldBtn').addEventListener('click', () => {
      document.getElementById('sidebar').classList.toggle('fold');
      setTimeout(() => window.dispatchEvent(new Event('resize')), 220);
    });
    bindGlobalInteractions();
  }

  /* ---------- 全局交互：⌘K 搜索 / 通知 / 用户菜单 ---------- */
  function closeDropdowns() { document.querySelectorAll('.dropdown').forEach(d => d.remove()); }
  function toggleDropdown(dd) {
    const existed = !!document.querySelector('.dropdown');
    closeDropdowns();
    if (!existed) {
      document.body.appendChild(dd);
      setTimeout(() => document.addEventListener('click', function h(e) { if (!dd.contains(e.target)) { dd.remove(); document.removeEventListener('click', h); } }), 0);
    }
  }

  /* 通知下拉（数据来自 GET /home/todo） */
  function openNotify() {
    const dd = document.createElement('div');
    dd.className = 'dropdown';
    dd.innerHTML = `<div class="dd-head">通知与待办 <span class="dd-op" data-readall>全部已读</span></div>
      <div class="dd-body"><div class="block-loading"><span class="spin"></span> 加载中…</div></div>`;
    dd.querySelector('[data-readall]').onclick = () => { document.querySelector('.icon-btn .dot') && document.querySelector('.icon-btn .dot').remove(); toast('已全部标记为已读', 'ok'); dd.remove(); };
    toggleDropdown(dd);
    const body = dd.querySelector('.dd-body');
    const render = rows => {
      body.innerHTML = rows.map(t => `
        <div class="row-item" data-href="${t.kind === 'alert' ? 'alert.html' : t.kind === 'approve' ? 'system.html' : 'index.html'}">
          <span class="tag ${t.level === 'danger' ? 'danger' : t.level === 'warn' ? 'warn' : t.level === 'ok' ? 'ok' : 'info'}">${t.kind === 'alert' ? '告警' : t.kind === 'sub' ? '订阅' : t.kind === 'approve' ? '审批' : '质量'}</span>
          <div class="grow"><div style="font-size:12.5px">${t.title}</div><div class="sm tx-3">${t.sub}</div></div>
        </div>`).join('');
      body.querySelectorAll('.row-item').forEach(r => r.onclick = () => location.href = r.dataset.href);
    };
    if (window.DG && DG.api) DG.api.get('/home/todo').then(r => render(r.data)); else render([]);
  }

  /* 用户菜单 */
  function openUserMenu() {
    const dd = document.createElement('div');
    dd.className = 'dropdown dd-user';
    dd.style.left = '12px'; dd.style.right = 'auto'; dd.style.top = 'auto'; dd.style.bottom = '64px'; dd.style.position = 'fixed';
    dd.innerHTML = `
      <div style="padding:14px 16px;border-bottom:1px solid var(--line-1)">
        <div style="font-weight:600">李明 <span class="tag brand" style="margin-left:6px">数据分析师</span></div>
        <div class="sm tx-3 mt-1">liming@energy.local · 华北油田分公司</div>
      </div>
      ${[['个人设置', 'system'], ['我的收藏', 'star'], ['我的订阅', 'alert'], ['主题偏好（暗色）', 'spark'], ['退出登录', 'arrowR']].map(m => `<div class="dd-menu-item" data-act="${m[1]}">${ICONS[m[1]] || ''}${m[0]}</div>`).join('')}`;
    dd.querySelectorAll('.dd-menu-item').forEach(it => it.onclick = () => {
      const act = it.dataset.act; dd.remove();
      if (act === 'arrowR') location.href = 'login.html';
      else if (act === 'star') location.href = 'index.html';
      else if (act === 'alert') location.href = 'alert.html';
      else toast('原型演示：' + it.textContent.trim());
    });
    toggleDropdown(dd);
  }

  /* ⌘K 全局搜索（数据来自 GET /search?q=，FR-HOME-08） */
  function openSearch() {
    if (document.getElementById('dgSearchMask')) return;
    const mask = document.createElement('div');
    mask.className = 'modal-mask show'; mask.id = 'dgSearchMask';
    mask.innerHTML = `<div class="search-modal">
      <div class="sm-head">${ICONS.search}<input id="dgSearchInput" placeholder="搜索指标 / 看板 / 数据集 / 报表 / 数据源 …" autocomplete="off"/><kbd style="font-size:10px;color:var(--tx-4);border:1px solid var(--line-2);border-radius:4px;padding:0 5px">ESC</kbd></div>
      <div class="sm-body" id="dgSearchBody"><div class="block-loading"><span class="spin"></span></div></div>
      <div class="sm-foot"><span>↑↓ 选择</span><span>↵ 打开</span><span>按 Enter 可将问题发送至智能问数</span></div>
    </div>`;
    document.body.appendChild(mask);
    const input = mask.querySelector('#dgSearchInput');
    const body = mask.querySelector('#dgSearchBody');
    let cur = -1;
    const close = () => { mask.remove(); document.removeEventListener('keydown', nav); };
    mask.addEventListener('click', e => { if (e.target === mask) close(); });
    function nav(e) {
      const items = body.querySelectorAll('.sm-item');
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault(); if (!items.length) return;
        cur = (cur + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
        items.forEach((x, i) => x.classList.toggle('hover', i === cur));
      } else if (e.key === 'Enter') {
        if (cur >= 0 && items[cur]) location.href = items[cur].dataset.href;
        else if (input.value.trim()) location.href = 'chatbi.html?q=' + encodeURIComponent(input.value.trim());
      }
    }
    document.addEventListener('keydown', nav);
    function render(rows, grouped) {
      if (!rows.length) { body.innerHTML = `<div class="empty" style="padding:28px"><div class="sm tx-3">未找到「${input.value}」相关资源</div><button class="btn primary sm mt-2" id="dgAskBtn">用智能问数提问</button></div>`; const b = body.querySelector('#dgAskBtn'); if (b) b.onclick = () => location.href = 'chatbi.html?q=' + encodeURIComponent(input.value.trim()); return; }
      const byType = {};
      rows.forEach(r => { (byType[r.type] = byType[r.type] || []).push(r); });
      body.innerHTML = Object.keys(byType).map(t => `<div class="sm-group">${t}</div>` + byType[t].map(r => `
        <div class="sm-item" data-href="${r.href}">
          <div class="sm-ico" style="color:${r.c};background:var(--bg-glass-2)">${ICONS[r.icon] || ICONS.dot}</div>
          <div class="grow"><div class="sm-name">${r.name}</div><div class="sm-sub">${r.sub}</div></div>
          <span class="tag">${r.type}</span>
        </div>`).join('')).join('');
      cur = -1;
      body.querySelectorAll('.sm-item').forEach(it => it.onclick = () => location.href = it.dataset.href);
    }
    const doSearch = q => {
      if (window.DG && DG.api) DG.api.get('/search', { q }).then(r => render(r.data.rows));
      else render([]);
    };
    let timer;
    input.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(() => doSearch(input.value.trim()), 200); });
    doSearch('');
    setTimeout(() => input.focus(), 50);
  }

  function bindGlobalInteractions() {
    const ts = document.getElementById('topSearch');
    if (ts) ts.addEventListener('click', openSearch);
    const bell = document.getElementById('bellBtn');
    if (bell) bell.addEventListener('click', openNotify);
    const user = document.getElementById('sideUser');
    if (user) user.addEventListener('click', openUserMenu);
    document.addEventListener('keydown', e => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openSearch(); }
    });
  }

  /* ---------- ECharts 暗色主题预设 ---------- */
  const CHART_COLORS = ['#FF8A3D', '#22D3EE', '#A78BFA', '#E8B33C', '#34D399', '#F87171', '#60A5FA', '#F472B6'];
  function chartBase() {
    return {
      color: CHART_COLORS,
      textStyle: { color: '#B9C2D4', fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif' },
      grid: { left: 8, right: 12, top: 36, bottom: 4, containLabel: true },
      legend: { textStyle: { color: '#7C88A0', fontSize: 11 }, itemWidth: 12, itemHeight: 8, icon: 'roundRect', top: 2 },
      tooltip: {
        backgroundColor: 'rgba(13,20,32,.94)', borderColor: 'rgba(255,255,255,.12)',
        textStyle: { color: '#F2F5FA', fontSize: 12 }, confine: true
      },
      xAxis: {
        axisLine: { lineStyle: { color: 'rgba(255,255,255,.14)' } },
        axisTick: { show: false },
        axisLabel: { color: '#7C88A0', fontSize: 11 },
        splitLine: { show: false }
      },
      yAxis: {
        axisLine: { show: false }, axisTick: { show: false },
        axisLabel: { color: '#7C88A0', fontSize: 11, fontFamily: 'Barlow, Bahnschrift, sans-serif' },
        splitLine: { lineStyle: { color: 'rgba(255,255,255,.06)' } }
      }
    };
  }
  function mergeDeep(base, ext) {
    const out = Object.assign({}, base);
    for (const k in ext) {
      if (ext[k] && typeof ext[k] === 'object' && !Array.isArray(ext[k]) && base[k] && typeof base[k] === 'object' && !Array.isArray(base[k])) {
        out[k] = mergeDeep(base[k], ext[k]);
      } else out[k] = ext[k];
    }
    return out;
  }
  function makeChart(el, option) {
    if (!el || typeof echarts === 'undefined') return null;
    const c = echarts.init(el, null, { renderer: 'canvas' });
    c.setOption(mergeDeep(chartBase(), option));
    window.addEventListener('resize', () => c.resize());
    return c;
  }
  // 自动初始化带 data-chart 属性的容器（由页面脚本提供 option 工厂）
  function autoCharts(registry) {
    document.querySelectorAll('[data-chart]').forEach(el => {
      const key = el.dataset.chart;
      if (registry[key]) makeChart(el, registry[key]());
    });
  }

  /* ---------- 数字滚动动画 ---------- */
  function countUp() {
    document.querySelectorAll('[data-count]').forEach(el => {
      const target = parseFloat(el.dataset.count);
      const decimals = (el.dataset.count.split('.')[1] || '').length;
      const dur = 900; const t0 = performance.now();
      function tick(t) {
        const p = Math.min(1, (t - t0) / dur);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = (target * eased).toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        if (p < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    });
  }

  /* ---------- Toast ---------- */
  function toast(msg) {
    let box = document.getElementById('dg-toast');
    if (!box) {
      box = document.createElement('div');
      box.id = 'dg-toast';
      box.style.cssText = 'position:fixed;top:70px;left:50%;transform:translateX(-50%);z-index:200;display:flex;flex-direction:column;gap:8px;align-items:center;pointer-events:none';
      document.body.appendChild(box);
    }
    const item = document.createElement('div');
    item.style.cssText = 'background:rgba(17,26,42,.96);border:1px solid rgba(255,138,61,.35);color:#F2F5FA;padding:9px 18px;border-radius:10px;font-size:13px;box-shadow:0 8px 30px rgba(0,0,0,.45);backdrop-filter:blur(10px);transition:all .3s';
    item.textContent = msg;
    box.appendChild(item);
    setTimeout(() => { item.style.opacity = '0'; item.style.transform = 'translateY(-8px)'; setTimeout(() => item.remove(), 300); }, 3000);
  }

  /* ---------- 演示数据生成 ---------- */
  function series(n, base, wave, seed) {
    const arr = []; let v = base;
    for (let i = 0; i < n; i++) {
      v += Math.sin(i * 0.8 + (seed || 0)) * wave * 0.4 + (Math.random() - 0.48) * wave;
      arr.push(Math.max(0, +v.toFixed(2)));
    }
    return arr;
  }
  const MONTHS = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];
  const WEEK = ['周一','周二','周三','周四','周五','周六','周日'];

  window.DG = {
    ICONS, NAV, makeChart, autoCharts, chartBase, mergeDeep,
    countUp, toast, series, MONTHS, WEEK,
    colors: { oil: '#FF8A3D', gas: '#22D3EE', chem: '#A78BFA', coal: '#E8B33C', ok: '#34D399', danger: '#F87171', warn: '#FBBF24', info: '#60A5FA' }
  };

  document.addEventListener('DOMContentLoaded', () => { buildShell(); countUp(); });
})();
