# prototypev2 对齐实现基准（Gap Matrix & Batch Plan）

> 基准：`docs/productdesign/v4.1-design/prototypev2.zip`（15 页交互原型 + mock-api.js 前后端契约）
> 依据：PRD V4.1 + SDS V1.0（mock-api 端点与 SDS「REST API 分组清单」一一对应，统一 `{code,message,data}` 信封）
> 本地预览：`cd /tmp/proto-v2/prototypev2 && python3 -m http.server 8900`（已验证）
> 状态标注：✅已对齐 / 🟡部分对齐 / ❌未实现（前端+后端均无）/ 🔧前端有壳需补真实

## 一、v2 原型总览（相对 v1 的增量主题）

1. **mock-api.js（530 行）**：可执行的前后端契约。~80 个端点，覆盖语义层/告警/订阅/调度/数据源/数据集/AI 问数/系统管理/行列权限/开放嵌入/治理/看板/报表/首页/交付部署/认证 16 组
2. **每页交互化**：所有按钮接 mock 路由（启停开关、保存、删除、试算、复制、模板套用、回收站、抽屉、向导）
3. **新增整页能力**：看板页三 tab（我的/行业模板库/回收站）、系统管理行列权限+脱敏+组织、开放页 API Key/MCP/代码示例、首页待办+模板库+收藏+新手引导+布局管理
4. **设计器大幅深化**（1288 行）：语义层指标拖入列表、草稿自动保存、网格开关、已选计数、维度/度量 chips 可移除、过滤器添加

## 二、逐页差距矩阵（v2 原型 ⇄ 当前 Vue 实现）

| 页面 | v2 原型要点（路由契约） | 当前实现 | 差距 | 批次 |
|---|---|---|---|---|
| **dashboards 看板** | 行业筛选 chips；我的看板/行业模板库/回收站 三 tab；模板卡片网格+一键套用(copyFromTemplate)；看板卡：收藏(fav/toggle)、复制(copy)、删除、回收站(restore) | 真实数据表格（旧表格式） | ❌ 大 | **B1** |
| **alert 告警订阅** | 4 统计卡；5 tab：规则(启停/CRUD)/历史(处理)/订阅(toggle/save)/调度(触发/日志)/渠道(test)；三步配置向导 | 静态演示页 | ❌ 大（后端无 alert 模块） | **B2** |
| **api 开放嵌入** | 5 tab：数据API(启停/文档/复制curl)/API Key(创建/吊销)/嵌入集成(密钥/白名单/SDK代码)/MCP Server/导入导出；24h 调用量卡 | 静态演示页 | ❌ 大（后端无 openapi 模块） | **B3** |
| **index 综合首页** | 指标卡(真实指标+同环比)；生产运营趋势；待办与消息(todo/readAll)；行业模板库；我的收藏(favorite)；新手引导(5步)；布局管理(layout持久化) | 真实资产统计卡+快捷入口+最近看板 | 🟡 中 | **B4** |
| **metrics 指标中心** | 目录树(两级)+列表(状态/冲突标记/sparkline)+表单弹窗+详情抽屉(版本/SQL高亮/血缘)+口径对比(compare)+冲突处理 | 真实API版（目录/列表/抽屉/认证/版本/试算） | 🟡 小-中（补：冲突检测标记、编辑表单弹窗化、迷你趋势） | **B5** |
| **system 系统管理** | 用户/组织/角色/行列级权限(rowperm save·toggle)/脱敏(mask save)/审计(audit list) | 用户/角色真实 CRUD；无行列权限/脱敏/组织 | ❌ 后端新表（FR-AUTH-10/11 P1） | **B6** |
| **governance 治理** | 5 tab：元数据/标准/质量(规则toggle+问题)/血缘/安全(敏感字段标记) | 静态演示 | ❌ 后端新表（FR-GOV P2） | **B7** |
| **designer 设计器** | 语义指标拖入列表(/semantics/metric/list)；草稿自动保存(dashboard/save+draft)；网格开关；已选N；维度chips可移除；过滤器添加；组件/文本 tab 内容 | 已有真实拖拽画布/属性面板/保存发布 | 🟡 中（对接已有真实API） | **B8** |
| **chatbi 问数** | 会话列表(/ai/session/list)；提问→canned答案(图表+表+结论+DSL/SQL透明)；澄清选项；归因；转图表 | 静态演示 | 🔧 需 datagear-ai 模块（Phase 2） | **B9** |
| **datasource/dataset** | 交互化（测试连接/保存/删除/预览），字段与现有一致 | 真实 CRUD 已完成 | ✅ 基本对齐（微调） | B10 |
| **screen/report/mobile/login** | 交互化增强 | 大屏全栈/报表演示/移动演示/真实登录 | 🟡 | B11 |

