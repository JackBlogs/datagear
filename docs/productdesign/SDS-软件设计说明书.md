# DataGear 软件设计说明书（SDS）

> 本文档基于 DataGear 6.0.0 源码逆向分析整理而成，描述系统的总体架构、模块划分、数据模型、核心流程、接口契约与扩展机制，用于指导二次开发与后续产品演进。

---

## 1. 文档信息

| 项目 | 内容 |
| --- | --- |
| 产品名称 | DataGear（数据可视化分析平台） |
| 版本 | 6.0.0 |
| 文档类型 | 软件设计说明书（SDS / System Design Specification） |
| 架构风格 | 单体应用 + 分层架构（Maven 多模块） |
| 目标读者 | 架构师、后端/前端开发、二次开发与实施工程师 |

---

## 2. 设计概述

### 2.1 设计目标

1. **轻量单体、私有化**：Java 8+ 单进程运行，内嵌 Tomcat，开箱即用。
2. **分层解耦、可替换**：九模块自底向上依赖，层间通过接口耦合，支持按层扩展。
3. **数据源无关**：通过 JDBC 抽象 + 方言（Dialect）+ 元信息解析器（MetaResolver）屏蔽数据库差异。
4. **插件化扩展**：图表能力插件化、数据源驱动运行时加载。
5. **安全内建**：功能权限 + 行级数据权限 + SQL 防注入 + 敏感信息加密 + 日志脱敏。

### 2.2 设计原则

- **单一职责**：每模块职责边界清晰（连接/元信息/持久化/交换/分析/管理/表现）。
- **依赖倒置**：上层依赖下层抽象接口（如 `DataSet`、`Dialect`、`DBMetaResolver`）。
- **约定优于配置**：目录约定（驱动/插件/看板/数据集文件目录）降低配置成本。
- **版本化演进**：内置库 DDL 版本化自动升级（`DATAGEAR_VERSION`）。

---

## 3. 总体架构设计

### 3.1 技术栈

| 层次 | 技术 |
| --- | --- |
| 后端框架 | Spring Boot 2.7.18、Spring MVC、Spring Security、Spring Cache（Caffeine） |
| ORM/持久化 | MyBatis 3.3.1（mybatis-spring 1.3.1）、JdbcTemplate |
| 模板 | Freemarker（页面 + 数据集模板） |
| 内置库 | Apache Derby（可选 MySQL） |
| 序列化 | Jackson、JSON-P（javax.json）、JsonPath |
| 文件 | Apache POI（Excel）、Commons CSV、Commons FileUpload、Commons DBCP2 |
| HTTP 客户端 | Apache HttpClient 5 |
| 前端 | jQuery、Vue3、PrimeVue、CodeMirror、ECharts、DataTables、PrimeFlex/PrimeIcons |
| 构建 | Maven 多模块，编译目标 Java 1.8 |

### 3.2 模块划分与依赖

| 模块 | 定位 | 依赖（内部） |
| --- | --- | --- |
| `datagear-util` | 基础层：工具/缓存/资源/SQL 校验/分页/i18n | 无 |
| `datagear-connection` | 连接层：JDBC 驱动加载/连接创建 | util |
| `datagear-meta` | 连接层：数据源元信息解析 | util, connection |
| `datagear-persistence` | 访问层：表数据读写/方言/行映射 | util, meta |
| `datagear-dataexchange` | 引擎层：数据导入/导出 | util, persistence |
| `datagear-analysis` | 引擎层：数据集/图表/看板/图表插件 API | util |
| `datagear-management` | 服务层：用户/角色/权限/数据源/数据集领域与映射 | connection, persistence, analysis, util |
| `datagear-web` | 表现层：控制器/页面/安全/SQL 工作台 | persistence, management, dataexchange, analysis, util |
| `datagear-webapp` | 应用层：启动类与装配 | web |

依赖关系（自底向上）：

```
datagear-webapp
   └─> datagear-web
         ├─> datagear-management ──> datagear-analysis ──> datagear-util
         │        ├─> datagear-persistence ─┐
         │        └─> datagear-connection ──┤
         ├─> datagear-dataexchange ──> datagear-persistence
         ├─> datagear-persistence ──> datagear-meta ──> datagear-connection ──> datagear-util
         └─> datagear-util
```

### 3.3 分层职责

| 层 | 模块 | 职责 |
| --- | --- | --- |
| 应用层 | webapp | 启动（`DataGearApplication`）、外置 WAR（`DataGearServletInitializer`）、装配配置 |
| 表现层 | web | 控制器、Freemarker 页面、安全过滤器、SQL 工作台、数据交换 UI、JSON/格式化扩展 |
| 业务服务层 | management | 领域模型、Service 接口与实现、MyBatis 映射、DDL 版本管理 |
| 分析引擎层 | analysis, dataexchange | 数据集/图表/看板/图表插件抽象；数据导入导出 |
| 数据访问层 | persistence, meta, connection | 表数据读写与方言；表结构元信息；JDBC 驱动与连接 |
| 基础层 | util | 缓存/资源/校验/分页/i18n/表达式/版本 |

### 3.4 部署架构

