# DataGear API 契约（api.md 骨架）

> 阶段零交付物。目标形态：浏览器 SPA 调用后端纯 REST API（`/api` 前缀 JSON）。
> 冻结面（`/cv/**`、`/dv/**`、`/checkCode/**`、`/vres/**`、Compat 控制器）**不适用**本文档，维持现状。

---

## 1. 统一响应体

### 1.1 现状（v1 非泛型）

```java
public class OperationMessage {
    MessageType type;   // SUCCESS | FAIL
    String code;        // i18n 消息码
    String message;     // 已解析消息文本
    String detail;      // 详细内容 / 堆栈
    boolean throwableDetail;
    Object data;        // 非泛型
}
```

### 1.2 目标（阶段二：泛型化 `OperationMessage<T>`）

```jsonc
{
  "type": "SUCCESS",          // SUCCESS | FAIL
  "code": "operationSuccess", // i18n 消息码（服务端异常/校验消息）
  "message": "操作成功",       // 已解析文案（前端可直接展示）
  "detail": null,             // 可选，详细/堆栈
  "data": { ... }             // 业务数据，类型随端点而定
}
```

- 后端 `message.properties` **保留**，服务服务端异常/校验消息；前端语言包（vue-i18n）负责界面文案，二者不重叠。
- `type = FAIL` 时前端统一 Toast + reject promise。

---

## 2. 分页约定

### 2.1 现状 `PagingData<T>`

```java
public class PagingData<T> {
    long total;      // 总记录数
    List<T> items;   // 当前页数据
    int pages;       // 总页数
    int page;        // 当前页（1 起）
    int pageSize;    // 每页条数
}
```

### 2.2 目标

- 分页端点统一返回 `OperationMessage<PagingData<T>>`，`data` 即 `PagingData<T>`。
- PrimeVue DataTable 懒加载模式对接：`page`（1 起）、`rows`、`sortField`、`sortOrder`、`multiSortMeta`、`filters`。
- 请求参数沿用现状 `DataFilterPagingQuery`（`page`/`pageSize`/`keyword`/`dataFilter` 等），阶段二在 `/api/{module}/meta` 中声明列定义与默认排序。

---

## 3. HTTP 方法与 `/api` 前缀

- 现状 `@RequestMapping` 多未限定方法（GET/POST 混用）；`/api` 化时**逐端点明确方法**：
  - 查询/元数据：`GET`
  - 新增/修改/删除：`POST` / `PUT` / `DELETE`（与现状 saveAdd/saveEdit/delete 对齐，首期可全 POST 降低迁移摩擦）
  - 上传：`POST multipart/form-data`
  - 下载：`GET`（blob 流式）
- 路径映射：`/role/pagingQueryData` → `GET /api/role/pagingQueryData`（或收敛为 `GET /api/role`）；`/role/saveAdd` → `POST /api/role`。具体映射表见《端点契约盘点表.md》。

---

## 4. 错误码约定

- 业务失败：HTTP 200 + `OperationMessage.type=FAIL`（现状 `optFailResponseEntity` 用 400 的端点，阶段二统一决策为「HTTP 200 + type=FAIL」或「HTTP 4xx + type=FAIL」，二选一后全量一致）。
- HTTP 错误：`ControllerAdvice` 已按 `DeliverContentTypeExceptionHandlerExceptionResolver` 分流（content-type JSON → JSON，否则错误页）。SPA 化后：**API 错误一律 JSON**，页面 404/500 由前端路由兜底。
- 异常消息码规范：`error.{ExceptionSimpleName}`，`message` 为已解析文案。
- 401：清 auth store → 跳登录（携带 `redirectUrl` 回跳）。

---

## 5. 认证 / 401 行为

- 阶段一：Session + Cookie 同源。开发期 Vite proxy 转发 `/`、`/api`、`/login`、`/checkCode`；生产期 nginx 同域或 Spring 托管前端产物。
- 登录链路：`POST /login/doLogin`（表单）→ 成功 302 → `GET /login/success`（返回 `OperationMessage` JSON，axios 跟随重定向即可）；失败 → `/login/error`（JSON，含锁定/校验码错误码）。
- `GET /api/auth/me`（新增，阶段二）：返回当前用户、角色、模块可见权限（替代 main.ftl 的 `modulePermissions` 模板注入）。
- `X-Requested-With` 头、locale/theme 参数、分析项目头：沿用现有拦截器语义，由 axios 请求拦截器统一注入（分析项目头对齐 `AnalysisProjectAwareSupport` 显式契约）。

---

## 6. 元数据接口（新增，替代 `<@writeJson var=formModel/>`）

每个表单/列表页补：

```
GET /api/{module}/meta
```

返回：列定义（DataTable column）、默认值、`isReadonlyAction`、模块权限、select 选项。替代 53 个模板在用的 `<@writeJson var=formModel/>`。

---

## 7. 文件上传 / 下载

- 上传：`multipart/form-data`，`POST /api/{module}/uploadFile`，返回 `OperationMessage<T>`（含文件名/路径等元数据）。
- 下载：`GET` 流式，前端 axios `responseType: 'blob'` + `Content-Disposition` 文件名解析（复用现有导出/下载端点，含 Zip 流式端点 `export/download`、`export/downloadAll`）。
- 上传进度：axios `onUploadProgress` 回调。

---

## 8. 分析项目契约（阶段二显式化）

- 现状 `AnalysisProjectAwareSupport` 靠请求参数/会话/Cookie 感知（`KEY_ANALYSIS_PROJECT_ID`）。
- 目标：显式请求头 `X-Analysis-Project-Id`（或 query 参数），由 Pinia `analysisProject` store 统一注入。

---

## 9. 冻结豁免端点（不按本文档 JSON 化）

见《不迁移清单-冻结面.md》：
- `/cv/**`、`/dv/**`、`/vres/**`、`/checkCode/**`、3 个 Compat 控制器
- Zip/文件流式下载端点（保持 blob）
- `chartPlugin/icon/**`、`chartPlugin/manualContent`、`chartPlugin/download`（流式资源）

---

## 10. 契约演进纪律

- 阶段三起，对模范模块（role + dataSet）做**接口级 diff 测试**：同一操作分别打旧 JSON 接口和新 `/api` 接口，比对响应。
- `api/` 前端封装层每个函数有完整 TS 类型；`OperationMessage<T>` 泛型化后可考虑 openapi-generator 或手写 TS 类型。
- master 只接受 bugfix，前端迁移在 feature 分支按模块合并。
