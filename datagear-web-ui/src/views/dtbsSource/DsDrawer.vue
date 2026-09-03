<script setup lang="ts">
import { ref, computed, watch, onBeforeUnmount, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import type * as echartsType from 'echarts'
import type { DtbsSource } from '@/api/dtbsSource'
import { deriveDsType, maskUrl, CATEGORY_STYLE } from './dsType'
import type { HealthRecord } from './dsHealth'

// 数据源详情抽屉（对应原型 datasource.html 的 .drawer）：
// 连接信息 KV / 元数据采集开关（localStorage，后端无此能力）/ 会话内连接健康度折线 / 底部操作。
// echarts 按需动态导入，避免列表页首屏块过大。
const props = defineProps<{
  ds: DtbsSource | null
  show: boolean
  /** 表数量（懒加载，undefined 表示未加载） */
  tableCount?: number
  /** 可见性（懒加载：private/shared，undefined 表示未加载） */
  visibility?: 'private' | 'shared'
  /** 本次会话健康度记录 */
  health: HealthRecord[]
  testing?: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'test'): void
  (e: 'auth'): void
}>()

const { t } = useI18n()

const typeInfo = computed(() => deriveDsType(props.ds?.url))
const iconStyle = computed(() => {
  const s = CATEGORY_STYLE[typeInfo.value.category]
  return { color: s.color, background: s.bg }
})

// ---- 元数据采集开关：纯 UI 状态，存 localStorage（后端无此能力，见任务核验） ----
const META_KEY = 'dg.ds.metaCollect'
const metaOn = ref(false)

function loadMeta() {
  if (!props.ds) return
  try {
    const all = JSON.parse(localStorage.getItem(META_KEY) ?? '{}') as Record<string, boolean>
    metaOn.value = all[props.ds.id] ?? false
  } catch {
    metaOn.value = false
  }
}

function toggleMeta() {
  if (!props.ds) return
  try {
    const all = JSON.parse(localStorage.getItem(META_KEY) ?? '{}') as Record<string, boolean>
    all[props.ds.id] = metaOn.value
    localStorage.setItem(META_KEY, JSON.stringify(all))
  } catch {
    // localStorage 不可用时静默失败（纯 UI 开关）
  }
}

// ---- 健康度图表：会话内测试结果按时间累计 ----
const chartEl = ref<HTMLElement | null>(null)
let chart: echartsType.ECharts | null = null

const healthSummary = computed(() => {
  const list = props.health
  const total = list.length
  const okCount = list.filter((r) => r.ok).length
  return {
    total,
    okCount,
    rate: total ? `${((okCount / total) * 100).toFixed(1)}%` : '-',
  }
})

async function renderChart() {
  if (!chartEl.value) return
  const echarts = await import('echarts')
  if (!chartEl.value) return
  if (!chart) chart = echarts.init(chartEl.value)
  const list = props.health
  chart.setOption({
    grid: { left: 4, right: 12, top: 26, bottom: 2, containLabel: true },
    tooltip: {
      trigger: 'axis',
      formatter: (ps: unknown) => {
        const arr = ps as { name: string; data: number }[]
        const p = arr[0]
        if (!p) return ''
        return `${p.name} · ${p.data === 1 ? t('dsPage.stOk') : t('dsPage.stFail')}`
      },
    },
    xAxis: {
      type: 'category',
      data: list.map((r) => r.time),
      axisLabel: { color: '#7C88A0', fontSize: 10 },
      axisLine: { lineStyle: { color: 'rgba(255,255,255,.12)' } },
    },
    yAxis: {
      type: 'value',
      min: -0.2,
      max: 1.2,
      interval: 1,
      axisLabel: {
        color: '#7C88A0',
        fontSize: 10,
        formatter: (v: number) => (v === 1 ? t('dsPage.healthOk') : v === 0 ? t('dsPage.healthFail') : ''),
      },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,.06)' } },
    },
    series: [
      {
        name: t('dsPage.health'),
        type: 'line',
        smooth: false,
        symbol: 'circle',
        symbolSize: 7,
        step: 'end',
        data: list.map((r) => (r.ok ? 1 : 0)),
        lineStyle: { width: 2.5, color: '#34D399' },
        itemStyle: {
          color: (p: { dataIndex: number }) => (list[p.dataIndex]?.ok ? '#34D399' : '#F87171'),
        },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(52,211,153,.25)' },
              { offset: 1, color: 'rgba(52,211,153,0)' },
            ],
          },
        },
      },
    ],
  })
}

