<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import {
  reports,
  createReport,
  deleteReport,
  exportReport,
  REPORT_TYPES,
  type ReportItem,
} from '@/mock/reportData'
import { dataSetPagingQueryData, previewSqlDataSet, getSqlDataSet, type SqlDataSetForm } from '@/api/dataSet'
import { useOperationMessage } from '@/composables/useOperationMessage'
import { useConfirm } from '@/composables/useConfirm'
import '@/styles/datasource-page.css'

/**
 * 统计报表（对齐 prototypev2 report.html，本地适配为可创建）：
 * 类型筛选 + 报表清单 + 新建向导（绑定 SQL 数据集 → 真实预览取数 → 保存）+ 中国式样张 + 导出/订阅。
 * 报表清单持久化于 localStorage；报表引擎后端（P3 企业版）就绪后切换。
 */
const { success, fail } = useOperationMessage()
const { confirmAction } = useConfirm()

const typeFilter = ref<'全部' | (typeof REPORT_TYPES)[number]>('全部')
const selected = ref<ReportItem>(reports.value[0])

const filtered = computed(() => {
  if (typeFilter.value === '全部') return reports.value
  return reports.value.filter((r) => r.type === typeFilter.value)
})

function typeCount(t: string): number {
  return t === '全部' ? reports.value.length : reports.value.filter((r) => r.type === t).length
}

function selectReport(r: ReportItem) {
  selected.value = r
  liveData.value = null
  liveError.value = ''
  nextTick(() => selected.value.id === r.id && loadLive(r))
}

/** GET /api/dataSet/get 返回的是管理端完整实体；预览端点只接受最小表单（connectionFactory 等服务端字段会导致反序列化失败） */
function toPreviewForm(f: SqlDataSetForm, fallbackName = ''): SqlDataSetForm {
  return {
    id: f.id,
    name: f.name || fallbackName,
    sql: f.sql,
    dataSetType: 'SQL',
    mutableModel: f.mutableModel,
    params: f.params || [],
    dtbsCnFty: { dtbsSource: { id: f.dtbsCnFty?.dtbsSource?.id || '' } },
  }
}

/* ---------- 报表实时取数（绑定数据集的报表经 /dataSet/preview/SQL 渲染） ---------- */
const liveData = ref<{ columns: string[]; rows: string[][] } | null>(null)
const liveError = ref('')
const liveLoading = ref(false)

async function loadLive(r: ReportItem) {
  if (!r.dataSetId) return
  liveLoading.value = true
  liveError.value = ''
  try {
    const raw: SqlDataSetForm = await getSqlDataSet(r.dataSetId)
    const dsForm = toPreviewForm(raw, r.name)
    const res = await previewSqlDataSet(dsForm, { query: { resultFetchSize: 20, paramValues: {} } })
    const data = (res.result?.data ?? []) as Record<string, unknown>[]
    const fields = res.fields ?? []
    const columns = fields.map((f) => f.name || '')
    liveData.value = {
      columns,
      rows: data.slice(0, 12).map((row) => columns.map((c) => String(row[c] ?? '—'))),
    }
  } catch (e) {
    liveError.value = (e as Error).message || '取数失败，请检查数据集配置'
  } finally {
    liveLoading.value = false
  }
}

/* ---------- 导出 / 订阅 ---------- */
const exportOpen = ref(false)
const exportFormat = ref('xlsx')

function doExport() {
  if (!selected.value) return
  const res = exportReport(selected.value.name, exportFormat.value)
  exportOpen.value = false
  success(`已导出 ${res.file}（${res.size}，含水印）`)
}

function toggleSub(r: ReportItem) {
  confirmAction(
    r.subscribed ? `取消「${r.name}」的定时推送订阅吗？` : `订阅「${r.name}」将按定时任务推送到指定渠道，确认订阅吗？`,
    () => {
      r.subscribed = !r.subscribed
      success(r.subscribed ? '已订阅定时推送' : '已取消订阅')
    },
  )
}

