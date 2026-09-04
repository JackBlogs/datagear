<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  metricPagingQueryData,
  deleteMetrics,
  certifyMetric,
  queryMetric,
  queryMetricValue,
  listMetricVersions,
  type MetricEntity,
  type MetricQueryResult,
  type MetricVersion,
} from '@/api/metric'
import { useOperationMessage } from '@/composables/useOperationMessage'
import '@/styles/datasource-page.css'

/**
 * 指标中心（真实数据）：指标目录 / 认证 / 详情试算 / 版本历史。
 * 数据来自 /api/metric/*（语义层 MVP），详情抽屉内即时出数（口径透明化）。
 */
const router = useRouter()
const { success, fail } = useOperationMessage()

const metrics = ref<MetricEntity[]>([])
const loading = ref(false)
const keyword = ref('')
const activeDomain = ref('all')

/* ---------- 详情抽屉状态 ---------- */
const drawerMetric = ref<MetricEntity | null>(null)
const drawerValue = ref<{ value: unknown; sql: string; costMs: number } | null>(null)
const drawerDist = ref<MetricQueryResult | null>(null)
const drawerVersions = ref<MetricVersion[]>([])
const drawerLoading = ref(false)

function parseDims(m: MetricEntity): string[] {
  try {
    return JSON.parse(m.dimensionsJson || '[]')
  } catch {
    return []
  }
}

const domains = computed(() => {
  const map = new Map<string, number>()
  for (const m of metrics.value) {
    const d = m.bizDomain || '未分类'
    map.set(d, (map.get(d) || 0) + 1)
  }
  return Array.from(map.entries()).map(([name, count]) => ({ name, count }))
})

const filteredMetrics = computed(() => {
  let list = metrics.value
  if (activeDomain.value !== 'all') list = list.filter((m) => (m.bizDomain || '未分类') === activeDomain.value)
  const kw = keyword.value.trim().toLowerCase()
  if (kw)
    list = list.filter(
      (m) =>
        m.name.toLowerCase().includes(kw) ||
        (m.caliber || '').toLowerCase().includes(kw) ||
        (m.bizDomain || '').toLowerCase().includes(kw),
    )
  return [...list].sort((a, b) => (b.certified || 0) - (a.certified || 0))
})

const stats = computed(() => ({
  total: metrics.value.length,
  certified: metrics.value.filter((m) => m.certified).length,
  draft: metrics.value.filter((m) => !m.certified).length,
  domains: domains.value.length,
}))

/** 口径冲突检测（FR-SEM-03）：同名指标存在不同口径定义 */
const conflictNames = computed(() => {
  const byName = new Map<string, Set<string>>()
  for (const m of metrics.value) {
    const key = m.name.trim()
    if (!byName.has(key)) byName.set(key, new Set())
    if (m.caliber) byName.get(key)!.add(m.caliber.trim())
  }
  const conflicts = new Set<string>()
  for (const [name, calibers] of byName) if (calibers.size > 1) conflicts.add(name)
  return conflicts
})

function hasConflict(m: MetricEntity): boolean {
  return conflictNames.value.has(m.name.trim())
}

/** 口径冲突对比（FR-SEM-03）：同名指标不同口径并排对比 */
const conflictView = ref<{ name: string; items: MetricEntity[] } | null>(null)
function openConflict(m: MetricEntity) {
  const items = metrics.value.filter((x) => x.name.trim() === m.name.trim())
  conflictView.value = { name: m.name.trim(), items }
}

/** 维度分布条宽（按最大值归一化） */
function distBarWidth(v: unknown, rows: unknown[][]): string {
  const nums = rows.map((r) => Number(r[1])).filter((n) => Number.isFinite(n))
  const max = nums.length ? Math.max(...nums) : 0
  const val = Number(v)
  if (!max || !Number.isFinite(val)) return '4%'
  return Math.max(4, Math.round((val / max) * 100)) + '%'
}

