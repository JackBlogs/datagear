# 前端 Vue 化（前后端分离）改造方案 v2 · 彻底去 FreeMarker 版

> v2 修订说明：
> 1. 目标升级——**彻底移除 web 层全部 FreeMarker，前端 100% 切换为 Vite 工程化 SPA**；
> 2. 并入对 v1 的代码级核查勘误（控制器 32 个、po 框架实际 234KB、前端依赖为本地 vendored 而非 CDN 等）；
> 3. 明确 FreeMarker 在仓库中的两处用途及各自处置方式（§3）；
> 4. 重点深化前端改造方案（§6）：页面范式、组合函数、路由与多标签、状态、i18n 迁移脚本、主题、代码分割、重型模块专项策略。

---

## 1. 现状盘点（核查修正版）

| 维度 | 现状（经代码核查） |
|---|---|
| 后端 | Spring Boot 2.7.18、Java 8、MyBatis、**可执行 war 双形态打包**（`java -jar` 内嵌启动 + 外置 Tomcat，datagear-webapp） |
| 视图层 | FreeMarker，**136 个 .ftl 模板**（位于 **datagear-web** 模块 `src/main/resources/org/datagear/web/templates/`，非 webapp） |
| 控制器 | **32 个 @Controller**（org.datagear.web.controller），视图方法与 JSON 接口混合（约 45% : 55%）；含 3 个旧公开 URL 兼容控制器 |
| 前端 | Vue 3.2.47 + PrimeVue 3.34.1 + PrimeFlex + PrimeIcons + jQuery 3.7.1 + jquery-validation + CodeMirror 5.64 + ECharts 5.6 + clipboard/marked，**全部本地 vendored**（static/lib/），无任何 CDN |
| 页面框架 | 自制 po（page object）框架：主体在 `static/script/pages/include/page.js`（**146KB，约 148 个 po.* 方法**）+ `static/script/util.js`（87KB jQuery 工具集），**合计 ~234KB** |
| 页面组织 | main.ftl 用 AJAX 拉取整页 HTML 注入面板、弹窗就地挂载——**同一 DOM 多 Vue 应用并存**，靠 pid/ppid 命名空间隔离 |
| 国际化 | `<@spring.message>` 在 119 个 ftl 中出现 **1873 次** + JS 侧 `po.i18n.*` 注入 **167 处**；message.properties 单文件 1333 行（仅中文） |
| 安全 | Spring Security：表单登录（成功为 302→JSON 端点混合体）、Session + remember-me（365 天）、校验码、IP+用户名双重登录锁定、CSRF 已禁用、frameOptions 已禁用（为 iframe 嵌入）、CORS 可配置、**匿名用户从数据库装配默认角色** |
| 数据接口 | 已存在大量 JSON 接口，但 OperationMessage（**非泛型**）未全量统一：存在裸 List、裸 Map、void 流式（Zip 导出）、HTML 片段端点 |
| 实时性 | **无 WebSocket/SSE**，看板心跳为轮询端点，无实时推送迁移风险 |

## 2. FreeMarker 在仓库中的两处用途（关键事实）

全仓 freemarker 依赖仅两处 pom 声明、两类用途：

| # | 位置 | 用途 | 性质 |
|---|---|---|---|
| ① | datagear-webapp/pom.xml `spring-boot-starter-freemarker` + datagear-web 视图四件套（FreeMarkerViewResolver / FreeMarkerConfigurer / CustomFreeMarkerView / WriteJsonTemplateDirectiveModel）+ 136 个 .ftl | **页面视图渲染** | 本次改造要消灭的对象 |
| ② | datagear-analysis/pom.xml `org.freemarker:freemarker` + `analysis/support/datasettpl/` 包（DataSetFmkTemplateResolver、SqlDataSetFmkTemplateResolver、各 OutputFormat） | **数据集模板语言**：用户在 SQL 数据集、HTTP 数据集（URL/请求头/请求体）、CSV/JSON/XML 值数据集、Excel sheet 名中直接书写 FreeMarker 语法（`${param}`、`<#if>` 等）实现动态参数 | **用户可见的产品功能**，存量用户数据集里已含 freemarker 语法 |