/** 完成率着色（静态样张）：≥100 绿，<98 红 */
function rateClass(v: string): string {
  const n = parseFloat(v)
  if (!Number.isFinite(n)) return ''
  if (n >= 100) return 'rate-good'
  if (n < 98) return 'rate-bad'
  return ''
}

function onDelete(r: ReportItem) {
  confirmAction(`确定删除报表「${r.name}」吗？`, () => {
    deleteReport(r.id)
    if (selected.value?.id === r.id) selected.value = reports.value[0]
    success('报表已删除')
  })
}

/* ---------- 新建报表向导 ---------- */
const wizardOpen = ref(false)
const wizardStep = ref<0 | 1 | 2>(0)
const saving = ref(false)

const form = ref({
  name: '',
  type: '分组报表' as ReportItem['type'],
  org: '',
  owner: 'admin',
  dataSetId: '',
  dataSetName: '',
})

interface DsOption {
  id: string
  name: string
}
const dsOptions = ref<DsOption[]>([])
const dsLoading = ref(false)

async function openWizard() {
  wizardOpen.value = true
  wizardStep.value = 0
  form.value = { name: '', type: '分组报表', org: '', owner: 'admin', dataSetId: '', dataSetName: '' }
  if (!dsOptions.value.length) {
    dsLoading.value = true
    try {
      const data = await dataSetPagingQueryData({ page: 1, pageSize: 100 })
      dsOptions.value = data.items
        .filter((d) => (d as { dataSetType?: string }).dataSetType === 'SQL' || true) // 全类型可选，SQL 类型可直接预览
        .map((d) => ({ id: d.id, name: d.name }))
    } catch (e) {
      fail((e as Error).message || '数据集加载失败')
    } finally {
      dsLoading.value = false
    }
  }
}

function canNext(): boolean {
  if (wizardStep.value === 0) return !!form.value.name.trim()
  if (wizardStep.value === 1) return !!form.value.dataSetId
  return true
}

function wizardNext() {
  if (!canNext()) {
    fail(wizardStep.value === 0 ? '请填写报表名称' : '请选择数据集')
    return
  }
  if (wizardStep.value < 2) wizardStep.value++
}

/* 预览确认：绑定数据集真实取数填充样张 */
const previewCols = ref<string[]>([])
const previewRows = ref<string[][]>([])
const previewLoading = ref(false)

async function loadPreview() {
  if (!form.value.dataSetId) {
    fail('请先选择数据集')
    return
  }
  previewLoading.value = true
  previewCols.value = []
  previewRows.value = []
  try {
    const raw: SqlDataSetForm = await getSqlDataSet(form.value.dataSetId)
    const dsForm = toPreviewForm(raw, form.value.name)
    const res = await previewSqlDataSet(dsForm, { query: { resultFetchSize: 10, paramValues: {} } })
    const data = (res.result?.data ?? []) as Record<string, unknown>[]
    const fields = res.fields ?? []
    previewCols.value = fields.map((f) => f.name || '')
    previewRows.value = data.slice(0, 8).map((row) => previewCols.value.map((c) => String(row[c] ?? '—')))
    if (!previewRows.value.length) fail('该数据集无数据返回，样张将为空表')
  } catch (e) {
    fail((e as Error).message || '预览取数失败')
  } finally {
    previewLoading.value = false
  }
}

