import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'

/**
 * 路由表按模块组织，meta 携带：菜单分组、权限标识、KeepAlive 策略、范式类型。
 * 阶段三起，32 个控制器 → 路由映射按《端点契约盘点表》逐一定义。
 * 骨架期仅登录 + 主框架占位。
 */
const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/LoginView.vue'),
    meta: { public: true },
  },
  {
    path: '/',
    component: () => import('@/layouts/MainLayout.vue'),
    children: [
      {
        path: '',
        name: 'home',
        component: () => import('@/views/HomeView.vue'),
        meta: { title: '首页', keepAlive: false },
      },
      {
        path: 'role',
        name: 'role',
        component: () => import('@/views/role/RoleListView.vue'),
        meta: { title: '角色管理', keepAlive: true },
      },
      {
        path: 'user',
        name: 'user',
        component: () => import('@/views/user/UserListView.vue'),
        meta: { title: '用户管理', keepAlive: true },
      },
      {
        path: 'dtbsSource',
        name: 'dtbsSource',
        component: () => import('@/views/ModuleListView.vue'),
        meta: { title: '数据源', module: 'dtbsSource', keepAlive: true },
      },
      {
        path: 'fileSource',
        name: 'fileSource',
        component: () => import('@/views/ModuleListView.vue'),
        meta: { title: '文件源', module: 'fileSource', keepAlive: true },
      },
      {
        path: 'analysisProject',
        name: 'analysisProject',
        component: () => import('@/views/ModuleListView.vue'),
        meta: { title: '分析项目', module: 'analysisProject', keepAlive: true },
      },
      {
        path: 'dataSet',
        name: 'dataSet',
        component: () => import('@/views/ModuleListView.vue'),
        meta: { title: '数据集', module: 'dataSet', keepAlive: true },
      },
      {
        path: 'chart',
        name: 'chart',
        component: () => import('@/views/ModuleListView.vue'),
        meta: { title: '图表', module: 'chart', keepAlive: true },
      },
      {
        path: 'dashboard',
        name: 'dashboard',
        component: () => import('@/views/ModuleListView.vue'),
        meta: { title: '看板', module: 'dashboard', keepAlive: true },
      },
      {
        path: 'dtbsSourceGuard',
        name: 'dtbsSourceGuard',
        component: () => import('@/views/ModuleListView.vue'),
        meta: { title: '数据源防护', module: 'dtbsSourceGuard', keepAlive: true },
      },
    ],
  },
  {
    path: '/dashboard/:id/design',
    name: 'dashboardDesigner',
    component: () => import('@/views/dashboard/DashboardDesignerView.vue'),
    meta: { title: '看板设计器' },
  },
  {
    path: '/sqlpad/:dtbsSourceId',
    name: 'sqlpad',
    component: () => import('@/views/sqlpad/SqlpadView.vue'),
    meta: { title: 'SQL 工作台' },
  },
  {
    path: '/sqlpad-editor/:dtbsSourceId',
    name: 'sqlpadEditor',
    component: () => import('@/views/sqlpad/SqlpadEditor.vue'),
    meta: { title: 'SQL 工作台（Vue 重写）' },
  },
  {
    path: '/dataExchange/:dtbsSourceId',
    name: 'dataExchange',
    component: () => import('@/views/exchange/DataExchangeView.vue'),
    meta: { title: '数据交换' },
  },
  {
    path: '/dataExchange-export/:dtbsSourceId',
    name: 'dataExchangeExport',
    component: () => import('@/views/exchange/DataExchangeExportView.vue'),
    meta: { title: '数据导出向导' },
  },
  {
    path: '/dataExchange-import/:dtbsSourceId',
    name: 'dataExchangeImport',
    component: () => import('@/views/exchange/DataExchangeImportView.vue'),
    meta: { title: '数据导入向导' },
  },
  {
    path: '/demo/dataSetBind',
    name: 'dataSetBindDemo',
    component: () => import('@/views/dashboard/DataSetBindDemo.vue'),
    meta: { title: '数据绑定面板演示' },
  },
  {
    path: '/dataSet/add/sql',
    name: 'dataSetSqlForm',
    component: () => import('@/views/dataSet/DataSetSqlForm.vue'),
    meta: { title: '新建 SQL 数据集' },
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('@/views/NotFoundView.vue'),
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

// 全局守卫：未认证跳登录（首次非公开导航时拉取 /api/auth/me 判定）。
let authChecked = false
router.beforeEach(async (to) => {
  if (to.meta.public) return true
  const { useAuthStore } = await import('@/stores/auth')
  const auth = useAuthStore()
  if (!authChecked) {
    authChecked = true
    try {
      await auth.fetchMe()
    } catch {
      // 未登录/会话失效，保持匿名
    }
  }
  if (!auth.isAnonymous) return true
  return { path: '/login', query: { redirectUrl: to.fullPath } }
})

export default router