> 注：v1 审阅中"看板引擎依赖 freemarker"的表述需修正——代码核查确认看板渲染引擎（HtmlTplDashboardWidget）**不直接 import freemarker**，analysis 模块的 freemarker 全部服务于数据集模板语言。

## 3. "彻底移除 FreeMarker"处置矩阵（v2 核心决策）

| 对象 | 处置 | 说明 |
|---|---|---|
| web 层视图体系（①） | **全部删除**：webapp pom 移除 starter；删除视图四件套与相关注册；删除 136 个 .ftl；删除 static 下由 npm 工程接管的前端资源 | 随 SPA 逐模块替换完成后在收敛阶段执行 |
| 数据集模板语言（②） | **保留 freemarker jar，定位为"数据集模板引擎"依赖**；同步做两件隔离工作：(a) 在 `datasettpl` 包抽象 `TemplateResolver` SPI（接口已存在，补齐默认实现的装配隔离），使引擎可插拔；(b) 文档明确"FreeMarker 是数据集模板语法，与视图层无关" | 用户存量数据集内含 freemarker 语法，任何替换引擎都必须兼容该语法 = 重写一个 freemarker，**评估为不可行，不推荐** |
| 看板 viewer / 嵌入端点 | **零改动冻结**：`/dv/**`、`/cv/**`、3 个 Compat 控制器（`/chart/show/**`、`/dashboard/show/**`、`/analysis/**`）、`/checkCode`、analysisapi/analysislib、图表插件运行时（150 个 zip 插件）、心跳轮询 | 本就不走 FreeMarker 视图；对外嵌入契约不可破 |

**结论性表述（写入方案目标）**：本次改造达成 **"视图层 100% 去 FreeMarker、前端 100% Vite 工程化"**；后端仅保留 freemarker 作为数据集模板引擎这一数据功能依赖（与前端无关、与视图无关），并通过 SPI 隔离为可替换实现。

## 4. 目标架构与技术选型

目标形态：浏览器端 Vue 3 SPA（**Vite + TypeScript + Vue Router 4 + Pinia + PrimeVue 3 + Axios + vue-i18n**）调用后端 Spring Boot 纯 REST API（`/api` 前缀 JSON）；后端不再承担任何页面渲染职责，仅保留：校验码、文件上传下载、看板运行时/嵌入端点（冻结面）、analysisapi/analysislib 与插件资源托管、静态资源托管。

- **UI 库保持 PrimeVue 3**（npm 版锁定 3.34.x + PrimeFlex + PrimeIcons），不引入 Element Plus 等新库；
- **认证阶段一：Session + Cookie 同源**（开发期 Vite proxy，生产期 nginx 同域或 Spring 托管）；阶段七可选演进 JWT。JWT 化时必须等价复刻：匿名用户数据库角色装配、看板分享密码 Session 校验态、`;jsessionid=` URL 会话（iframe 嵌入绕第三方 Cookie 限制的兜底）；
- **部署形态保持双形态**：可执行 war 与外置 Tomcat 均须验证前端产物可用。

## 5. 后端改造方案（v2 深化）

### 5.1 API 契约统一（阶段零盘点 → 阶段二实施）

