# 《前端 Vue 化（前后端分离）改造方案》审阅与深化意见

> 审阅基准：方案文档 + 对 datagear 代码库（datagear-web / datagear-webapp / datagear-analysis 等模块）的逐项核查。
> 结论先行：**方案总体方向正确、策略选型合理，可以按此推进；但有 9 处事实性偏差需勘误，15 个遗漏风险点需补入方案，阶段五工期明显低估，建议先补一个"阶段零：契约盘点"再动工。**

---

## 一、总体评价

方案做对了四件最关键的事：

1. **本质判断准确**：现状确为"FreeMarker 页面壳 + 内嵌 Vue 运行时"，数据层已 JSON 化，改造本质是页面壳职责迁移，后端退化为纯 REST API。这一判断与代码事实完全一致。
2. **策略正确**：拒绝一次性重写，采用"并行双轨、逐模块替换、收敛下线"，每个阶段可发布可回滚。对 136 个模板 + 看板设计器这种体量，这是唯一现实的路径。
3. **不更换 UI 库（保留 PrimeVue）正确**：现有界面全量 PrimeVue，换库会带来巨大视觉与工作量回归。
4. **认证先 Session 同源、后可选 JWT 的取舍正确**：代码核查确认登录锁定（IP + 用户名双闸）、校验码、remember-me（365 天）、匿名用户数据库角色装配等均深度依赖现有安全体系，阶段一动它性价比极低。

以下按"勘误 → 遗漏风险 → 计划修正 → 下一步工程指导"展开。

---

## 二、事实性勘误（请修正方案原文）

| # | 方案表述 | 代码事实 | 影响 |
|---|---------|---------|------|
| 1 | 40 个 @Controller | **实际 32 个**（`org.datagear.web.controller` 包），含 3 个旧 URL 兼容控制器（ChartVisualCompat / DashboardVisualCompat / Compatible） | 路由映射表按 32 个做；兼容控制器不在迁移范围内但**不能删** |
| 2 | 前端依赖"CDN 引入" | **全部本地 vendored**（`datagear-web/.../static/lib/`），无任何外网 CDN | 措辞修正即可；npm 化时按本地版本（vue 3.2.47 / primevue 3.34.1 / codemirror 5.64 等）锁版本 |
| 3 | po 框架为"约 87KB 的 util.js" | util.js（87KB）只是 jQuery 工具集；**po 框架主体在 `static/script/pages/include/page.js`（146KB，约 148 个 po.* 方法）**，合计 **~234KB** | **前端框架层重写工作量被低估约 2.7 倍**。方案漏列的大头：Vue 桥接层 20+ 方法、SQL 编辑器及服务端补全、多标签管理、数据集绑定辅助、调色板 |
| 4 | 保留 OperationMessage/PagingData"收敛为顶层包装" | OperationMessage **非泛型**（data 为 Object）；且 JSON 接口**未全量统一**：存在裸 `List` 返回（数据交换 uploadImportFile）、裸 `Map`（看板 heartbeat）、void 流式（Zip 导出）、HTML 片段（getLogContent） | "统一响应体"需先全量盘点裸返回端点清单，工作量高于方案预期；建议趁机把 OperationMessage 泛型化 |
| 5 | "移除 FreeMarker 依赖" | **看板引擎不可移除**：datagear-analysis 的 HtmlTplDashboardWidget 用 freemarker 渲染用户看板 HTML（datagear-analysis/pom.xml）。只能移除 datagear-webapp 的 starter 与 web 层视图四件套 | 阶段六"删除 FreeMarker 依赖"改为"删除 web 层 FreeMarker 视图体系"，analysis 模块 freemarker 保留 |
| 6 | 看板"渲染入口为服务端生成页面"（隐含 FreeMarker） | 看板 viewer **根本不走 FreeMarker 模板**：`DashboardVisualController.show()`（`/dv/{id}/`）在 Java 端用自有 HtmlTplDashboard 引擎解析用户 HTML 模板并注入 JS，直接写 response | 看板运行时天然独立于本次 FreeMarker 迁移，**本就不在改造范围内**——方案应明确"看板 viewer/嵌入端点零改动"而非"保留少量模板" |
| 7 | changeThemeData.ftl | 文件名为 `change_theme_data.ftl`；主题机制是**换 link href**（PrimeVue 预制主题 CSS + 自建 style.css 覆盖层，定义在 `theme/blue.properties` / `blueDark.properties`），非 CSS 变量 | SPA 侧按"切换两个 link 的 href"复刻即可，比 CSS 变量方案更简单 |
| 8 | WAR 打包（datagear-webapp） | 实为**可执行 war 双形态**：既可 `java -jar` 内嵌启动（DataGearApplication.main），又可投外置 Tomcat（DataGearServletInitializer），构建期把 war 复制重命名为 jar | 前端产物若打进 static，**两种启动形态都要验证**；nginx 独立托管则不受影响 |
| 9 | 前端资源隐含在 datagear-webapp | 模板与 static 实际在 **datagear-web 模块**（`src/main/resources/org/datagear/web/`） | frontend-maven-plugin 的集成点、静态资源清理范围都应在 datagear-web |

