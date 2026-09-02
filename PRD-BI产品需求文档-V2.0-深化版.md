# DataGear 商业智能分析平台产品需求文档（PRD）V2.0 · 深化版

> 本文档在《PRD-BI产品需求文档》（V1）基础上深化：一是将竞品参照系从国内主流 BI 扩展到**国际先进 BI 与开源竞品**（Tableau、Power BI、Looker、Qlik、ThoughtSpot、Superset、Metabase、DataEase/SQLBot）；二是基于对 **DataGear 6.0.0 代码库的事实盘点**重新校准需求基线；三是新增语义层/指标中心、AI 增强分析（ChatBI）、数据告警、嵌入式分析等模块，并给出**面向二次开发的分阶段实施路径**。

---

## 文档信息

| 项目 | 内容 |
| --- | --- |
| 产品名称 | DataGear（数据可视化分析与商业智能平台） |
| 基线版本 | 6.0.0（Java 8 / Spring Boot 2.7 / jQuery+Vue3+PrimeVue 混合前端 / Freemarker 服务端渲染） |
| 文档版本 | V2.0（在 V1 基础上深化，与 V1 配合使用；冲突处以本文档为准） |
| 文档目的 | 为下一步二次开发明确方向（做什么、为什么）与路径（先后顺序、技术要点、验收标准） |
| 国际参照 | Tableau（Pulse/Agent）、Power BI（Copilot/语义模型）、Looker（LookML/Conversational Analytics）、Qlik（Insight Advisor）、ThoughtSpot（Spotter）、Apache Superset、Metabase |
| 国内参照 | 帆软 FineBI 7.0/FineChatBI、阿里 Quick BI 智能小Q、观远 ChatBI/Metrics、Smartbi AIChat 白泽、Kyligence Zen/Copilot、DataEase/SQLBot |
| 事实依据 | 竞品公开资料（2024–2026，附来源）；本地代码库盘点（模块/类级证据） |

---

## 1. 竞品格局与趋势洞察（新增）

### 1.1 国际竞品能力矩阵

