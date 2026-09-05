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
    path: '/register',
    name: 'register',
    component: () => import('@/views/RegisterView.vue'),
    meta: { public: true, title: '注册' },
  },
  {
    path: '/about',
    name: 'about',
    component: () => import('@/views/AboutView.vue'),
    meta: { public: true, title: '关于' },
  },
  {
    path: '/changelog',
    name: 'changelog',
    component: () => import('@/views/ChangelogView.vue'),
    meta: { public: true, title: '更新日志' },
  },
  {
    path: '/resetPassword',
    name: 'resetPassword',
    component: () => import('@/views/ResetPasswordView.vue'),
    meta: { public: true, title: '重置密码' },
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
        path: 'metrics',
        name: 'metrics',
        component: () => import('@/views/MetricsView.vue'),
        meta: { title: '指标中心', keepAlive: false },
      },
      {
        path: 'metric/add',
        name: 'metricAdd',
        component: () => import('@/views/metric/MetricFormView.vue'),
        meta: { title: '新建指标' },
      },
      {
        path: 'metric/:id/edit',
        name: 'metricEdit',
        component: () => import('@/views/metric/MetricFormView.vue'),
        meta: { title: '编辑指标' },
      },
      {
        path: 'metric/:id/view',
        name: 'metricView',
        component: () => import('@/views/metric/MetricFormView.vue'),
        meta: { title: '查看指标' },
      },
      {
        path: 'chatbi',
        name: 'chatbi',
        component: () => import('@/views/ChatbiView.vue'),
        meta: { title: '智能问数', keepAlive: false },
      },
      {
        path: 'governance',
        name: 'governance',
        component: () => import('@/views/GovernanceView.vue'),
        meta: { title: '数据治理', keepAlive: false },
      },
      {
        path: 'screen',
        name: 'screen',
        component: () => import('@/views/bigScreen/BigScreenListView.vue'),
        meta: { title: '数据大屏', keepAlive: false },
      },
      {
        path: 'screen/add',
        name: 'bigScreenAdd',
        component: () => import('@/views/bigScreen/BigScreenFormView.vue'),
        meta: { title: '新建数据大屏' },
      },
      {
        path: 'screen/:id/edit',
        name: 'bigScreenEdit',
        component: () => import('@/views/bigScreen/BigScreenFormView.vue'),
        meta: { title: '编辑数据大屏' },
      },
      {
        path: 'report',
        name: 'report',
        component: () => import('@/views/ReportView.vue'),
        meta: { title: '统计报表', keepAlive: false },
      },
      {
        path: 'alert',
        name: 'alert',
        component: () => import('@/views/AlertView.vue'),
        meta: { title: '告警与订阅', keepAlive: false },
      },
      {
        path: 'openApi',
        name: 'openApi',
        component: () => import('@/views/OpenApiView.vue'),
        meta: { title: '开放与嵌入', keepAlive: false },
      },
      {
        path: 'system',
        name: 'system',
        component: () => import('@/views/system/SystemView.vue'),
        meta: { title: '系统管理', keepAlive: false },
      },
      {
        path: 'mobile',
        name: 'mobile',
        component: () => import('@/views/MobileView.vue'),
        meta: { title: '移动端', keepAlive: false },
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
        component: () => import('@/views/dtbsSource/DtbsSourceListView.vue'),
        meta: { title: '数据源', keepAlive: true },
      },
      {
        path: 'fileSource',
        name: 'fileSource',
        component: () => import('@/views/fileSource/FileSourceListView.vue'),
        meta: { title: '文件源', keepAlive: true },
      },
      {
        path: 'analysisProject',
        name: 'analysisProject',
        component: () => import('@/views/analysisProject/AnalysisProjectListView.vue'),
        meta: { title: '分析项目', keepAlive: true },
      },
      {
        path: 'dataSet',
        name: 'dataSet',
        component: () => import('@/views/dataSet/DataSetListView.vue'),
        meta: { title: '数据集', keepAlive: true },
      },
      {
        path: 'chart',
        name: 'chart',
        component: () => import('@/views/chart/ChartListView.vue'),
        meta: { title: '图表', keepAlive: true },
      },
      {
        path: 'dashboard',
        name: 'dashboard',
        component: () => import('@/views/dashboard/DashboardListView.vue'),
        meta: { title: '看板', keepAlive: true },
      },
      {
        path: 'dtbsSourceGuard',
        name: 'dtbsSourceGuard',
        component: () => import('@/views/dtbsSourceGuard/DtbsSourceGuardListView.vue'),
        meta: { title: '数据源防护', keepAlive: true },
      },
      {
        path: 'driverEntity',
        name: 'driverEntity',
        component: () => import('@/views/driverEntity/DriverEntityListView.vue'),
        meta: { title: '驱动管理', keepAlive: true },
      },
      {
        path: 'chartPlugin',
        name: 'chartPlugin',
        component: () => import('@/views/chartPlugin/ChartPluginListView.vue'),
        meta: { title: '图表插件', keepAlive: true },
      },
    {
    path: 'screen/:id/design',
    name: 'bigScreenDesigner',
    component: () => import('@/views/bigScreen/BigScreenDesignerView.vue'),
    meta: { title: '大屏设计器' },
  },
  {
    path: 'screen/:id/viewer',
    name: 'bigScreenViewer',
    component: () => import('@/views/bigScreen/BigScreenViewerView.vue'),
    meta: { title: '大屏展示' },
  },
  {
    path: 'dashboard/add',
    name: 'dashboardAdd',
    component: () => import('@/views/dashboard/DashboardFormView.vue'),
    meta: { title: '新建看板' },
  },
  {
    path: 'dashboard/:id/edit',
    name: 'dashboardEdit',
    component: () => import('@/views/dashboard/DashboardFormView.vue'),
    meta: { title: '编辑看板' },
  },
  {
    path: 'dashboard/:id/view',
    name: 'dashboardView',
    component: () => import('@/views/dashboard/DashboardFormView.vue'),
    meta: { title: '查看看板' },
  },
  {
    path: 'dashboard/design',
    name: 'dashboardDesignerNew',
    component: () => import('@/views/dashboard/DashboardDesignerView.vue'),
    meta: { title: '新建看板设计' },
  },
  {
    path: 'screen/design',
    name: 'bigScreenDesignerNew',
    component: () => import('@/views/bigScreen/BigScreenDesignerView.vue'),
    meta: { title: '新建大屏设计' },
  },
  {
    path: 'dashboard/:id/design',
    name: 'dashboardDesigner',
    component: () => import('@/views/dashboard/DashboardDesignerView.vue'),
    meta: { title: '看板设计器' },
  },
  {
    path: 'dashboard/:id/viewer',
    name: 'dashboardViewer',
    component: () => import('@/views/dashboard/DashboardViewerView.vue'),
    meta: { title: '看板展示' },
  },
  {
    path: 'dashboard/:id/share',
    name: 'dashboardShareSet',
    component: () => import('@/views/dashboard/DashboardShareSetView.vue'),
    meta: { title: '看板分享设置' },
  },
  {
    path: 'dashboard/import',
    name: 'dashboardImport',
    component: () => import('@/views/dashboard/DashboardImportView.vue'),
    meta: { title: '导入看板' },
  },
  {
    path: 'chart/add',
    name: 'chartAdd',
    component: () => import('@/views/chart/ChartDesignerView.vue'),
    meta: { title: '新建图表' },
  },
  {
    path: 'chart/:id/design',
    name: 'chartDesigner',
    component: () => import('@/views/chart/ChartDesignerView.vue'),
    meta: { title: '图表设计器' },
  },
  {
    path: 'sqlpad/:dtbsSourceId',
    name: 'sqlpad',
    component: () => import('@/views/sqlpad/SqlpadEditor.vue'),
    meta: { title: 'SQL 工作台' },
  },
  {
    path: 'dataExchange-export/:dtbsSourceId',
    name: 'dataExchangeExport',
    component: () => import('@/views/exchange/DataExchangeExportView.vue'),
    meta: { title: '数据导出向导' },
  },
  {
    path: 'dataExchange-import/:dtbsSourceId',
    name: 'dataExchangeImport',
    component: () => import('@/views/exchange/DataExchangeImportView.vue'),
    meta: { title: '数据导入向导' },
  },
  {
    path: 'demo/dataSetBind',
    name: 'dataSetBindDemo',
    component: () => import('@/views/dashboard/DataSetBindDemo.vue'),
    meta: { title: '数据绑定面板演示' },
  },
  {
    path: 'authorization/:resourceType/:resource',
    name: 'authorization',
    component: () => import('@/views/authorization/AuthorizationView.vue'),
    meta: { title: '资源授权' },
  },
  {
    path: 'dtbsSourceUrlBuilder',
    name: 'dtbsSourceUrlBuilder',
    component: () => import('@/views/dtbsSourceUrlBuilder/DtbsSourceUrlBuilderView.vue'),
    meta: { title: 'URL 构建器' },
  },
  {
    path: 'dtbsSourceData/:dtbsSourceId',
    name: 'dtbsSourceData',
    component: () => import('@/views/dtbsSourceData/DtbsSourceDataView.vue'),
    meta: { title: '数据管理' },
  },
  {
    path: 'dataSet/add/sql',
    name: 'dataSetSqlForm',
    component: () => import('@/views/dataSet/DataSetSqlForm.vue'),
    meta: { title: '新建 SQL 数据集' },
  },
  {
    path: 'dataSet/:id/edit/sql',
    name: 'dataSetSqlEdit',
    component: () => import('@/views/dataSet/DataSetSqlForm.vue'),
    meta: { title: '编辑 SQL 数据集' },
  },
  {
    path: 'dataSet/:id/view/sql',
    name: 'dataSetSqlView',
    component: () => import('@/views/dataSet/DataSetSqlForm.vue'),
    meta: { title: '查看 SQL 数据集' },
  },
  {
    path: 'dataSet/add',
    name: 'dataSetAdd',
    component: () => import('@/views/dataSet/DataSetAddView.vue'),
    meta: { title: '新建数据集' },
  },
  {
    path: 'dataSet/add/:type',
    name: 'dataSetAddType',
    component: () => import('@/views/dataSet/DataSetFormView.vue'),
    meta: { title: '新建数据集' },
  },
  {
    path: 'dataSet/:id/edit',
    name: 'dataSetEdit',
    component: () => import('@/views/dataSet/DataSetFormView.vue'),
    meta: { title: '编辑数据集' },
  },
  {
    path: 'dataSet/:id/view',
    name: 'dataSetView',
    component: () => import('@/views/dataSet/DataSetFormView.vue'),
    meta: { title: '查看数据集' },
  },
  {
    path: 'role/add',
    name: 'roleAdd',
    component: () => import('@/views/role/RoleFormView.vue'),
    meta: { title: '新建角色' },
  },
  {
    path: 'role/:id/edit',
    name: 'roleEdit',
    component: () => import('@/views/role/RoleFormView.vue'),
    meta: { title: '编辑角色' },
  },
  {
    path: 'role/:id/view',
    name: 'roleView',
    component: () => import('@/views/role/RoleFormView.vue'),
    meta: { title: '查看角色' },
  },
  {
    path: 'user/add',
    name: 'userAdd',
    component: () => import('@/views/user/UserFormView.vue'),
    meta: { title: '新建用户' },
  },
  {
    path: 'user/:id/edit',
    name: 'userEdit',
    component: () => import('@/views/user/UserFormView.vue'),
    meta: { title: '编辑用户' },
  },
  {
    path: 'user/:id/view',
    name: 'userView',
    component: () => import('@/views/user/UserFormView.vue'),
    meta: { title: '查看用户' },
  },
  {
    path: 'user/:id/password',
    name: 'userPassword',
    component: () => import('@/views/user/UserPasswordView.vue'),
    meta: { title: '修改用户密码' },
  },
  {
    path: 'analysisProject/add',
    name: 'analysisProjectAdd',
    component: () => import('@/views/analysisProject/AnalysisProjectFormView.vue'),
    meta: { title: '新建分析项目' },
  },
  {
    path: 'analysisProject/:id/edit',
    name: 'analysisProjectEdit',
    component: () => import('@/views/analysisProject/AnalysisProjectFormView.vue'),
    meta: { title: '编辑分析项目' },
  },
  {
    path: 'analysisProject/:id/view',
    name: 'analysisProjectView',
    component: () => import('@/views/analysisProject/AnalysisProjectFormView.vue'),
    meta: { title: '查看分析项目' },
  },
  {
    path: 'fileSource/add',
    name: 'fileSourceAdd',
    component: () => import('@/views/fileSource/FileSourceFormView.vue'),
    meta: { title: '新建文件源' },
  },
  {
    path: 'fileSource/:id/edit',
    name: 'fileSourceEdit',
    component: () => import('@/views/fileSource/FileSourceFormView.vue'),
    meta: { title: '编辑文件源' },
  },
  {
    path: 'fileSource/:id/view',
    name: 'fileSourceView',
    component: () => import('@/views/fileSource/FileSourceFormView.vue'),
    meta: { title: '查看文件源' },
  },
  {
    path: 'dtbsSourceGuard/add',
    name: 'dtbsSourceGuardAdd',
    component: () => import('@/views/dtbsSourceGuard/DtbsSourceGuardFormView.vue'),
    meta: { title: '新建防护规则' },
  },
  {
    path: 'dtbsSourceGuard/:id/edit',
    name: 'dtbsSourceGuardEdit',
    component: () => import('@/views/dtbsSourceGuard/DtbsSourceGuardFormView.vue'),
    meta: { title: '编辑防护规则' },
  },
  {
    path: 'dtbsSourceGuard/:id/view',
    name: 'dtbsSourceGuardView',
    component: () => import('@/views/dtbsSourceGuard/DtbsSourceGuardFormView.vue'),
    meta: { title: '查看防护规则' },
  },
  {
    path: 'dtbsSourceGuard/:id/test',
    name: 'dtbsSourceGuardTest',
    component: () => import('@/views/dtbsSourceGuard/DtbsSourceGuardTestView.vue'),
    meta: { title: '数据源防护测试' },
  },
  {
    path: 'dtbsSource/add',
    name: 'dtbsSourceAdd',
    component: () => import('@/views/dtbsSource/DtbsSourceFormView.vue'),
    meta: { title: '新建数据源' },
  },
  {
    path: 'dtbsSource/:id/edit',
    name: 'dtbsSourceEdit',
    component: () => import('@/views/dtbsSource/DtbsSourceFormView.vue'),
    meta: { title: '编辑数据源' },
  },
  {
    path: 'dtbsSource/:id/view',
    name: 'dtbsSourceView',
    component: () => import('@/views/dtbsSource/DtbsSourceFormView.vue'),
    meta: { title: '查看数据源' },
  },
  {
    path: 'driverEntity/add',
    name: 'driverEntityAdd',
    component: () => import('@/views/driverEntity/DriverEntityFormView.vue'),
    meta: { title: '新建驱动' },
  },
  {
    path: 'driverEntity/:id/edit',
    name: 'driverEntityEdit',
    component: () => import('@/views/driverEntity/DriverEntityFormView.vue'),
    meta: { title: '编辑驱动' },
  },
  {
    path: 'driverEntity/:id/view',
    name: 'driverEntityView',
    component: () => import('@/views/driverEntity/DriverEntityFormView.vue'),
    meta: { title: '查看驱动' },
  },
  {
    path: 'chartPlugin/:id/view',
    name: 'chartPluginView',
    component: () => import('@/views/chartPlugin/ChartPluginFormView.vue'),
    meta: { title: '查看图表插件' },
  },
  ],
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