---

## 三、方案遗漏的风险点（按优先级补入方案）

### A 类：影响架构设计，必须在阶段一前决策

1. **多 Vue 应用嵌套架构无法平移（前端最大障碍）**
   现状 main.ftl 用 `po.open(url, {target: panel})` **AJAX 拉取整页 HTML 注入 div**，弹窗页（`$.open`）同样是动态注入后就地挂载独立 Vue app，靠 pid/ppid 命名空间隔离。同一 DOM 可同时存在 N 个 Vue 应用。这套"HTML 片段注入 + 就地挂载"机制在 SPA 下不复存在，**必须一次性设计好替代体系**：路由级页面 + 对话框内嵌组件（而非对话框加载远端 HTML）。建议阶段三模范模块时就定型"列表页 / 表单对话框 / 独立表单页"三种页面范式，否则批量迁移期会反复返工。

2. **jsessionid URL 会话机制**
   `StrictHttpFirewall.setAllowSemicolon(true)`（SecurityConfigSupport）允许 `;jsessionid=` 形式 URL——这是看板 iframe 嵌入第三方系统、且第三方 Cookie 被浏览器禁用时的兜底会话机制。方案完全未提。阶段一 Session 方案下无影响；**若阶段七演进到 JWT，必须提供等价物**（token in query 或显式放弃该场景）。

3. **公开 URL 兼容面比 /cv、/dv 更大**
   除 `/cv/**`、`/dv/**` 外，还有 3 个 Compat 控制器暴露旧公开地址：`/chart/show/**`、`/dashboard/show/**`、`/analysis/chart|dashboard/show/**`，下游嵌入方存量可能仍在用。**这些端点全部冻结不动**，写进方案的"不迁移清单"。

4. **匿名用户从数据库装配默认角色**
   `AnonymousAuthenticationFilterExt` 会给匿名身份装配数据库配置的默认角色（`roleService`），看板匿名展示的权限语义依赖它。Session 方案下不动；JWT 方案 B 必须复刻，否则匿名看板权限会悄悄变化。

### B 类：Session 依赖清单补全（方案只列了 2 项，实际 9 项）

| 功能 | 位置 | SPA 化处理 |
|---|---|---|
| 注册回填用户名 | RegisterController / LoginController | Session 方案下保留 |
| 重置密码多步向导 KEY_STEP | ResetPasswordController | 保留 |
| **校验码存取** | CheckCodeManager | 保留（方案已提端点保留，但未点明其 Session 存储） |
| **看板分享密码校验态** | DashboardVisualController + DashboardShowAuthCheckManager | 保留，不在迁移范围 |
| **数据交换批任务进度** | DtbsSourceExchangeController | 阶段五重点，进度查询接口化 |
| **看板心跳/展示信息** | analysis/SessionDashboardInfoSupport | 不动（看板运行时范围外） |
| **Session flash 消息**（WebUtils.setOperationMessage） | WebUtils | **应废弃**，JSON 化后由响应体直接承载 |
| 通用过期 Session 属性 | ExpiredSessionAttrManager | 逐个盘点 |
| jsessionid URL 会话 | SecurityConfigSupport | 见 A-2 |

### C 类：工作量与边界补充

5. **图表插件体系**：150 个内置插件是 **classpath 下的 zip 包**（v1 74 个 + v2 76 个），启动时解压到运行目录，由 ChartPluginManagerJsFactory 生成 JS 注入页面；**看板页全量加载所有插件 JS**。这套体系与 npm 前端工程无交集——方案应明确"插件运行时继续由后端托管，不进 npm 工程"。

6. **analysisapi 1.0 / 2.0 双版本并存**（chartFactory/chartSupport/dashboardFactory/dashboardEditor 等，对外公开的看板 JS API）。这是对外兼容包袱，**明确"本次不动"**，避免迁移期有人顺手"优化"破坏下游。

7. **运行时静态资源加工链**：`ClearCss/JsCommentResourceTransformer`（在线剥注释）、`ServerTimeJsController`（把 serverTime.js 做成动态控制器端点）、`DetectNewVersionScriptResolver`（新版本检测脚本注入）。SPA 静态托管后这套机制要么保留在后端（推荐，改动小），要么前端重做。