```
浏览器（桌面/平板/手机/大屏）
   │  HTTP :50401（可 context-path）
   ▼
DataGear 单体应用（Spring Boot + 内嵌 Tomcat，Java 8+）
   ├─ 系统库：Derby（~/.datagear/derby）或 MySQL
   ├─ 驱动目录（~/.datagear/driver）
   ├─ 图表插件目录（~/.datagear/chartPlugin）
   ├─ 看板目录（~/.datagear/dashboard）
   └─ 数据集文件目录（~/.datagear/dataSet）
   │  JDBC（运行时驱动）
   ▼
外部数据源（MySQL / PostgreSQL / Oracle / SQL Server / ClickHouse / 国产库 …）
```

---

## 4. 模块详细设计

### 4.1 datagear-util（基础层）

**职责**：无内部依赖的通用能力底座。

| 包/类 | 职责 |
| --- | --- |
| `cache/` | 缓存抽象：`CacheAware`、`CollectionCacheValue`、`CommonCacheKey` |
| `resource/` | 资源与连接工厂：`ResourceFactory`、`ConnectionFactory`、`DataSourceConnectionFactory` |
| `sqlvalidator/` | SQL 校验：`AbstractSqlValidator`、`InvalidPatternSqlValidator`、`SqlTokenParser`、`DatabaseProfile` |
| `query/` | 分页与查询模型：`Order`、`Paging`、`PagingData`、`KeywordQuery` |
| `html/` | HTML 过滤：`HtmlFilter`、`FilterHandler` |
| `i18n/` | 国际化标签：`Label`、`Labeled`、`LabelUtil` |
| `spel/` | Spring EL 解析：`BaseSpelExpressionParser`、`MapAccessor` |
| `expression/` | 通用表达式求值 |
| `dirquery/`、`version/` | 目录分页查询、版本与更新日志 |
| 顶层 | `Global`（版本/常量）、`IOUtil`、`FileUtil`、`JdbcUtil`、`Sql`、`SqlScriptParser`、`IDUtil`、`AsteriskPatternMatcher` 等 |

**二次开发**：新增通用能力应优先放于此层，保持对上层透明。

### 4.2 datagear-connection（连接层）

**职责**：从指定目录动态加载 JDBC 驱动并创建连接。

| 组件 | 职责 |
| --- | --- |
| `DriverEntity` / `DriverEntityManager` / `XmlDriverEntityManager` | 驱动实体与持久化管理 |
| `PathDriverFactory` / `PathClassLoader` | 从目录/类路径动态加载驱动 |
| `DriverChecker` / `SimpleDriverChecker` | 驱动合法性校验 |
| `ConnectionSource` / `DefaultConnectionSource` / `ConnectionOption` | 连接创建抽象 |
| `URLSensor` 及 `MySqlURLSensor`/`OracleURLSensor`/`PostgresqlURLSensor`/`SqlServerURLSensor`/`DerbyURLSensor` | JDBC URL 探测 |
| `PropertiesProcessor` / `GenericPropertiesProcessor` / `DevotedPropertiesProcessor` | 连接属性处理 |

### 4.3 datagear-meta（元信息层）

**职责**：解析数据源表结构。

| 组件 | 职责 |
| --- | --- |
| `DBMetaResolver` / `GenericDBMetaResolver` / `DevotedDBMetaResolver` / `AbstractDevotedDBMetaResolver` / `WildcardDevotedDBMetaResolver` | 通用/专用元信息解析 |
| 元模型 | `Database`、`Table`、`SimpleTable`、`Column`、`PrimaryKey`、`ImportKey`、`UniqueKey`、`DataType`、`TableType` |
| `TableTypeResolver` / `DefaultTableTypeResolver` / `DbTableTypeSpec` | 表类型解析 |

**二次开发**：新数据库若通用解析不准，扩展 `DevotedDBMetaResolver` 或配置 `dbmeta.tabletypes.*`。

### 4.4 datagear-persistence（访问层）

**职责**：对数据源表数据进行统一增删改查。

| 组件 | 职责 |
| --- | --- |
| `Dialect` / `AbstractDialect` / `DialectBuilder` / `DialectSource` | 屏蔽不同数据库 SQL 差异（分页/标识符/函数） |
| `PersistenceManager` | 数据 CRUD 统一入口 |
| `Query` / `PagingQuery` | 查询模型 |
| `Row` / `RowMapper` / `AbstractRowMapper` / `SqlParamValueMapper` / `LiteralSqlParamValue` | 行映射与参数值处理 |

### 4.5 datagear-dataexchange（数据交换引擎）

**职责**：数据导入/导出。

| 组件 | 职责 |
| --- | --- |
| `DataExchangeService` / `DataExchange` / `BatchDataExchange` / `SimpleBatchDataExchange` / `BatchDataExchangeResult` / `FormatDataExchange` / `SubDataExchange` | 交换服务与批量抽象 |
| `Query` / `SqlQuery` / `TableQuery` / `TextDataExport` / `QueryTextDataExport` / `TextValueDataImport` | 数据源/目标 |
| `support/` 的 `CsvDataImport/Export`、`ExcelDataImport/Export`、`JsonDataImport/Export`、`SqlDataImport/Export` | 格式实现 |
| `DataIndex` / `RowDataIndex` / `RowColumnDataIndex`、`*Listener` | 索引进度与监听 |

