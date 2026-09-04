<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import {
  dataApis,
  apiKeys,
  embedKeys,
  publishApi,
  toggleApi,
  saveApiKey,
  revokeKey,
  saveEmbedKey,
  apiCodeSamples,
  type DataApi,
} from '@/mock/openApiData'
import { metricPagingQueryData, type MetricEntity } from '@/api/metric'
import { dataSetPagingQueryData } from '@/api/dataSet'
import { useOperationMessage } from '@/composables/useOperationMessage'
import { useConfirm } from '@/composables/useConfirm'
import '@/styles/datasource-page.css'

/**
 * 数据交换、嵌入与开放 API（对齐 prototypev2 api.html）：
 * 5 tab（数据API / API Key / 嵌入集成 / MCP Server / 导入导出）+ 24h 调用量卡。
 * 数据层为前端 mock（src/mock/openApiData.ts），后端 openapi 模块就绪后一键切换。
 */
const { success, fail } = useOperationMessage()
const { confirmAction } = useConfirm()
const router = useRouter()

const activeTab = ref<'apis' | 'keys' | 'embed' | 'mcp' | 'pack'>('apis')
const docApi = ref<DataApi | null>(null)
const docLang = ref<'cURL' | 'JavaScript' | 'Python'>('cURL')

const totalToday = computed(() => dataApis.value.reduce((s, a) => s + a.today, 0))
const enabledApis = computed(() => dataApis.value.filter((a) => a.enabled).length)

function onToggleApi(a: DataApi) {
  const enabled = toggleApi(a.id)
  success(`${a.name} 已${enabled ? '启用' : '停用'}`)
}

function copyPath(path: string) {
  navigator.clipboard?.writeText('https://bi.energy.local' + path).then(
    () => success('端点已复制'),
    () => fail('复制失败'),
  )
}

function openDoc(a: DataApi) {
  docApi.value = a
  docLang.value = 'cURL'
}

/* ---------- 发布 API（选指标/数据集 → 端点生成） ---------- */
const pubOpen = ref(false)
const pubForm = ref<{ name: string; source: '指标' | '数据集'; refId: string; limit: string } | null>(null)
const pubOptions = ref<{ id: string; name: string }[]>([])
const pubLoading = ref(false)

async function openPublish(source: '指标' | '数据集') {
  pubOpen.value = true
  pubForm.value = { name: '', source, refId: '', limit: '300 次/分' }
  pubLoading.value = true
  try {
    if (source === '指标') {
      const d = await metricPagingQueryData({ page: 1, pageSize: 100 })
      pubOptions.value = d.items.map((m: MetricEntity) => ({ id: m.id, name: m.name }))
    } else {
      const d = await dataSetPagingQueryData({ page: 1, pageSize: 100 })
      pubOptions.value = d.items.map((d2) => ({ id: d2.id, name: d2.name }))
    }
  } catch (e) {
    fail((e as Error).message || '选项加载失败')
  } finally {
    pubLoading.value = false
  }
}

function switchPubSource(source: '指标' | '数据集') {
  pubForm.value!.source = source
  pubForm.value!.refId = ''
  openPublishRefresh(source)
}
async function openPublishRefresh(source: '指标' | '数据集') {
  pubLoading.value = true
  try {
    if (source === '指标') {
      const d = await metricPagingQueryData({ page: 1, pageSize: 100 })
      pubOptions.value = d.items.map((m: MetricEntity) => ({ id: m.id, name: m.name }))
    } else {
      const d = await dataSetPagingQueryData({ page: 1, pageSize: 100 })
      pubOptions.value = d.items.map((d2) => ({ id: d2.id, name: d2.name }))
    }
  } finally {
    pubLoading.value = false
  }
}

function submitPublish() {
  const f = pubForm.value
  if (!f) return
  if (!f.name.trim() || !f.refId) {
    fail('请填写 API 名称并选择来源')
    return
  }
  const row = publishApi(f)
  pubOpen.value = false
  success(`API 已发布：${row.path}`)
}

/* ---------- API Key ---------- */
const keyForm = ref<{ name: string; scope: string; limit: string } | null>(null)

