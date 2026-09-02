import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const backendTarget = env.VITE_BACKEND_TARGET || 'http://localhost:50401'

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
        },
        '/logout': {
          target: backendTarget,
          changeOrigin: true,
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
        },
        '/dtbsSourceUrlBuilder': {
          target: backendTarget,
          changeOrigin: true,
        },
        '/dataSet': {
          target: backendTarget,
          changeOrigin: true,
        },
        '/chart': {
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