**二次开发**：新增格式实现对应的 `*DataImport`/`*DataExport` 并注册。

### 4.6 datagear-analysis（分析引擎，核心）

#### 4.6.1 数据集体系

| 组件 | 职责 |
| --- | --- |
| `DataSet`（接口） | 统一数据集抽象：`getName()`、`isMutableModel()`、`getParams()`、`getResult(DataSetQuery)` |
| `AbstractDataSet` / `AbstractResolvableDataSet` / `AbstractResolvableResourceDataSet` | 抽象基类 |
| `DataSetField` / `DataSetParam` / `DataSetQuery` / `DataSetResult` / `DataSetBind` | 字段/参数/查询/结果/绑定模型 |
| `ResolvableDataSet` / `ResolvedDataSetResult` | 可解析数据集 |
| `support/` 实现 | `SqlDataSet`、`HttpDataSet`、`JsonValueDataSet`、`JsonFileDataSet`、`CsvValueDataSet`、`CsvFileDataSet`、`CsvDirectoryFileDataSet`、`ExcelDataSet`、`JsonDirectoryFileDataSet` |
| `datasettpl/` | 模板解析：`DataSetFmkTemplateResolver`、`SqlDataSetFmkTemplateResolver`、输出格式（SQL/JSON/CSV/XML） |
| `httpresult/` | HTTP 结果处理：`JsonHttpResultHandler`、`TextHttpResultHandler`、`Base64HttpResultHandler` |

**数据契约**：
- `DataSetResult.data`：普通 JavaBean / `Map` / 或其数组、集合；`additions` 承载附加数据。
- 字段支持：`fullname`（嵌套路径）、`type`、`defaultValue`、`evaluated`+`expression`（计算字段）、`array`（数组）。
- 参数类型：`string/boolean/integer/number/object`；输入类型：`text/select/radio/checkbox/textarea/date/time/datetime`。

#### 4.6.2 图表体系

| 组件 | 职责 |
| --- | --- |
| `Chart` / `ChartDefinition` | 图表实例（含 plugin、renderContext、dataSetBinds）与定义 |
| `ChartPlugin`（接口） | 插件抽象：`renderChart()`、`getDataSignSpec()`、`getDataSetRange()`、`getResources()` 等 |
| `ChartPluginManager` / `AbstractChartPluginManager` / `ConcurrentChartPluginManager` / `DirectoryHtmlChartPluginManager` | 插件加载与管理 |
| `ChartQuery` / `ChartResult` / `ChartTheme` | 图表查询/结果/主题 |
| `ChartWidget` / `ChartWidgetSource` / `SimpleChartWidgetSource` | 图表部件与来源 |
| `DataSign` / `DataSignSpec` / `DataSignSpec` | 数据标记 |
| `support/html/` | `HtmlChart`、`HtmlChartPlugin`、`HtmlChartWidget`、`JsChartRenderer`、`HtmlChartPluginLoader`、`HtmlChartPluginJsDefResolver` 等 |

#### 4.6.3 看板体系

| 组件 | 职责 |
| --- | --- |
| `Dashboard` / `DashboardQuery` / `DashboardResult` | 看板实体与查询结果 |
| `DashboardQueryHandler` / `SimpleDashboardQueryHandler` | 查询处理 |
| `TplDashboard` / `HtmlTplDashboard` / `HtmlTplDashboardWidget` | HTML 模板看板 |
| `HtmlTplDashboardWidgetHtmlRenderer` / `HtmlTplDashboardWidgetRenderer` | 渲染器 |
| `RenderContext` / `DefaultRenderContext` / `HtmlRenderContext` / `HtmlTplDashboardRenderContext` | 渲染上下文 |
| `HtmlTplDashboardImport` / `ImportBuilder` / `SimpleHtmlTplDashboardImportBuilder` | 看板导入 |
| `DashboardTheme` / `DashboardThemeSource` / `SimpleDashboardThemeSource` | 主题 |
| `Form` / `FormProperty` / `InputFormProperty` / `Constraint` | 看板表单与约束 |

### 4.7 datagear-management（业务服务层）

**职责**：系统领域模型、业务服务、MyBatis 映射、DDL 版本管理。

#### 4.7.1 领域模型（domain/）

| 实体 | 说明 |
| --- | --- |
| `User` / `Role` / `Authorization` | 用户/角色/授权 |
| `AnalysisProject` | 项目 |
| `DtbsSource` / `DtbsSourceProperty` / `DtbsSourceGuard` / `DtbsSourcePropertyPattern` | 数据源与防护 |
| `DataSetEntity` 及 `SqlDataSetEntity`/`HttpDataSetEntity`/`JsonValueDataSetEntity`/`JsonFileDataSetEntity`/`CsvValueDataSetEntity`/`CsvFileDataSetEntity`/`ExcelDataSetEntity`/`DirectoryFileDataSetEntity` | 各类型数据集实体 |
| `HtmlChartWidgetEntity` / `HtmlTplDashboardWidgetEntity` | 图表/看板实体 |
| `DashboardShareSet` | 看板分享 |
| `FileSource` / `SqlHistory` | 文件源/SQL 历史 |
| 抽象基类 | `AbstractEntity`、`AbstractStringIdEntity`、`CreateUserEntity`、`CreateTimeEntity`、`DataPermissionEntity`、`CloneableEntity` |

