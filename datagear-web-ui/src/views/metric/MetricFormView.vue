<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  getMetric,
  saveMetric,
  previewMetric,
  AGG_OPTIONS,
  type MetricEntity,
  type MetricQueryResult,
} from '@/api/metric'
import { dtbsSourcePagingQueryData, type DtbsSource } from '@/api/dtbsSource'
import { listTables, getTable, type SimpleTable, type ColumnMeta } from '@/api/dtbsSourceData'
import { useOperationMessage } from '@/composables/useOperationMessage'
import { useSteps } from '@/composables/useSteps'
import '@/styles/datasource-page.css'

/**
 * 指标定义向导（对齐 PRD 页面2：选数据源 → 选表 → 定义维度/度量 → 属性 → 预览 → 保存）。
 * 复用 /metric/:id/edit、/metric/:id/view。
 */
const route = useRoute()
const router = useRouter()
const { success, fail } = useOperationMessage()

const mode = computed<'add' | 'edit' | 'view'>(() =>
  route.name === 'metricAdd' ? 'add' : route.name === 'metricEdit' ? 'edit' : 'view',
)
const editId = computed(() => (mode.value === 'add' ? '' : (route.params.id as string)))
const readonly = computed(() => mode.value === 'view')

const STEPS = ['选择数据源', '选择数据表', '定义度量与维度', '指标属性', '预览验证']
const { current, isFirst, isLast, next, prev, go } = useSteps(STEPS)

const loading = ref(false)
const saving = ref(false)
const previewing = ref(false)

/* ---------- 表单模型 ---------- */
const sources = ref<DtbsSource[]>([])
const tables = ref<SimpleTable[]>([])
const columns = ref<ColumnMeta[]>([])

const sourceId = ref('')
const tableName = ref('')
const valueField = ref('')
const aggType = ref('SUM')
const dimensions = ref<string[]>([])
const timeField = ref('')
const name = ref('')
const caliber = ref('')
const bizDomain = ref('')
const owner = ref('')

const previewResult = ref<MetricQueryResult | null>(null)
const previewValue = ref<MetricQueryResult | null>(null)

const NUMERIC_HINT = /(INT|DECIMAL|NUMERIC|NUMBER|DOUBLE|FLOAT|REAL|BIGINT|SMALLINT|LONG)/i

function isNumericColumn(c: ColumnMeta): boolean {
  return NUMERIC_HINT.test(c.typeName || '') || NUMERIC_HINT.test(String(c.type))
}

function buildMetric(): MetricEntity {
  return {
    id: editId.value,
    name: name.value.trim(),
    caliber: caliber.value.trim(),
    metricType: 'atomic',
    sourceId: sourceId.value,
    tableName: tableName.value,
    valueField: valueField.value,
    aggType: aggType.value,
    dimensionsJson: JSON.stringify(dimensions.value),
    timeField: timeField.value,
    bizDomain: bizDomain.value.trim(),
    owner: owner.value.trim(),
    certified: 0,
  }
}

/* ---------- 步骤数据加载 ---------- */
async function loadSources() {
  const data = await dtbsSourcePagingQueryData({ page: 1, pageSize: 100 })
  sources.value = data.items
}

async function selectSource(id: string) {
  if (readonly.value && sourceId.value === id) return
  sourceId.value = id
  tableName.value = ''
  valueField.value = ''
  dimensions.value = []
  timeField.value = ''
  columns.value = []
  tables.value = await listTables(id)
}

async function selectTable(t: string) {
  tableName.value = t
  valueField.value = ''
  dimensions.value = []
  timeField.value = ''
  columns.value = []
  const meta = await getTable(sourceId.value, t)
  columns.value = meta.columns ?? []
}

function toggleDimension(c: string) {
  const i = dimensions.value.indexOf(c)
  if (i >= 0) dimensions.value.splice(i, 1)
  else dimensions.value.push(c)
}

/* ---------- 校验 ---------- */
function stepClickable(target: number): boolean {
  if (readonly.value) return true
  if (target <= current.value) return true
  if (target === current.value + 1) return canNext()
  return false
}

function canNext(): boolean {
  if (current.value === 0) return !!sourceId.value
  if (current.value === 1) return !!tableName.value
  if (current.value === 2) return !!valueField.value
  if (current.value === 3) return !!name.value.trim()
  return true
}

