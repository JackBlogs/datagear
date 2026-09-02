# 前端 Vue 化（前后端分离）改造方案

本文档针对 DataGear 现有以 FreeMarker 模板与内嵌 CDN Vue 作为前端实现、以 Spring Boot 作为后端的架构，提出将其改造为 Vue 单页应用（SPA）与后端 REST API 前后端分离架构的详细实施方案，涵盖现状分析、技术选型、总体策略、后端改造、前端工程、数据契约迁移、重点难点、实施计划、构建部署等内容。

## 现状盘点

| 维度 | 现状 |
|---|---|
| 后端 | Spring Boot 2.7.18、Java 8、MyBatis、WAR 打包（datagear-webapp） |
| 视图层 | FreeMarker，共 136 个 .ftl 模板 |
| 控制器 | 40 个 @Controller，位于 datagear-web 控制器包，视图与 JSON 接口混合 |
| 前端 | 已是 Vue 3.2.47 + PrimeVue 3.34.1 + jQuery + ECharts + CodeMirror（CDN 引入） |
| 页面框架 | 自制 po（page object）框架，约 87KB 的 static/script/util.js |
| 国际化 | 后端 message.properties + FreeMarker 消息标签（当前仅中文） |
| 安全 | Spring Security：表单登录、Session + remember-me、校验码、登录锁定、CSRF 已禁用、CORS 可配置 |
| 数据接口 | 已存在一批 JSON 接口（@ResponseBody + ResponseEntity<OperationMessage> + PagingData） |

核心结论：项目当前实为“FreeMarker 渲染页面壳 + 内嵌 Vue 运行时”的混合体，数据已经走 JSON，仅“页面导航、初始表单数据（formModel）、国际化文案、权限数据”仍由服务端模板渲染。因此本次改造的本质，是把“页面壳的职责”从 FreeMarker 彻底迁移到浏览器端 SPA，后端退化为纯 REST API 与静态资源托管。

## 目标架构与技术选型

目标形态为：浏览器端 Vue 3 单页应用（Vite + TypeScript + Vue Router + Pinia + PrimeVue + Axios + vue-i18n）通过 HTTP 调用后端 Spring Boot 纯 REST API（/api 前缀 JSON 接口），后端不再承担页面渲染职责，仅保留校验码、文件上传下载、看板运行时等特殊端点与静态资源托管能力。

| 关注点 | 选型 | 理由 |
|---|---|---|
| 构建 | Vite + TypeScript | 现代标准，开发体验好 |
| 框架 | Vue 3（Composition API） | 与现有 Vue3 对齐，组件可迁移 |
| 路由 | Vue Router 4 | 对应 40 个控制器的 manage/add/edit/view/select 动作 |
| 状态管理 | Pinia | 管理用户、主题、语言、当前分析项目、模块权限 |
| UI 组件 | PrimeVue 3（npm 版）+ PrimeFlex + PrimeIcons | 直接复用现有组件与样式，迁移成本最低 |
| HTTP | Axios + 拦截器 | 统一处理 OperationMessage、401 跳登录、错误提示 |
| 国际化 | vue-i18n | 前端文案；后端 message.properties 保留给服务端错误码 |
| 图表/看板 | ECharts（沿用）、CodeMirror | 看板与图表可视化需单独评估 |
| 认证 | 阶段一 Session + Cookie（同源）；阶段二可选 JWT | 见“认证与安全改造”章节 |

不建议引入 Element Plus 等新 UI 库：现有界面均为 PrimeVue，更换组件库会带来较大的视觉与工作量回归。

## 总体策略

不推荐一次性重写（136 个模板、看板可视化设计器、20 个业务模块，风险极高），推荐“并行双轨、逐模块替换、收敛下线”的渐进式策略：

- 先搭建 SPA 骨架，打通认证，并以一个模范模块跑通全链路（POC）；

- 后端为每个业务模块补齐 REST API，把原本由模板注入的表单初始数据、模块权限等改为 JSON 返回；