function formatNum(v: unknown): string {
  const n = Number(v)
  return Number.isFinite(n) ? n.toLocaleString('zh-CN') : String(v ?? '—')
}

async function load() {
  loading.value = true
  try {
    const data = await metricPagingQueryData({ page: 1, pageSize: 500, orders: [{ name: 'createTime', type: 'DESC' }] })
    metrics.value = data.items
  } catch (e) {
    fail((e as Error).message || '查询失败')
  } finally {
    loading.value = false
  }
}

function setDomain(name: string) {
  activeDomain.value = name
}

/* ---------- 详情抽屉 ---------- */
async function openDrawer(m: MetricEntity) {
  drawerMetric.value = m
  drawerValue.value = null
  drawerDist.value = null
  drawerVersions.value = []
  drawerLoading.value = true

  const dims = parseDims(m)
  try {
    const [value, versions] = await Promise.all([queryMetricValue(m.id, {}), listMetricVersions(m.id)])
    drawerValue.value = value
    drawerVersions.value = versions
    if (dims.length) drawerDist.value = await queryMetric(m.id, { dimensions: [dims[0]], orderBy: 'value', limit: 20 })
  } catch (e) {
    fail((e as Error).message || '指标试算失败')
  } finally {
    drawerLoading.value = false
  }
}

function closeDrawer() {
  drawerMetric.value = null
}

/* ---------- 操作 ---------- */
async function onToggleCertify(m: MetricEntity) {
  try {
    await certifyMetric(m.id, !m.certified, m.certified ? '' : '口径已评审')
    success(m.certified ? '已取消认证' : '指标已认证')
    await load()
    if (drawerMetric.value?.id === m.id) drawerMetric.value = metrics.value.find((x) => x.id === m.id) ?? null
  } catch (e) {
    fail((e as Error).message || '操作失败')
  }
}

async function onDelete(m: MetricEntity) {
  if (!window.confirm(`确定删除指标「${m.name}」吗？删除后引用它的看板/图表将无法取数。`)) return
  try {
    await deleteMetrics([m.id])
    success('删除成功')
    closeDrawer()
    await load()
  } catch (e) {
    fail((e as Error).message || '删除失败')
  }
}

onMounted(load)
</script>