#### 4.7.2 服务层（service/、service/impl/）

- `UserService`、`RoleService`、`AuthorizationService`、`DtbsSourceService`、`DataSetEntityService`、`AnalysisProjectService`、`FileSourceService`、`DashboardShareSetService`、`SqlHistoryService` 等。
- `util/`：`DataPermissionSpec`、`DtbsSourceGuardChecker`、方言构建器（`dialect/`）、类型处理器（`typehandlers/`）。
- `dbversion/DbVersionManager`：内置库版本化升级。

#### 4.7.3 持久化映射

- `resources/mapper/*.xml`：MyBatis 映射，含通用数据权限 SQL（`commonDataPermissionSqls.xml`、`commonSqls.xml`）。
- `resources/ddl/datagear.sql`（Derby）与 `datagear-mysql.sql`（MySQL）：建表与版本升级脚本。

### 4.8 datagear-web（表现层）

- **控制器（controller/，40+）**：`UserController`、`RoleController`、`AuthorizationController`、`DtbsSourceController`、`DataSetController`、`ChartController`、`ChartPluginController`、`DashboardController`、`AnalysisProjectController`、`DriverEntityController`、`FileSourceController`、`SqlpadController`、`LoginController`、`RegisterController`、`ResetPasswordController`、`CheckCodeController` 等。
- **安全（security/）**：`AuthUser`、`UserDetailsServiceImpl`、认证成功/失败处理器、`LoginLatchFilter`（登录限流）。
- **SQL 工作台（sqlpad/）**：`SqlpadExecutionService`、`SqlpadExecutionSubmit`。
- **配置（config/、config/support/）**：`SecurityConfigSupport`、`CoreConfigSupport`、`DataSourceConfigSupport`、`SchedulingConfigSupport`、`WebMvcConfigurerConfigSupport`。
- **其它**：`freemarker/`（自定义视图）、`json/jackson/`（序列化扩展）、`format/`、`accesslatch/`（访问限流）、`util/packager/`、`dataexchange/`。

### 4.9 datagear-webapp（应用层）

- `DataGearApplication`（Spring Boot main）、`DataGearServletInitializer`（外置 WAR）。
- 装配：`CoreConfig`、`DataSourceConfig`、`SecurityConfig`、`SchedulingConfig`、`ServletConfig`、`TransactionConfig`、`WebMvcConfigurerConfig`、`WebMvcRegistrationsConfig`、`ApplicationPropertiesConfig`。

---

## 5. 数据模型设计

### 5.1 ER 概览

```
USER ──< ROLE_USER >── ROLE
  │
  └── AUTHORIZATION（资源 × 主体 × 权限）

SCHEMA(数据源) ──< SQL_HISTORY
SCHEMA(数据源) ──< SCHEMA_GUARD(防护)

ANALYSIS_PROJECT ──< DATA_SET ──< DATA_SET_PROP(字段)
                          │
                          ├─< DATA_SET_PAR(参数)
                          ├─< DATA_SET_SQL / _JSON_VALUE / _JSON_FILE / _EXCEL / _CSV_VALUE / _CSV_FILE / _HTTP
                          └─< HCW_DS(图表-数据集绑定)

ANALYSIS_PROJECT ──< HTML_CHART_WIDGET ──< HCW_DS >── DATA_SET
ANALYSIS_PROJECT ──< HTML_DASHBOARD ──< DB_SHARE_SET(分享)

DSR_DIRECTORY(文件源目录) ──< JSON_FILE/EXCEL/CSV_FILE 数据集
```

### 5.2 核心表结构