8. **错误页体系**：`ErrorController`（/error）返回模板页，`DeliverContentTypeExceptionHandlerExceptionResolver` 按 content-type 决定返回 JSON 还是错误页。SPA 化后：API 错误一律 JSON，页面 404/500 由前端路由兜底 + SPA 回退。方案提了回退但未提错误页迁移。

9. **i18n 真实规模**：`<@spring.message>` 在 119 个 ftl 中出现 **1873 次**，另有 **167 处** `po.i18n.xxx = "<@spring.message/>"` 模式把文案注入 JS（dashboard 设计器占 112 处）。message.properties 单文件 1333 行。一次性转换脚本要做两件事：properties → vue-i18n 语言包 + 处理 JS 侧注入文案的归属。

10. **frameOptions 已禁用**（为 iframe 嵌入图表/看板）。改造期若顺手收紧安全头会破坏嵌入场景——明确不动。

11. **每管理页全量加载 ~700KB JS**（含 120KB dashboardDesign.js 和整套 analysisapi）。SPA 化后必须做路由级代码分割，把看板设计器/SQL 工作台拆为异步 chunk——这本是迁移的红利之一，写进验收标准。

### D 类：阶段五（复杂模块）工作量重估

方案把 sqlpad、数据交换、URL 构建器、看板设计器合并为一个 4–6 周的阶段，明显低估：

| 模块 | 真实体量 |
|---|---|
| SQL 工作台 sqlpad | 单 ftl **1316 行**，浏览器端完整 SQL 客户端（编辑器 + 服务端补全 + 执行 + 分页结果网格 + 历史） |
| 看板设计器 | ftl 合计 **~3600 行**（其中属性面板单文件 2984 行）+ dashboardDesign.js **120KB / 437 个 function**，含 iframe 内就地支取编辑、拖拽插入图表 |
| 数据交换 | 11+11 个模板 + 11 个 include，列映射 importKeys、子任务 start/suspend/resume/stop、进度存 Session、Zip 流式下载 |
| URL 构建器 | HTTP 数据源 URL 可视化拼接 + CodeMirror 预览 |
| dtbsSourceData | 库表数据在线增删改，含二进制/LOB 列上传、HEX 处理 |

建议阶段五拆为三个子阶段（5a 数据交换 + URL 构建器；5b SQL 工作台 + dtbsSourceData；5c 看板设计器），每个独立排期与验收。

### E 类：好消息（核查排除的风险）

- **无 WebSocket / SSE**：全库无相关代码；看板心跳是轮询端点（`/dv/heartbeat`），无实时推送迁移风险。
- 登录成功虽是 302 → JSON 端点的混合体，但 `/login/success`、`/login/error` 本身已返回 OperationMessage JSON，axios 跟随重定向即可兼容，**认证改造量确实很小**，方案判断正确。

---

## 四、实施计划修正建议

| 阶段 | 原预估 | 修正建议 | 理由 |
|---|---|---|---|
| 新增 阶段零：契约盘点 | 无 | **3–5 天** | 全量盘点 32 个控制器的端点清单、返回形态（标注裸返回/流式/HTML 片段）、Session 依赖点、权限矩阵（URL antMatcher → 角色，硬编码在 SecurityConfigSupport 各 xxxModuleAccess()）→ 产出 api.md 与"不迁移清单"。这是后续所有排期的依据 |
| 阶段一：骨架 | 1 周 | 1 周（不变） | 合理 |
| 阶段二：后端 API 化 | 2–3 周 | **3–4 周** | 裸返回端点统一 + meta 接口补全 + OperationMessage 泛型化，工作量高于预期 |
| 阶段三：模范模块 | 2 周 | 2 周（不变），但验收标准增加"三种页面范式定型"（见 A-1） | 范式不定型，阶段四会返工 |
| 阶段四：批量迁移 | 4–6 周 | 4–6 周（不变） | 合理，前提是阶段三范式成熟 |
| 阶段五：复杂模块 | 4–6 周 | **拆为 5a/5b/5c，合计 8–12 周** | 见 D 类，看板设计器单独就值 4 周以上 |
| 阶段六：收敛下线 | 1–2 周 | 1–2 周（不变），范围改为"web 层 FreeMarker 视图体系下线" | analysis 的 freemarker 保留 |
| 总量 | 3–6 个月 | **4–7 个月（2–4 人）** | 若需压回 3–6 个月，优先压缩方式是阶段五与阶段四部分并行（看板设计器独立专人） |

