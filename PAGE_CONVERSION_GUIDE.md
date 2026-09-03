# 列表页「能源暗域 Energy Dark」改造指南（v4.1）

> 参照原型 `http://self.deepvera.net/prototype/dataset.html`（本地副本 `.prototype-ref/`），
> 把旧 PrimeVue DataTable 列表页重写为原生 HTML + `datasource-page.css` 的暗色玻璃拟态风格。
> **功能必须 100% 保留**（API 调用、分页、搜索、排序语义、多选、全部操作按钮），只换皮不砍功能。

## 必读样板（动手前先读完）

1. **改造样板（最重要）**：`src/views/dtbsSource/DtbsSourceListView.vue`
   —— 已完成改造的同类页面。脚本组织、`page-head`/`src-cats`/搜索条/`table-wrap`+`tbl`/`pager` 的写法照它抄。
2. **样式库**：`src/styles/datasource-page.css` —— 全部可用类都在里面（token 均在 `.ds-page` 作用域）。
3. **i18n 既有词条**：`src/locales/zh-CN.json` —— 平铺键。通用词（`query/edit/view/delete/add/operation/loading/more/import/export/copy/deleteSuccess/deleteFail/queryFail/saveSuccess/confirmDelSelectedAsk/id/name/description/createTime/enable/yes/no` 等）**直接复用，不要重复定义**。

## 改造规则

1. 根节点改为 `<div class="ds-page">`，`<script setup>` 顶部加 `import '@/styles/datasource-page.css'`。
2. **删除所有 PrimeVue 组件**（DataTable/Column/Button/InputText/Dialog…）与 primeflex 类（`grid/col-*/p-1/flex-1` 等），
   改用 `.ds-page` 内的：`.input` `.btn(.primary/.danger/.sm/.ghost)` `.table-wrap>table.tbl` `.tag(.ok/.warn/.danger/.info/.brand)`
   `.link(.danger/.muted)` `.pager>.pg-btn` `.card(.card-title>.bar)` `.stat-grid>.stat-card` `.dst-types>.dst-type` `.sel-bar`
   `.modal-mask>.modal` `.empty` `.avatar` `.tabs>.tab` `.switch` 与工具类 `.flex/.grow/.mb-2/.mb-3/.sm/.tx-3/.num/.ellipsis`。
3. 页面骨架统一为：
   ```
   .ds-page
   ├─ .page-head（.page-title + .page-desc ｜ .page-actions：次要按钮 + .btn.primary 主操作）
   ├─ 可选 .stat-grid 统计卡 / .dst-types 类型卡（点击可过滤，选中加 .sel 类）
   ├─ 搜索条：.flex.mb-2 > form(@submit.prevent) > input.input + button.btn
   │         右侧放总数 "共 N 条"（.tx-3.sm）与已选操作条 .sel-bar（有选中时出现，含批量删除）
   ├─ .table-wrap > table.tbl（首列多选用 <input type="checkbox">；操作列用 .link + " · " 分隔）
   └─ .pager（照样板：‹ 页码 ›，页码窗口 ±2）
   ```
4. 排序：原生表头不加后端排序交互的页面，固定 `orders` 沿用原页默认值即可；原页有排序列的，
   表头加点击切换排序（升/降小箭头 ▲▼，样式用内联 style，不新增全局类）。
5. 每页 i18n 键用独立前缀（见各自任务卡），**禁止改 zh-CN.json**（并行冲突）。
   把新增键值写到 `/Users/ctao/2、dev/2.datagear/datagear/i18n-snippets/<页面名>.json`
   （平铺 `"前缀.xxx": "中文"`，UTF-8 无 BOM），由主代理统一合并。已存在的通用键一律复用。
6. 图标：用内联 SVG（从样板 `DtbsSourceListView.vue` 的 `ICONS` 拷贝需要的，或自己写 24×24 stroke 风格），
   不用 PrimeIcons。SVG 通过 `v-html` 注入，外层套 `<span style="display:inline-flex">`。
7. 保留 TypeScript 类型与 `useOperationMessage` 成功/失败提示；确认框沿用 `window.confirm` + i18n。
8. 写完后跑 `cd /Users/ctao/2、dev/2.datagear/datagear/datagear-web-ui && npx vue-tsc --noEmit -p tsconfig.json 2>&1 | grep <你的文件名>`
   确认无新增类型错误（项目存量错误可忽略）。**不要**启动 dev server、不要改其他文件。
9. 弹窗类（如文件浏览）改 `.modal-mask`（常驻 DOM、`v-if` 控制）+ `.modal`，不用 PrimeVue Dialog；
   若原页 Dialog 逻辑复杂，可保留 PrimeVue Dialog —— `.ds-page` 内已有其暗色覆盖，但模板根必须在 `.ds-page` 内。

## 视觉基调速查

- 底色 `#0A0E17` 系 + 三处径向光晕（`.ds-page` 自带）；品牌橙 `#FF8A3D` 渐变（`.btn.primary`/`.bar`/`.pg-btn.cur`）。
- 数字用 `.num`（Barlow 字体）；次要信息 `.sm.tx-3`；状态一律 `.tag` 着色（成功 ok / 失败 danger / 实时 ok / 参数 brand）。
- 操作列：主操作 `.link`，危险操作 `.link.danger`，折叠次要操作可用 `.link.muted`。