| 表 | 说明 | 关键列 |
| --- | --- | --- |
| `DATAGEAR_VERSION` | 版本 | `VERSION_VALUE` |
| `DATAGEAR_USER` | 用户 | `USER_ID`(PK)、`USER_NAME`(UK)、`USER_PASSWORD`、`USER_REAL_NAME`、`USER_EMAIL`、`USER_IS_ADMIN` |
| `DATAGEAR_ROLE` | 角色 | `ROLE_ID`(PK)、`ROLE_NAME`、`ROLE_ENABLED` |
| `DATAGEAR_ROLE_USER` | 用户-角色 | `RU_ROLE_ID`、`RU_USER_ID` |
| `DATAGEAR_AUTHORIZATION` | 授权 | `AUTH_RESOURCE`、`AUTH_RESOURCE_TYPE`、`AUTH_PRINCIPAL`、`AUTH_PRINCIPAL_TYPE`、`AUTH_PERMISSION`、`AUTH_ENABLED` |
| `DATAGEAR_SCHEMA` | 数据源 | `SCHEMA_URL`、`SCHEMA_USER`、`SCHEMA_PASSWORD`、`SCHEMA_PROPERTIES`、`SCHEMA_SCHM_NAME`、`DRIVER_ENTITY_ID`、`SCHEMA_SHARED` |
| `DATAGEAR_SCHEMA_GUARD` | 防护 | `SG_NAME`、`SG_PATTERN`、`SG_USER_PATTERN`、`SG_PROP_PATTERNS`、`SG_PERMITTED`、`SG_PRIORITY`、`SG_EMPTY_PPT_FA`、`SG_PROP_MATCH_MODE` |
| `DATAGEAR_SQL_HISTORY` | SQL 历史 | `SQLHIS_SQL`、`SQLHIS_SCHEMA_ID`、`SQLHIS_USER_ID` |
| `DATAGEAR_ANALYSIS_PROJECT` | 项目 | `AP_NAME`、`AP_DESC` |
| `DATAGEAR_DATA_SET` | 数据集（头） | `DS_NAME`、`DS_TYPE`、`DS_AP_ID`、`DS_DATA_FORMAT`、`DS_MUTABLE_MODEL`、`DS_DESC` |
| `DATAGEAR_DATA_SET_PROP` | 字段 | `PROP_NAME`、`PROP_TYPE`、`PROP_LABEL`、`PROP_DFT_VALUE`、`PROP_EVALUATED`、`PROP_EXPRESSION`、`PROP_FULLNAME`、`PROP_ARRAY` |
| `DATAGEAR_DATA_SET_PAR` | 参数 | `PAR_NAME`、`PAR_TYPE`、`PAR_REQUIRED`、`PAR_LABEL`、`PAR_INPUT_TYPE`、`PAR_INPUT_PAYLOAD` |
| `DATAGEAR_DSR_DIRECTORY` | 文件源目录 | `DD_NAME`、`DD_DIRECTORY` |
| `DATAGEAR_DATA_SET_SQL` | SQL 数据集 | `DS_SCHEMA_ID`、`DS_SQL` |
| `DATAGEAR_DATA_SET_HTTP` | HTTP 数据集 | `DS_URI`、`DS_HEADER_CONTENT`、`DS_RQT_METHOD`、`DS_RQT_CONTENT_TYPE`、`DS_RQT_CONTENT`、`DS_RPS_CONTENT_TYPE`、`DS_RPS_DATA_JSON_PATH`、`DS_RPS_ADTND_PROPS` |
| `DATAGEAR_DATA_SET_JSON_VALUE` | JSON 值数据集 | `DS_VALUE`、`DS_DATA_JSON_PATH`、`DS_ADTND_PROPS` |
| `DATAGEAR_DATA_SET_JSON_FILE` | JSON 文件数据集 | `DS_FILE_NAME`、`DS_FILE_ENCODING`、`DS_DATA_JSON_PATH`、`DS_FILE_SOURCE_TYPE`、`DS_DSRD_ID` |
| `DATAGEAR_DATA_SET_EXCEL` | Excel 数据集 | `DS_SHEET_INDEX`、`DS_SHEET_NAME`、`DS_NAME_ROW`、`DS_DATA_ROW_EXP`、`DS_DATA_COLUMN_EXP` |
| `DATAGEAR_DATA_SET_CSV_VALUE` | CSV 值数据集 | `DS_VALUE`、`DS_NAME_ROW` |
| `DATAGEAR_DATA_SET_CSV_FILE` | CSV 文件数据集 | `DS_FILE_NAME`、`DS_FILE_ENCODING`、`DS_NAME_ROW` |
| `DATAGEAR_HTML_CHART_WIDGET` | 图表 | `HCW_PLUGIN_ID`、`HCW_UPDATE_INTERVAL`、`HCW_RD_FORMAT`、`HCW_ATTR_VALUES`、`HCW_OPTIONS`、`HCW_DESC` |
| `DATAGEAR_HCW_DS` | 图表-数据集 | `DS_ID`、`DS_PROPERTY_SIGNS`、`DS_ALIAS`、`DS_ATTACHMENT`、`DS_QUERY`、`DS_PROPERTY_ALIASES`、`DS_PROPERTY_ORDERS`、`DS_DATASET_SIGNS` |
| `DATAGEAR_HTML_DASHBOARD` | 看板 | `HD_TEMPLATE`、`HD_TEMPLATE_ENCODING`、`HD_VERSION`、`HD_DESC` |
| `DATAGEAR_DB_SHARE_SET` | 分享 | `DSS_ENABLE_PSD`、`DSS_ANONYMOUS_PSD`、`DSS_PSD` |

### 5.3 权限值语义（Authorization）

| 权限 | 值域 | 说明 |
| --- | --- | --- |
| 无 | `[0,20)` | `PERMISSION_NONE_START=0` |
| 只读 | `[20,40)` | `PERMISSION_READ_START=20` |
| 编辑 | `[40,60)` | `PERMISSION_EDIT_START=40` |
| 删除 | `[60,99]` | `PERMISSION_DELETE_START=60` |
| 读传递-读 | `20` | 授权资源所表示的子级数据的读取 |
| 读传递-编辑 | `24` | 同上编辑 |
| 读传递-删除 | `28` | 同上删除 |

主体类型：`ALL`（全部）、`ROLE`（角色）、`USER`（用户）、`ANONYMOUS`（匿名）。