1. **阶段零先产出《端点契约盘点表》**：脚本扫描 32 个控制器，逐端点标注 路径/方法/返回形态/权限角色/Session 依赖/迁移分类（REST 化 / 冻结 / 废弃）。
2. **OperationMessage 泛型化**为 `OperationMessage<T>`，统一作为 `/api` 顶层包装；同步盘点并改造裸返回端点（已知：数据交换 `uploadImportFile` 裸 List、看板 `heartbeat` 裸 Map、`getLogContent` HTML 片段——逐一给出 JSON 化或保留豁免的决议）。
3. **新增元数据接口**：每个表单/列表页补 `GET /api/{module}/meta`（列定义、默认值、`isReadonlyAction`、模块权限），替代 `<@writeJson var=formModel/>`（53 个模板在用）。
4. **认证微调（最小改动）**：登录成功/失败目前是 302→JSON 端点混合体，axios 跟随重定向可兼容；如 POC 发现行为不佳，将 `AuthenticationSuccessHandlerExt`/失败处理器改为直接输出 JSON（改动小，预案写好）。
5. **废弃 Session flash 消息**（`WebUtils.setOperationMessage(HttpSession)` 版），改由响应体直接承载。
6. **分析项目感知显式化**：`AnalysisProjectAwareSupport` 目前靠请求参数/会话感知，API 化时改为显式请求头/参数契约，由 Pinia store 统一注入。
7. **权限元数据接口**：`GET /api/auth/me` 返回用户、角色、模块可见权限（替代 main.ftl 的 `modulePermissions` 模板注入）。
8. **错误页与异常**：API 错误一律 JSON；`DeliverContentTypeExceptionHandlerExceptionResolver` 保留按 content-type 分流；页面 404/500 由 SPA 路由兜底 + 回退。
9. **保留不动的机制**：theme/locale 拦截器随模板删除而废弃（SPA 本地状态接管）；`ClearCss/JsCommentResourceTransformer`、`ServerTimeJsController`、`DetectNewVersionScriptResolver`（新版本检测）保留在后端静态链上；frameOptions 维持禁用（嵌入需要）。

### 5.2 收敛期删除清单（阶段六执行）

- datagear-webapp/pom.xml：`spring-boot-starter-freemarker`；`DataGearApplication` 中 `FreeMarkerAutoConfiguration` 排除项可一并清理；
- datagear-web：`WebMvcConfigurerConfigSupport` 中视图解析器/FreeMarkerConfigurer 注册、`CustomFreeMarkerView`、`WriteJsonTemplateDirectiveModel`、`freemarker/` 包；
- `templates/` 全部 136 个 .ftl；
- static 下由 npm 接管的前端资源（vue/primevue/jquery/codemirror 等 lib）；**保留**：analysisapi（1.0/2.0）、analysislib（echarts、geojson 39 图等 7.8MB）、builtInChartPlugins（150 zip）、theme 覆盖层 CSS（或迁入前端工程，二选一，建议迁入）；
- **不删**：datagear-analysis 的 freemarker 依赖与 `datasettpl` 包（见 §3）。

---

## 6. 前端工程深化方案（v2 重点）

### 6.1 工程骨架与构建集成

```
datagear-web-ui/
├─ package.json / vite.config.ts / tsconfig.json / .env.development / .env.production
├─ index.html
└─ src/
   ├─ main.ts / App.vue
   ├─ api/            # 与后端控制器一一对应（role.ts、dataSet.ts…），全量 TS 类型
   ├─ router/         # 路由表 + 菜单元数据 + 多标签页 KeepAlive 配置
   ├─ stores/         # auth / theme / locale / analysisProject / permissions / tabs
   ├─ locales/        # vue-i18n 语言包（脚本自 message.properties 生成）
   ├─ components/     # 通用组件（替代 include/*.ftl 的 32 个公共模板）
   ├─ composables/    # po 框架能力的 Composition API 重写（§6.3）
   ├─ layouts/        # 主布局（侧菜单 + 多标签页 + 头部）
   ├─ views/          # 按模块分目录，对应 templates/* 与 32 控制器
   ├─ plugins/        # PrimeVue 全局注册、确认框、Toast
   └─ utils/          # axios 实例、OperationMessage 解析、文件下载、存储
```

构建集成：frontend-maven-plugin 挂在 **datagear-web 模块**（资源实际所在地），`npm ci && npm run build` 产物拷入静态资源目录；CI 同时验证**可执行 war 与外置 Tomcat 两种形态**。

### 6.2 三种页面范式（替代 po.open 弹窗体系，阶段三定型）