function onNext() {
  if (!canNext()) {
    fail('请先完成当前步骤的必选项')
    return
  }
  if (current.value === 4) return
  if (current.value === 2 && !columns.value.length) {
    getTable(sourceId.value, tableName.value).then((meta) => {
      columns.value = meta.columns ?? []
    })
  }
  next()
}

/* ---------- 预览 ---------- */
async function doPreview() {
  previewing.value = true
  try {
    const metric = buildMetric()
    const firstDim = dimensions.value[0]
    previewValue.value = await previewMetric(metric, { dimensions: [], limit: 1 })
    previewResult.value = firstDim
      ? await previewMetric(metric, { dimensions: [firstDim], orderBy: 'value', limit: 20 })
      : null
  } catch (e) {
    fail((e as Error).message || '试算失败')
  } finally {
    previewing.value = false
  }
}

/* ---------- 保存 ---------- */
async function onSave() {
  if (!name.value.trim()) {
    fail('请填写指标名称')
    go(3)
    return
  }
  saving.value = true
  try {
    await saveMetric(buildMetric())
    success(mode.value === 'edit' ? '指标已更新' : '指标已创建')
    router.push('/metrics')
  } catch (e) {
    fail((e as Error).message || '保存失败')
  } finally {
    saving.value = false
  }
}