---

## 6. 核心流程与关键时序

### 6.1 数据集查询（参数化 SQL）

```
Chart/Dashboard 请求
  → DataSetBind.getResult(DataSetQuery{paramValues})
  → DataSet.getResult(query)
  → AbstractResolvableDataSet.resolve（Freemarker 模板解析）
       SQL: ${param} 文本替换 / ${pc(param)} 预编译占位
  → 连接数据源执行（PreparedStatement / 文件读取 / HTTP 请求）
  → 结果行映射（RowMapper）→ 字段类型转换 → DataSetResult
```

### 6.2 图表渲染

```
ChartWidget + ChartPlugin
  → 解析 DataSetBind 集合（每数据集执行查询）
  → 数据标记（DataSign）将字段映射到插件语义（名称/数值/类别）
  → ChartPlugin.renderChart(chartDefinition, renderContext)
  → HtmlChartPlugin 通过 JsChartRenderer 生成前端脚本
  → 前端 chartFactory / chartSupport 渲染（ECharts 等）
```

### 6.3 看板渲染

```
HtmlTplDashboardWidget.render()
  → 组装 RenderContext（含 dashboardRuntime、charts、loadChartPolicy、apiVersion）
  → HtmlTplDashboardWidgetHtmlRenderer 输出 HTML + JS
  → 前端 dashboardFactory 初始化看板、异步/懒加载图表、联动/钻取
```

### 6.4 登录与鉴权

```
登录请求 → 认证（UserDetailsServiceImpl → AuthUser）
  → LoginLatchFilter（IP/用户名限流）
  → 功能权限（角色）
  → 数据权限（AuthorizationMapper + commonDataPermissionSqls.xml）
  → DataPermissionSpec 注入 DP_* 参数 → SQL 行级过滤（mine/other/all）
```

### 6.5 数据导入/导出

```
DataExchangeService
  → BatchDataExchange / FormatDataExchange
  → Query（SqlQuery/TableQuery）→ 读取源
  → 格式实现（Csv/Excel/Json/Sql）→ 写入目标
  → DataIndex + Listener 报告进度
```

---

## 7. 接口设计

### 7.1 REST/HTTP 接口风格

系统为**服务端渲染（Freemarker）+ JSON 数据接口**混合体，控制器类级 `@RequestMapping("/xxx")` 定义资源路径，方法级定义操作。

| 资源 | 路径前缀 | 典型端点 |
| --- | --- | --- |
| 数据集 | `/dataSet` | `/add/{type}`、`/saveAdd/{type}`、`/edit/{id}`、`/saveEdit/{type}`、`/view/{id}`、`/pagingQueryData`、`/delete`、`/preview/{type}`、`/resolveSql`、`/uploadFile`、`/downloadFile`、`/getProfileDataSetByIds` |
| 数据源 | `/dtbsSource`（及 `.../guard`、`.../sqlpad`、`.../sqlEditor`、`.../urlBuilder`、`.../exchange`、`.../data`） | 增删改查、连接测试、表结构/数据、SQL 执行、防护 |
| 图表 | `/chart` | 增删改查、插件选择、预览 |
| 图表插件 | `/chartPlugin`（及 `.../visualRes`） | 上传、列表、启停 |
| 看板 | `/dashboard`（及 `.../globalRes`、`.../visual`） | 增删改查、展示、分享、全局资源 |
| 项目 | `/analysisProject` | CRUD |
| 授权 | `/authorization` | 增删改查 |
| 用户/角色 | `/user`、`/role` | CRUD |
| 驱动 | `/driverEntity` | 上传、列表 |
| 文件源 | `/fileSource` | CRUD、上传下载 |
| 登录/注册 | `/login`、`/register`、`/resetPassword`、`/checkCode` | 认证相关 |

> 说明：具体端点以 `datagear-web` 各 `*Controller` 源码为准；JSON 接口统一 `produces = CONTENT_TYPE_JSON`。

### 7.2 核心 Java API（二次开发契约）

#### 7.2.1 数据集

```java
public interface DataSet extends DataSetFieldsAware, Identifiable {
    String getName();
    boolean isMutableModel();                 // 返回结构是否可变
    List<DataSetParam> getParams();
    DataSetParam getParam(String name);
    DataSetResult getResult(DataSetQuery query) throws DataSetException;
}
```

- 扩展入口：继承 `AbstractDataSet` 或 `AbstractResolvableDataSet`（支持模板参数化）。

#### 7.2.2 图表插件

```java
public interface ChartPlugin extends Identifiable, Labeled, AdditionsAware {
    List<ChartPluginResource> getResources();
    ChartPluginConfigForm getConfigForm();
    DataSignSpec getDataSignSpec();           // 数据标记声明
    ChartPluginDataSetRange getDataSetRange();// 数据集数量约束
    Chart renderChart(ChartDefinition cd, RenderContext rc);
    String getVersion(); int getOrder();
    List<ChartPluginCategoryInfo> getCategoryInfos();
    String getAuthor(); String getContact(); String getIssueDate();
}
```

#### 7.2.3 数据访问（方言）