<template>
  <div class="ds-page" @click="drawerMetric && closeDrawer()">
    <!-- 页头 -->
    <div class="page-head" @click.stop>
      <div>
        <div class="page-title">指标中心 <span class="tag brand">语义层</span></div>
        <div class="page-desc">指标的唯一定义与消费中心 —— 一个指标，一个口径（FR-SEM-02/03）</div>
      </div>
      <div class="page-actions">
        <button class="btn primary" type="button" @click="router.push('/metric/add')">＋ 新建指标</button>
      </div>
    </div>

    <!-- 统计卡 -->
    <section class="stat-grid mb-3">
      <div class="stat-card">
        <div class="s-label">指标总数</div>
        <div class="s-value num">{{ stats.total }}</div>
        <div class="s-sub">语义层唯一事实源</div>
      </div>
      <div class="stat-card">
        <div class="s-label">已认证</div>
        <div class="s-value num" style="color: #34d399">{{ stats.certified }}</div>
        <div class="s-sub">口径已评审，优先展示</div>
      </div>
      <div class="stat-card">
        <div class="s-label">待认证</div>
        <div class="s-value num" style="color: #fbbf24">{{ stats.draft }}</div>
        <div class="s-sub">定义可用，待口径评审</div>
      </div>
      <div class="stat-card">
        <div class="s-label">业务域</div>
        <div class="s-value num" style="color: #60a5fa">{{ stats.domains }}</div>
        <div class="s-sub">按业务域组织目录</div>
      </div>
    </section>

    <div class="metric-layout">
      <!-- 左：业务域目录 -->
      <div class="card domain-panel" @click.stop>
        <div class="card-title"><i class="bar"></i>业务域目录</div>
        <div class="domain-item" :class="{ sel: activeDomain === 'all' }" @click="setDomain('all')">
          <span>全部指标</span><b>{{ metrics.length }}</b>
        </div>
        <div
          v-for="d in domains"
          :key="d.name"
          class="domain-item"
          :class="{ sel: activeDomain === d.name }"
          @click="setDomain(d.name)"
        >
          <span>{{ d.name }}</span><b>{{ d.count }}</b>
        </div>
      </div>

      <!-- 右：指标列表 -->
      <div class="metric-panel" @click.stop>
        <div class="flex mb-2" style="gap: 10px">
          <form class="flex grow" style="gap: 10px; max-width: 420px" @submit.prevent>
            <input v-model="keyword" class="input" placeholder="搜索指标名 / 口径 / 业务域" />
          </form>
          <span class="tx-3 sm" style="margin-left: auto; align-self: center">共 {{ filteredMetrics.length }} 个指标</span>
        </div>

        <div v-if="loading" class="empty">加载中…</div>
        <div v-else-if="!filteredMetrics.length" class="empty">
          暂无指标 —— 点击右上角「新建指标」，30 秒完成从数据表到语义指标的定义
        </div>

        <div v-for="m in filteredMetrics" :key="m.id" class="metric-card" @click="openDrawer(m)">
          <div class="mc-head">
            <span class="mc-name">{{ m.name }}</span>
            <span class="tag info">原子</span>
            <span v-if="m.certified" class="tag ok">已认证</span>
            <span v-if="hasConflict(m)" class="tag danger" title="点击查看口径冲突对比" @click.stop="openConflict(m)">口径冲突</span>
            <span class="tag" style="margin-left: auto">{{ m.bizDomain || '未分类' }}</span>
          </div>
          <div class="mc-caliber">{{ m.caliber || '（暂无口径说明）' }}</div>
          <div class="mc-def">
            <span class="tag">{{ m.aggType }}</span>
            <span class="tx-3 sm">{{ m.tableName }}.{{ m.valueField }}</span>
            <template v-if="parseDims(m).length">
              <span class="tx-4 sm">GROUP BY</span>
              <span v-for="d in parseDims(m)" :key="d" class="tag info">{{ d }}</span>
            </template>
            <span class="mc-owner">负责人：{{ m.owner || '-' }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 详情抽屉 -->
    <div v-if="drawerMetric" class="drawer-mask" @click="closeDrawer()">
      <div class="drawer" @click.stop>
        <div class="drawer-head">
          <div>
            <div class="drawer-title">
              {{ drawerMetric.name }}
              <span v-if="drawerMetric.certified" class="tag ok">已认证</span>
              <span class="tag info">原子</span>
            </div>
            <div class="tx-3 sm">{{ drawerMetric.bizDomain || '未分类' }} · 负责人：{{ drawerMetric.owner || '-' }}</div>
          </div>
          <div class="flex" style="gap: 8px">
            <button class="btn sm" type="button" @click="onToggleCertify(drawerMetric)">
              {{ drawerMetric.certified ? '取消认证' : '认证' }}
            </button>
            <button class="btn sm" type="button" @click="router.push(`/metric/${drawerMetric.id}/edit`)">编辑</button>
            <button class="btn sm danger" type="button" @click="onDelete(drawerMetric)">删除</button>
            <button class="btn sm ghost" type="button" @click="closeDrawer()">✕</button>
          </div>
        </div>

        <div class="drawer-body">
          <div class="card mb-3">
            <div class="card-title"><i class="bar"></i>口径定义</div>
            <div class="def-caliber">{{ drawerMetric.caliber || '（暂无口径说明，建议补充口径避免歧义）' }}</div>
            <div class="mc-def" style="margin-top: 8px">
              <span class="tag">{{ drawerMetric.aggType }}</span>
              <span class="tx-3 sm">{{ drawerMetric.tableName }}.{{ drawerMetric.valueField }}</span>
              <template v-if="parseDims(drawerMetric).length">
                <span class="tx-4 sm">GROUP BY</span>
                <span v-for="d in parseDims(drawerMetric)" :key="d" class="tag info">{{ d }}</span>
              </template>
              <span v-if="drawerMetric.timeField" class="tag">时间：{{ drawerMetric.timeField }}</span>
            </div>
          </div>

          <div class="card mb-3">
            <div class="card-title"><i class="bar"></i>当前值（即时取数）</div>
            <div v-if="drawerLoading" class="empty">试算中…</div>
            <div v-else-if="drawerValue" class="drawer-kpi">
              <b class="num">{{ drawerValue.value ?? '—' }}</b>
              <span class="tx-3 sm">{{ drawerValue.costMs }}ms</span>
            </div>
            <pre v-if="drawerValue?.sql" class="sql-code">{{ drawerValue.sql }}</pre>
          </div>

          <div v-if="drawerDist" class="card mb-3">
            <div class="card-title"><i class="bar"></i>维度分布（{{ parseDims(drawerMetric)[0] }} · Top20）</div>
            <div class="dist-list">
              <div v-for="(r, i) in drawerDist.rows.slice(0, 12)" :key="i" class="dist-row">
                <span class="d-name ellipsis">{{ r[0] }}</span>
                <div class="d-bar-wrap">
                  <div
                    class="d-bar"
                    :style="{ width: distBarWidth(r[1], drawerDist.rows) }"
                  ></div>
                </div>
                <span class="d-val num">{{ formatNum(r[1]) }}</span>
              </div>
            </div>
            <div class="sql-code" style="margin-top: 10px">{{ drawerDist.sql }}</div>
          </div>

          <div class="card">
            <div class="card-title"><i class="bar"></i>版本历史（FR-SEM-05）</div>
            <div v-if="!drawerVersions.length" class="empty">暂无版本记录（保存/认证时自动快照）</div>
            <div v-for="v in drawerVersions" :key="v.id" class="version-item">
              <span class="tag brand">v{{ v.versionNo }}</span>
              <span>{{ v.changeNote || '定义快照' }}</span>
              <span class="tx-3 sm" style="margin-left: auto">{{ v.createTime }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 口径冲突对比弹窗 -->
    <div v-if="conflictView" class="drawer-mask" @click="conflictView = null">
      <div class="modal" @click.stop>
        <div class="drawer-head">
          <div class="drawer-title">口径冲突 · {{ conflictView.name }}</div>
          <button class="btn sm ghost" type="button" @click="conflictView = null">✕</button>
        </div>
        <div class="drawer-body">
          <div class="tx-3 sm" style="margin-bottom: 12px">
            同名指标存在 {{ conflictView.items.length }} 种不同口径定义 —— 请统一为唯一定义（一个指标，一个口径）：
          </div>
          <div v-for="(it, i) in conflictView.items" :key="it.id" class="cf-item" :class="{ alt: i % 2 === 1 }">
            <div class="cf-head">
              <span class="tag" :class="it.certified ? 'ok' : 'danger'">{{ it.certified ? '已认证口径' : '未认证口径' }}</span>
              <span class="sm tx-4">{{ it.bizDomain || '未分类' }} · {{ it.owner || '—' }} · {{ it.tableName }}.{{ it.valueField }}（{{ it.aggType }}）</span>
            </div>
            <div class="cf-caliber">{{ it.caliber || '（未填写口径说明）' }}</div>
          </div>
          <div class="flex" style="gap: 10px; margin-top: 14px">
            <button class="btn primary" type="button" @click="router.push('/metric/add'); conflictView = null">新建统一口径指标</button>
            <button class="btn" type="button" @click="conflictView = null">稍后处理</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.cf-item { padding: 12px 14px; border: 1px solid var(--line-1); border-radius: 10px; margin-bottom: 10px; }
.cf-item.alt { background: var(--bg-glass); }
.cf-head { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; margin-bottom: 6px; }
.cf-caliber { font-size: 13px; color: var(--tx-1); }
.modal { width: 620px; max-width: 92vw; max-height: 86vh; background: #0d1420; border: 1px solid var(--line-2); border-radius: 14px; display: flex; flex-direction: column; overflow: hidden; }
.drawer-head { flex: none; display: flex; align-items: center; justify-content: space-between; padding: 15px 20px; border-bottom: 1px solid var(--line-1); }
.drawer-title { font-size: 15px; font-weight: 700; color: var(--tx-1); }
.drawer-body { flex: 1; overflow-y: auto; padding: 16px 20px 22px; }

<style scoped>
.metric-layout { display: grid; grid-template-columns: 220px 1fr; gap: 12px; align-items: start; }
.domain-panel { padding: 12px; }
.domain-item {
  display: flex; justify-content: space-between; align-items: center;
  padding: 8px 10px; border-radius: 8px; font-size: 12.5px; color: var(--tx-2); cursor: pointer;
}
.domain-item:hover { background: var(--bg-glass-2); color: var(--tx-1); }
.domain-item.sel { background: var(--brand-soft); color: var(--brand); }
.domain-item b { font-size: 11px; color: var(--tx-4); }
.metric-panel { min-width: 0; }
.metric-card {
  padding: 14px 16px; border-radius: 12px; border: 1px solid var(--line-1); background: var(--bg-glass);
  margin-bottom: 10px; cursor: pointer; transition: border-color 0.15s;
}
.metric-card:hover { border-color: var(--brand-line); background: var(--bg-glass-2); }
.mc-head { display: flex; align-items: center; gap: 8px; }
.mc-name { font-size: 14px; font-weight: 700; color: var(--tx-1); }
.mc-caliber { font-size: 12px; color: var(--tx-3); margin: 6px 0; }
.mc-def { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.mc-owner { margin-left: auto; font-size: 11px; color: var(--tx-4); }
.dist-list { display: flex; flex-direction: column; gap: 8px; }
.dist-row { display: flex; align-items: center; gap: 10px; }
.d-name { width: 110px; flex: none; font-size: 12px; color: var(--tx-2); }
.d-bar-wrap { flex: 1; height: 16px; border-radius: 5px; background: var(--bg-glass-2); overflow: hidden; }
.d-bar { height: 100%; border-radius: 5px; background: linear-gradient(90deg, #b06a2a, var(--brand)); transition: width 0.4s; }
.d-val { width: 90px; flex: none; text-align: right; font-size: 12px; color: var(--tx-1); }
.def-caliber { font-size: 13px; color: var(--tx-1); }
.drawer-mask { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.55); z-index: 100; display: flex; align-items: center; justify-content: center; }
.drawer {
  /* 覆盖全局 .ds-page .drawer 滑入式抽屉定位（fixed/right:-480px/width 等），改为 flex 流内居中模态 */
  position: relative;
  top: auto;
  right: auto;
  width: 720px; max-width: 94vw; height: min(86vh, 900px); background: #0d1420;
  border: 1px solid var(--line-2); border-radius: 16px;
  display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 24px 70px rgba(0, 0, 0, 0.55);
}
.drawer-head {
  flex: none; display: flex; align-items: center; justify-content: space-between; gap: 10px;
  padding: 16px 20px; border-bottom: 1px solid var(--line-1);
}
.drawer-title { font-size: 16px; font-weight: 700; color: var(--tx-1); display: flex; gap: 8px; align-items: center; }
.drawer-body { flex: 1; overflow-y: auto; padding: 16px 20px 30px; }
.drawer-kpi { display: flex; align-items: baseline; gap: 10px; padding: 6px 0 10px; }
.drawer-kpi .num { font-size: 32px; color: var(--brand); }
.sql-code {
  margin: 8px 0 0; padding: 10px; border-radius: 8px; background: rgba(0, 0, 0, 0.35); border: 1px solid var(--line-1);
  font-family: monospace; font-size: 11.5px; color: #9ecbff; white-space: pre-wrap; word-break: break-all;
}
.version-item { display: flex; align-items: center; gap: 10px; padding: 8px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.05); font-size: 12.5px; }
.grow { flex: 1; min-width: 0; }
</style>