function submitKey() {
  if (!keyForm.value) return
  if (!keyForm.value.name) {
    fail('请填写 Key 名称')
    return
  }
  const row = saveApiKey(keyForm.value)
  keyForm.value = null
  success(`API Key 已创建：${row.prefix}`)
}

async function onRevokeKey(id: string, name: string) {
  confirmAction(`确定吊销「${name}」吗？吊销后使用该 Key 的调用将立即失败。`, () => {
    revokeKey(id)
    success('Key 已吊销')
  })
}

/* ---------- 嵌入密钥 ---------- */
const embedForm = ref<{ name: string; domains: string; expire: string } | null>(null)
const embedSecret = ref('')

function submitEmbed() {
  if (!embedForm.value) return
  if (!embedForm.value.name || !embedForm.value.domains) {
    fail('请填写密钥名称与白名单域名')
    return
  }
  const row = saveEmbedKey(embedForm.value)
  embedSecret.value = row.secret || ''
  embedForm.value = null
  success('嵌入密钥已创建')
}

function copyCode() {
  const code = docApi.value ? apiCodeSamples(docApi.value.path)[docLang.value] : ''
  navigator.clipboard?.writeText(code).then(
    () => success('示例代码已复制'),
    () => fail('复制失败'),
  )
}
</script>