```java
public interface Dialect {
    // 分页、标识符引用、类型映射、函数等
}
// 通过 DialectBuilder / DialectSource 获取
```

#### 7.2.4 元信息解析

```java
public interface DBMetaResolver {
    // 解析 Database/Table/Column/PrimaryKey/ImportKey/UniqueKey
}
```

### 7.3 图表插件文件契约

插件为 zip 包：

```
org.example.myChart.zip
├── plugin.json    # 元信息与数据标记声明（见下）
├── renderer.js    # 渲染逻辑（IIFE，接收 plugin，返回渲染对象）
└── icon.png       # 图标
```

`plugin.json` 示例（节选）：

```jsonc
{
  "id": "org.example.myChart",
  "nameLabel": { "value": "我的图表", "localeValues": { "en": "My chart" } },
  "icons": "icon.png",
  "dataSignSpec": [
    { "name": "name", "nameLabel": {"value":"名称"}, "required": true, "multiple": false },
    { "name": "value", "nameLabel": {"value":"数值"}, "required": true, "multiple": true },
    { "name": "category", "nameLabel": {"value":"类别"}, "required": false, "multiple": false }
  ],
  "dataSetRange": 1,
  "version": "1.0.0",
  "order": 200,
  "categoryInfos": { "name": "custom", "nameLabel": {"value":"自定义"} },
  "author": "me",
  "apiVersion": "2.0",
  "platformVersion": ">=6.0"
}
```

`renderer.js` 示例：

```js
(function(plugin) {
    return chartFactory.chartSupport.barRenderer(plugin);
})(plugin);
```

### 7.4 看板前端 JS API（analysisapi 2.0）

| 文件 | 职责 |
| --- | --- |
| `dashboardRuntime.js` | `window.dashboardRuntime`：`registerMap()`、`registerLib(lib)`、`registerLibStore()` |
| `chartFactory.js` | 图表工厂：`registerGlobalLib()`、图表渲染核心 |
| `dashboardFactory.js` | 看板工厂：看板初始化、图表加载/联动 |
| `chartSupport.js` | 各类图表渲染器（`barRenderer` 等） |
| `chartTool.js` | 图表工具函数 |
| `dashboardEditor.js` | 看板编辑器 API |
| `dashboardBuiltinMap.js` | 内置地图 |

---

## 8. 安全设计

### 8.1 认证与授权

- **认证**：Spring Security + `UserDetailsServiceImpl`（`AuthUser`），支持内置管理员 `admin/admin`。
- **授权（功能）**：角色 → URL 权限。
- **授权（数据）**：`Authorization` 行级权限 + `commonDataPermissionSqls.xml` 在查询层注入过滤条件（`DP_*` 参数）。
- **默认私有**：未授权资源不可见，仅创建者与管理员可见。

### 8.2 注入与攻击防护

- **SQL 防注入**：`InvalidPatternSqlValidator` 校验非法关键字（按权限档位）；SQL 数据集 `${pc()}` 预编译。
- **数据源防护**：`DtbsSourceGuard` 阻断恶意 URL/连接属性（如 MySQL `allowLoadLocalInfile`）。
- **HTML 过滤**：`HtmlFilter` 过滤看板模板中的危险内容。
- **登录限流**：`LoginLatchFilter`（IP/用户名）、验证码（`CheckCode`）。

### 8.3 敏感信息保护

- **密码加密**：用户密码 `{sha256}`；数据源/看板分享密码支持 `{noop}`/`{std}` 与可配置 AES 加密（`dtbsSourcePsd.crypto.*`、`dashboardSharePsd.crypto.*`）。
- **日志脱敏**：日志中敏感字段脱敏。

### 8.4 越权防护

- 控制器统一继承 `AbstractController`/`AbstractDataAnalysisController`，在服务层逐资源校验数据权限。

---

## 9. 扩展机制与二次开发指南

### 9.1 接入新数据库

1. 将 JDBC 驱动 jar 上传至 `driverRootDirectory`（或放至类路径）。
2. 如元信息解析不准：扩展 `DevotedDBMetaResolver` 或配置 `dbmeta.tabletypes.*`。
3. 如 SQL 差异：扩展 `Dialect`/`DialectBuilder`。

### 9.2 新增图表类型

1. 编写 `plugin.json` + `renderer.js` + `icon.png`，打包为 zip。
2. 放置至 `chartPluginRootDirectory`（或通过「图表插件管理」上传）。
3. `renderer.js` 返回的渲染对象实现图表渲染逻辑，可复用 `chartFactory`/`chartSupport`。

### 9.3 新增数据集类型

1. 继承 `AbstractDataSet` / `AbstractResolvableDataSet` 实现 `getResult()`。
2. 定义 `DataSetEntity` 子类 + `service` + `mapper` + DDL 专有表。
3. 注册到 `datagear-management` 与 `datagear-web` 的添加/编辑/预览端点。

### 9.4 新增数据交换格式

- 实现 `*DataImport` / `*DataExport`，接入 `DataExchangeService`。

### 9.5 自定义看板能力

- 看板为原生 HTML 模板，可引入 Vue/React 等；通过 `dashboardRuntime`/`chartFactory` 实现联动、钻取、异步加载、表单。
- 看板全局资源：`dashboardGlobalResRootDirectory` + `dashboardGlobalResUrlPrefix`。