/* ---------- 初始化 ---------- */
onMounted(async () => {
  loading.value = true
  try {
    await loadSources()
    if (mode.value !== 'add') {
      const m = await getMetric(editId.value)
      sourceId.value = m.sourceId
      tableName.value = m.tableName
      valueField.value = m.valueField
      aggType.value = m.aggType
      try {
        dimensions.value = JSON.parse(m.dimensionsJson || '[]')
      } catch {
        dimensions.value = []
      }
      timeField.value = m.timeField
      name.value = m.name
      caliber.value = m.caliber
      bizDomain.value = m.bizDomain
      owner.value = m.owner

      tables.value = await listTables(m.sourceId)
      if (m.tableName) {
        const meta = await getTable(m.sourceId, m.tableName)
        columns.value = meta.columns ?? []
      }
      if (readonly.value) go(4)
    }
  } catch (e) {
    fail((e as Error).message || '加载失败')
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="ds-page">
    <div class="page-head">
      <div>
        <div class="page-title">
          {{ mode === 'add' ? '新建指标' : mode === 'edit' ? '编辑指标' : '查看指标' }}
          <span class="tag brand">语义层 · 口径唯一事实源</span>
        </div>
        <div class="page-desc">原子指标 = 数值字段 + 聚合方式 + 维度；定义后可被看板/指标卡/问数统一消费</div>
      </div>
      <div class="page-actions">
        <button class="btn" type="button" @click="router.push('/metrics')">返回列表</button>
        <button v-if="!readonly" class="btn primary" type="button" :disabled="saving" @click="onSave">
          {{ saving ? '保存中…' : '保存指标' }}
        </button>
      </div>
    </div>

    <!-- 步骤条 -->
    <div class="metric-steps mb-3">
      <button
        v-for="(s, i) in STEPS"
        :key="s"
        class="m-step"
        :class="{ cur: i === current, done: i < current, ok: stepClickable(i) }"
        type="button"
        @click="stepClickable(i) && go(i)"
      >
        <b>{{ i + 1 }}</b>{{ s }}
      </button>
    </div>

    <div v-if="loading" class="empty">加载中…</div>

    <!-- Step 1 数据源 -->
    <div v-else-if="current === 0" class="card">
      <div class="card-title"><i class="bar"></i>选择数据源</div>
      <div class="src-cats">
        <div
          v-for="s in sources"
          :key="s.id"
          class="src-cat"
          :class="{ sel: sourceId === s.id }"
          @click="selectSource(s.id)"
        >
          <div class="c-icon">DB</div>
          <div>
            <div class="c-name">{{ s.title }}</div>
            <div class="c-sub">{{ s.url }}</div>
          </div>
        </div>
        <div v-if="!sources.length" class="empty">暂无数据源，请先在「数据源」模块创建</div>
      </div>
    </div>

    <!-- Step 2 数据表 -->
    <div v-else-if="current === 1" class="card">
      <div class="card-title"><i class="bar"></i>选择数据表（{{ tables.length }}）</div>
      <div class="table-list">
        <div
          v-for="t in tables"
          :key="t.name"
          class="table-item"
          :class="{ sel: tableName === t.name }"
          @click="selectTable(t.name)"
        >
          <span class="t-icon">T</span>
          <span class="cell-main">{{ t.name }}</span>
          <span class="tx-3 sm">{{ t.comment || t.type || '' }}</span>
        </div>
        <div v-if="!tables.length" class="empty">该数据源暂无数据表</div>
      </div>
    </div>

    <!-- Step 3 字段定义 -->
    <div v-else-if="current === 2" class="card">
      <div class="card-title"><i class="bar"></i>定义度量与维度（{{ tableName }} · {{ columns.length }} 列）</div>
      <div class="form-item">
        <label class="form-label">数值字段（度量） *</label>
        <select v-model="valueField" class="input" :disabled="readonly">
          <option value="">请选择…</option>
          <option v-for="c in columns" :key="c.name" :value="c.name">
            {{ c.name }}（{{ c.typeName || c.type }}）{{ isNumericColumn(c) ? ' ✓数值' : '' }}
          </option>
        </select>
      </div>
      <div class="form-item">
        <label class="form-label">聚合方式 *</label>
        <div class="seg-row">
          <span
            v-for="a in AGG_OPTIONS"
            :key="a.value"
            class="seg-item"
            :class="{ active: aggType === a.value }"
            @click="!readonly && (aggType = a.value)"
          >
            {{ a.label }}
          </span>
        </div>
      </div>
      <div class="form-item">
        <label class="form-label">分析维度（可多选）</label>
        <div class="chip-zone">
          <span v-for="c in columns" :key="c.name" class="dim-item" :class="{ on: dimensions.includes(c.name) }" @click="!readonly && toggleDimension(c.name)">
            {{ c.name }}<small>{{ c.typeName }}</small>
          </span>
        </div>
      </div>
      <div class="form-item">
        <label class="form-label">时间字段（可选，用于趋势与时间窗）</label>
        <select v-model="timeField" class="input" :disabled="readonly">
          <option value="">无</option>
          <option v-for="c in columns" :key="c.name" :value="c.name">{{ c.name }}（{{ c.typeName }}）</option>
        </select>
      </div>
    </div>

    <!-- Step 4 属性 -->
    <div v-else-if="current === 3" class="card">
      <div class="card-title"><i class="bar"></i>指标属性</div>
      <div class="form-item">
        <label class="form-label">指标名称 *（同业务域下唯一）</label>
        <input v-model="name" class="input" :readonly="readonly" placeholder="如：销售额" />
      </div>
      <div class="form-item">
        <label class="form-label">口径说明（他人理解此指标的唯一依据）</label>
        <textarea v-model="caliber" class="input" rows="3" :readonly="readonly" placeholder="如：全区域销售金额合计，含税"></textarea>
      </div>
      <div class="flex" style="gap: 14px">
        <div class="form-item grow">
          <label class="form-label">业务域</label>
          <input v-model="bizDomain" class="input" :readonly="readonly" placeholder="如：经营分析" />
        </div>
        <div class="form-item grow">
          <label class="form-label">负责人</label>
          <input v-model="owner" class="input" :readonly="readonly" placeholder="如：admin" />
        </div>
      </div>
      <div class="def-summary">
        <span class="tag brand">{{ name || '（未命名指标）' }}</span> =
        <span class="tag">{{ aggType }}</span>( <span class="tag info">{{ tableName }}.{{ valueField || '?' }}</span> )
        <template v-if="dimensions.length"> GROUP BY <span v-for="d in dimensions" :key="d" class="tag">{{ d }}</span></template>
      </div>
    </div>

    <!-- Step 5 预览 -->
    <div v-else class="card">
      <div class="card-title">
        <i class="bar"></i>预览验证
        <button class="btn sm" type="button" style="margin-left: auto" :disabled="previewing || readonly" @click="doPreview">
          {{ previewing ? '试算中…' : '▶ 执行试算' }}
        </button>
      </div>

      <div v-if="!previewValue" class="empty">点击「执行试算」验证口径出数</div>
      <template v-else>
        <div class="preview-kpi">
          <span class="tx-3 sm">指标总值</span>
          <b class="num">{{ previewValue.rows[0]?.[0] ?? '—' }}</b>
          <span class="tx-3 sm">（{{ previewValue.costMs }}ms）</span>
        </div>
        <div v-if="previewResult" class="preview-table">
          <div class="tx-3 sm mb-2">按「{{ dimensions[0] }}」维度 Top20</div>
          <div class="table-wrap">
            <table class="tbl">
              <thead>
                <tr>
                  <th v-for="c in previewResult.columns" :key="c">{{ c }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(r, i) in previewResult.rows" :key="i">
                  <td v-for="(cell, j) in r" :key="j" :class="{ num: j > 0 }">{{ cell }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <div class="sql-view">
          <div class="tx-3 sm mb-2">编译 SQL（取数逻辑透明化）</div>
          <pre class="sql-code">{{ previewResult?.sql || previewValue.sql }}</pre>
        </div>
      </template>
    </div>

    <!-- 底部导航 -->
    <div class="flex mt-3" style="gap: 10px">
      <button class="btn" type="button" :disabled="isFirst" @click="prev">‹ 上一步</button>
      <button v-if="!isLast" class="btn primary" type="button" @click="onNext">下一步 ›</button>
      <span class="tx-3 sm" style="margin-left: auto" v-if="!readonly && isLast">确认无误后点击右上角「保存指标」</span>
    </div>
  </div>
</template>

<style scoped>
.metric-steps { display: flex; gap: 8px; flex-wrap: wrap; }
.m-step {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 8px 16px; border-radius: 10px; border: 1px solid var(--line-1);
  background: var(--bg-glass); color: var(--tx-3); cursor: default; font-size: 12.5px; font-family: inherit;
}
.m-step b {
  width: 20px; height: 20px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;
  background: var(--bg-glass-2); font-size: 11px; color: var(--tx-3);
}
.m-step.ok { cursor: pointer; color: var(--tx-2); }
.m-step.cur { border-color: var(--brand-line); color: var(--tx-1); background: var(--brand-soft); }
.m-step.cur b { background: var(--brand-grad); color: #241105; }
.m-step.done b { background: rgba(52, 211, 153, 0.25); color: #34d399; }
.table-list { display: flex; flex-direction: column; gap: 6px; max-height: 420px; overflow-y: auto; }
.table-item {
  display: flex; align-items: center; gap: 10px; padding: 9px 12px; border-radius: 10px;
  border: 1px solid var(--line-1); cursor: pointer;
}
.table-item:hover { background: var(--bg-glass-2); }
.table-item.sel { border-color: var(--brand-line); background: var(--brand-soft); }
.t-icon {
  width: 26px; height: 26px; border-radius: 7px; background: var(--bg-glass-2); color: var(--brand);
  display: inline-flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; flex: none;
}
.form-item { margin-bottom: 14px; }
.form-label { font-size: 12px; color: var(--tx-2); margin-bottom: 5px; display: block; }
.seg-row { display: flex; gap: 6px; flex-wrap: wrap; }
.chip-zone { display: flex; gap: 6px; flex-wrap: wrap; }
.dim-item {
  padding: 5px 12px; border-radius: 8px; border: 1px solid var(--line-2); font-size: 12px;
  color: var(--tx-2); cursor: pointer; display: inline-flex; gap: 6px; align-items: baseline;
}
.dim-item small { color: var(--tx-4); font-size: 10px; }
.dim-item:hover { background: var(--bg-glass-2); }
.dim-item.on { border-color: var(--brand-line); background: var(--brand-soft); color: var(--brand); }
.def-summary { padding: 12px; border-radius: 10px; background: var(--bg-glass); border: 1px dashed var(--line-2); font-size: 12.5px; display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
.preview-kpi { display: flex; align-items: baseline; gap: 10px; padding: 14px; border-radius: 10px; background: var(--bg-glass); margin-bottom: 12px; }
.preview-kpi .num { font-size: 30px; color: var(--brand); }
.sql-code {
  margin: 0; padding: 12px; border-radius: 10px; background: rgba(0, 0, 0, 0.35); border: 1px solid var(--line-1);
  font-family: monospace; font-size: 12px; color: #9ecbff; white-space: pre-wrap; word-break: break-all;
}
.mt-3 { margin-top: 16px; }
</style>
