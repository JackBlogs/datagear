**以下是项目的架构图和详细解释：**

```
+--------------------------------------------------------------------------------------------------+
|                                        DataGear 应用程序                                         |
|                                        (datagear-webapp)                                        |
|                                      (部署/打包模块)                                              |
+--------------------------------------------------------------------------------------------------+
        |
        |  依赖 / 打包
        V
+--------------------------------------------------------------------------------------------------+
|                                          Web 层                                                |
|                                        (datagear-web)                                          |
|                          (UI, REST API, 集成所有核心功能)                                        |
+--------------------------------------------------------------------------------------------------+
        |
        |  依赖
        V
+--------------------------------------------------------------------------------------------------+
|                                      核心业务逻辑层                                            |
|  +----------------------+  +----------------------+  +----------------------+  +----------------+ |
|  |     数据持久化       |  |     数据交换         |  |     数据分析         |  |     管理       | |
|  | (datagear-persistence) |  | (datagear-dataexchange)|  | (datagear-analysis)  |  | (datagear-management)| |
|  |    (DAO, 实体)       |  | (导入/导出, CSV,     |  | (报表, 图表,        |  | (用户, 角色,   | |
|  |                      |  |     Excel, JSON)     |  |     数据可视化)      |  |   设置)        | |
|  +----------------------+  +----------------------+  +----------------------+  +----------------+ |
+--------------------------------------------------------------------------------------------------+
        |
        |  依赖 (持久化, 连接, 分析等)
        V
+--------------------------------------------------------------------------------------------------+
|                                      基础服务层                                                |
|  +----------------------+  +----------------------+  +----------------------+                    |
|  |     元数据           |  |     连接             |  |     工具类           |                    |
|  | (datagear-meta)      |  | (datagear-connection)|  | (datagear-util)      |                    |
|  | (数据模型)           |  | (JDBC, 连接池)       |  | (通用辅助方法)       |                    |
|  |                      |  |                      |  |                      |                    |
|  +----------------------+  +----------------------+  +----------------------+                    |
+--------------------------------------------------------------------------------------------------+
```
---
**每个工程的作用及关系分析：**
1.  **datagear-util (工具类模块)**
    *   **作用**: 提供项目中通用的工具类、辅助方法、常量定义等，是整个项目的基础公共模块。
    *   **主要依赖**: `spring-context`。
    *   **关系**: 作为基础模块，几乎所有其他模块都直接或间接依赖于它，提供各种通用功能支持。
2.  **datagear-connection (连接模块)**
    *   **作用**: 负责建立和管理各种数据源（如关系型数据库、文件系统等）的连接，包括连接池的配置和管理。
    *   **主要依赖**: `datagear-util`, `commons-dbcp2` (连接池), `caffeine` (缓存)。
    *   **关系**: 依赖 `datagear-util`。`datagear-meta` 和 `datagear-management` 模块直接依赖它，为其提供数据源连接服务。
3.  **datagear-meta (元数据模块)**
    *   **作用**: 定义了数据结构、数据模型、元数据信息（如表结构、字段类型、数据源信息等），为其他模块提供统一的数据描述。
    *   **主要依赖**: `datagear-util`, `datagear-connection`。
    *   **关系**: 依赖 `datagear-util` 和 `datagear-connection`（因为元数据可能包含数据源连接信息）。`datagear-persistence` 模块依赖它来理解和操作数据结构。
4.  **datagear-persistence (持久化模块)**
    *   **作用**: 处理数据的持久化操作，包括数据访问对象（DAO）、实体映射、事务管理等，提供统一的数据存储和检索接口。
    *   **主要依赖**: `datagear-util`, `datagear-meta`, `spring-expression`, `commons-codec`。
    *   **关系**: 依赖 `datagear-util` 和 `datagear-meta`。`datagear-dataexchange`、`datagear-management` 和 `datagear-web` 模块都依赖它来执行数据操作，是业务逻辑层与数据层交互的核心。