现状"AJAX 拉整页 HTML 注入面板 + 弹窗就地挂载独立 Vue app"无法平移，必须在模范模块阶段一次性定型：

| 范式 | 适用 | 实现 |
|---|---|---|
| **A. 列表页 ListView** | manage 页 | 路由页面 + `usePagingTable` + 搜索表单组件；新增/编辑以范式 B 弹出 |
| **B. 表单对话框 FormDialog** | add/edit/view（轻量表单，如 role、user） | 路由不动，Dialog 内嵌**本地组件**（不再加载远端 HTML）；通过 props 传 id、事件回传刷新 |
| **C. 独立表单页 FormPage** | 重度表单（dataSet 表单、chart 表单、看板设计器、sqlpad、数据交换向导） | 独立路由 + KeepAlive 多标签页，对应现状"新开面板"语义 |

多标签页（tabs store + KeepAlive include 名单）复刻现状多 panel 共存语义，支持"关闭其他/左侧/右侧/新窗口打开"（替代 po.tabview* 系列）。

### 6.3 组合函数 API 设计（po 框架 234KB 的替代，按优先级）

| 优先级 | 组合函数 | 替代的 po/util 能力 |
|---|---|---|
| P0 | `usePagingTable()` | setupAjaxTable：PrimeVue DataTable 懒加载分页/排序/多选 ↔ PagingData |
| P0 | `useCrudActions()` | handleAdd/Edit/View/DeleteAction：按范式 A/B 分发、删除确认、批量删除 |
| P0 | `useOperationMessage()` / axios 拦截器 | OperationMessage 解包、fail 弹错、401 跳登录、redirectUrl 跳转 |
| P0 | `useAuth()` / auth store | isReadonlyAction、modulePermissions、当前用户 |
| P1 | `useSearchForm()` | page_search_form 骨架：折叠、重置、条件装配 |
| P1 | `useFormDialog()` / `useFormPage()` | page_form/page_simple_form 骨架：校验、提交、脏检查 |
| P1 | `useConfirm()` `useToast()` | $.confirm（动态 ConfirmDialog）、提示 |
| P1 | `useTheme()` / `useLocale()` | change_theme_data.ftl 换 link href；LOCALE 参数 |
| P2 | `useCodeEditor()` / `useSqlEditor()` | createCodeEditor/createSqlEditor + 服务端 SQL 补全（CodeMirror 5 锁定，后续再评估升 6） |
| P2 | `useFileUpload()` / `useDownload()` | page_fileupload、Content-Disposition 下载、上传进度 |
| P2 | `usePalette()` | 调色板 setupPalette/showPalettePanel |
| P2 | `useSteps()` | page_steps 向导步条（数据交换用） |
| P3 | `useDataSetBind()` | inflateDataSetBind/validateDataSetBindDataSign/restoreDataSetFields（图表/看板表单） |
| P3 | `useImportKeys()` | 数据交换列映射工具 |
| P3 | `useIframeNestCode()` | buildIframeNestCode 嵌入码复制 |

明确**不迁移**：pid/ppid 页面命名空间、$.open 远端 HTML 弹窗、`$.inflatePageObj`——由范式与组件体系替代。

### 6.4 路由与菜单

- 路由表按模块组织，meta 携带：菜单分组、权限标识、KeepAlive 策略、范式类型；
- 菜单数据来自 `GET /api/auth/me` 的模块权限（替代 main.ftl 模板注入），前端按权限过滤渲染；
- 32 个控制器 → 路由映射在阶段零盘点表中逐一定义；select 类页面（角色选择等）统一为"选择对话框"组件而非路由。

### 6.5 状态管理（Pinia stores）

| store | 职责 |
|---|---|
| auth | 当前用户、角色、登录/登出动作、401 处理 |
| permissions | 模块可见性、isReadonlyAction、数据级权限缓存 |
| analysisProject | 当前分析项目、切换动作（与后端显式契约对齐） |
| theme | blue/blueDark 切换，换 link href + 本地持久化 |
| locale | 语言切换，与后端校验/错误消息的 locale 约定对齐 |
| tabs | 多标签页：打开/激活/关闭/关闭其他、KeepAlive include 计算 |