<template>
  <div class="ds-page">
    <!-- 页头 -->
    <div class="page-head">
      <div>
        <div class="page-title">数据交换、嵌入与开放 API</div>
        <div class="page-desc">指标/数据集发布为 REST API、签名嵌入集成、MCP Server 与项目导入导出（PRD 10.13）</div>
      </div>
      <div class="page-actions">
        <button class="btn" type="button" @click="success('OpenAPI 文档已生成：/openapi.json')">OpenAPI 文档</button>
        <button class="btn primary" type="button" @click="openPublish('指标')">＋ 发布 API</button>
      </div>
    </div>

    <!-- Tabs -->
    <div class="tabs-row mb-2">
      <div class="tab-item" :class="{ active: activeTab === 'apis' }" @click="activeTab = 'apis'">数据 API <em>{{ dataApis.length }}</em></div>
      <div class="tab-item" :class="{ active: activeTab === 'keys' }" @click="activeTab = 'keys'">API Key <em>{{ apiKeys.length }}</em></div>
      <div class="tab-item" :class="{ active: activeTab === 'embed' }" @click="activeTab = 'embed'">嵌入集成</div>
      <div class="tab-item" :class="{ active: activeTab === 'mcp' }" @click="activeTab = 'mcp'">MCP Server <em class="ai">AI</em></div>
      <div class="tab-item" :class="{ active: activeTab === 'pack' }" @click="activeTab = 'pack'">导入导出</div>
    </div>

    <!-- ===== 数据 API ===== -->
    <template v-if="activeTab === 'apis'">
      <div class="openapi-layout">
        <div class="table-wrap" style="flex: 1; min-width: 0">
          <table class="tbl">
            <thead>
              <tr>
                <th>API 名称</th>
                <th>端点</th>
                <th style="width: 90px">来源</th>
                <th style="width: 100px">限流</th>
                <th style="width: 90px">今日调用</th>
                <th style="width: 70px">状态</th>
                <th style="width: 140px">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="!dataApis.length"><td colspan="7"><div class="empty">暂无已发布 API</div></td></tr>
              <tr v-for="a in dataApis" :key="a.id">
                <td>
                  <span class="cell-main">{{ a.name }}</span>
                  <span class="tag" style="margin-left: 6px">{{ a.version }}</span>
                </td>
                <td>
                  <span class="path" @click="copyPath(a.path)" title="点击复制">{{ a.path }}</span>
                </td>
                <td><span class="tag" :class="a.source === '指标' ? 'brand' : 'info'">{{ a.source }}</span></td>
                <td class="sm">{{ a.limit }}</td>
                <td class="num">{{ a.today.toLocaleString() }}</td>
                <td><label class="switch"><input type="checkbox" :checked="a.enabled" @change="onToggleApi(a)" /><i></i></label></td>
                <td>
                  <span class="link" @click="openDoc(a)">文档</span> ·
                  <span class="link" @click="copyPath(a.path)">复制</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="side-cards">
          <div class="card side-card">
            <div class="card-title"><i class="bar"></i>近 24h 调用量</div>
            <div class="spark"><i v-for="n in 24" :key="n" :style="{ height: 20 + ((n * 37) % 60) + '%' }"></i></div>
          </div>
          <div class="card side-card kv">
            <div class="kv-item"><span class="tx-3 sm">调用成功率</span><b class="num" style="color: #34d399">99.7%</b></div>
            <div class="kv-item"><span class="tx-3 sm">平均延迟</span><b class="num">42 ms</b></div>
            <div class="kv-item"><span class="tx-3 sm">今日调用</span><b class="num">{{ totalToday.toLocaleString() }}</b></div>
            <div class="kv-item"><span class="tx-3 sm">启用 API</span><b class="num">{{ enabledApis }}/{{ dataApis.length }}</b></div>
          </div>
        </div>
      </div>
    </template>

    <!-- ===== API Key ===== -->
    <template v-else-if="activeTab === 'keys'">
      <div class="flex mb-2">
        <button class="btn primary sm" type="button" @click="keyForm = { name: '', scope: '只读', limit: '300/分' }">＋ 创建 API Key</button>
      </div>
      <div class="table-wrap">
        <table class="tbl">
          <thead>
            <tr>
              <th>Key 名称</th>
              <th>Key 前缀</th>
              <th>权限范围</th>
              <th style="width: 100px">限流</th>
              <th style="width: 120px">最近使用</th>
              <th style="width: 110px">创建时间</th>
              <th style="width: 80px">状态</th>
              <th style="width: 90px">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!apiKeys.length"><td colspan="8"><div class="empty">暂无 API Key</div></td></tr>
            <tr v-for="k in apiKeys" :key="k.id">
              <td><span class="cell-main">{{ k.name }}</span></td>
              <td><span class="path">{{ k.prefix }}</span></td>
              <td><span class="tag info">{{ k.scope }}</span></td>
              <td class="sm">{{ k.limit }}</td>
              <td class="sm tx-3">{{ k.last }}</td>
              <td class="sm tx-3">{{ k.created }}</td>
              <td><span class="tag" :class="k.enabled ? 'ok' : 'danger'">{{ k.enabled ? '启用' : '已吊销' }}</span></td>
              <td><span v-if="k.enabled" class="link danger" @click="onRevokeKey(k.id, k.name)">吊销</span><span v-else class="tx-4 sm">—</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <!-- ===== 嵌入集成 ===== -->
    <template v-else-if="activeTab === 'embed'">
      <div class="flex mb-2">
        <button class="btn primary sm" type="button" @click="embedForm = { name: '', domains: '', expire: '2027-09-04' }">＋ 创建嵌入密钥</button>
      </div>
      <div v-if="embedSecret" class="card secret-card mb-3">
        <div class="card-title"><i class="bar"></i>新密钥（仅本次展示）</div>
        <div class="path" style="word-break: break-all">{{ embedSecret }}</div>
      </div>
      <div class="table-wrap">
        <table class="tbl">
          <thead>
            <tr>
              <th>密钥名称</th>
              <th>白名单域名</th>
              <th style="width: 120px">有效期至</th>
              <th style="width: 110px">近30天调用</th>
              <th style="width: 80px">状态</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!embedKeys.length"><td colspan="5"><div class="empty">暂无嵌入密钥</div></td></tr>
            <tr v-for="e in embedKeys" :key="e.id">
              <td><span class="cell-main">{{ e.name }}</span></td>
              <td class="sm">{{ e.domains }}</td>
              <td class="sm tx-3">{{ e.expire }}</td>
              <td class="num">{{ e.calls30d.toLocaleString() }}</td>
              <td><span class="tag ok">启用</span></td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="card" style="margin-top: 14px; padding: 14px">
        <div class="card-title"><i class="bar"></i>Embed JS SDK（FR-EMBED-03）</div>
        <pre class="sql-code">&lt;script src="https://bi.energy.local/embed/datagear-embed.js"&gt;&lt;/script&gt;
