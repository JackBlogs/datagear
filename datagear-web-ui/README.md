# datagear-web-ui

DataGear 前端 Vue 化 SPA（阶段一骨架）。

## 技术栈

Vite 4 + Vue 3.2.47 + TypeScript 5 + Pinia 2 + Vue Router 4 + PrimeVue 3.34 + Axios + vue-i18n 9。

> 版本锁定与现状 vendored 资源一致：vue 3.2.47 / primevue 3.34.1 / primeflex 3.3.1 / primeicons 6.0.1。

## 目录结构

```
src/
├─ api/          # 与后端控制器一一对应（auth.ts…），全量 TS 类型
├─ router/       # 路由表 + 菜单元数据 + 多标签 KeepAlive 配置
├─ stores/       # auth / theme / locale / analysisProject / permissions / tabs
├─ locales/      # vue-i18n 语言包（脚本自 message.properties 生成）
├─ components/   # 通用组件（替代 include/*.ftl）
├─ composables/  # po 框架能力的 Composition API 重写
├─ layouts/      # 主布局（侧菜单 + 多标签页 + 头部）
├─ views/        # 按模块分目录
├─ plugins/      # PrimeVue 全局注册、确认框、Toast
├─ types/        # OperationMessage<T> / PagingData<T> 等契约类型
└─ utils/        # axios 实例、OperationMessage 解析、文件下载、存储
```

## 开发

```bash
npm install
npm run dev        # Vite dev server（代理 /login、/api、/checkCode 等到 http://localhost:50401）
npm run build      # vue-tsc 类型检查 + 产物构建
```

后端默认端口 50401（见 `datagear-web/src/main/resources/org/datagear/web/application.properties`），
开发代理目标可用 `.env.development` 的 `VITE_BACKEND_TARGET` 覆盖。

## 构建集成（阶段六）

frontend-maven-plugin 挂在 **datagear-web** 模块：`npm ci && npm run build`，产物拷入静态资源目录；
CI 同时验证可执行 war 与外置 Tomcat 两种形态。

## 阶段一 POC 验证点（5 个证伪点）

1. Vite proxy 下 Session Cookie + 表单登录全链路（含校验码、登录锁定错误码透传）；
2. axios 跟随 302 → `/login/success` 拿到 JSON；
3. PrimeVue npm 版 DataTable 懒加载 ↔ PagingData；
4. message.properties → vue-i18n 语言包一次性转换脚本 + 覆盖率校验；
5. npm 版 PrimeVue “换 link href”复刻 blue/blueDark 双主题。