### 9.6 配置化扩展

- `application.properties` 覆盖主目录、目录位置、缓存、CORS、登录安全、密码加密、SQL 校验关键字、表类型、端口等（详见源码配置注释）。

### 9.7 新增业务实体（范式）

1. 在 `datagear.sql` 追加建表 + 版本号行（`--version[x.y.z], DO NOT EDIT THIS LINE!`）。
2. 新建 domain 实体 + MyBatis mapper XML。
3. 新建 service 接口/实现。
4. 新建 controller + Freemarker 页面 + 静态脚本。
5. 数据权限：接入 `DataPermissionSpec` 与通用权限 SQL。

---

## 10. 部署设计

### 10.1 运行环境

- Java 8+；Servlet 3.1+。
- 可执行 JAR（`DataGearApplication`）或外置 WAR（`DataGearServletInitializer`）。
- 默认端口 `50401`，支持 `server.servlet.context-path` 二级目录。

### 10.2 工作目录（`DATAGEAR_HOME`，默认 `~/.datagear`）

| 目录/配置 | 用途 |
| --- | --- |
| `derby/` | 内置系统库 |
| `driver/` | 数据源驱动 |
| `chartPlugin/` | 图表插件 |
| `dashboard/` | 看板 |
| `dashboardGlobalRes/` | 看板全局资源 |
| `dataSet/` | 数据集文件 |
| `temp/` | 临时文件 |
| `tomcatworkspace/` | Tomcat 工作目录 |
| `db_url_builder.js` | 数据源 URL 构建器脚本 |

### 10.3 系统库配置

- 默认 Derby（嵌入式）。
- 切换 MySQL：`datasourceDialect=mysql` + `datasource.*`，系统自动使用 `datagear-mysql.sql` 初始化/升级。

### 10.4 构建与打包

```
mvn clean package              # 完整构建（需 MySQL 测试环境）
mvn clean package -DskipTests  # 跳过测试
# 产物：datagear-webapp/target/datagear-[version]-packages/
```

---

## 11. 关键技术决策（ADR 摘要）

| 决策 | 选择 | 理由 |
| --- | --- | --- |
| 架构 | 单体 + 分层多模块 | 轻量私有化、部署简单、维护成本低 |
| 系统库 | 内置 Derby，可选 MySQL | 开箱即用 + 可外置 |
| 图表渲染 | HTML/JS 插件（前端渲染） | 灵活、可扩展、支持任意前端库 |
| 数据集参数化 | Freemarker 模板 + `${pc()}` 预编译 | 灵活 + 防注入 |
| 数据权限 | 授权表 + SQL 行级过滤 | 行级粒度、统一实现 |
| 方言隔离 | `Dialect` 抽象 | 屏蔽多数据库 SQL 差异 |
| 元信息解析 | 通用 + 专用解析器 | 兼顾通用性与特例 |
| 前端 | 服务端渲染 + jQuery/Vue3 混合 | 渐进式、兼顾管理端与看板端 |

---

## 12. 性能与可靠性设计

- **缓存**：Caffeine（`spring.cache.caffeine.spec`，默认 500 条/30 分钟）；数据集结果缓存上限 `dataSetCacheMaxLength`（默认 10000）。
- **连接池**：Commons DBCP2（`datagear-connection`）。
- **分页**：列表与表数据统一分页查询。
- **异步/定时**：`SchedulingConfig`（图表插件刷新、临时目录清理）。
- **SQL 预编译**：`${pc()}` 提升执行效率并复用执行计划。
- **错误处理**：`ErrorController`、`ChartResultError`、`ErrorMessageDashboardResult` 统一错误展示。

---

## 13. 附录

### 13.1 内置图表插件清单（v2 节选）

柱状图/条形图/堆叠/极坐标、折线/面积/阶梯、饼图/环图/玫瑰/嵌套、散点/涟漪/坐标、雷达、漏斗/金字塔、仪表盘/环形/阶梯、桑基、主题河流、树图、矩形树图、旭日图、关系图/环形关系、热力图、地图/散点/涟漪/热力/飞线/线/关系、词云、盒须图、K 线、平行坐标、象形柱状图、标签、自定义、日期时间、表单（select 单选/多选）等（共 70+）。

### 13.2 术语

| 术语 | 含义 |
| --- | --- |
| DtbsSource/Schema | 数据源 |
| DataSet | 数据集 |
| ChartWidget | 图表部件 |
| ChartPlugin | 图表插件 |
| DataSign | 数据标记 |
| Dashboard | 看板 |
| Authorization | 行级数据授权 |
| Dialect | 数据库方言 |
| DBMetaResolver | 元信息解析器 |
| Guard | 数据源防护 |

---

> 本文档与《PRD-产品需求文档》配套：PRD 定义需求与验收，SDS 定义架构、数据模型、接口与扩展落地方式。二次开发应以「模块分层依赖」为准绳，优先通过扩展点（驱动/图表插件/数据集/方言/元信息解析器/看板 API）实现，避免破坏既有稳定 API。