- 前端按菜单逐模块重写页面（数据源、数据集、图表、看板、用户、角色、数据交换等）；

- 全部替换完成后删除 FreeMarker 依赖与模板，下线旧入口。

该策略使每个阶段都可独立发布、可回滚，团队可边迁移边维护线上环境。

## 后端改造方案

### 统一响应体与 API 前缀

当前已存在 OperationMessage（成功或失败 + code + message + data）与 PagingData，本次保留它们作为统一契约，并收敛为顶层包装，由前端拦截器统一解析：

```
// 成功
{ "code": "operationSuccess", "type": "success", "message": "...", "data": { ... } }
// 失败（HTTP 状态同时返回 400/401/500）
{ "code": "error.IllegalInputException", "type": "fail", "message": "...", "data": null }
```

新增 @RestController 统一前缀 /api（如 /api/role），与 SPA 静态资源、特殊端点（/checkCode、/static）隔离。改造方式二选一，推荐方式 A：

- 方式 A：保留现有 @Controller，将视图方法（add/edit/view/manage）由返回模板名改为返回 JSON，manage 只返回模块权限与查询所需元数据；

- 方式 B：新建平行 @RestController，旧 @Controller 先保留兼容，代码量更大但风险更小。

### 控制器改造映射

以 RoleController 为例，改造前后的映射关系如下：

| 现状（视图方法） | 改造后（REST） | 说明 |
|---|---|---|
| GET /role/manage → role_table.ftl | GET /api/role/manageMeta → 返回列定义、isReadonlyAction、权限 | 页面壳职责交给 SPA |
| GET /role/add → role_form.ftl | GET /api/role/addMeta → 返回空实体与默认值 | formModel 改 JSON |
| GET /role/edit?id=x → 渲染实体 | GET /api/role/{id} | 已是 getByIdForEdit 逻辑 |
| POST /role/saveAdd | POST /api/role | 已存在，仅改路径与规范 |
| POST /role/saveEdit | PUT /api/role | 同上 |
| POST /role/delete | DELETE /api/role（body 传 ids） | 同上 |
| POST /role/pagingQueryData | POST /api/role/pagingQuery | 已存在 |

关键点：目前“初始表单数据”通过 <@writeJson var=formModel/> 写入页面，改造后必须为每个表单与列表页补充一个“元数据或初始化”GET 接口，这是后端工作量的主要来源。

### 移除 FreeMarker 依赖

- pom.xml 移除 spring-boot-starter-freemarker；

- 删除 WebMvcConfigurerConfigSupport 中视图解析器、FreeMarkerConfigurer、CustomFreeMarkerView、WriteJsonTemplateDirectiveModel 等配置；

- 删除 templates 下全部 .ftl 模板；

- 删除 static 下属于前端的资源（Vue、jQuery、PrimeVue、CodeMirror、主题等 CDN 文件），统一改由 npm 前端工程管理；static 下 analysisapi、analysislib 为看板对外 API 公共库，需保留。

### 认证与安全改造

当前为 Session + Cookie 表单登录（CSRF 已禁用），提供两条路线：

方案 A（推荐，阶段一落地最快）：同源 Session。SPA 与后端同源部署（开发期 Vite 代理转发，生产期 nginx 或 Spring 静态托管同一端口），保留现有表单登录、remember-me、校验码、登录锁定逻辑，仅将登录页与校验码、找回密码、注册等流程改为 JSON。优点为几乎不动安全配置、无 token 生命周期问题；缺点为依赖同源。

方案 B（纯前后端分离，跨域）：JWT 无状态。后端新增 /api/auth/login 签发 JWT，前端存内存或 localStorage，Axios 携带。需重做校验码、登录锁定、remember-me、Session 依赖（HttpSessionRequestCache、注册用户名回填等）的等价实现。优点为真正解耦、可独立域名与 CDN；缺点为改造与安全回归成本高。