---

## 五、下一步软件工程指导（可立即执行）

### 第 1 周：阶段零 + POC 证伪

**阶段零产出物（先于任何代码）：**

1. **端点契约盘点表**：用脚本扫描 32 个控制器，逐端点标注：路径 / 方法 / 返回形态（OperationMessage / 裸 JSON / 流式 / HTML 片段 / 视图名）/ 权限角色 / Session 依赖 / 迁移分类（REST 化 / 冻结不动 / 废弃）。
2. **不迁移清单**（冻结面）：`/cv/**`、`/dv/**`、3 个 Compat 控制器、`/checkCode/**`、analysisapi/analysislib、图表插件运行时、看板心跳。这张表和"迁移清单"同等重要——它保护对外契约。
3. **api.md 骨架**：统一响应体规范（含 OperationMessage 泛型化决议）、错误码约定、分页约定（PagingData）、401/403 行为约定。

**POC 必须证实的 5 个不确定点（证实不了就调整方案）：**

1. Vite proxy 转发下，Session Cookie + 表单登录全链路可用（含校验码、登录锁定错误码透传）；
2. axios 跟随 302 → `/login/success` 能正确拿到 JSON（若行为不佳，改 AuthenticationSuccessHandler 直接写 JSON，改动很小）;
3. PrimeVue **npm 版** DataTable 懒加载模式与 PagingData 对接（分页/排序/多选）;
4. message.properties → vue-i18n 语言包的一次性转换脚本跑通（1333 行 + 1873 处引用 key 的覆盖率校验）;
5. npm 版 PrimeVue 用"换 link href"方式复刻现有 blue/blueDark 双主题。

### 工程化落地要点

- **仓库与构建**：前端独立目录 `datagear-web-ui/`（同仓库 monorepo 即可，不必独立仓库，降低 CI 复杂度）；用 frontend-maven-plugin 挂在 **datagear-web** 模块（不是 webapp），`npm ci && npm run build` 产物拷入静态资源目录；**可执行 war 与外置 Tomcat 两种形态都要在 CI 验证**。
- **双轨并行机制**：旧入口（模板路由）与新入口（SPA）并存期间，用独立 context path 或独立端口区分，菜单级灰度切换；每个模块切换后保留旧模板一个迭代再删。
- **类型契约**：OperationMessage 泛型化后，可考虑用 openapi-generator 或手写 TS 类型；至少保证 api/ 层每个封装函数有完整类型标注。
- **回归测试策略**：阶段三起，对模范模块做"接口级 diff 测试"——同一操作分别打旧 JSON 接口和新 /api 接口，比对响应；页面级用清单式人工回归（每个模块一份 checklist）。
- **版本兼容纪律**：改造期间 master 只接受 bugfix，前端迁移在 feature 分支按模块合并，避免长期分支地狱。

### 里程碑验收门槛

| 里程碑 | 退出条件 |
|---|---|
| M1 POC 完成 | 上述 5 个证伪点全部通过；登录进主框架，菜单可点 |
| M2 模范模块 | role + dataSet 功能与旧版逐项一致；三种页面范式文档化；通用组合函数（usePagingTable 等）稳定 |
| M3 常规模块完成 | 阶段四菜单全量切 SPA；接口 diff 测试通过 |
| M4 复杂模块完成 | 5a/5b/5c 各自验收；重点回归看板设计器 iframe 编辑与数据交换导入导出 |
| M5 下线 | 旧 FreeMarker 视图入口关闭；嵌入方冒烟测试（iframe 嵌入、密码分享、匿名访问、jsessionid 场景）通过 |

---

## 附：核查依据（关键文件）

- 控制器：`datagear-web/src/main/java/org/datagear/web/controller/`（32 个 @Controller）
- 安全配置：`datagear-web/.../config/SecurityConfigSupport.java`、`config/support/FormLoginConfgBean.java`
- FreeMarker 视图体系：`config/WebMvcConfigurerConfigSupport.java`、`freemarker/CustomFreeMarkerView.java`、`freemarker/WriteJsonTemplateDirectiveModel.java`
- 统一响应：`web/util/OperationMessage.java`、`datagear-util/.../query/PagingData.java`
- po 框架：`datagear-web/src/main/resources/org/datagear/web/static/script/pages/include/page.js`（146KB）、`static/script/util.js`（87KB）
- 看板运行时：`DashboardVisualController.java`（/dv）、`datagear-analysis` HtmlTplDashboardWidget 引擎
- 前端模板：`datagear-web/src/main/resources/org/datagear/web/templates/`（136 个 .ftl）
