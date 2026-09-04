import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const backendTarget = env.VITE_BACKEND_TARGET || 'http://localhost:50404'

  return {
    plugins: [vue()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      port: 5173,
      // 阶段一 POC：Session + Cookie 同源，开发期用 Vite proxy 转发到后端。
      // 生产期由 nginx 同域反代或 Spring 托管构建产物（见《方案》§4）。
      proxy: {
        '/api': {
          target: backendTarget,
          changeOrigin: true,
        },
        '/login': {
          target: backendTarget,
          changeOrigin: true,
          // SPA 登录页由前端路由渲染（与 /dashboard 同模式）：整页导航回退 vite index.html，
          // 仅登录 XHR（POST /login/doLogin 等）转发后端；否则后端返回托管 SPA HTML，
          // 其 /assets/*.js 在 dev server 上 404 导致白屏，且会以旧构建覆盖新页面
          bypass(req) {
            const accept = String(req.headers.accept ?? '')
            if (req.method === 'GET' && accept.includes('text/html')) {
              return '/index.html'
            }
            return undefined
          },
        },
        '/logout': {
          target: backendTarget,
          changeOrigin: true,
          bypass(req) {
            const accept = String(req.headers.accept ?? '')
            if (req.method === 'GET' && accept.includes('text/html')) {
              return '/index.html'
            }
            return undefined
          },
        },
        '/checkCode': {
          target: backendTarget,
          changeOrigin: true,
        },
        '/register': {
          target: backendTarget,
          changeOrigin: true,
        },
        '/resetPassword': {
          target: backendTarget,
          changeOrigin: true,
        },
        // 冻结面：图表/看板运行时、插件资源仍由后端托管，按需代理
        '/cv': {
          target: backendTarget,
          changeOrigin: true,
        },
        '/dv': {
          target: backendTarget,
          changeOrigin: true,
        },
        '/vres': {
          target: backendTarget,
          changeOrigin: true,
        },
        '/static': {
          target: backendTarget,
          changeOrigin: true,
        },
        // 阶段五「包装迁移」：复杂模块旧视图（iframe 外壳内嵌），双轨期由后端渲染
        '/dashboard': {
          target: backendTarget,
          changeOrigin: true,
          // SPA 路由 /dashboard* 与旧端点同前缀：整页导航回退 SPA（旧分享展示页 /dashboard/show 除外），
          // XHR（axios 带 X-Requested-With）仍代理后端
          bypass(req) {
            const accept = String(req.headers.accept ?? '')
            const url = String(req.url ?? '')
            if (
              req.method === 'GET' &&
              accept.includes('text/html') &&
              !req.headers['x-requested-with'] &&
              !url.startsWith('/dashboard/show')
            ) {
              return '/index.html'
            }
            return undefined
          },
        },
        '/dtbsSourceSqlpad': {
          target: backendTarget,
          changeOrigin: true,
        },
        '/dtbsSourceExchange': {
          target: backendTarget,
          changeOrigin: true,
        },
        '/dtbsSourceData': {
          target: backendTarget,
          changeOrigin: true,
          // SPA 路由 /dtbsSourceData/:id 与旧端点同前缀：浏览器整页导航回退到 SPA，
          // 仅 XHR（axios 带 X-Requested-With / 非 text/html）才代理到后端（如 getQuerySql）
          bypass(req) {
            const accept = String(req.headers.accept ?? '')
            if (req.method === 'GET' && accept.includes('text/html') && !req.headers['x-requested-with']) {
              return '/index.html'
            }
            return undefined
          },
        },
        '/dtbsSourceUrlBuilder': {
          target: backendTarget,
          changeOrigin: true,
        },
        '/dataSet': {
          target: backendTarget,
          changeOrigin: true,
          // SPA 路由 /dataSet* 与旧端点同前缀：整页导航回退 SPA，XHR 仍代理后端（如 /dataSet/preview/SQL）
          bypass(req) {
            const accept = String(req.headers.accept ?? '')
            if (req.method === 'GET' && accept.includes('text/html') && !req.headers['x-requested-with']) {
              return '/index.html'
            }
            return undefined
          },
        },
        '/chart': {
          target: backendTarget,
          changeOrigin: true,
          // SPA 路由 /chart* 与旧端点同前缀：整页导航回退 SPA（旧图表展示页 /chart/show 除外）
          bypass(req) {
            const accept = String(req.headers.accept ?? '')
            const url = String(req.url ?? '')
            if (
              req.method === 'GET' &&
              accept.includes('text/html') &&
              !req.headers['x-requested-with'] &&
              !url.startsWith('/chart/show')
            ) {
              return '/index.html'
            }
            return undefined
          },
        },
        // 驱动库文件的旧端点（上传/下载/删除/列表），迁移期直接复用后端控制器
        '/driverEntity': {
          target: backendTarget,
          changeOrigin: true,
          // SPA 路由 /driverEntity* 与旧端点同前缀：整页导航回退 SPA（驱动文件下载端点除外）
          bypass(req) {
            const accept = String(req.headers.accept ?? '')
            const url = String(req.url ?? '')
            if (
              req.method === 'GET' &&
              accept.includes('text/html') &&
              !req.headers['x-requested-with'] &&
              !url.startsWith('/driverEntity/downloadDriverFile')
            ) {
              return '/index.html'
            }
            return undefined
          },
        },
        // 旧服务端渲染/非 /api 端点（无 /api 版，见《端点契约盘点表》核验）：
        // 数据库信息页（HTML，前端解析内嵌 formModel JSON）
        '/dtbsSource/dbinfo': {
          target: backendTarget,
          changeOrigin: true,
        },
        // 数据源防护测试执行（JSON）
        '/dtbsSourceGuard/testExecute': {
          target: backendTarget,
          changeOrigin: true,
        },
        // 文件源文件浏览（JSON）
        '/fileSource/file': {
          target: backendTarget,
          changeOrigin: true,
        },
      },
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
      // 路由级代码分割由视图的动态 import() 提供（见《方案》§6.9）。
      // 注：PrimeVue 3.34 无根入口（仅有子路径组件），不能对裸 'primevue' 做 manualChunks，
      // 否则 Vite 无法解析其根 entry。analysisapi/analysislib 不进 npm，仍由后端 static 托管。
    },
  }
})