建议先按方案 A 落地，把“前后端分离”解决在构建与部署层面（前端独立工程、独立打包），认证保持 Session，后续有跨域或多端需求再演进到方案 B。

### CORS、静态托管与 SPA 路由回退

- 开发期：Vite server.proxy 将 /api、/checkCode 等转发到后端，避免跨域，无需开启 CORS；

- 生产期二选一：其一，前端构建产物拷入后端 static（或 webapp 资源目录），由 Spring Boot 托管，并增加 SPA 回退（非 /api 路径返回 index.html）；其二，独立 nginx，根路径走静态资源，/api 反代到 Spring Boot，更符合前后端分离，推荐；

- 现有 CrossOriginProperties 与 corsConfigurationSource 已支持 CORS，若走跨域 JWT 方案 B 则启用。

### 后端国际化边界

message.properties 保留，用于服务端异常与校验消息；前端界面文案全部迁到 vue-i18n 语言包。可将现有 message.properties 通过一次性脚本转换为前端语言包，保证文案一致。

## 前端工程方案

新建独立前端工程 datagear-web-ui，目录结构如下：

```
datagear-web-ui/
├─ package.json / vite.config.ts / tsconfig.json / .env.development / .env.production
├─ index.html
└─ src/
   ├─ main.ts / App.vue
   ├─ api/                 # 与后端控制器一一对应的 API 封装（role.ts、dataSet.ts 等）
   ├─ router/              # 对应 40 个控制器的路由
   ├─ stores/              # Pinia：auth、theme、locale、analysisProject、permissions
   ├─ locales/             # vue-i18n 语言包
   ├─ components/          # 通用组件（替代原 include/*.ftl）
   ├─ composables/         # 替代原 util.js 的 po 框架能力（usePagingTable 等）
   ├─ layouts/             # 主布局（对应 main.ftl 的头部菜单与多面板）
   ├─ views/               # 按模块分目录，对应 templates/*
   └─ utils/               # axios 实例、OperationMessage 解析、文件下载等
```

### 核心抽象

现有 util.js 的 po（page object）框架承担大量职责，需用 Composition API 重写为可复用模块：

| 原 po 能力 | SPA 替代 |
|---|---|
| po.setupAjaxTable | usePagingTable() 组合函数（封装 PrimeVue DataTable 的懒加载分页、排序、多选） |
| po.handleAdd/Edit/View/DeleteAction | 路由跳转 + 通用 CRUD 组合函数 |
| po.open(url, {dialog}) 面板式导航 | Vue Router 嵌套路由 + 主面板 KeepAlive |
| po.vuePageModel / vueMethod | <script setup> 的 reactive 与方法 |
| <@writeJson var=formModel/> | 页面 onMounted 调 /api/xx/{id} 拉取数据 |
| <@spring.message/> | t('key')（vue-i18n） |
| po.concatContextPath | 由 .env 的 VITE_BASE_URL 统一处理 |

### Axios 拦截器

- 请求：携带 X-Requested-With 与 locale、theme 参数（沿用现有 THEME 与 LOCALE 拦截器语义）；

- 响应：解包 OperationMessage；type 为 fail 时弹出错误；HTTP 401 跳登录；data.redirectUrl 跳转；

- 文件上传与下载：复用现有 multipart 与 Content-Disposition 端点，前端用 axios + blob 处理。

## 数据与契约迁移对照

| 事项 | FreeMarker 现状 | SPA 目标 |
|---|---|---|
| 初始表单数据 | <@writeJson var=formModel/> | GET /api/xx/{id} |
| 列表数据 | pagingQueryData（已 JSON） | 保持不变 |
| 权限与只读标记 | modulePermissions、isReadonlyAction 模板注入 | GET /api/auth/me + 模块 meta 接口 |
| 国际化 | <@spring.message/> | vue-i18n |
| 主题与语言切换 | changeThemeData.ftl + THEME/LOCALE 参数 | SPA 本地状态 + 对应接口 |
| 校验码图片 | checkCode 端点 | 保留，前端 img 带时间戳刷新 |
| 看板展示 | 服务端渲染 + 嵌入式 | 需专项处理，见“重点难点与风险” |