&lt;script&gt;
  DataGearEmbed.render("#container", {
    resource: "dashboard/DB-01",   // 看板 / 报表 / 问数框
    token: signedJwt,              // 第三方后端用共享密钥签发（HS256，≤5min）
    theme: "dark-energy",
    params: { org: "HB01" },       // 行级权限透传参数
  });
&lt;/script&gt;</pre>
      </div>
    </template>

    <!-- ===== MCP Server ===== -->
    <template v-else-if="activeTab === 'mcp'">
      <div class="card" style="padding: 16px">
        <div class="card-title"><i class="bar"></i>MCP 工具清单（FR-EMBED-04 · AI Agent 接入）</div>
        <div class="table-wrap" style="margin-top: 8px">
          <table class="tbl">
            <thead>
              <tr><th>工具</th><th>说明</th><th>输入</th><th style="width: 90px">状态</th></tr>
            </thead>
            <tbody>
              <tr><td><span class="cell-main">list_metrics</span></td><td class="sm">列出语义层全部已认证指标</td><td class="sm tx-3">domain?, keyword?</td><td><span class="tag ok">可用</span></td></tr>
              <tr><td><span class="cell-main">query_metric</span></td><td class="sm">按指标+维度+时间窗取数</td><td class="sm tx-3">metricId, dimensions, filters</td><td><span class="tag ok">可用</span></td></tr>
              <tr><td><span class="cell-main">get_dataset</span></td><td class="sm">执行数据集查询并返回结果</td><td class="sm tx-3">datasetId, params</td><td><span class="tag ok">可用</span></td></tr>
              <tr><td><span class="cell-main">ask</span></td><td class="sm">自然语言问数（Text2DSL）</td><td class="sm tx-3">question</td><td><span class="tag">Phase 2</span></td></tr>
            </tbody>
          </table>
        </div>
        <div class="tx-3 sm" style="margin-top: 10px">端点：<span class="path">https://bi.energy.local/mcp/sse</span> · 认证：MCP Token（系统设置中生成）</div>
      </div>
    </template>

    <!-- ===== 导入导出 ===== -->
    <template v-else>
      <div class="tpl-grid">
        <div class="db-card">
          <div class="c-body">
            <div class="c-name">项目打包导出</div>
            <div class="c-desc">数据集 / 图表 / 看板 / 指标打包为 .dgpkg，支撑环境迁移与模板分发（FR-DELIV-03）</div>
            <button class="btn primary sm" type="button" @click="success('已导出 project-能源分析项目.dgpkg（18.4 MB）')">导出项目包</button>
          </div>
        </div>
        <div class="db-card">
          <div class="c-body">
            <div class="c-name">数据导入导出</div>
            <div class="c-desc">CSV / Excel / JSON / SQL 格式，进入「数据源 → 数据管理」操作（已实现）</div>
            <button class="btn sm" type="button" @click="router?.push?.('/dtbsSource')">前往数据源</button>
          </div>
        </div>
        <div class="db-card">
          <div class="c-body">
            <div class="c-name">系统库备份</div>
            <div class="c-desc">系统库 + DATAGEAR_HOME 一键备份（FR-DELIV-02，Phase 0 交付项）</div>
            <button class="btn sm" type="button" @click="success('备份已开始：datagear-backup-20260904.zip')">立即备份</button>
          </div>
        </div>
      </div>
    </template>

    <!-- API 文档抽屉 -->
    <div v-if="docApi" class="drawer-mask" @click="docApi = null">
      <div class="modal" @click.stop>
        <div class="drawer-head">
          <div class="drawer-title">API 文档 · {{ docApi.name }}</div>
          <button class="btn sm ghost" type="button" @click="docApi = null">✕</button>
        </div>
        <div class="drawer-body">
          <div class="flex mb-2" style="gap: 8px; align-items: center">
            <span class="path grow">{{ docApi.path }}</span>
            <span class="tag brand">{{ docApi.source }}</span>
            <span class="tag">{{ docApi.limit }}</span>
          </div>
          <div class="seg-row mb-2">
            <span v-for="l in (['cURL', 'JavaScript', 'Python'] as const)" :key="l" class="seg-item" :class="{ active: docLang === l }" @click="docLang = l">{{ l }}</span>
            <button class="btn sm" style="margin-left: auto" type="button" @click="copyCode()">复制</button>
          </div>
          <pre class="sql-code">{{ apiCodeSamples(docApi.path)[docLang] }}</pre>
          <div class="tx-3 sm" style="margin-top: 10px">认证：Authorization: Bearer &lt;API Key&gt; · 限流：{{ docApi.limit }} · 超限返回 429 + Retry-After</div>
        </div>
      </div>
    </div>

    <!-- Key 创建弹窗 -->
    <div v-if="keyForm" class="drawer-mask" @click="keyForm = null">
      <div class="modal" @click.stop>
        <div class="drawer-head">
          <div class="drawer-title">创建 API Key</div>
          <button class="btn sm ghost" type="button" @click="keyForm = null">✕</button>
        </div>
        <div class="drawer-body">
          <div class="form-item"><label class="form-label">Key 名称 *</label><input v-model="keyForm.name" class="input" placeholder="如：生产调度系统" /></div>
          <div class="form-item"><label class="form-label">权限范围</label>
            <select v-model="keyForm.scope" class="input"><option>只读</option><option>只读 · 指标查询</option><option>只读 · 指定API</option><option>读写</option></select>
          </div>
          <div class="form-item"><label class="form-label">限流</label>
            <select v-model="keyForm.limit" class="input"><option>60/分</option><option>100/分</option><option>300/分</option><option>1000/分</option></select>
          </div>
          <div class="flex" style="gap: 10px; margin-top: 16px">
            <button class="btn primary grow" type="button" @click="submitKey">创建</button>
            <button class="btn" type="button" @click="keyForm = null">取消</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 嵌入密钥弹窗 -->
    <div v-if="embedForm" class="drawer-mask" @click="embedForm = null">
      <div class="modal" @click.stop>
        <div class="drawer-head">
          <div class="drawer-title">创建嵌入密钥</div>
          <button class="btn sm ghost" type="button" @click="embedForm = null">✕</button>
        </div>
        <div class="drawer-body">
          <div class="form-item"><label class="form-label">密钥名称 *</label><input v-model="embedForm.name" class="input" placeholder="如：集团门户嵌入密钥" /></div>
          <div class="form-item"><label class="form-label">白名单域名 *</label><input v-model="embedForm.domains" class="input" placeholder="如：portal.energy.local" /></div>
          <div class="form-item"><label class="form-label">有效期至</label><input v-model="embedForm.expire" class="input" placeholder="2027-09-04" /></div>
          <div class="flex" style="gap: 10px; margin-top: 16px">
            <button class="btn primary grow" type="button" @click="submitEmbed">创建</button>
            <button class="btn" type="button" @click="embedForm = null">取消</button>
          </div>
        </div>
      </div>
    </div>
  <!-- 发布 API 弹窗 -->
  <div v-if="pubOpen" class="drawer-mask" @click="pubOpen = false">
    <div class="modal" @click.stop>
      <div class="drawer-head">
        <div class="drawer-title">发布 API</div>
        <button class="btn sm ghost" type="button" @click="pubOpen = false">✕</button>
      </div>
      <div class="drawer-body">
        <div class="form-item"><label class="form-label">来源类型</label>
          <div class="seg-row">
            <span class="seg-item" :class="{ active: pubForm!.source === '指标' }" @click="switchPubSource('指标')">指标</span>
            <span class="seg-item" :class="{ active: pubForm!.source === '数据集' }" @click="switchPubSource('数据集')">数据集</span>
          </div>
        </div>
        <div class="form-item"><label class="form-label">API 名称 *</label><input v-model="pubForm!.name" class="input" placeholder="如：原油产量查询" /></div>
        <div class="form-item"><label class="form-label">选择{{ pubForm!.source }} *</label>
          <div v-if="pubLoading" class="empty">加载中…</div>
          <div v-else class="pub-opts">
            <div v-for="o in pubOptions" :key="o.id" class="qb-src" :class="{ sel: pubForm!.refId === o.id }" @click="pubForm!.refId = o.id">
              <span class="cell-main">{{ o.name }}</span>
            </div>
            <div v-if="!pubOptions.length" class="empty">暂无可选项</div>
          </div>
        </div>
        <div class="form-item"><label class="form-label">限流</label>
          <select v-model="pubForm!.limit" class="input"><option>100 次/分</option><option>300 次/分</option><option>600 次/分</option><option>1000 次/分</option></select>
        </div>
        <div v-if="pubForm!.refId" class="tx-3 sm">端点：<span class="path">{{ pubForm!.source === '指标' ? '/api/v1/metrics/' : '/api/v1/datasets/' }}{{ pubForm!.refId }}</span></div>
        <div class="flex" style="gap: 10px; margin-top: 16px">
          <button class="btn primary grow" type="button" @click="submitPublish">发布</button>
          <button class="btn" type="button" @click="pubOpen = false">取消</button>
        </div>
      </div>
    </div>
  </div>
  </div>