## 三、mock-api → 真实后端映射表（开发契约）

| mock 路由 | 真实后端状态 | 说明 |
|---|---|---|
| /semantics/metric/list · detail · save · certify · versions · query · /semantics/catalog | ✅ 已实现（/api/metric/*） | 已对齐，前端字段名差异适配 |
| /dashboard/list · delete · save(draft) · publish | ✅ /api/dashboard/* | 列表/删除/保存已通 |
| /dashboard/copy · fav/toggle · restore · copyFromTemplate | ❌ 需后端小增（复制=读源模板建新看板；收藏=collab收藏表） | B1 配套 |
| /alert/* · /subscribe/* · /job/* · /channel/* | ❌ 需 datagear-scheduler + alert 模块（PRD P0/P1） | B2 配套 |
| /openapi/* · /embed/* | ❌ 需 openapi 模块（FR-EXCH-04~07/FR-EMBED-01） | B3 配套 |
| /home/todo · favorite · layout | ❌ 部分可前端 localStorage；todo 需聚合告警/审批 | B4 配套 |
| /auth/rowperm/* · /auth/mask/* · /management/audit/* | ❌ 需行列权限模块（FR-AUTH-10/11 P1） | B6 配套 |
| /quality/* · /sensitive/* | ❌ 需治理模块（FR-GOV P2） | B7 配套 |
| /ai/chat/* | ❌ 需 datagear-ai（Phase 2） | B9 |

## 四、实施批次

- **B1 ✅（已完成）看板列表 v2 化**：三 tab + 行业筛选 + 模板库（一键套用真实落库，已验收 21→22）+ 回收站（localStorage 快照恢复，保留 30 天）+ 收藏/复制/右键菜单/排序/双视图
- **B2 ✅（已完成）告警页 v2 结构**：4 统计卡 + 5 tab（规则/历史/订阅/调度/渠道）全交互 + 三步向导卡；数据层 `src/mock/alertData.ts`（localStorage 持久化，契约对齐 mock-api，后端就绪后仅换数据源）
- **B3 ✅（已完成）开放与嵌入 v2**：5 tab（数据API 文档三语言示例/API Key 创建吊销/嵌入密钥+SDK代码/MCP 工具清单/导入导出）+ 24h 调用量卡；数据层 `src/mock/openApiData.ts`
- **B4 ✅（已完成）综合首页 v2**：指标卡横滑区（真实语义指标 + queryValue 即时取数）+ 待办与消息（真实告警历史驱动）+ 行业模板库（一键套用落库）+ 我的收藏
- **B5 ✅（已完成）指标中心 v2 补齐**：口径冲突检测标记（同名不同口径）+ 维度分布可视化条形图（真实数据）+ 编译 SQL 展示
- **B6 ✅（已完成）系统管理 v2**：新增 /system 页 + 平台管理组菜单项。6 tab——用户（真实 /api/user 适配，搜索/编辑/改密入口）/角色（真实入口+角色卡）/组织（架构树 mock）/行列级权限（规则启停+新建，${currentUser}/${currentOrg} 变量说明）/动态脱敏（四算法）/审计日志（关键操作红色高亮+类型筛选）。数据层 `src/mock/systemData.ts`
- **B7 ✅（已完成）数据治理 v2**：重写 GovernanceView。5 tab——元数据（目录树+字段清单+标记敏感）/数据标准/数据质量（总分统计卡+规则 spark 趋势条+启停+异常清单）/数据血缘（L0-L3 分层）/数据安全（敏感字段）。数据层 `src/mock/governanceData.ts`
- **B9 ✅（已完成）ChatBI 交互化**：重写 ChatbiView。会话历史/新会话、推荐问题、提问→意图匹配→canned 三段式回答（ECharts 同比图+明细表+结论）、澄清选项、取数逻辑透明化（指标/DSL/SQL/权限说明）、归因面板、追问、转图表/加看板/分享。数据层 `src/mock/chatData.ts`（datagear-ai 就绪后切 SSE）
- **B4补 ✅（已完成）首页 v2 补齐**：5 步角色化新手引导（可跳过，localStorage 记忆，帮助按钮可重开）+ 布局管理（编辑模式隐藏/恢复模块，localStorage 偏好）
- **B5补 ✅（已完成）指标中心口径冲突弹窗**：冲突 tag 点击→同名不同口径并排对比弹窗（实测双口径对比+新建统一口径入口）
- **分析展示六项菜单 ✅（已完成）**：图表/看板/看板设计器/大屏设计器/数据大屏/统计报表 六项二级菜单+图标（实测渲染）；两个设计器支持新建模式（菜单直达，首次保存落库）；看板消费已有图表（我的图表拖入绑 chartId）与语义指标（metricId 实时取数）；统计报表按 v2 重做（斜线表头样张）
- **B10 ✅（已完成）收尾批次**：① MobileView 按 v2 重写——手机壳内 5 视图（首页/看板列表/看板详情/问数/消息）+ 底部 Tab 栏 + 问数 Text2DSL canned 对话（canvas 图表）+ 体验二维码（微信/企微扫码）；② 数据集页新增**可视化查询构建器**（FR-PREP-01：选数据源→选表→字段点入维度/度量槽位→自动生成预编译 SQL→保存为 SQL 数据集，全流程实测）；③ 顶栏全局搜索对齐 /search 契约——跨资源联想新增「指标」组（真实 /api/metric，认证状态标注）并按资源类型分组置顶渲染；④ 数据源页健康 spark 与导出清单已有覆盖（核对确认）
- **B10.5 ✅（已完成）统计报表可创建**：reportData 改造为响应式+localStorage 持久化；新建报表三步向导（基本信息→绑定 SQL 数据集→真实预览取数→保存）；绑定数据集的报表预览经 /dataSet/preview/SQL 实时取数渲染（修复 connectionFactory 反序列化失败：GET 实体需清洗为最小预览表单）；清单支持删除；实测创建「管输量周报（自建）」7列×12行真实数据刷新后持久恢复
- **B10.6 ✅（已完成）数据治理多级钻取**：元数据多表目录树（4 表各含字段清单）+ 字段检索 + **L3 字段详情抽屉**（敏感级别 L4 分段编辑实时生效）+ 批量标注弹窗（多选+级别）；标准详情抽屉 + 编辑/删除/**发布**状态流转；质量规则**编辑/删除** + 异常点击→**处理意见弹窗**（resolved 流转）；血缘节点点击→上下游/字段映射/频率详情。全部 localStorage 持久化
- **B11.1 ✅（已完成）行列级权限/脱敏/审计后端真实化（FR-AUTH-10/11/12）**：新增三表 DATAGEAR_ROW_PERM / DATAGEAR_MASK_RULE / DATAGEAR_AUDIT_LOG（datagear-mysql.sql + datagear.sql 版本化 + 现网库手工建表）。后端 RowPermEntity/MaskRuleEntity/AuditLogEntity + Service/Mapper + AuthApiController（/api/auth/rowperm/*、/api/auth/mask/*，list/save/toggle/delete 全套）+ AuditApiController（/api/management/audit/list）。**权限管道**：DataPermissionService——① 行级过滤：规则绑定物理表后，指标查询自动解析条件模板（${currentUser}/${currentOrg}/字面量）为 PreparedStatement 参数化 WHERE 注入 MetricQueryEngine（admin 绕过）；② 结果脱敏：按列名匹配启用的脱敏规则，结果侧应用掩码/哈希/置空/截断（华东→华***东 实测）；③ 审计留痕：行列权限每次变更自动写审计（IP 脱敏/IPv6 回环显示「本地」）。MetricQueryResult 新增 appliedRowPerms/appliedMasks 字段（取数透明化数据源）。前端 api/authData.ts + SystemView 三 tab（行列权限/脱敏/审计）切真实 API（用户 tab 早已真实）。E2E：sale_user 查询被注入 WHERE region = ? 且 appliedRowPerms 返回规则名，admin 全量 1491.75 绕过
- **B11.2 ✅（已完成）ChatBI 真实问数后端（datagear-ai 通道 A，FR-AI-01~08）**：新增 DATAGEAR_AI_SESSION / DATAGEAR_AI_MESSAGE 两表。ChatService 实现**确定性 Text2DSL 管道**：意图识别（指标名/口径关键词命中，候选多→澄清，术语表 grounding 预留）→ DSL 中间层 → 复用 MetricQueryEngine 编译执行（**行列权限管道全程继承**，sale_user 实测注入 WHERE region = ?）→ 结论模板 + 图表推荐规则引擎（时间维→折线，其余→柱状）。AiApiController：/api/ai/session/list|create|delete、/chat/ask|clarify|history、/insight/attribute（真实维度贡献度）。问答落库持久化，会话标题自动取首问。前端 ChatbiView：新会话进入 live 模式（左栏「我的会话」组与演示组并存），提问/澄清/归因/取数透明化五步面板全部走真实 API（explain 含真实 SQL/权限/耗时），演示罐装会话保留对照。**修复全局性图表渲染 bug**：后台标签页 rAF 不触发导致 chatbi 图表静默漏渲染（drawPendingCharts 改 nextTick+条件重试，演示与 live 路径均修复）
- **B11.3 ✅（已完成）治理后端真实化（FR-GOV-01~05）**：新增五表 DATAGEAR_GOV_META_TABLE（字段清单内嵌 JSON）/ GOV_STANDARD / GOV_QUALITY_RULE / GOV_QUALITY_ISSUE / GOV_SENSITIVE（两份 DDL 版本化 + 现网库建表）。GovernanceService（统一轻量 mapper）+ GovernanceApiController（/api/governance/meta|standard|quality/rule|quality/issue|sensitive 全套 CRUD）。**质量规则服务端执行引擎**（/quality/rule/run）：数据源权限校验 → 直连抽样（500 行结果侧截断，标识符白名单）→ 确定性判定（非空/唯一/范围/格式，与前端同口径）→ 通过率/异常落库自动流转。前端 governanceData.ts 改造为后端同步层（本地乐观更新 + API 落库），GovernanceView「运行校验」切换后端引擎（实测：范围规则 12/12 失败 → danger 异常自动生成 → 处理流转 resolved；非空规则 100% 通过）
- **B11.4 ✅（已完成）术语表 grounding + 移动端真实问数**：GlossaryService + DATAGEAR_GLOSSARY 接入 ChatService.recognize——术语/同义词命中 → 关联指标加分（实测「本月各地区**营收**情况」经同义词命中「销售额」指标，时间过滤诚实生效）；术语 CRUD 语句就绪。MobileView 问数切真实 /api/ai（手机端复用桌面端 Text2DSL 管道，失败回退演示罐装），同时修复其后台标签 rAF 图表渲染问题（与 B11.2 同根因）
- **B11（后端阶段项，前端契约已就绪）**：ChatBI LLM 润色/SSE 流式（Phase 2，接口已按 DSL 中间层隔离，BYO-LLM 接入后替换 ChatService.recognize 即可）、报表引擎（P3 企业版）——mock 数据层契约已对齐 SDS。行列级权限 SQL 改写（B11.1）、ChatBI 确定性问数（B11.2）、治理持久化（B11.3）、术语 grounding 与移动端问数（B11.4）均已完成

## 五、约定

- 演示数据层：`src/mock/` 目录，形状与 mock-api.js 一致；页面通过 `useDemoData` 开关切换
- 真实可落地的操作（套用模板、看板复制/删除/收藏）直接调真实 /api/dashboard/*
- 遵守 PAGE_CONVERSION_GUIDE 换肤纪律；页面骨架用 datasource-page.css