## 重点难点与风险

### 看板与图表可视化（最大风险项）

dashboard、chart、chartPlugin、dashboardGlobalRes 等模块包含看板可视化设计器、ECharts 插件体系、analysisapi 与 analysislib 公共库；看板还存在对外嵌入与分享场景（用户将看板嵌入第三方系统），其渲染入口为服务端生成页面。建议：看板管理端设计器可迁 SPA，但看板运行时展示（viewer）与对外嵌入入口先保留现有服务端渲染能力（保留少量模板或改由独立轻量模板渲染），避免破坏下游嵌入方，此项需单独立项评估。

### 复用 CDN 内联 Vue 的历史包袱

现有页面为“每页一个独立 Vue 实例 + 内联脚本”，迁移时不能逐字搬运，需按数据驱动与组件化重写，否则会出现大量重复代码与状态不一致。

### 第三方与插件兼容

图表插件（builtInChartPlugins）、数据交换（CSV、JSON、Excel 导入导出）等边界较多，需注意上传下载与流式响应的 SPA 适配。

### 安全回归

登录锁定、校验码、remember-me、注册回填用户名（SESSION_KEY_REGISTER_USER_NAME）等均依赖 Session，务必在阶段一保持 Session 方案，以减少回归面。

## 分阶段实施计划

| 阶段 | 内容 | 产出与验收 | 预估 |
|---|---|---|---|
| 阶段一：骨架 | 建 datagear-web-ui（Vite + TS + Router + Pinia + PrimeVue + Axios + vue-i18n），打通登录、/api 代理、布局与主菜单、401 拦截 | 能登录进入主框架，菜单可点击 | 1 周 |
| 阶段二：后端 API 化 | 统一响应体规范；补全元数据与初始化接口；/api 前缀路由 | 各模块 CRUD、分页、meta 接口可用 | 2 至 3 周 |
| 阶段三：模范模块 | 完整迁移角色（role）与数据集（dataSet）两模块，沉淀 usePagingTable 等通用件 | 两模块功能与旧版一致，可回滚 | 2 周 |
| 阶段四：批量迁移 | 数据源、图表、用户、授权、分析项目、驱动、文件源等逐模块替换 | 菜单中常规模块全量切换 SPA | 4 至 6 周 |
| 阶段五：复杂模块 | 数据交换（导入导出）、SQL 工作台、URL 构建器、看板设计器 | 与旧版等价，重点回归 | 4 至 6 周 |
| 阶段六：收敛下线 | 删除 FreeMarker 依赖与模板；处理看板对外嵌入兼容；部署切换 | 旧 FreeMarker 入口下线，前后端完全分离 | 1 至 2 周 |
| 阶段七（可选） | 演进 JWT、独立域名与 CDN、CI 前端构建、国际化多语言 | 纯前后端分离 + 多语言 | 视需求而定 |

总体量级粗估为 3 至 6 个月（2 至 4 人，视是否同步推进看板与可视化部分而定）。

## 构建与部署

- 前端构建接入：前端作为独立工程，建议独立 Git 仓库或目录与独立 CI；如需随 Maven 一键打包，可用 frontend-maven-plugin 在 datagear-webapp 构建时执行 npm ci 与 npm run build，并拷入 WAR 或静态目录；

- 开发：datagear-web-ui 启动 Vite 开发服务器，proxy 转发到后端；

- 生产：npm run build 产物由 nginx 托管 + /api 反代（或并入 Spring Boot static）。

## 下一步建议

- 先完成阶段一骨架：搭建 Vite 工程并打通登录，验证“Session + 同源代理”路线可行，以最小成本证伪或证实整个方案的最大不确定点；

- 冻结 API 契约文档：以现有 OperationMessage 与 PagingData 为准，编写 api.md；

- 选一个模块做全链路样板（建议 role），形成可复制的迁移模板后再铺开。