async function submitReport() {
  if (!form.value.name.trim()) {
    fail('请填写报表名称')
    wizardStep.value = 0
    return
  }
  if (!form.value.dataSetId) {
    fail('请绑定数据集')
    wizardStep.value = 1
    return
  }
  saving.value = true
  try {
    // 无预览列时先补一次真实取数
    let cols = previewCols.value
    let rows = previewRows.value
    if (!cols.length) {
      const raw: SqlDataSetForm = await getSqlDataSet(form.value.dataSetId)
      const dsForm = toPreviewForm(raw, form.value.name)
      const res = await previewSqlDataSet(dsForm, { query: { resultFetchSize: 10, paramValues: {} } })
      const data = (res.result?.data ?? []) as Record<string, unknown>[]
      cols = (res.fields ?? []).map((f) => f.name || '')
      rows = data.slice(0, 8).map((row) => cols.map((c) => String(row[c] ?? '—')))
    }
    const created = createReport({
      name: form.value.name.trim(),
      type: form.value.type,
      org: form.value.org,
      owner: form.value.owner,
      dataSetId: form.value.dataSetId,
      dataSetName: form.value.dataSetName,
      sql: '',
      columns: cols,
      rows,
    })
    selected.value = created
    liveData.value = null
    wizardOpen.value = false
    success(`报表「${created.name}」已创建`)
    loadLive(created)
  } catch (e) {
    fail((e as Error).message || '创建失败')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="ds-page">
    <!-- 页头 -->
    <div class="page-head">
      <div>
        <div class="page-title">统计报表 <span class="tag info">可创建</span></div>
        <div class="page-desc">中国式复杂报表 —— 分组 / 交叉 / 电子表格模板与定时推送（FR-RPT）</div>
      </div>
      <div class="page-actions">
        <button class="btn primary" type="button" @click="openWizard">＋ 新建报表</button>
      </div>
    </div>

    <!-- 类型筛选 -->
    <div class="seg-row mb-3">
      <span class="seg-item" :class="{ active: typeFilter === '全部' }" @click="typeFilter = '全部'">全部 {{ typeCount('全部') }}</span>
      <span v-for="t in REPORT_TYPES" :key="t" class="seg-item" :class="{ active: typeFilter === t }" @click="typeFilter = t">
        {{ t }} {{ typeCount(t) }}
      </span>
    </div>

    <div class="report-layout">
      <!-- 左：报表清单 -->
      <div class="card list-card">
        <div class="card-title"><i class="bar"></i>报表清单 <span class="more tx-4">目录 ›</span></div>
        <div
          v-for="r in filtered"
          :key="r.id"
          class="rep-item"
          :class="{ sel: selected?.id === r.id }"
          @click="selectReport(r)"
        >
          <div class="ri-name ellipsis" :title="r.name">{{ r.name }}</div>
          <div class="ri-meta">
            <span class="tag info">{{ r.type }}</span>
            <span class="sm tx-3">{{ r.updated }}</span>
            <span class="ri-del" title="删除" @click.stop="onDelete(r)">✕</span>
          </div>
        </div>
        <div v-if="!filtered.length" class="empty">该类型暂无报表，点击右上角「新建报表」</div>
      </div>

      <!-- 右：报表预览 -->
      <div class="card preview-card">
        <div class="card-title"><i class="bar"></i>{{ selected?.name || '报表' }} · 预览
          <span v-if="selected?.dataSetName" class="tag ok">绑定：{{ selected.dataSetName }}</span>
        </div>
        <div class="toolbar">
          <button class="btn sm" type="button" @click="exportOpen = true">导出 Excel</button>
          <button class="btn sm" type="button" @click="exportOpen = true">导出 PDF</button>
          <button class="btn sm" type="button" @click="toggleSub(selected)">定时推送</button>
          <button class="btn sm" type="button" @click="success('条件格式为企业版增值能力')">条件格式</button>
          <button class="btn sm" type="button" @click="success('已调起打印预览')">打印</button>
          <span class="tx-3 sm" style="margin-left: auto">
            {{ selected?.dataSetId ? `数据集：${selected.dataSetName} · 预览实时取数` : '静态样张（未绑定数据集）' }}
          </span>
        </div>

        <!-- 取数失败 -->
        <div v-if="liveError" class="empty" style="color: #f87171">{{ liveError }}</div>

        <!-- 绑定数据集：真实取数渲染 -->
        <template v-else-if="selected?.dataSetId">
          <div v-if="liveLoading" class="empty">取数中…</div>
          <div v-else-if="liveData" class="sheet">
            <div class="sheet-title">{{ selected.sheet.title }}</div>
            <div class="sheet-sub">
              <span><u>编制单位：{{ selected.sheet.org }}</u></span>
              <span><u>报表编号：{{ selected.sheet.no }}</u></span>
            </div>
            <div class="table-wrap">
              <table class="sheet-tbl">
                <thead>
                  <tr><th v-for="c in liveData.columns" :key="c">{{ c }}</th></tr>
                </thead>
                <tbody>
                  <tr v-for="(row, i) in liveData.rows" :key="i">
                    <td v-for="(cell, j) in row" :key="j">{{ cell }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div class="sheet-foot"><span>填报人：{{ selected.owner }}</span><span>上报日期：{{ selected.updated }}</span></div>
          </div>
        </template>

        <!-- 静态样张（历史演示报表） -->
        <div v-else-if="selected" class="sheet">
          <div class="sheet-title">{{ selected.sheet.title }}</div>
          <div class="sheet-sub">
            <span><u>编制单位：{{ selected.sheet.org }}</u></span>
            <span><u>单位：{{ selected.sheet.unit }}</u></span>
            <span><u>报表编号：{{ selected.sheet.no }}</u></span>
          </div>
          <table class="sheet-tbl">
            <thead>
              <tr>
                <th class="slash-th" rowspan="2">
                  <span class="sl-b">指标</span>
                  <span class="sl-a">类别</span>
                  <i class="slash-line"></i>
                </th>
                <th v-for="c in selected.sheet.cols" :key="c">{{ c }}</th>
              </tr>
              <tr>
                <th v-for="c in selected.sheet.cols" :key="c + '-sub'" class="sub-th">完成率(%)</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, i) in selected.sheet.rows" :key="i">
                <td class="row-head">{{ row[0] }}</td>
                <td class="num">{{ row[1] }}</td>
                <td class="num">{{ row[2] }}</td>
                <td class="num" :class="rateClass(row[4])">{{ row[4] }}</td>
              </tr>
            </tbody>
          </table>
          <div class="sheet-foot">
            <span>填报人：{{ selected.owner }}</span>
            <span>审核：生产运行部</span>
            <span>上报日期：2026-09-01</span>
          </div>
        </div>

        <div class="ent-bar mt-3">
          <b>企业版增值能力</b>：报表设计器、单元格公式计算、电子表格（类 Excel 在线建模）为企业版增值模块；开源版支持分组 / 交叉等基础报表模板与预览（FR-RPT，P3）
        </div>
      </div>
    </div>

    <!-- 导出弹窗 -->
    <div v-if="exportOpen" class="drawer-mask" @click="exportOpen = false">
      <div class="modal" @click.stop>
        <div class="drawer-head">
          <div class="drawer-title">导出 · {{ selected?.name }}</div>
          <button class="btn sm ghost" type="button" @click="exportOpen = false">✕</button>
        </div>
        <div class="drawer-body">
          <div class="form-item"><label class="form-label">格式</label>
            <select v-model="exportFormat" class="input"><option value="xlsx">Excel（.xlsx）</option><option value="pdf">PDF</option><option value="csv">CSV</option></select>
          </div>
          <div class="tx-3 sm">导出自动附加外发水印（用户 + 时间）</div>
          <div class="flex" style="gap: 10px; margin-top: 16px">
            <button class="btn primary grow" type="button" @click="doExport">导出</button>
            <button class="btn" type="button" @click="exportOpen = false">取消</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 新建报表向导 -->
    <div v-if="wizardOpen" class="drawer-mask" @click="wizardOpen = false">
      <div class="modal wizard-modal" @click.stop>
        <div class="drawer-head">
          <div class="drawer-title">新建报表</div>
          <button class="btn sm ghost" type="button" @click="wizardOpen = false">✕</button>
        </div>
        <div class="drawer-body">
          <div class="qb-steps mb-2">
            <span :class="{ cur: wizardStep >= 0 }">① 基本信息</span>
            <span :class="{ cur: wizardStep >= 1 }">② 绑定数据集</span>
            <span :class="{ cur: wizardStep >= 2 }">③ 预览确认</span>
          </div>

          <!-- 步骤1 基本信息 -->
          <template v-if="wizardStep === 0">
            <div class="form-item"><label class="form-label">报表名称 *</label><input v-model="form.name" class="input" placeholder="如：管输量日报" /></div>
            <div class="form-item"><label class="form-label">报表类型</label>
              <div class="seg-row">
                <span v-for="t in REPORT_TYPES" :key="t" class="seg-item" :class="{ active: form.type === t }" @click="form.type = t">{{ t }}</span>
              </div>
            </div>
            <div class="flex" style="gap: 12px">
              <div class="form-item grow"><label class="form-label">编制单位</label><input v-model="form.org" class="input" placeholder="如：生产运行部" /></div>
              <div class="form-item" style="width: 140px"><label class="form-label">负责人</label><input v-model="form.owner" class="input" /></div>
            </div>
          </template>

          <!-- 步骤2 绑定数据集 -->
          <template v-else-if="wizardStep === 1">
            <div class="tx-3 sm mb-2">选择已有数据集作为报表数据源，样张按数据集实时取数渲染</div>
            <div class="ds-picker">
              <div
                v-for="d in dsOptions"
                :key="d.id"
                class="qb-src"
                :class="{ sel: form.dataSetId === d.id }"
                @click="() => { form.dataSetId = d.id; form.dataSetName = d.name }"
              >
                <span class="cell-main">▦ {{ d.name }}</span>
              </div>
              <div v-if="dsLoading" class="empty">加载中…</div>
              <div v-else-if="!dsOptions.length" class="empty">暂无数据集，请先在「数据集」模块创建</div>
            </div>
          </template>

          <!-- 步骤3 预览确认 -->
          <template v-else>
            <div class="flex mb-2" style="gap: 10px; align-items: center">
              <span class="sm tx-3">报表：{{ form.name }} · {{ form.type }} · 数据集：{{ form.dataSetName || '—' }}</span>
              <button class="btn sm" style="margin-left: auto" type="button" :disabled="previewLoading" @click="loadPreview">
                {{ previewLoading ? '取数中…' : '▶ 加载真实数据' }}
              </button>
            </div>
            <div v-if="previewLoading" class="empty">取数中…</div>
            <div v-else-if="!previewCols.length" class="empty">点击「加载真实数据」预览样张（可选，保存后仍可实时取数）</div>
            <div v-else class="table-wrap">
              <table class="sheet-tbl preview-tbl">
                <thead><tr><th v-for="c in previewCols" :key="c">{{ c }}</th></tr></thead>
                <tbody><tr v-for="(row, i) in previewRows" :key="i"><td v-for="(cell, j) in row" :key="j">{{ cell }}</td></tr></tbody>
              </table>
            </div>
          </template>

          <div class="flex" style="gap: 10px; margin-top: 16px">
            <button class="btn" type="button" :disabled="wizardStep === 0" @click="wizardStep--">‹ 上一步</button>
            <button v-if="wizardStep < 2" class="btn primary" type="button" @click="wizardNext">下一步 ›</button>
            <button v-else class="btn primary grow" type="button" :disabled="saving" @click="submitReport">
              {{ saving ? '创建中…' : '创建报表' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.seg-row { display: inline-flex; gap: 4px; padding: 3px; border-radius: 10px; background: var(--bg-glass); border: 1px solid var(--line-1); flex-wrap: wrap; }
.seg-item { padding: 5px 14px; border-radius: 8px; font-size: 12.5px; color: var(--tx-3); cursor: pointer; }
.seg-item:hover { color: var(--tx-1); }
.seg-item.active { background: var(--brand-soft); color: var(--brand); }
.report-layout { display: grid; grid-template-columns: 260px 1fr; gap: 12px; align-items: start; }
.list-card { padding: 12px; }
.rep-item { padding: 10px 12px; border-radius: 10px; cursor: pointer; border: 1px solid transparent; }
.rep-item:hover { background: var(--bg-glass-2); }
.rep-item.sel { border-color: var(--brand-line); background: var(--brand-soft); }
.ri-name { font-size: 13px; font-weight: 600; color: var(--tx-1); }
.ri-meta { display: flex; gap: 8px; align-items: center; margin-top: 4px; }
.ri-del { margin-left: auto; color: var(--tx-4); cursor: pointer; font-size: 11px; }
.ri-del:hover { color: #f87171; }
.preview-card { padding: 14px; min-width: 0; }
.toolbar { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; margin-bottom: 14px; }
/* 中国式报表样张 */
.sheet { background: #fdfcf7; color: #1a2333; border-radius: 8px; padding: 18px 20px 14px; font-family: 'SimSun', 'Songti SC', serif; }
.sheet-title { text-align: center; font-size: 17px; font-weight: 700; letter-spacing: 2px; }
.sheet-sub { display: flex; justify-content: space-between; font-size: 11px; margin: 8px 2px 6px; color: #475069; }
.sheet-tbl { width: 100%; border-collapse: collapse; font-size: 12px; }
.sheet-tbl th, .sheet-tbl td { border: 1px solid #6b7280; padding: 5px 8px; text-align: center; }
.sheet-tbl th { background: #f1ede2; font-weight: 700; }
.sheet-tbl .row-head { background: #f7f5ee; font-weight: 700; text-align: left; }
.slash-th { position: relative; width: 110px; }
.slash-line { position: absolute; left: 8px; top: 6px; right: 8px; bottom: 6px; background: linear-gradient(to top right, transparent calc(50% - 0.5px), #6b7280 50%, transparent calc(50% + 0.5px)); }
.slash-th .sl-b { position: absolute; right: 8px; top: 6px; }
.slash-th .sl-a { position: absolute; left: 8px; bottom: 5px; }
.sub-th { font-weight: 400; }
.rate-good { color: #15803d; font-weight: 700; }
.rate-bad { color: #b91c1c; font-weight: 700; }
.preview-tbl td { text-align: left; }
.sheet-foot { display: flex; justify-content: space-between; font-size: 11px; margin-top: 8px; color: #475069; }
.num { font-family: 'Barlow', monospace; }
.ent-bar { padding: 10px 14px; border-radius: 10px; background: rgba(251, 191, 36, 0.1); border: 1px solid rgba(251, 191, 36, 0.3); font-size: 12px; color: var(--tx-2); }
.mt-3 { margin-top: 14px; }
.mb-3 { margin-bottom: 14px; }
.mb-2 { margin-bottom: 10px; }
.grow { flex: 1; min-width: 0; }
.ds-picker { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; max-height: 300px; overflow-y: auto; }
.qb-src { display: flex; flex-direction: column; gap: 3px; padding: 10px 12px; border: 1px solid var(--line-1); border-radius: 10px; cursor: pointer; }
.qb-src:hover { background: var(--bg-glass-2); }
.qb-src.sel { border-color: var(--brand-line); background: var(--brand-soft); }
.qb-steps { display: flex; gap: 8px; }
.qb-steps span { padding: 5px 12px; border-radius: 8px; font-size: 12px; color: var(--tx-4); background: var(--bg-glass); border: 1px solid var(--line-1); }
.qb-steps span.cur { color: var(--brand); border-color: var(--brand-line); background: var(--brand-soft); }
.form-item { margin-bottom: 13px; }
.form-label { font-size: 12px; color: var(--tx-2); margin-bottom: 5px; display: block; }
.drawer-mask { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.55); z-index: 100; display: flex; align-items: center; justify-content: center; }
.modal { max-height: 86vh; background: #0d1420; border: 1px solid var(--line-2); border-radius: 14px; display: flex; flex-direction: column; overflow: hidden; }
.wizard-modal { width: 660px; max-width: 94vw; }
.drawer-head { flex: none; display: flex; align-items: center; justify-content: space-between; padding: 15px 20px; border-bottom: 1px solid var(--line-1); }
.drawer-title { font-size: 15px; font-weight: 700; color: var(--tx-1); }
.drawer-body { flex: 1; overflow-y: auto; padding: 16px 20px 22px; }
.sql-code { margin: 0; padding: 10px 12px; border-radius: 8px; background: rgba(0, 0, 0, 0.35); border: 1px solid var(--line-1); font-family: monospace; font-size: 11.5px; color: #9ecbff; white-space: pre-wrap; }
</style>