5.  **datagear-dataexchange (数据交换模块)**
    *   **作用**: 负责数据的导入、导出和转换，支持多种数据格式（如CSV、Excel、JSON）。
    *   **主要依赖**: `datagear-util`, `datagear-persistence`, `commons-csv`, `poi`, `poi-ooxml`, `javax.json`。
    *   **关系**: 依赖 `datagear-util` 和 `datagear-persistence`，从持久层获取数据并进行格式转换。
6.  **datagear-analysis (数据分析模块)**
    *   **作用**: 提供数据分析、报表生成、图表展示和数据可视化等功能。它可能处理各种数据源的数据，并将其呈现给用户。
    *   **主要依赖**: `datagear-util`, `jackson-databind`, `freemarker`, `commons-csv`, `poi`, `poi-ooxml`, `httpclient5`, `json-path`。
    *   **关系**: 依赖 `datagear-util`。`datagear-management` 和 `datagear-web` 模块也依赖它来呈现分析结果和构建仪表盘。
7.  **datagear-management (管理模块)**
    *   **作用**: 提供用户管理、权限管理、系统配置管理等核心业务管理功能。它是对其他业务功能进行统一管理和协调的中心。
    *   **主要依赖**: `datagear-connection`, `datagear-persistence`, `datagear-analysis`, `datagear-util`, `mybatis`, `mybatis-spring`, `spring-tx`, `spring-security-crypto`, `jackson-databind`, `spring-context`。
    *   **关系**: 依赖 `datagear-connection`、`datagear-persistence`、`datagear-analysis` 和 `datagear-util`。它整合了其他模块的功能来提供全面的管理界面。
8.  **datagear-web (Web 层模块)**
    *   **作用**: 作为整个应用的用户界面层，处理前端请求，渲染页面（使用FreeMarker模板），提供RESTful API，并将请求转发给下层业务逻辑模块处理。它集成了所有核心业务功能。
    *   **主要依赖**: `datagear-persistence`, `datagear-management`, `datagear-dataexchange`, `datagear-analysis`, `datagear-util` 以及大量Spring Web相关的库 (`spring-webmvc`, `spring-security-web`, `freemarker` 等)。
    *   **关系**: 依赖 `datagear-util`、`datagear-persistence`、`datagear-management`、`datagear-dataexchange` 和 `datagear-analysis`。它是所有业务逻辑的集成点，负责将后端服务暴露给前端用户。
9.  **datagear-webapp (部署模块)**
    *   **作用**: 负责将整个DataGear应用打包成可部署的WAR文件（或可执行JAR），包含Spring Boot的启动配置和必要的运行脚本，是整个应用的最终部署单元。
    *   **主要依赖**: `datagear-web`, `spring-boot-starter`, `spring-boot-starter-web`, `spring-boot-starter-tomcat` (provided), `spring-boot-starter-freemarker`, `spring-boot-starter-security`, `spring-boot-starter-validation`, `spring-boot-devtools`。
    *   **关系**: 仅依赖 `datagear-web`，是整个应用的最终部署单元，将 `datagear-web` 及其所有间接依赖打包在一起。
---
**总结：**
DataGear 项目采用了典型的分层架构，并以Maven多模块项目的形式组织。
*   **最底层是基础服务层**：`datagear-util`、`datagear-connection` 和 `datagear-meta` 提供了通用的工具、数据源连接管理和元数据定义。
*   **向上是持久化层**：`datagear-persistence` 负责数据的存储和检索。
*   **再向上是核心业务逻辑层**：`datagear-dataexchange`、`datagear-analysis` 和 `datagear-management` 实现了具体的功能模块。
*   **顶层是Web层**：`datagear-web` 集成了所有业务逻辑，提供用户界面和API接口。
*   **最外层是部署层**：`datagear-webapp` 负责将整个应用程序打包成可部署的制品。

这种架构设计使得模块之间职责清晰，易于维护和扩展。