### 6.6 axios 层

- 请求：携带 `X-Requested-With`、locale/theme 参数（沿用现有拦截器语义直至后端拦截器下线）、分析项目头；
- 响应：解包 `OperationMessage<T>`；`type=fail` 统一 Toast + 拒绝 promise；HTTP 401 清 auth 跳登录；`data.redirectUrl` 跳转；
- 文件：上传走 multipart（进度回调）；下载走 blob + Content-Disposition 文件名解析（复用现有导出/下载端点，含 Zip 流式端点）。

### 6.7 i18n 迁移（一次性脚本 + 校验）

1. 脚本：`message.properties`（1333 行）→ `locales/zh-CN.json`（层级 key 拍平或按 `.` 分组）；
2. 模板侧 1873 处 `<@spring.message code='x'/>` 在迁移页面时手工替换为 `t('x')`，脚本生成**已迁移 key 覆盖率报告**（每个模块页面替换后跑一遍，未覆盖 key 列清单）；
3. JS 侧 167 处 `po.i18n.* = "<@spring.message/>"` 文案归入对应模块的语言包命名空间（dashboard 设计器占 112 处，单独一组 `dashboard.*`）；
4. 后端 message.properties 保留服务服务端异常/校验消息，前端不再直接消费；
5. 结构预留多语言（en-US 平铺即可补译）。

### 6.8 主题

复刻现状"换 link href"机制（非 CSS 变量）：PrimeVue 预制主题（saga-blue / vela-blue）+ 自建 style.css 覆盖层，两套资源进前端工程，`useTheme()` 切换两个 `<link>` 的 href 并持久化；`change_theme_data.ftl` 与 `/changeThemeData/**` 端点随模板下线。

### 6.9 代码分割与加载优化（迁移红利，写进验收）

现状每个管理页全量加载 ~700KB JS（含 120KB dashboardDesign.js + 整套 analysisapi）。SPA 化后：

- 路由级动态 import；看板设计器、sqlpad、数据交换向导为异步 chunk；
- analysisapi/analysislib **不进 npm**，继续由后端 static 托管，设计器/预览页按需 `<script>` 注入（复用现有加载器）；
- 首屏目标：登录 + 主框架 + 一个列表页 < 300KB gzip。

### 6.10 重型模块专项策略（阶段五，按 5a/5b/5c 拆分）

| 子阶段 | 模块 | 体量事实 | 策略 |
|---|---|---|---|
| 5a | 数据交换（11+11 模板）+ URL 构建器 | 列映射 importKeys、子任务 start/suspend/resume/stop、**进度存 Session**（改进度轮询接口）、Zip 流式下载、裸 List 返回待统一 | 范式 C 向导页；`useSteps` + `useImportKeys`；先配合后端把 Session 进度改 JSON 轮询 |
| 5b | SQL 工作台 sqlpad（单 ftl 1316 行）+ dtbsSourceData | 浏览器端完整 SQL 客户端：编辑器+服务端补全+执行+结果网格+历史；库表在线增删改、LOB/二进制列、HEX 工具 | 范式 C；`useSqlEditor` 先行（P2）；结果网格复用 usePagingTable 变体 |
| 5c | 看板设计器（ftl ~3600 行 + dashboardDesign.js 120KB/437 函数） | 属性面板单文件 2984 行；iframe 内就地支取编辑；拖拽插入图表 | **两步走**：第一步"包装迁移"——设计器外壳 SPA 化，iframe 内编辑与 dashboardDesign.js 原样包装复用（保持 visual-editor-iframe 机制）；第二步视收益逐步把属性面板重写为 Vue 组件。**不做一次性重写** |

### 6.11 不迁移清单（冻结面，与迁移清单同等重要）