watch(
  () => [props.show, props.health.length, props.ds?.id] as const,
  async () => {
    if (props.show) {
      loadMeta()
      await nextTick()
      if (props.health.length) await renderChart()
      chart?.resize()
    }
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  chart?.dispose()
  chart = null
})

const DB_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5"/><path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/></svg>'
const X_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>'
</script>

<template>
  <div class="drawer" :class="{ show }">
    <div class="drawer-head">
      <div class="d-icon" :style="iconStyle" v-html="DB_ICON"></div>
      <div>
        <div style="font-size:15px;font-weight:700">{{ ds?.title }}</div>
        <div class="sm tx-3">
          {{ typeInfo.label }} · {{ t('dsPage.colCreator') }} {{ ds?.createUser?.realName || ds?.createUser?.name || '-' }}
          <template v-if="ds?.createTime"> · {{ ds.createTime }}</template>
        </div>
      </div>
      <button class="drawer-close" type="button" @click="emit('close')" v-html="X_ICON"></button>
    </div>
    <div class="drawer-body">
      <div class="sec-label">{{ t('dsPage.connInfo') }}</div>
      <div class="card" style="padding:6px 14px">
        <div class="kv"><span class="k">{{ t('dsPage.connUrl') }}</span><span class="v mono">{{ maskUrl(ds?.url) }}</span></div>
        <div class="kv"><span class="k">{{ t('dsPage.dbType') }}</span><span class="v">{{ typeInfo.label }}</span></div>
        <div class="kv"><span class="k">{{ t('dsPage.account') }}</span><span class="v mono">{{ ds?.user || '-' }}</span></div>
        <div class="kv">
          <span class="k">{{ t('password') }}</span>
          <span class="v"><span class="tag ok">{{ t('dsPage.pwdEncrypted') }}</span></span>
        </div>
        <div class="kv"><span class="k">Schema</span><span class="v mono">{{ ds?.schemaName || '-' }}</span></div>
        <div class="kv"><span class="k">{{ t('dsPage.colTables') }}</span><span class="v num">{{ tableCount ?? '-' }}</span></div>
        <div class="kv">
          <span class="k">{{ t('dsPage.colVisibility') }}</span>
          <span class="v">
            <span v-if="visibility" class="tag" :class="{ info: visibility === 'shared' }">
              {{ visibility === 'shared' ? t('dsPage.visShared') : t('dsPage.visPrivate') }}
            </span>
            <span v-else>-</span>
          </span>
        </div>
        <div class="kv"><span class="k">{{ t('createTime') }}</span><span class="v">{{ ds?.createTime || '-' }}</span></div>
      </div>

      <div class="sec-label">{{ t('dsPage.metaCollect') }}</div>
      <div class="card" style="padding:12px 14px">
        <div class="flex-between">
          <div>
            <div style="font-size:13px;font-weight:600">{{ t('dsPage.metaCollectTitle') }}</div>
            <div class="sm tx-3">{{ t('dsPage.metaCollectDesc') }}</div>
          </div>
          <label class="switch"><input type="checkbox" v-model="metaOn" @change="toggleMeta" /><i></i></label>
        </div>
      </div>

      <div class="sec-label">{{ t('dsPage.health') }}</div>
      <div class="card" style="padding:12px 14px 4px">
        <div v-if="health.length" ref="chartEl" style="height:150px;min-height:150px;width:100%"></div>
        <div v-else class="empty" style="padding:24px 12px">{{ t('dsPage.healthEmpty') }}</div>
        <div v-if="health.length" class="flex-between sm tx-3" style="padding:8px 0 10px">
          <span>{{ t('dsPage.stOk') }} <b class="num" style="color:var(--ok)">{{ healthSummary.okCount }}</b></span>
          <span>{{ t('dsPage.stFail') }} <b class="num" style="color:var(--danger)">{{ healthSummary.total - healthSummary.okCount }}</b></span>
          <span>OK率 <b class="num" style="color:var(--tx-1)">{{ healthSummary.rate }}</b></span>
        </div>
      </div>

      <div class="flex mt-3" style="gap:10px">
        <button class="btn primary grow" type="button" style="justify-content:center" :disabled="testing" @click="emit('test')">
          {{ testing ? t('loading') : t('testConnection') }}
        </button>
        <button class="btn grow" type="button" style="justify-content:center" @click="emit('auth')">{{ t('dsPage.authShare') }}</button>
      </div>
    </div>
  </div>
</template>