| 能力域 | 标杆实践 | 来源 |
| --- | --- | --- |
| 语义层/指标层 | Looker LookML：维度/度量/Join 以代码定义，Git 版本化 + Code Review，是 BI 界工程化程度最高的语义层；2024 起 Looker Modeler 把语义模型以 SQL 接口暴露给第三方 BI（"语义层即服务"） | 7wData: 2024-2025(https://7wdata.be/company/looker/) |
| 语义层/指标层 | Power BI 语义模型是全部 AI 能力的底座，提供 "Approved for Copilot" 治理标记；AI data schema 支持字段同义词与 AI Instructions（业务规则提示词） | Rollstack: 2025(https://www.rollstack.com/articles/power-bi-ai-best-practices) |
| 语义层/指标层 | Tableau Pulse Metrics Layer 集中定义可复用指标，用户"关注"指标后自动获得洞察推送 | Tableau 官方博客: 2024(https://www.tableau.com/blog/tableau-metrics-and-natural-language-query-evolve-tableau-pulse) |
| 语义层/指标层 | dbt Semantic Layer / MetricFlow：YAML 定义指标、Git 版本化；MetricFlow 于 2025 年底以 Apache 2.0 开源；OSI（Open Semantic Interchange）语义互换标准 v1.0 于 2026.1 发布并捐入 Apache 孵化器 | Datus: 2025-2026(https://datus.ai/blog/open-semantic-interchange-osi/) |
| AI 增强分析 | Power BI Copilot：自然语言生成整页报表、写 DAX、Smart Narrative 摘要；Verified answers 用"人工认证答案"对冲 AI 幻觉；Key Influencers / Anomaly Detection / Decomposition Tree 三个 AI 视觉件 | Bifocal: 2025-12(https://bifocal.show/2025/12/16/episode-312-power-bi-november-2025/) |
| AI 增强分析 | Tableau Pulse：面向业务决策者的"指标新闻流"，AI 自动发现趋势/异常并用自然语言解释，主动推送至 Web/移动/Slack | Tableau 产品页: 2024(https://www.tableau.com/products/tableau-pulse) |
| AI 增强分析 | ThoughtSpot Spotter：AI 数据分析师 Agent，多步推理；底层是"确定性 search-token 架构"而非纯 text-to-SQL；SpotIQ 无人值守自动洞察 | OSI 厂商调研: 2025(https://github.com/bitol-io/tsc/blob/main/rfcs/approved/odcs-v3.2.0/0038-context.md) |
| AI 增强分析 | Looker Conversational Analytics（2025.11 GA）：Fast/Thinking 双模式，"Show reasoning" 透明化解释，支持 golden queries（金标准问答对） | Querio: 2025(https://querio.ai/articles/conversational-analytics-tools) |
| 数据准备 | Power Query：拖拽+步骤列表 ETL，数百连接器，转换可回溯为 M 脚本；业界公认强于 Tableau Prep | Prologika: 2024(https://prologika.com/tableau-prep-vs-power-query/) |
| 嵌入式分析 | Metabase：JWT 签名嵌入 + React Embedding SDK，开源即可基础嵌入，公认开源 BI 中嵌入体验最佳；Superset 提供 Embedded SDK + Guest Token | work-management: 2025(https://work-management.org/analytics/metabase-review/) |
| 告警推送 | Power BI 磁贴告警 + Fabric Activator 动态告警；Tableau Data-driven alerts；Metabase/Superset 均有阈值告警 + 邮件/Slack/Webhook | Lukas Reese: 2024-12(https://lukasreese.com/2024/12/26/power-bi-alerts/) |
| 协作治理 | Metabase Verified 认证内容 + Collections；Tableau 修订历史（版本快照回滚）；Power BI 部署管道（Dev/Test/Prod） | Wiiisdom: 2024(https://wiiisdom.com/blog/tableau-version-control/) |
| 开放接口 | Metabase、ThoughtSpot 已提供 MCP Server，让外部 AI Agent 直接检索 BI 资产、跑查询 | Metabase: 2025(https://www.metabase.com/releases-ai) |

### 1.2 国内竞品动态（2024–2026）

- **ChatBI 技术路线已收敛**：行业共识是"大模型只做对话理解与意图拆解，不直接碰数据；取数走语义层/指标层的确定性通道"。帆软 FineChatBI 用 Text2DSL（大模型把意图转成可解释、可干预的 DSL 指令），永洪 Megrez 天权用 NL2Skill（自研领域语言 BDSL 替代 NL2SQL），均在规避裸 text-to-SQL 的幻觉与安全风险（甲子光年: 2024-05(http://mp.weixin.qq.com/s?__biz=MzU5OTI0NTc3Mg==&mid=2247534103&idx=2&sn=240019fbded4ad7f60d95fb0cb1046b6)；亿欧: 2025-12(https://www.iyiou.com/news/202512311118533)）。
- **产品形态从"问答框"扩展为智能体矩阵**：Quick BI 智能小Q（2025-08 新版）拆分为问数/解读/报告/搭建四个 Agent；观远洞察 Agent 做 7×24 指标监控、异常检测、归因与行动建议（星汐引力: 2025-09(http://mp.weixin.qq.com/s?__biz=MzA3NDA4MjA2Mg==&mid=2247483844&idx=1&sn=2e722984afcb0861dc4a909074e40836)；观远: 2024-11(https://www.ithome.com/0/810/529.htm)）。
- **指标平台国内三类载体**：独立中台型（Kyligence Zen）、BI 内建型（观远 Metrics、Smartbi 指标管理、FineBI 7.0 指标中心）、ChatBI 知识库型（业务用语/同义词/规则沉淀口径）。对开源产品，"BI 内建轻量指标层 + 口径知识库"性价比最高。
- **开源商业模式被验证**：DataEase（约 20.8K Star）以"社区版免费 + X-Pack 增值包（填报/同步/外观定制）"形成闭环；其衍生项目 **SQLBot**（LLM+RAG Text2SQL 独立开源问数组件）发布两个月获 12 万次部署，证明"智能问数可插拔化"的获客路径（OSCHINA: 2025-10(https://my.oschina.net/u/4736111/blog/18695592)）。
- **实时化双轨应对**：BI 厂商普遍"直连实时 OLAP 引擎（Doris/StarRocks/ClickHouse）+ 内置加速/缓存层"，而非自建数仓（Quick BI 官方支持 Doris/SelectDB，阿里云文档(https://www.aliyun.com/sswb/1771602.html)）。
- **信创升级为硬门槛**：央国企要求 2027 年前全栈信创替换，适配须覆盖芯片/OS/数据库（达梦/人大金仓/GaussDB/GBase）/中间件/国产浏览器五层，且要求性能验证（Worktile: 2026-07(https://worktile.com/kb/p/3996017)）。
- **市场结构利好私有化开源 BI**：2024 年中国 BI 市场 10.6 亿美元，本地部署占 85.9%（美国 57.7%）；预计 2029 年达 19.3 亿美元，CAGR 12.8%（IDC，安全内参: 2025-07-31(https://www.secrss.com/articles/81495)）。

### 1.3 六大趋势判断（DataGear 的战略输入）

| # | 趋势 | 对 DataGear 的含义 |
| --- | --- | --- |
| T1 | **语义层/指标层是一切高级能力（ChatBI、告警、嵌入、治理）的地基**；AtScale 基准显示 LLM 无语义层 grounding 时错误率约 80% | 优先建设轻量指标中心，且指标定义要"可 API 消费、可导出"（headless 形态） |
| T2 | **AI 取数走"确定性中间层"**（Text2DSL/NL2Skill），大模型只做意图理解 | DataGear 自有数据集/数据标记模型天然适合做 DSL，避免裸 NL2SQL |
| T3 | **告警/订阅/嵌入是开源用户口碑最集中的"非炫技"能力**，成本低见效快 | 排在 AI 大叙事之前落地 |
| T4 | **Agentic BI**：从"对话取数"到"监控-归因-建议"的主动洞察与多智能体协同 | 作为中期演进方向，依赖 T1/T2 成熟 |
| T5 | **可组合/Headless BI 与 MCP**：BI 资产（指标、数据、看板）以 API/MCP 向外供给 | 开放 API 与 MCP Server 是生态卡位 |
| T6 | **信创与实时 OLAP 适配**决定国内政企准入 | 数据源方言矩阵与性能验证需专项投入 |

---

## 2. DataGear 现状盘点与差距分析（新增，基于代码事实）

> 本节结论来自对 6.0.0 代码库的逐项核查（模块/类级证据），用于把 V1 PRD 中"规划语气"的需求重新定性为「增强现有」或「全新建设」，避免二次开发误判工作量。

### 2.1 已实现能力（可作为深化基座）

| 能力域 | 关键代码证据 |
| --- | --- |
| 数据源管理 + 运行时 JDBC 驱动加载 | `datagear-connection`：`DriverEntity/DriverEntityManager/PathDriverFactory`；`DriverEntityController` |
| SQL 工作台 | `DtbsSourceSqlpadController`、CodeMirror SQL 模式 |
| 六类数据集 + Freemarker 参数化 + 汇总数据集 | `datagear-analysis/support/*DataSet`、`SummaryDataSetEntity` |
| 70+ 图表（ECharts 5.6）、一图多数据集、数据标记 | `builtInChartPlugins` v1(74)/v2(76)、`ChartPlugin/ChartPluginManager` |
| 看板（HTML 模板、可视/源码双模式、分享密码、iframe、响应式） | `DashboardVisualController`（1871 行）、`dashboardEditor.js`（3808 行） |
| 看板前端开放 API（联动/钻取/异步加载/交互表单） | `analysisapi/2.0/chartFactory.js`（8743 行）、`dashboardFactory.js`、`chartSupport.js` |
| 数据导入导出（CSV/Excel/JSON/SQL，手动触发） | `datagear-dataexchange`、`DtbsSourceExchangeController` |
| 用户/角色/资源级授权/数据源防护 | `User/Role/Authorization`（四档权限值）、`DtbsSourceGuard` |
| 内部调度框架（Spring Scheduling，仅 housekeeping） | `web/config/SchedulingConfigSupport.java` |
| 内部 JSON Web API（会话认证，46 个 Controller） | `/dashboard/data`、`/dashboard/loadChart` 等 |

### 2.2 未实现能力（V1 PRD 规划项的真实状态）

| V1 规划项 | 代码现状 | 定性 |
| --- | --- | --- |
| 数据填报 | 零实现，Roadmap 仅"待研究" | 全新建设 |
| 统计报表/固定报表 | 无 report 引擎；汇总数据集仅部分替代 | 全新建设 |
| 数据治理（血缘/质量/标准/指标） | 仅 `datagear-meta` 表结构解析 | 全新建设（其中指标中心升级为本 V2 的核心模块） |
| 开放数据 API（Key/Token 鉴权、限流） | 仅会话制内部接口 + 分享密码 iframe | 全新建设 |
| 定时任务/订阅推送 | 无 quartz/cron/邮件模块 | 全新建设（基建级） |
| 行/列级数据权限 | 权限粒度停在资源级（Authorization 四档） | 全新建设（需扩展权限模型） |
| 真拖拽设计器 | 可视编辑器为插入/点选式，`draggable` 出现 0 次 | 增强现有（dashboardEditor.js 演进） |
| 大屏设计器 | 无专门模块 | 全新建设 |
| 数据集市/ETL 调度/跨库查询 | dataexchange 无调度、无增量、无转换编排 | 全新建设 |
| Docker 交付 | 无 Dockerfile | 全新建设（低成本） |
| 移动端 | 仅看板响应式 | 全新建设（建议降级为 H5 深化） |

### 2.3 差距分析结论

1. **DataGear 的强项在"自由看板 + 插件体系 + 轻量部署"，弱项在"语义层、自助分析、企业级治理、开放集成"**——恰与 Superset（SQL 深度强/业务自助弱）、Metabase（自助与嵌入强/治理弱）形成错位。
2. **V1 PRD 的多数规划项属于"全新建设"而非"增强现有"**，二次开发必须按基建（调度/邮件/开放 API/权限扩展）→ 语义层 → AI/告警/嵌入的顺序推进，不能并行摊大饼。
3. **国内开源竞品（DataEase/SQLBot）已验证"简单好用 + 可插拔问数 + 增值包"路径**；DataGear 的差异化空间在「中文场景 + 轻量私有化 + 数据集语义层 + 可嵌入 + AI 可插拔」的组合。

---

## 3. 产品战略与定位升级（深化 V1「产品定位」）

### 3.1 定位陈述（V2）

DataGear 从「自由制作任何数据看板」升级为：

> **开源、轻量、可私有化的"语义层驱动"BI 平台**——以数据集语义层与指标中心为地基，向上支撑自由看板、自助分析与 AI 增强分析（ChatBI），向外以开放 API / 嵌入 SDK / MCP 供给数据与指标，服务中文场景与信创环境。

### 3.2 三个战略支点

1. **语义层优先**：指标中心是 ChatBI 准确率、告警、嵌入、治理的共同地基，作为 V2 最高优先级的全新建设模块。
2. **AI 可插拔而非重写内核**：对标 SQLBot，智能问数做成独立可插拔模块（复用现有数据集/权限体系），支持 DeepSeek/Qwen/OpenAI 兼容接口的自带模型（BYO-LLM）。
3. **开放与嵌入放大生态**：签名 Token 嵌入、数据 API、MCP Server 三层开放，让 DataGear 可被第三方系统与 AI Agent 消费。

### 3.3 明确不做（边界）

- 不做独立重型 ETL/数据集成产品（对标 Tableau Prep 全量能力）；只做数据集内轻量数据准备，重 ETL 交由上游（SeaTunnel/Flink CDC 等）。
- 不做 SaaS 多租户云平台；坚持私有化单体 + 可选外置库高可用。
- 不做自研 OLAP 引擎；以"直连实时 OLAP + 缓存加速"双轨应对实时化。
- 不做裸 text-to-SQL 问数；坚持"语义层 grounding + DSL 中间层"的确定性路线。

---

---

## 4. 新增与深化的需求模块

> 编号规则：延续 V1 的 FR 体系，新增模块使用新前缀（SEM/AI/ALERT/EMBED/PREP/COLLAB/DELIV）。每项标注【全新建设】或【增强现有】。

### 4.1 M1 语义层与指标中心【全新建设 · 最高优先级】

**定位**：DataGear 的"指标唯一事实源"。在现有数据集之上定义维度、度量、指标与业务术语，统一供给图表、报表、看板、告警、问数与外部 API。参照 Looker LookML 的集中管控思想、Superset 数据集语义层的轻量形态、Metabase Metrics 的易用性，以及 Kyligence Zen/观远 Metrics 的国内落地形态。

| 编号 | 功能点 | 说明 |
| --- | --- | --- |
| FR-SEM-01 | 维度/度量定义 | 在数据集字段上声明维度（时间/地区/组织等，支持层级）与度量（聚合方式：SUM/AVG/COUNT/MAX/MIN/COUNT_DISTINCT），复用 `FR-MODEL-01` 字段定义体系 |
| FR-SEM-02 | 指标定义 | 原子指标（度量+聚合）、派生指标（四则运算/同比/环比/占比/累计，对标 dbt 的 simple/ratio/cumulative/derived 四类）；含名称、口径说明、业务归属、负责人 |
| FR-SEM-03 | 指标目录与分类 | 按主题域/部门/层级组织指标；指标检索与详情页（口径、血缘、热度） |
| FR-SEM-04 | 业务术语与同义词库 | 字段/指标的同义词、业务用语映射、业务规则说明（对标 Power BI AI data schema 与 FineChatBI 知识配置）——ChatBI 的 grounding 基础 |
| FR-SEM-05 | 指标认证与版本 | 指标"已认证"标记（对标 Metabase Verified / Power BI endorsed）；指标定义版本历史与变更记录 |
| FR-SEM-06 | 指标统一消费 | 图表/报表/看板直接引用指标（替代手写聚合）；指标卡片组件（数值+同环比+迷你趋势，落实 V1 FR-HOME-13/FR-DISP-03） |
| FR-SEM-07 | 指标关注与个人中心 | 用户"关注"指标后在首页呈现关注指标动态（对标 Tableau Pulse 的形，不取 AI） |
| FR-SEM-08 | 指标开放 API | 指标定义与取数以 REST API 对外供给（headless 形态），为数据 API 服务（FR-EXCH-04）与 MCP 提供底座 |
| FR-SEM-09 | 指标级血缘 | 指标 ← 数据集 ← 数据源的正向血缘与指标 → 图表/报表/看板/告警的反向血缘（落实 V1 FR-GOV-11~13 的可落地子集） |

**技术要点**：新增 `datagear-semantics` 子模块（或并入 `datagear-analysis`）；指标查询引擎将"指标 + 维度 + 过滤"编译为参数化 SQL（复用 Freemarker 参数化与 `${pc()}` 预编译机制）；实体存储入系统库（Derby/MySQL），DDL 走 `DATAGEAR_VERSION` 版本化升级。

### 4.2 M2 AI 增强分析（ChatBI）【全新建设 · 可插拔模块】

**定位**：对标 FineChatBI 的 Text2DSL 与 SQLBot 的可插拔形态。大模型仅负责意图理解与拆解，查询经由"语义层 grounding + DSL 中间层"确定性执行，全程继承行列级权限。

| 编号 | 功能点 | 说明 |
| --- | --- | --- |
| FR-AI-01 | 智能问数（对话式取数） | 自然语言提问 → 意图识别 → 生成中间 DSL（指标/维度/筛选/排序/时间窗的结构化指令）→ 经指标查询引擎确定性执行 → 图表+数据+自然语言结论三段式回答 |
| FR-AI-02 | 问数知识库 | 基于 FR-SEM-04 术语库 + RAG：业务用语、同义词、业务规则、金标准问答对（golden queries，对标 Looker Conversational Analytics）；支持管理员维护"认证答案"（对标 Power BI Verified answers） |
| FR-AI-03 | 查询透明化 | 展示"用了哪些指标/筛选条件"（对标 Copilot 的核验展示），支持一键转为图表/看板继续分析 |
| FR-AI-04 | 多轮追问与澄清 | 上下文管理；歧义时主动追问（时间范围？哪个地区？） |
| FR-AI-05 | AI 数据解读 | 对任意图表/指标卡一键生成自然语言解读（趋势、占比、异常点说明） |
| FR-AI-06 | 归因分析 | 指标波动多维贡献度拆解（哪个维度/成员贡献最大），输出归因结论（对标 FineChatBI/Quick BI 波动归因） |
| FR-AI-07 | AI 自动报告 | 按模板把一组图表/指标生成可编辑的分析报告（文字+图），可导出 |
| FR-AI-08 | 模型接入配置 | BYO-LLM：OpenAI 兼容接口配置（DeepSeek/Qwen/GLM/私有部署模型）；模型 Key 加密存储；按功能点指定模型 |
| FR-AI-09 | AI 权限继承 | 问数与解读严格走现有授权体系 + 行/列级数据权限（FR-AUTH-10/11），敏感字段脱敏后出域 |
| FR-AI-10 | 问数嵌入 | 问数对话框可嵌入第三方系统（复用 FR-EMBED 签名 Token），对标 SQLBot 嵌入 n8n/Dify |

**技术要点**：独立模块 `datagear-ai`（可选部署，不污染核心）；DSL 直接映射 FR-SEM 指标模型与 DataSet 参数模型；大模型调用经 HTTP 客户端 + 提示词模板外置；无 LLM 配置时模块自动隐藏，保证开源核心零依赖。

### 4.3 M3 数据告警与订阅推送【全新建设 · 高性价比】

**定位**：对标 Metabase/Superset 告警与 Power BI Data Activator 的轻量子集。V1 的 FR-EXCH-11~13（订阅推送）并入本模块统一设计。

| 编号 | 功能点 | 说明 |
| --- | --- | --- |
| FR-ALERT-01 | 指标阈值告警 | 对指标设阈值规则（高于/低于/变化率超过），定时检测触发通知 |
| FR-ALERT-02 | 图表/看板告警 | 对图表度量轴设数据驱动告警（对标 Tableau data-driven alerts） |
| FR-ALERT-03 | 通知渠道 | 邮件、Webhook（通用 HTTP 回调，可对接钉钉/企微/飞书机器人）；站内信 |
| FR-ALERT-04 | 看板/报表订阅 | 按 cron 定时生成看板/报表快照（图片/PDF/Excel）并推送（落实 V1 FR-RPT-13、FR-EXCH-13） |
| FR-ALERT-05 | 告警历史与静默 | 告警记录、触发历史、静默期与去重 |
| FR-ALERT-06 | 调度框架 | 引入 Quartz（或 Spring Scheduling + 持久化任务表）支撑告警/订阅/报表定时任务；任务管理 UI（启停、执行日志、失败重试） |

**技术要点**：调度框架是后续填报审批、数据抽取、报表定时的公共基建，**必须先建**；邮件模块基于 Spring Mail + 系统配置外置；快照渲染可用无头浏览器（服务端）对看板 URL 截图。

### 4.4 M4 嵌入式分析与开放 API【增强现有（FR-EXCH 深化）】

**定位**：把现有"分享密码 + iframe"升级为对标 Metabase 签名嵌入 / Superset Guest Token 的三层开放体系，支撑 T5（Headless/MCP）。

| 编号 | 功能点 | 说明 |
| --- | --- | --- |
| FR-EMBED-01 | 签名 Token 嵌入 | 第三方系统用共享密钥签发有时效的 JWT（含用户标识与参数），免登访问指定看板/报表/图表；权限按签名内容生效 |
| FR-EMBED-02 | 行级权限透传 | Token 中携带的用户/组织属性自动套用时数据行级过滤（依赖 FR-AUTH-10 落地） |
| FR-EMBED-03 | Embed JS SDK | 轻量 JS 库：`DataGearEmbed.render(dom, {resource, token, theme, params})`，隐藏 DataGear 品牌元素（白标） |
| FR-EXCH-04' | 数据 API 服务（深化） | 数据集/指标发布为 REST API：API Key/Token 鉴权、按 Key 限流配额、调用日志与监控、自动生成文档与示例（cURL/JS/Python） |
| FR-EMBED-04 | MCP Server（前瞻） | 以 MCP 协议暴露"列指标/查指标/取数据集"工具，让 Claude/Cursor 等 AI Agent 直接消费 DataGear 语义层（对标 Metabase/ThoughtSpot MCP） |
| FR-EMBED-05 | 开放看板 API 2.0 | 落实 Roadmap 待定项：dashboardRuntime 开放 API 变量、`registerMap()/registerLib()/registerLibStore()`，使看板可编程整合至第三方前端 |

**技术要点**：在 Spring Security 过滤链中新增 Token 认证通道（与会话认证并存）；现有 46 个 Controller 的 JSON 端点可分级开放；限流用 Caffeine 计数 + 滑动窗口即可起步。

### 4.5 M5 自助数据准备与组合数据集【增强现有（FR-MODEL 深化）】

**定位**：对标 Metabase 查询构建器与 Superset 虚拟数据集，落实 V1 FR-MODEL-02/03/05 与 Roadmap 的 CombineDataSet，但**明确不做独立重型 ETL**。

| 编号 | 功能点 | 说明 |
| --- | --- | --- |
| FR-PREP-01 | 可视化查询构建器 | 不写 SQL：选表/字段 → 过滤 → 聚合分组 → 排序 → 生成数据集；可随时切换 SQL"逃生舱" |
| FR-PREP-02 | 组合数据集 | 落实 Roadmap 待定项：多数据集经 SQL 连接/选取生成新数据集（CombineDataSet）；支持跨数据源（经内置计算引擎落地，见技术要点） |
| FR-PREP-03 | 数据集内转换步骤 | 在数据集上叠加轻量步骤：过滤、派生列（表达式）、去重、排序、透视、行列转换；步骤可回溯可编辑（对标 Power Query 步骤模型的轻量子集） |
| FR-PREP-04 | 虚拟数据集 | 任意 SQL（含参数模板）上升为可复用、可认证的数据集，支持缓存超时配置（对标 Superset 虚拟数据集） |
| FR-PREP-05 | 数据集级缓存策略 | 按数据集配置缓存超时与失效规则；热点查询结果缓存可观测（命中率） |

**技术要点**：跨源组合查询可引入嵌入式计算引擎（DuckDB/Calcite 二选一，DuckDB 对文件+JDBC 混合查询友好且单进程嵌入轻量），与"不做重型 ETL"边界一致。

### 4.6 M6 协作与内容治理【全新建设 · 低成本高感知】

| 编号 | 功能点 | 说明 |
| --- | --- | --- |
| FR-COLLAB-01 | 资源版本历史 | 看板/图表/报表/数据集的保存即快照，版本列表、回滚、（后期）diff（对标 Tableau 修订历史） |
| FR-COLLAB-02 | 内容认证 | 管理员对看板/数据集/指标打"已认证"标记，列表与搜索优先展示（对标 Metabase Verified） |
| FR-COLLAB-03 | 标签与收藏体系 | 资源标签、按标签筛选；收藏/最近访问（落实 V1 FR-HOME-09/10） |
| FR-COLLAB-04 | 评论与批注 | 看板/报表级评论与 @提醒（可后置） |
| FR-COLLAB-05 | 使用分析 | 资源访问热度统计（谁在看什么），辅助内容运营与资产推荐（FR-HOME-21） |

### 4.7 M7 实时 OLAP 与信创适配【增强现有（数据源深化）】

| 编号 | 功能点 | 说明 |
| --- | --- | --- |
| FR-RT-01 | 实时 OLAP 方言优化 | Doris/StarRocks/ClickHouse/Elasticsearch 的 SQL 方言、分页、函数映射专项适配；查询下推验证 |
| FR-RT-02 | 实时刷新增强 | 图表/看板定时刷新 + WebSocket 推送通道（落实 V1 FR-STREAM-02/03） |
| FR-RT-03 | 流式数据源（后置） | Kafka/MQTT 接入（V1 FR-STREAM-01），依赖调度与推送基建 |
| FR-XC-01 | 信创数据库适配矩阵 | 达梦/人大金仓/GaussDB/GBase/OceanBase/TiDB 的方言与 JDBC 驱动验证矩阵，附性能基准（非仅连通性） |
| FR-XC-02 | 信创环境验证 | 麒麟/统信 UOS + 国产中间件 + 国产浏览器的兼容性验证清单与自动化冒烟 |
| FR-XC-03 | 国密支持（可选） | 传输/存储国密算法适配，政企投标加分项 |

### 4.8 M8 交付与部署增强【全新建设 · 低成本】

| 编号 | 功能点 | 说明 |
| --- | --- | --- |
| FR-DELIV-01 | 官方 Docker 镜像 | Dockerfile + docker-compose（app + MySQL），落实 Roadmap"待研究"项；配置全部环境变量化 |
| FR-DELIV-02 | 备份恢复工具 | 系统库 + DATAGEAR_HOME 的一键备份/恢复脚本（落实 V1 FR-STORE-14/15 的可落地子集） |
| FR-DELIV-03 | 项目导入导出 | 落实 Roadmap 待定项：项目（数据集/图表/看板）打包导出/导入，支撑环境间迁移与模板分发（V1 FR-EXCH-03） |
| FR-DELIV-04 | 版本升级向导 | 跨版本升级检查清单与回滚说明 |

---

---

## 5. 二次开发方向与路径（本文档核心）

### 5.1 优先级矩阵

> 评分维度：用户价值（刚需度）、实现成本（人周，1 名熟悉 DataGear 的工程师估算）、战略依赖（是否为其他能力地基）。

| 优先级 | 需求 | 价值 | 估算成本 | 依赖/备注 |
| --- | --- | --- | --- | --- |
| **P0** | FR-ALERT-06 调度框架 + 邮件模块 | 高（基建） | 2–3 人周 | 告警/订阅/报表定时/数据抽取全部依赖 |
| **P0** | FR-EMBED-01/03 签名 Token 嵌入 + JS SDK | 高 | 3–4 人周 | 开源用户最高频诉求；仅依赖现有授权体系 |
| **P0** | FR-SEM-01/02/03/06 指标中心最小闭环 | 高 | 6–8 人周 | 一切 AI/告警/开放 API 的地基 |
| **P0** | FR-DELIV-01 Docker 镜像 | 中-高 | 0.5–1 人周 | 无依赖，立即降低部署门槛 |
| **P1** | FR-SEM-04/05/08/09 术语库/认证/开放 API/血缘 | 高 | 4–6 人周 | 依赖 P0 指标中心 |
| **P1** | FR-ALERT-01~05 告警与订阅推送 | 高 | 3–4 人周 | 依赖调度框架 + 指标中心 |
| **P1** | FR-EXCH-04' 数据 API 服务 | 高 | 3–4 人周 | 依赖指标开放 API；鉴权与限流 |
| **P1** | FR-AUTH-10/11 行/列级数据权限 | 高 | 5–8 人周 | 权限模型扩展；嵌入透传/问数/脱敏依赖 |
| **P1** | FR-RT-01 实时 OLAP 方言优化 | 中-高 | 2–4 人周 | 纯数据源插件工作，可并行 |
| **P1** | FR-DELIV-03 项目导入导出 | 中 | 2–3 人周 | 模板市场/环境迁移前置 |
| **P2** | FR-AI-01~04/08/09 智能问数 V1 | 高 | 8–12 人周 | 依赖语义层 + 术语库 + 行列权限 |
| **P2** | FR-PREP-01/02/04 查询构建器/组合数据集/虚拟数据集 | 高 | 6–10 人周 | 自助分析主线；可与问数并行 |
| **P2** | FR-COLLAB-01/02/03/05 版本历史/认证/标签/使用分析 | 中 | 3–5 人周 | 低成本高感知，插空实施 |
| **P2** | FR-AI-05/06 AI 解读与归因 | 中-高 | 4–6 人周 | 依赖问数链路 |
| **P2** | 拖拽式看板设计器深化（dashboardEditor 真拖拽） | 高 | 8–12 人周 | Roadmap 待定项；前端投入大 |
| **P3** | FR-AI-07/10 AI 报告/问数嵌入/MCP（FR-EMBED-04） | 中 | 4–8 人周 | 生态卡位 |
| **P3** | 复杂报表与填报（V1 FR-RPT/FR-FILL） | 高（国内刚需） | 15–25 人周 | 工程量最大；建议作为商业化增值包单独立项 |
| **P3** | 大屏设计器 / 移动端 H5 深化 | 中 | 8–15 人周 | 跟随拖拽设计器成果复用 |
| **P3** | FR-RT-03 流式数据源 / FR-XC-02/03 信创全栈验证 | 中 | 视项目 | 项目驱动（按投标/客户要求触发） |

### 5.2 分阶段 Roadmap

#### Phase 0：基建期（约 1.5 个月）——「先修路」

**目标**：补齐所有后续能力依赖的公共基建，并快速交付两个低本高效能力。

| 工作包 | 内容 | 对应需求 | 验收标准 |
| --- | --- | --- | --- |
| 调度与邮件基建 | 引入 Quartz（持久化 JobStore 到系统库）；任务管理 UI；Spring Mail 配置与发送服务 | FR-ALERT-06 | 可配置 cron 任务并执行，失败重试与日志可查；邮件可发送 |
| 签名 Token 嵌入 | JWT 签发/校验过滤器 + Embed JS SDK + 白标参数 | FR-EMBED-01/03 | 第三方页面免登嵌入看板，签名过期/篡改被拒，权限正确生效 |
| Docker 交付 | Dockerfile + compose + 环境变量化配置 | FR-DELIV-01 | 一条命令启动可用实例，外置 MySQL 可配 |
| 权限模型扩展设计 | 行/列级权限的数据模型与 SQL 改写方案设计（先行设计，Phase 1 实施） | FR-AUTH-10/11 | 设计评审通过，兼容现有 Authorization 四档模型 |

#### Phase 1：语义层期（约 2–2.5 个月）——「打地基」

**目标**：建成指标中心最小闭环并对外供给，同时落地告警订阅与数据 API。

| 工作包 | 内容 | 对应需求 | 验收标准 |
| --- | --- | --- | --- |
| 指标中心内核 | 维度/度量/指标定义、目录、指标查询引擎（编译为参数化 SQL）、指标卡片组件 | FR-SEM-01/02/03/06 | 定义指标后可在看板引用并正确出数；同环比可算 |
| 术语库与认证 | 同义词/业务用语维护；指标认证与版本 | FR-SEM-04/05 | 术语可被检索；认证标记全局可见 |
| 指标开放 API + 数据 API 服务 | API Key 鉴权、限流、调用日志、自动文档 | FR-SEM-08、FR-EXCH-04' | 外部系统凭 Key 调指标/数据集 API，超限被限流 |
| 行/列级权限实施 | 行过滤规则（按组织/字段值）、列掩码，贯穿数据集查询 | FR-AUTH-10/11 | 不同用户查同一图表行集不同；敏感列按角色隐藏 |
| 告警与订阅 | 阈值告警、看板订阅快照推送（邮件/Webhook） | FR-ALERT-01~05 | 阈值触发收到邮件/Webhook；订阅看板按时送达 |
| 实时 OLAP 方言 | Doris/StarRocks/ClickHouse 方言与驱动验证 | FR-RT-01 | 三类引擎常用图表查询正确下推，性能基准归档 |

#### Phase 2：智能分析期（约 2.5–3 个月）——「上台阶」

**目标**：交付可插拔智能问数 V1 与自助分析主线，形成对外传播点。

| 工作包 | 内容 | 对应需求 | 验收标准 |
| --- | --- | --- | --- |
| 智能问数 V1 | Text2DSL 链路（意图→DSL→指标引擎执行）、问数知识库（术语+golden queries）、查询透明化、多轮澄清、BYO-LLM 配置、权限继承 | FR-AI-01/02/03/04/08/09 | 配置 DeepSeek/Qwen 后，基于已认证指标的 50 个标准业务问题准确率 ≥ 85%；越权问题被拒 |
| 自助查询构建器 + 组合数据集 | 可视化构建器、CombineDataSet（DuckDB/Calcite 嵌入）、虚拟数据集 | FR-PREP-01/02/04 | 业务用户零 SQL 出图；跨 MySQL+Excel 组合数据集可查 |
| AI 解读与归因 | 图表一键解读、指标波动归因 | FR-AI-05/06 | 解读结论与数据一致；归因给出 Top 贡献维度 |
| 内容治理 | 版本历史/回滚、内容认证、标签、使用分析 | FR-COLLAB-01/02/03/05 | 看板可回滚到任意快照；认证内容搜索优先 |
| 项目导入导出 | 项目打包迁移、模板分发 | FR-DELIV-03 | 项目在 A 环境导出 B 环境导入可用 |

#### Phase 3：生态与纵深期（3 个月以上，按商业策略裁剪）

- **Agentic 演进**：指标监控→异常检测→归因→推送的主动洞察（FR-AI 扩展，对标观远洞察 Agent / Tableau Pulse）；MCP Server（FR-EMBED-04）；AI 报告（FR-AI-07）。
- **设计器纵深**：dashboardEditor.js 真拖拽改造（Roadmap 待定项）、大屏设计器、复杂报表与填报（建议作为**企业版增值包**立项，对标 DataEase X-Pack 模式：开源核心保持轻量，增值能力商业化）。
- **信创纵深**：全栈适配验证与性能报告（项目驱动）。
- **移动深化**：H5 门户 + 订阅推送 + 扫码/拍照填报（跟随填报模块）。

### 5.3 路径决策逻辑（为什么是这个顺序）

1. **调度/嵌入/Docker 先行**：成本最低、所有后续模块依赖调度，且嵌入与 Docker 立即改善开源用户获取与集成体验（对标 Metabase 的成功要素）。
2. **语义层先于 AI**：国内外调研一致结论——无语义层的 ChatBI 等于"演示玩具"（AtScale 基准：无 grounding 错误率约 80%）；指标中心同时反哺告警、开放 API、首页，一次投入四处受益。
3. **告警/订阅/API 紧跟语义层**：三者都消费指标模型，打包建设边际成本最低，且都是"可感知、可演示"的刚需能力。
4. **问数 V1 放在 Phase 2**：此时语义层、术语库、行列权限均已就位，问数可做到"可解释、可干预、可认证"，避免裸 NL2SQL 的信任崩塌。
5. **报表/填报压轴且商业化**：工程量最大（15–25 人周）且是国内公认付费点（DataEase 将填报放入收费 X-Pack），适合作为企业版锚点而非开源核心的早期负担。

---

## 6. 非功能需求增补（在 V1 基础上）

| 编号 | 需求 | 指标/说明 |
| --- | --- | --- |
| NFR-AI-01 | 问数准确率 | 基于已认证指标与术语库的标准问题集准确率 ≥ 85%（验收门槛）；全部回答可展示取数逻辑 |
| NFR-AI-02 | 模型解耦 | 核心包零 LLM 依赖；未配置模型时 AI 模块完全隐藏、系统可正常运行 |
| NFR-AI-03 | 数据出域安全 | 送大模型的内容经脱敏与最小化裁剪（只送 schema/术语/DSL，不送明细行数据） |
| NFR-SEC-09 | 开放 API 安全 | API Key 加密存储、可吊销；限流防爬；Token 嵌入强制时效与签名 |
| NFR-PERF-06 | 指标查询性能 | 指标查询编译+执行 P95 ≤ 3s（百万级数据经 OLAP 引擎）；缓存命中率可观测 |
| NFR-COMPAT-01 | 信创兼容 | 达梦/人大金仓/GaussDB 适配验证通过；麒麟/UOS + 国产浏览器冒烟通过 |
| NFR-DELIV-01 | 部署极简 | 保持"单 war/Docker 单容器 + 内置 Derby"开箱即用底线不被新模块破坏；AI/填报等均为可选装配 |

---

## 7. 风险与决策点

| # | 风险/决策点 | 影响 | 建议 |
| --- | --- | --- | --- |
| R1 | 前端栈混杂（jQuery + Vue3 + PrimeVue + Freemarker） | 拖拽设计器/问数 UI 等重交互开发效率低 | 新模块一律 Vue3 组件化，老页面渐进迁移；不强推全量重构 |
| R2 | Java 8 / Spring Boot 2.7 技术债 | DuckDB、部分 LLM SDK 需要更高 JDK | 问数等可选模块可要求 Java 17+，核心保持 8；或启动 JDK 升级专项（需评估） |
| R3 | 跨源组合查询引擎选型（DuckDB vs Calcite） | 影响组合数据集与问数能力上限 | 概念验证后定：DuckDB 轻量但 JVM 集成经 JNI；Calcite 纯 Java 但更重 |
| R4 | ChatBI 准确率达不到验收线 | 传播点变槽点 | 坚持 DSL 路线 + golden queries + 认证答案三重兜底；未达标不发布 |
| R5 | 范围蔓延（V1 规划项过多） | 交付失焦 | 以本文档 5.1 优先级矩阵为准；报表/填报/大屏/移动端明确后置 |
| R6 | 开源与商业化的边界 | 社区信任与收入 | 参照 DataEase：核心（语义层/告警/嵌入/问数基础版）开源，填报/复杂报表/审计/信创认证做企业版 |

---

## 附录 A：V2 与 V1 的章节映射

| V1 章节 | V2 处理 |
| --- | --- |
| 数据接入 / 数据存储 | 维持，M7 深化实时与信创适配 |
| 数据治理 | 指标管理升级为 M1 语义层与指标中心（最高优先级）；血缘收敛为指标级血缘（FR-SEM-09）先行 |
| 数据处理与建模 | M5 深化（组合数据集/虚拟数据集/查询构建器） |
| 数据展示 / 下钻交互 | 维持；拖拽设计器列入 Phase 2/3 |
| 移动端 | 降级为 H5 深化（Phase 3），原生 App 不做 |
| 统计报表 / 数据填报 | 维持需求描述，实施后置至 Phase 3，建议商业化 |
| 系统管理 | 增补 FR-AUTH-10/11 行列级权限实施路径（Phase 1） |
| 数据交换及分享 | 升级为 M3（告警订阅）+ M4（嵌入与开放 API） |
| 综合首页 | 增补指标关注动态（FR-SEM-07）、认证内容优先（FR-COLLAB-02） |

## 附录 B：主要参考资料

- Looker 语义层与 Modeler：7wData(https://7wdata.be/company/looker/)
- Power BI Copilot 与 AI-ready 语义模型：Rollstack(https://www.rollstack.com/articles/power-bi-ai-best-practices)、Bismart(https://blog.bismart.com/en/ai-ready-semantic-model-copilot-power-bi)
- Tableau Pulse / Metrics Layer：Tableau 官方博客(https://www.tableau.com/blog/tableau-metrics-and-natural-language-query-evolve-tableau-pulse)
- ThoughtSpot Spotter 架构与 OSI：GitHub OSI 调研(https://github.com/bitol-io/tsc/blob/main/rfcs/approved/odcs-v3.2.0/0038-context.md)
- OSI 语义互换标准：Datus(https://datus.ai/blog/open-semantic-interchange-osi/)
- Superset 语义层与 Feature Flags：Preset(https://preset.io/blog/understanding-superset-semantic-layer/)、Superset 官方文档(https://superset.apache.org/admin-docs/configuration/feature-flags/)
- Metabase（Data Studio / Metabot / MCP / 嵌入）：Metabase 官网(https://www.metabase.com/releases-ai)
- 帆软 FineChatBI Text2DSL 与更新日志：甲子光年(http://mp.weixin.qq.com/s?__biz=MzU5OTI0NTc3Mg==&mid=2247534103&idx=2&sn=240019fbded4ad7f60d95fb0cb1046b6)、帆软帮助文档(https://help.fanruan.com/finebi6.X/doc-view-2594.html)
- Quick BI 智能小Q：阿里云帮助中心(https://help.aliyun.com/zh/quick-bi/product-overview/introduction-to-quick-bi-1)
- 观远 ChatBI/Metrics/洞察 Agent：IT之家(https://www.ithome.com/0/810/529.htm)
- Smartbi AIChat 白泽：与非网(https://www.eefocus.com/article/1878394.html)
- 永洪 Megrez 天权 NL2Skill：亿欧(https://www.iyiou.com/news/202512311118533)
- Kyligence Zen/Copilot：数智前线(http://mp.weixin.qq.com/s?__biz=MzkwNDMyOTA1NA==&mid=2247488161&idx=1&sn=080a01952a335331502536f1aa6c9470)
- DataEase / SQLBot：OSCHINA(https://my.oschina.net/u/4736111/blog/18695592)
- 中国 BI 市场（IDC）：安全内参(https://www.secrss.com/articles/81495)
- 信创适配要求：Worktile(https://worktile.com/kb/p/3996017)
- DataGear 代码事实：本地代码库 `pom.xml`、`README.md`、`Roadmap.txt` 及各模块源码盘点（见第 2 节证据列）

---

> 本文档与 V1《PRD-BI产品需求文档》、《SDS-软件设计说明书》配套使用：V1 定义完整能力蓝图，V2 定义深化方向与实施路径，SDS 定义技术实现细节。