`/dv/**`、`/cv/**`、3 个 Compat 控制器旧公开 URL、`/checkCode/**`、analysisapi 1.0/2.0、analysislib、builtInChartPlugins 运行时、看板心跳/数据端点、`;jsessionid=` 支持、frameOptions 禁用、数据集模板语言（freemarker，见 §3）。

---

## 7. 实施计划（v2）

| 阶段 | 内容 | 产出与验收 | 预估 |
|---|---|---|---|
| **零：契约盘点** | 扫描 32 控制器产出《端点契约盘点表》；写 api.md（响应体/错误码/分页/401 约定）与《不迁移清单》；OperationMessage 泛型化决议 | 盘点表评审通过 | **3–5 天（新增）** |
| 一：骨架 | 建 datagear-web-ui（Vite+TS+Router+Pinia+PrimeVue+Axios+vue-i18n）；打通登录、/api 代理、主布局+菜单、401 拦截；**POC 证伪 5 点**（Session 登录链路 / 302→JSON 兼容 / DataTable 懒加载↔PagingData / i18n 脚本 / 双主题换 link） | 登录进主框架、菜单可点 | 1 周 |
| 二：后端 API 化 | 响应体统一（含裸返回改造）、meta 接口、/api 前缀、auth/me、分析项目显式化、登录 handler 预案 | 常规模块 CRUD/分页/meta 可用 | **3–4 周** |
| 三：模范模块 | role + dataSet 全链路；**三种页面范式定型**；P0/P1 组合函数沉淀 | 两模块与旧版逐项一致、可回滚 | 2 周 |
| 四：批量迁移 | 数据源、图表、用户、授权、分析项目、驱动、文件源等 | 常规模块全量切 SPA | 4–6 周 |
| 五：复杂模块 | **5a 数据交换+URL 构建器；5b sqlpad+dtbsSourceData；5c 看板设计器（包装迁移）** | 各子阶段独立验收 | **8–12 周** |
| 六：收敛下线 | 执行 §5.2 删除清单；嵌入方冒烟（iframe/密码分享/匿名/jsessionid）；双形态打包验证 | 视图层 FreeMarker 全删、前端全 Vite | 1–2 周 |
| 七（可选） | JWT 演进（含匿名角色/jsessionid 等价物）、独立域名 CDN、多语言 | 视需求 | 视需求 |

**总量：4–7 个月（2–4 人）**；压缩手段为 5c 看板设计器专人并行。

## 8. 验收与回归策略

- 里程碑门槛：M1 POC 5 证伪点全过；M2 模范模块功能逐项一致 + 范式文档化；M3 常规模块切完 + **接口 diff 测试**（同操作打新旧接口比对响应）通过；M4 5a/5b/5c 各自验收；M5 旧入口下线 + 嵌入冒烟通过 + 首屏 < 300KB gzip。
- 双轨机制：新旧入口并存期按菜单灰度；模块切换后旧模板保留一个迭代再删。
- 每模块一份页面级回归 checklist；阶段三起跑接口 diff。

## 9. 风险登记册（Top 8）

| # | 风险 | 等级 | 缓解 |
|---|---|---|---|
| 1 | 多 Vue 应用嵌套架构平移失败 | 高 | 阶段三定型三范式，不定型不进入阶段四 |
| 2 | 看板设计器重写失控 | 高 | 包装迁移优先，属性面板分步重写 |
| 3 | 存量数据集 freemarker 语法被误伤 | 高 | §3 隔离决策；datasettpl 不进改造范围 |
| 4 | 嵌入方契约破坏（旧 URL/jsessionid/匿名角色） | 高 | 不迁移清单 + M5 嵌入冒烟 |
| 5 | 裸返回端点漏改导致契约不一致 | 中 | 阶段零盘点表兜底 |
| 6 | i18n 漏翻（1873+167 处） | 中 | 覆盖率脚本报告逐模块清零 |
| 7 | Session 依赖漏网（9 项清单） | 中 | 盘点表逐项标注 |
| 8 | 工期蔓延 | 中 | 5a/5b/5c 拆分独立排期；5c 可并行 |