</template>

<style scoped>
.tabs-row { display: flex; gap: 4px; border-bottom: 1px solid var(--line-1); }
.tab-item { padding: 9px 18px; font-size: 13px; color: var(--tx-3); cursor: pointer; border-bottom: 2px solid transparent; display: inline-flex; gap: 6px; align-items: center; }
.tab-item:hover { color: var(--tx-1); }
.tab-item.active { color: var(--brand); border-bottom-color: var(--brand); }
.tab-item em { font-style: normal; font-size: 10.5px; padding: 1px 7px; border-radius: 8px; background: var(--bg-glass-2); color: var(--tx-3); }
.tab-item em.ai { background: var(--brand-soft); color: var(--brand); }
.openapi-layout { display: flex; gap: 14px; align-items: flex-start; }
.side-cards { width: 280px; flex: none; display: flex; flex-direction: column; gap: 12px; }
.side-card { padding: 14px; }
.spark { display: flex; align-items: flex-end; gap: 3px; height: 90px; margin-top: 10px; }
.spark i { flex: 1; border-radius: 3px 3px 0 0; background: linear-gradient(180deg, #22d3ee, rgba(34, 211, 238, 0.25)); }
.kv { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.kv-item { display: flex; flex-direction: column; gap: 4px; }
.kv-item .num { font-size: 22px; }
.path { font-family: monospace; font-size: 11.5px; color: #9ecbff; background: rgba(0, 0, 0, 0.3); padding: 3px 8px; border-radius: 6px; cursor: pointer; }
.seg-row { display: inline-flex; gap: 4px; padding: 3px; border-radius: 10px; background: var(--bg-glass); border: 1px solid var(--line-1); }
.seg-item { padding: 5px 14px; border-radius: 8px; font-size: 12.5px; color: var(--tx-3); cursor: pointer; }
.seg-item.active { background: var(--brand-soft); color: var(--brand); }
.secret-card { border-color: var(--brand-line); }
.form-item { margin-bottom: 13px; }
.form-label { font-size: 12px; color: var(--tx-2); margin-bottom: 5px; display: block; }
.drawer-mask { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.55); z-index: 100; display: flex; align-items: center; justify-content: center; }
.modal { width: 640px; max-width: 92vw; max-height: 86vh; background: #0d1420; border: 1px solid var(--line-2); border-radius: 14px; display: flex; flex-direction: column; overflow: hidden; }
.drawer-head { flex: none; display: flex; align-items: center; justify-content: space-between; padding: 15px 20px; border-bottom: 1px solid var(--line-1); }
.drawer-title { font-size: 15px; font-weight: 700; color: var(--tx-1); }
.drawer-body { flex: 1; overflow-y: auto; padding: 16px 20px 22px; }
.sql-code { margin: 0; padding: 12px; border-radius: 10px; background: rgba(0, 0, 0, 0.35); border: 1px solid var(--line-1); font-family: monospace; font-size: 11.5px; color: #9ecbff; white-space: pre-wrap; }
.grow { flex: 1; min-width: 0; }
.pub-opts { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; max-height: 240px; overflow-y: auto; }
.tpl-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 12px; }
.db-card { border: 1px solid var(--line-1); border-radius: 14px; overflow: hidden; background: var(--bg-glass); }
.c-body { padding: 16px; }
.c-name { font-size: 14px; font-weight: 700; color: var(--tx-1); }
.c-desc { font-size: 12px; color: var(--tx-3); margin: 6px 0 12px; }
</style>
