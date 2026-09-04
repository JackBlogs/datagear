<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  qualityRules,
  qualityIssues,
  sensitiveFields,
  metaTables,
  activeMetaTable,
  standards,
  mergeMetaTables,
  updateColumnSensitive,
  saveQualityRule,
  updateQualityRule,
  deleteQualityRule,
  saveIssue,
  resolveIssue,
  toggleQualityRule,
  saveStandard,
  updateStandard,
  deleteStandard,
  publishStandard,
  addSensitive,
  judgeSamples,
  fetchColumnSample,
  isValidIdentifier,
  identifyValue,
  type QualityRule,
  type QualityIssue,
  type MetaTable,
  type MetaColumn,
  type StdItem,
} from '@/mock/governanceData'
import { dtbsSourcePagingQueryData, type DtbsSource } from '@/api/dtbsSource'
import { listTables, getTable } from '@/api/dtbsSourceData'
import { dataSetPagingQueryData, getSqlDataSet, type SqlDataSetForm } from '@/api/dataSet'
import { useOperationMessage } from '@/composables/useOperationMessage'
import { useConfirm } from '@/composables/useConfirm'
import '@/styles/datasource-page.css'

/**
 * 数据治理（拿来直接能用版）：
 * - 元数据：采集自真实数据源（表/列结构），字段详情/批量标注
 * - 数据质量：规则绑定真实表字段，「运行校验」拉样本行前端确定性判定，通过率/异常为真实结果
 * - 数据安全：列样本正则识别敏感字段（手机号/身份证/银行卡/邮箱），识别结果入清单
 * - 数据血缘：解析 SQL 数据集的 FROM/JOIN 表，生成真实表级血缘
 * - 数据标准：配置数据 CRUD + 状态流转
 */
const { success, fail } = useOperationMessage()
const { confirmAction } = useConfirm()

type Pane = 'meta' | 'std' | 'quality' | 'lineage' | 'secure'
const pane = ref<Pane>('meta')

/* 数据源列表（多个功能共用） */
const sources = ref<DtbsSource[]>([])
async function loadSources() {
  try {
    const d = await dtbsSourcePagingQueryData({ page: 1, pageSize: 100 })
    sources.value = d.items
  } catch { /* ignore */ }
}
function sourceTitle(id: string): string {
  return sources.value.find((s) => s.id === id)?.title || id
}

/* ================================================================ */
/* ======================== 元数据 ================================ */
/* ================================================================ */
const metaKw = ref('')
const fieldDrawer = ref<{ table: MetaTable; col: MetaColumn } | null>(null)
const batchOpen = ref(false)
const batchSel = ref<string[]>([])
const batchSensitive = ref('手机号')
const SENSITIVE_LEVELS = ['—', '手机号', '身份证', '银行卡', '邮箱', '地址']

const currentTable = computed(() => metaTables.value.find((t) => t.name === activeMetaTable.value) ?? metaTables.value[0])
const filteredColumns = computed(() => {
  const cols = currentTable.value?.columns ?? []
  const kw = metaKw.value.trim().toLowerCase()
  if (!kw) return cols
  return cols.filter((c) => c.name.toLowerCase().includes(kw) || (c.desc || '').toLowerCase().includes(kw))
})

function openFieldDrawer(col: MetaColumn) {
  if (!currentTable.value) return
  fieldDrawer.value = { table: currentTable.value, col }
}

function setFieldSensitive(table: MetaTable, colName: string, level: string) {
  updateColumnSensitive(table.name, table.sourceId, colName, level)
  const col = table.columns.find((x) => x.name === colName)
  if (col) col.sensitive = level
  if (level !== '—') {
    addSensitive({
      id: 'SF-' + table.name + '-' + colName,
      field: colName,
      tableName: table.name,
      sourceId: table.sourceId,
      type: level,
      hits: 0,
      sample: '—',
      mode: '手动标记',
      rule: '待配置',
    })
  }
  success(`「${colName}」敏感级别已设为 ${level === '—' ? '无' : level}`)
}

function toggleBatchSel(name: string) {
  const i = batchSel.value.indexOf(name)
  if (i >= 0) batchSel.value.splice(i, 1)
  else batchSel.value.push(name)
}

function submitBatch() {
  const table = currentTable.value
  if (!table) return
  batchSel.value.forEach((colName) => {
    updateColumnSensitive(table.name, table.sourceId, colName, batchSensitive.value)
    const col = table.columns.find((x) => x.name === colName)
    if (col) col.sensitive = batchSensitive.value
  })
  success(`已批量标注 ${batchSel.value.length} 个字段为「${batchSensitive.value}」`)
  batchOpen.value = false
  batchSel.value = []
}

/* ================================================================ */
/* ======================== 数据标准 ============================== */
/* ================================================================ */
const stdDrawer = ref<StdItem | null>(null)
const stdEditId = ref('')
const stdForm = ref<{ name: string; category: string; summary: string; owner: string } | null>(null)
const STD_CATS = ['命名规范', '值域', '格式']

function openStdDrawer(s: StdItem) {
  stdDrawer.value = { ...s }
}
function openStdEdit(s?: StdItem) {
  stdEditId.value = s?.id ?? ''
  stdForm.value = s
    ? { name: s.name, category: s.category, summary: s.summary, owner: s.owner }
    : { name: '', category: '命名规范', summary: '', owner: 'admin' }
  stdDrawer.value = null
}
function submitStd() {
  if (!stdForm.value) return
  if (!stdForm.value.name || !stdForm.value.summary) {
    fail('请填写标准名称与内容摘要')
    return
  }
  if (stdEditId.value) {
    const target = standards.value.find((x) => x.id === stdEditId.value)
    if (target) {
      target.name = stdForm.value.name
      target.category = stdForm.value.category
      target.summary = stdForm.value.summary
      target.owner = stdForm.value.owner
      updateStandard(target)
    }
    success('标准已更新')
  } else {
    saveStandard(stdForm.value)
    success('数据标准已保存（试行）')
  }
  stdForm.value = null
}
function publishStd(s: StdItem) {
  publishStandard(s.id)
  success(`标准「${s.name}」已发布`)
  if (stdDrawer.value?.id === s.id) stdDrawer.value = { ...s, status: '已发布' }
}
function onDeleteStd(s: StdItem) {
  confirmAction(`确定删除标准「${s.name}」吗？`, () => {
    deleteStandard(s.id)
    if (stdDrawer.value?.id === s.id) stdDrawer.value = null
    success('标准已删除')
  })
}

/* ================================================================ */
/* ======================== 数据质量（真实执行） =================== */
/* ================================================================ */
const qualityScore = computed(() => {
  const runs = qualityRules.value.map((r) => r.lastRun).filter(Boolean)
  if (!runs.length) return '—'
  return (runs.reduce((s, r) => s + (r?.passRate ?? 0), 0) / runs.length).toFixed(1)
})
const openIssues = computed(() => qualityIssues.value.filter((i) => !i.resolved))

function onToggleRule(id: string) {
  const enabled = toggleQualityRule(id)
  success(`规则已${enabled ? '启用' : '停用'}`)
}

const ruleForm = ref<{
  id?: string
  name: string
  type: '非空' | '唯一' | '范围' | '格式'
  sourceId: string
  tableName: string
  columnName: string
  threshold: string
  freq: string
} | null>(null)
const ruleSourceId = ref('')
const ruleTables = ref<string[]>([])
const ruleColumns = ref<string[]>([])
const RULE_TYPES = ['非空', '唯一', '范围', '格式']
const FREQ_OPTS = ['每天 02:00', '每天 22:00', '每小时', '手动']

async function openRuleForm(r?: QualityRule) {
  ruleForm.value = r
    ? {
        id: r.id, name: r.name, type: r.type, sourceId: r.sourceId,
        tableName: r.tableName, columnName: r.columnName, threshold: r.threshold, freq: r.freq,
      }
    : { name: '', type: '非空', sourceId: ruleSourceId.value, tableName: '', columnName: '', threshold: '', freq: '每天 22:00' }
  if (!sources.value.length) await loadSources()
  if (ruleForm.value.sourceId && !ruleTables.value.length) {
    try {
      ruleTables.value = (await listTables(ruleForm.value.sourceId)).map((t) => t.name)
    } catch { /* ignore */ }
  }
}

async function onRuleSourceChange() {
  if (!ruleForm.value) return
  ruleForm.value.tableName = ''
  ruleForm.value.columnName = ''
  ruleTables.value = []
  try {
    ruleTables.value = (await listTables(ruleForm.value.sourceId)).map((t) => t.name)
  } catch { /* ignore */ }
}

async function onRuleTableChange() {
  if (!ruleForm.value) return
  try {
    const meta = await getTable(ruleForm.value.sourceId, ruleForm.value.tableName)
    ruleColumns.value = (meta.columns ?? []).map((c) => c.name)
  } catch {
    ruleColumns.value = []
  }
}

function submitRule() {
  const f = ruleForm.value
  if (!f) return
  if (!f.name || !f.sourceId || !f.tableName || !f.columnName) {
    fail('请完整填写名称并绑定数据源/表/字段')
    return
  }
  if ((f.type === '范围' || f.type === '格式') && !f.threshold) {
    fail(`「${f.type}」规则需要填写阈值（范围如 0~100，格式如正则）`)
    return
  }
  const base = {
    name: f.name.trim(), type: f.type, sourceId: f.sourceId,
    sourceName: sourceTitle(f.sourceId), tableName: f.tableName, columnName: f.columnName,
    threshold: f.threshold, freq: f.freq, enabled: true,
  }
  if (f.id) {
    const target = qualityRules.value.find((x) => x.id === f.id)
    if (target) updateQualityRule({ ...target, ...base })
    success('规则已更新')
  } else {
    saveQualityRule(base)
    success('质量规则已保存并启用')
  }
  ruleForm.value = null
}

function onDeleteRule(r: QualityRule) {
  confirmAction(`确定删除规则「${r.name}」吗？`, () => {
    deleteQualityRule(r.id)
    success('规则已删除')
  })
}

const runningId = ref('')
async function runRule(r: QualityRule) {
  if (!isValidIdentifier(r.tableName) || !isValidIdentifier(r.columnName)) {
    fail('表名/字段名不合法')
    return
  }
  runningId.value = r.id
  try {
    const values = await fetchColumnSample(r.sourceId, r.tableName, r.columnName, 500)
    const { total, failed } = judgeSamples(r.type, values, r.threshold)
    const passRate = total ? Math.round(((total - failed) / total) * 1000) / 10 : 100
    const time = new Date().toLocaleString('zh-CN', { hour12: false })
    const target = qualityRules.value.find((x) => x.id === r.id)
    if (target) {
      target.lastRun = { time, passRate, total, failed, sample: values.length }
      updateQualityRule(target)
    }
    if (passRate < 98) {
      saveIssue({
        id: 'QI-' + Date.now() % 100000,
        ruleId: r.id,
        rule: r.name,
        target: `${r.tableName}.${r.columnName}`,
        detail: `样本 ${total} 行中 ${failed} 行不满足「${r.type}${r.threshold ? ' ' + r.threshold : ''}」`,
        time: time.slice(5),
        level: passRate < 95 ? 'danger' : 'warn',
        failed,
        total,
      })
    }
    success(`校验完成：通过率 ${passRate}%（${failed}/${total} 不通过）`)
  } catch (e) {
    fail((e as Error).message || '校验执行失败')
  } finally {
    runningId.value = ''
  }
}

/* 异常处理弹窗（L3） */
const issueView = ref<QualityIssue | null>(null)
const issueNote = ref('')
function openIssue(i: QualityIssue) {
  issueView.value = { ...i }
  issueNote.value = ''
}
function submitIssue() {
  if (!issueView.value) return
  resolveIssue(issueView.value.id, issueNote.value)
  success('异常已标记处理')
  issueView.value = null
}

/* ================================================================ */
/* ======================== 数据安全（真实识别） =================== */
/* ================================================================ */
const scanOpen = ref(false)
const scanning = ref(false)
const scanSourceId = ref('')
const scanTable = ref('')
const scanTables = ref<string[]>([])
const scanColumns = ref<string[]>([])
const scanSel = ref<string[]>([])
const scanResult = ref<{ col: string; type: string; hits: number; sample: string }[]>([])

async function openScan() {
  scanOpen.value = true
  scanResult.value = []
  if (!sources.value.length) await loadSources()
}
async function onScanSourceChange() {
  scanTable.value = ''
  scanColumns.value = []
  scanSel.value = []
  if (!scanSourceId.value) return
  try {
    scanTables.value = (await listTables(scanSourceId.value)).map((t) => t.name)
  } catch { scanTables.value = [] }
}
async function onScanTableChange() {
  scanColumns.value = []
  scanSel.value = []
  if (!scanTable.value) return
  try {
    const meta = await getTable(scanSourceId.value, scanTable.value)
    scanColumns.value = (meta.columns ?? []).map((c) => c.name)
  } catch { scanColumns.value = [] }
}
function toggleScanCol(c: string) {
  const i = scanSel.value.indexOf(c)
  if (i >= 0) scanSel.value.splice(i, 1)
  else scanSel.value.push(c)
}

async function runScan() {
  if (!scanSel.value.length) {
    fail('请选择要扫描的列')
    return
  }
  scanning.value = true
  scanResult.value = []
  try {
    for (const col of scanSel.value) {
      let values: string[] = []
      try {
        values = await fetchColumnSample(scanSourceId.value, scanTable.value, col, 200)
      } catch { /* 单列失败跳过 */ }
      const counts = new Map<string, { hits: number; sample: string }>()
      for (const v of values) {
        if (!v) continue
        const t = identifyValue(v)
        if (t) {
          const e = counts.get(t) || { hits: 0, sample: v.length > 18 ? v.slice(0, 15) + '…' : v }
          e.hits++
          counts.set(t, e)
        }
      }
      for (const [type, info] of counts) {
        scanResult.value.push({ col, type, hits: info.hits, sample: info.sample })
      }
    }
    if (!scanResult.value.length) success('扫描完成：所选列未发现敏感数据')
    else success(`扫描完成：发现 ${scanResult.value.length} 处疑似敏感列`)
  } finally {
    scanning.value = false
  }
}

function addScanToSecure(row: { col: string; type: string; hits: number; sample: string }) {
  addSensitive({
    id: 'SF-' + scanTable.value + '-' + row.col,
    field: row.col,
    tableName: scanTable.value,
    sourceId: scanSourceId.value,
    type: row.type,
    hits: row.hits,
    sample: row.sample,
    mode: '扫描识别',
    rule: '待配置',
  })
  success(`「${row.col}」已加入敏感清单`)
}

/* ================================================================ */
/* ======================== 数据血缘（真实解析） =================== */
/* ================================================================ */
const lineageOpen = ref(false)
const lineageDsId = ref('')
const lineageDsName = ref('')
const lineageDsOptions = ref<{ id: string; name: string }[]>([])
const lineageNodes = ref<{ id: string; name: string; level: number }[]>([])
const lineageEdges = ref<{ from: string; to: string }[]>([])
const lineageBuilding = ref(false)
const nodeDetail = ref<string | null>(null)

const lineageCols = computed(() => {
  const maxLevel = Math.max(1, ...lineageNodes.value.map((n) => n.level))
  const cols: { id: string; name: string; level: number }[][] = []
  for (let l = 0; l <= maxLevel; l++) cols.push(lineageNodes.value.filter((n) => n.level === l))
  return cols
})

async function openLineage() {
  lineageOpen.value = true
  if (!lineageDsOptions.value.length) {
    try {
      const d = await dataSetPagingQueryData({ page: 1, pageSize: 100 })
      lineageDsOptions.value = d.items.map((x) => ({ id: x.id, name: x.name }))
    } catch { /* ignore */ }
  }
}

async function buildLineage() {
  if (!lineageDsId.value) {
    fail('请选择 SQL 数据集')
    return
  }
  lineageBuilding.value = true
  try {
    const form: SqlDataSetForm = await getSqlDataSet(lineageDsId.value)
    const dsName = form.name || lineageDsName.value
    const sql = form.sql || ''
    // 解析 FROM / JOIN 后的表名（标识符白名单过滤）
    const tables = new Set<string>()
    const re = /(?:from|join)\s+[`"\[]?([A-Za-z_][\w$]*)[`"\]]?/gi
    let m: RegExpExecArray | null
    while ((m = re.exec(sql))) {
      if (isValidIdentifier(m[1])) tables.add(m[1])
    }
    lineageNodes.value = [
      { id: '__ds__', name: dsName, level: 0 },
      ...[...tables].map((t) => ({ id: 'tbl_' + t, name: t, level: 1 })),
    ]
    lineageEdges.value = [...tables].map((t) => ({ from: '__ds__', to: 'tbl_' + t }))
    success(`已解析出 ${tables.size} 张来源表`)
    lineageOpen.value = false
  } catch (e) {
    fail((e as Error).message || '血缘解析失败')
  } finally {
    lineageBuilding.value = false
  }
}
function onLineageDsChange() {
  const d = lineageDsOptions.value.find((x) => x.id === lineageDsId.value)
  lineageDsName.value = d?.name || ''
}

/* ================================================================ */
/* ======================== 采集元数据 ============================= */
/* ================================================================ */
const collectOpen = ref(false)
const collecting = ref(false)
const collectSources = ref<DtbsSource[]>([])
const collectSel = ref<string[]>([])
const collectProgress = ref({ done: 0, total: 0, tables: 0 })
const COLLECT_TABLE_LIMIT = 20

async function openCollect() {
  collectOpen.value = true
  collectSel.value = []
  if (!sources.value.length) await loadSources()
}

function toggleCollectSource(id: string) {
  const i = collectSel.value.indexOf(id)
  if (i >= 0) collectSel.value.splice(i, 1)
  else collectSel.value.push(id)
}

async function runCollect() {
  if (!collectSel.value.length) {
    fail('请至少选择一个数据源')
    return
  }
  collecting.value = true
  collectProgress.value = { done: 0, total: 0, tables: 0 }
  const collected: MetaTable[] = []
  try {
    for (const sid of collectSel.value) {
      const src = sources.value.find((s) => s.id === sid)
      const tables = await listTables(sid)
      const limited = tables.slice(0, COLLECT_TABLE_LIMIT)
      collectProgress.value.total += limited.length
      for (const t of limited) {
        try {
          const meta = await getTable(sid, t.name)
          collected.push({
            name: t.name,
            source: src?.title || sid,
            sourceId: sid,
            rows: '—',
            columns: (meta.columns ?? []).slice(0, 60).map((c) => ({
              name: c.name,
              type: c.typeName || String(c.type),
              desc: c.comment || '—',
              sensitive: '—',
              rule: '—',
            })),
          })
        } catch { /* 单表读取失败不阻断整体 */ }
        collectProgress.value.done++
        collectProgress.value.tables = collected.length
      }
    }
    const r = mergeMetaTables(collected)
    success(`采集完成：新增 ${r.added} 张表，更新 ${r.updated} 张`)
    collectOpen.value = false
  } catch (e) {
    fail((e as Error).message || '采集失败')
  } finally {
    collecting.value = false
  }
}

/* ================================================================ */
onMounted(async () => {
  await loadSources()
  // 无元数据时自动尝试采集首个数据源（仅当用户已在治理页且没有任何数据）
  if (!metaTables.value.length && sources.value.length) {
    activeMetaTable.value = ''
  }
})
</script>

<template>
  <div class="ds-page">
    <!-- 页头 -->
    <div class="page-head">
      <div>
        <div class="page-title">数据治理 <span class="tag brand">FR-GOV</span></div>
        <div class="page-desc">元数据 — 数据标准 — 数据质量 — 数据血缘 — 数据安全（真实数据驱动）</div>
      </div>
      <div class="page-actions">
        <button class="btn primary" type="button" @click="openCollect">采集元数据</button>
      </div>
    </div>

    <!-- Tabs -->
    <div class="tabs-row mb-2">
      <div class="tab-item" :class="{ active: pane === 'meta' }" @click="pane = 'meta'">元数据 <em>{{ metaTables.length }}</em></div>
      <div class="tab-item" :class="{ active: pane === 'std' }" @click="pane = 'std'">数据标准 <em>{{ standards.length }}</em></div>
      <div class="tab-item" :class="{ active: pane === 'quality' }" @click="pane = 'quality'">
        数据质量 <em class="danger-tag">{{ openIssues.length }} 异常</em>
      </div>
      <div class="tab-item" :class="{ active: pane === 'lineage' }" @click="pane = 'lineage'">数据血缘</div>
      <div class="tab-item" :class="{ active: pane === 'secure' }" @click="pane = 'secure'">数据安全 <em>{{ sensitiveFields.length }}</em></div>
    </div>

    <!-- ===== 元数据 ===== -->
    <template v-if="pane === 'meta'">
      <div class="gov-layout">
        <div class="card meta-tree">
          <div class="card-title"><i class="bar"></i>元数据目录树</div>
          <div class="tree-node root">数据源</div>
          <div
            v-for="t in metaTables"
            :key="t.name + t.sourceId"
            class="tree-node tbl"
            :class="{ sel: activeMetaTable === t.name }"
            @click="activeMetaTable = t.name"
          >
            ▦ {{ t.name }}
          </div>
          <div v-if="!metaTables.length" class="empty" style="padding: 14px 6px">
            暂无元数据<br />点击右上角「采集元数据」从数据源读取表结构
          </div>
          <button v-if="metaTables.length" class="btn sm" style="margin-top: 12px" type="button" @click="batchOpen = true">批量标注 ›</button>
        </div>
        <div class="card meta-cols">
          <div class="card-title"><i class="bar"></i>{{ currentTable?.name || '字段清单' }}
            <span v-if="currentTable" class="sm tx-4" style="margin-left: auto">{{ currentTable.source }} · {{ currentTable.columns.length }} 字段</span>
          </div>
          <div v-if="!currentTable" class="empty">左侧选择一张表，或先采集元数据</div>
          <template v-else>
            <div class="flex mb-2" style="max-width: 340px">
              <input v-model="metaKw" class="input" placeholder="检索字段名 / 业务描述" />
            </div>
            <div class="table-wrap">
              <table class="tbl">
                <thead>
                  <tr><th style="width: 34px"></th><th>字段名</th><th style="width: 90px">类型</th><th>业务描述</th><th style="width: 90px">敏感级别</th><th style="width: 90px">操作</th></tr>
                </thead>
                <tbody>
                  <tr v-if="!filteredColumns.length"><td colspan="6"><div class="empty">没有匹配的字段</div></td></tr>
                  <tr v-for="c in filteredColumns" :key="c.name" class="meta-row" @click="openFieldDrawer(c)">
                    <td><input type="checkbox" :checked="batchSel.includes(c.name)" @click.stop @change="toggleBatchSel(c.name)" /></td>
                    <td><span class="cell-main">{{ c.name }}</span></td>
                    <td class="sm">{{ c.type }}</td>
                    <td class="sm tx-3">{{ c.desc }}</td>
                    <td>
                      <span v-if="c.sensitive !== '—'" class="tag danger">{{ c.sensitive }}</span>
                      <span v-else class="tx-4 sm">—</span>
                    </td>
                    <td @click.stop><span class="link" @click="openFieldDrawer(c)">详情</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div v-if="batchSel.length" class="batch-bar">
              已选 {{ batchSel.length }} 个字段
              <select v-model="batchSensitive" class="input" style="width: auto; padding: 4px 8px">
                <option v-for="lv in SENSITIVE_LEVELS" :key="lv" :value="lv">{{ lv === '—' ? '清除标记' : lv }}</option>
              </select>
              <button class="btn primary sm" type="button" @click="submitBatch">批量标注</button>
            </div>
          </template>
        </div>
      </div>
    </template>

    <!-- ===== 数据标准 ===== -->
    <template v-else-if="pane === 'std'">
      <div class="flex mb-2">
        <span class="tx-3 sm">标准被数据集 / 指标引用后，字段命名与值域自动校验</span>
        <button class="btn primary sm" style="margin-left: auto" type="button" @click="openStdEdit()">新建标准 ›</button>
      </div>
      <div class="table-wrap">
        <table class="tbl">
          <thead>
            <tr><th>标准名称</th><th style="width: 100px">类别</th><th>标准内容摘要</th><th style="width: 90px">状态</th><th style="width: 90px">被引用</th><th style="width: 110px">维护人</th><th style="width: 170px">操作</th></tr>
          </thead>
          <tbody>
            <tr v-if="!standards.length"><td colspan="7"><div class="empty">暂无数据标准</div></td></tr>
            <tr v-for="s in standards" :key="s.id" class="meta-row" @click="openStdDrawer(s)">
              <td><span class="cell-main">{{ s.name }}</span></td>
              <td><span class="tag info">{{ s.category }}</span></td>
              <td class="sm tx-3 ellipsis" style="max-width: 260px">{{ s.summary }}</td>
              <td><span class="tag" :class="s.status === '已发布' ? 'ok' : ''">{{ s.status }}</span></td>
              <td class="num">{{ s.refs }}</td>
              <td class="sm">{{ s.owner }}</td>
              <td @click.stop>
                <span class="link" @click="openStdEdit(s)">编辑</span> ·
                <span v-if="s.status !== '已发布'" class="link" @click="publishStd(s)">发布</span><span v-else class="tx-4 sm">—</span> ·
                <span class="link danger" @click="onDeleteStd(s)">删除</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <!-- ===== 数据质量 ===== -->
    <template v-else-if="pane === 'quality'">
      <div class="stat-grid mb-3">
        <div class="stat-card">
          <div class="s-label">数据质量总分</div>
          <div class="s-value num" style="color: #34d399">{{ qualityScore }}</div>
          <div class="s-sub">基于最近一次校验结果</div>
        </div>
        <div class="stat-card">
          <div class="s-label">质量规则</div>
          <div class="s-value num">{{ qualityRules.length }} <small>条</small></div>
          <div class="s-sub">绑定真实表字段</div>
        </div>
        <div class="stat-card">
          <div class="s-label">待处理异常</div>
          <div class="s-value num" style="color: #f87171">{{ openIssues.length }} <small>项</small></div>
          <div class="s-sub">通过率 &lt; 98% 自动生成</div>
        </div>
      </div>

      <div class="flex mb-2">
        <button class="btn primary sm" type="button" @click="openRuleForm()">＋ 新建质量规则</button>
        <span class="tx-3 sm" style="margin-left: auto">校验拉取真实样本行（≤500）前端确定性判定</span>
      </div>
      <div class="table-wrap mb-3">
        <table class="tbl">
          <thead>
            <tr><th>规则</th><th style="width: 80px">类型</th><th>校验对象</th><th style="width: 110px">最近校验</th><th style="width: 100px">通过率</th><th style="width: 90px">失败/总数</th><th style="width: 70px">启用</th><th style="width: 190px">操作</th></tr>
          </thead>
          <tbody>
            <tr v-if="!qualityRules.length"><td colspan="8"><div class="empty">暂无质量规则</div></td></tr>
            <tr v-for="r in qualityRules" :key="r.id">
              <td><span class="cell-main">{{ r.name }}</span></td>
              <td><span class="tag info">{{ r.type }}</span></td>
              <td class="sm tx-3">{{ r.tableName }}.{{ r.columnName }}</td>
              <td class="sm">{{ r.lastRun?.time || r.freq }}</td>
              <td>
                <span v-if="r.lastRun" class="num" :class="r.lastRun.passRate >= 99 ? 'ok-num' : (r.lastRun.passRate < 98 ? 'bad-num' : '')">{{ r.lastRun.passRate }}%</span>
                <span v-else class="tx-4 sm">未运行</span>
              </td>
              <td class="num">{{ r.lastRun ? `${r.lastRun.failed}/${r.lastRun.total}` : '—' }}</td>
              <td><label class="switch"><input type="checkbox" :checked="r.enabled" @change="onToggleRule(r.id)" /><i></i></label></td>
              <td>
                <span class="link" :class="{ disabled: runningId === r.id }" @click="runRule(r)">{{ runningId === r.id ? '校验中…' : '运行校验' }}</span> ·
                <span class="link" @click="openRuleForm(r)">编辑</span> ·
                <span class="link danger" @click="onDeleteRule(r)">删除</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="card issue-card">
        <div class="card-title"><i class="bar"></i>质量异常清单（点击处理）</div>
        <div v-for="i in qualityIssues" :key="i.id" class="issue-item" :class="i.resolved ? 'resolved' : i.level" @click="openIssue(i)">
          <span class="tag" :class="i.resolved ? 'ok' : i.level === 'danger' ? 'danger' : ''">{{ i.resolved ? '已处理' : i.level === 'danger' ? '严重' : '警告' }}</span>
          <b>{{ i.rule }}</b>
          <span class="sm tx-3 ellipsis" style="max-width: 320px">{{ i.target }} · {{ i.detail }}</span>
          <span class="sm tx-4" style="margin-left: auto">{{ i.time }}</span>
        </div>
        <div v-if="!qualityIssues.length" class="empty">暂无异常——运行校验后，通过率低于 98% 的规则会自动生成异常</div>
      </div>
    </template>

    <!-- ===== 数据血缘 ===== -->
    <template v-else-if="pane === 'lineage'">
      <div class="card lineage-card">
        <div class="card-title"><i class="bar"></i>数据集血缘（解析 SQL 数据集的 FROM / JOIN 表）
          <button class="btn sm primary" style="margin-left: auto" type="button" @click="openLineage">＋ 选择数据集生成</button>
        </div>
        <div class="flex mb-2" style="gap: 10px; align-items: center; flex-wrap: wrap">
          <select v-model="lineageDsId" class="input" style="width: auto" @change="onLineageDsChange">
            <option value="">选择 SQL 数据集…</option>
            <option v-for="d in lineageDsOptions" :key="d.id" :value="d.id">{{ d.name }}</option>
          </select>
          <button class="btn sm primary" type="button" :disabled="!lineageDsId || lineageBuilding" @click="buildLineage">
            {{ lineageBuilding ? '解析中…' : '生成血缘' }}
          </button>
        </div>
        <div v-if="lineageNodes.length" class="lineage-grid">
          <div v-for="(col, ci) in lineageCols" :key="ci" class="ln-col">
            <div class="ln-level">{{ ci === 0 ? '数据集' : '来源表' }}</div>
            <div
              v-for="n in col"
              :key="n.id"
              class="ln-node"
              :class="{ sel: nodeDetail === n.id }"
              @click="nodeDetail = nodeDetail === n.id ? null : n.id"
            >
              {{ n.name }}
            </div>
          </div>
        </div>
        <div v-if="nodeDetail" class="node-detail">
          <div class="nd-title">{{ lineageNodes.find((n) => n.id === nodeDetail)?.name }}</div>
          <div class="nd-row"><span class="f-lbl">层级</span><span>{{ nodeDetail === '__ds__' ? 'L0 数据集' : 'L1 来源表' }}</span></div>
          <div class="nd-row"><span class="f-lbl">说明</span><span>表级血缘，由 SQL 文本 FROM/JOIN 解析生成（FR-GOV-11 简化版）；字段级血缘需后端 SQL 解析器</span></div>
        </div>
        <div class="tx-3 sm" style="margin-top: 12px">
          解析失败的 SQL 标记「解析失败」不阻断保存（FR-GOV-11~13）。
        </div>
      </div>
    </template>

    <!-- ===== 数据安全 ===== -->
    <template v-else>
      <div class="flex mb-2" style="gap: 10px; align-items: center; flex-wrap: wrap">
        <button class="btn primary sm" type="button" @click="openScan">扫描敏感字段</button>
        <span class="tx-3 sm">对列采样跑正则识别（手机号/身份证/银行卡/邮箱），识别结果即敏感清单</span>
      </div>
      <div class="table-wrap">
        <table class="tbl">
          <thead>
            <tr><th>敏感字段</th><th style="width: 150px">所在表</th><th style="width: 90px">类型</th><th style="width: 90px">命中</th><th>样本</th><th style="width: 100px">方式</th></tr>
          </thead>
          <tbody>
            <tr v-if="!sensitiveFields.length"><td colspan="6"><div class="empty">暂无敏感字段——点击「扫描敏感字段」对真实表采样识别</div></td></tr>
            <tr v-for="s in sensitiveFields" :key="s.id">
              <td><span class="cell-main">{{ s.field }}</span></td>
              <td class="sm tx-3">{{ s.tableName }}</td>
              <td><span class="tag danger">{{ s.type }}</span></td>
              <td class="num">{{ s.hits || '—' }}</td>
              <td class="sm tx-3">{{ s.sample || '—' }}</td>
              <td class="sm">{{ s.mode }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="tx-3 sm" style="margin-top: 10px">
        动态脱敏在查询链路按角色生效（掩码/截断/替换/哈希四方式，FR-GOV-14~16）。
      </div>
    </template>

    <!-- ===== 采集元数据弹窗 ===== -->
    <div v-if="collectOpen" class="drawer-mask" @click="!collecting && (collectOpen = false)">
      <div class="modal" @click.stop>
        <div class="drawer-head">
          <div class="drawer-title">采集元数据 <span class="tag brand">datagear-meta</span></div>
          <button class="btn sm ghost" type="button" :disabled="collecting" @click="collectOpen = false">✕</button>
        </div>
        <div class="drawer-body">
          <div class="tx-3 sm mb-2">选择数据源，读取其库表列元信息并写入元数据目录（每源最多 {{ COLLECT_TABLE_LIMIT }} 张表）。同名同源表将被更新。</div>
          <template v-if="!collecting">
            <div class="form-item"><label class="form-label">选择数据源（可多选）</label>
              <div class="ds-picker">
                <div v-for="s in collectSources" :key="s.id" class="qb-src" :class="{ sel: collectSel.includes(s.id) }" @click="toggleCollectSource(s.id)">
                  <span class="cell-main">{{ s.title }}</span>
                  <span class="sm tx-4 ellipsis">{{ s.url }}</span>
                </div>
                <div v-if="!collectSources.length" class="empty">暂无数据源，请先在「数据源」模块创建</div>
              </div>
            </div>
          </template>
          <template v-else>
            <div class="collect-progress">
              <div class="cp-line">采集中… 已读取 {{ collectProgress.done }} / {{ collectProgress.total }} 张表</div>
              <div class="cp-bar"><i :style="{ width: collectProgress.total ? Math.round((collectProgress.done / collectProgress.total) * 100) + '%' : '0%' }"></i></div>
              <div class="tx-3 sm">已入库 {{ collectProgress.tables }} 张表</div>
            </div>
          </template>
          <div class="flex" style="gap: 10px; margin-top: 16px">
            <button v-if="!collecting" class="btn primary grow" type="button" @click="runCollect">开始采集</button>
            <button v-if="!collecting" class="btn" type="button" @click="collectOpen = false">取消</button>
          </div>
        </div>
      </div>
    </div>

    <!-- ===== 批量标注弹窗 ===== -->
    <div v-if="batchOpen" class="drawer-mask" @click="batchOpen = false">
      <div class="modal" @click.stop>
        <div class="drawer-head">
          <div class="drawer-title">批量标注 · {{ currentTable?.name }}</div>
          <button class="btn sm ghost" type="button" @click="batchOpen = false; batchSel = []">✕</button>
        </div>
        <div class="drawer-body">
          <div class="form-item"><label class="form-label">选择字段（可多选）</label>
            <div class="chip-zone">
              <span v-for="c in currentTable?.columns ?? []" :key="c.name" class="z-chip" :class="{ on: batchSel.includes(c.name) }" @click="toggleBatchSel(c.name)">
                {{ c.name }}
              </span>
            </div>
          </div>
          <div class="form-item"><label class="form-label">敏感级别</label>
            <select v-model="batchSensitive" class="input">
              <option v-for="lv in SENSITIVE_LEVELS" :key="lv" :value="lv">{{ lv === '—' ? '清除标记' : lv }}</option>
            </select>
          </div>
          <div class="flex" style="gap: 10px; margin-top: 14px">
            <button class="btn primary grow" type="button" :disabled="!batchSel.length" @click="submitBatch">应用标注（{{ batchSel.length }}）</button>
            <button class="btn" type="button" @click="batchOpen = false">取消</button>
          </div>
        </div>
      </div>
    </div>

    <!-- ===== 字段详情抽屉 ===== -->
    <div v-if="fieldDrawer" class="drawer-mask" @click="fieldDrawer = null">
      <div class="drawer" @click.stop>
        <div class="drawer-head">
          <div>
            <div class="drawer-title">{{ fieldDrawer.col.name }}</div>
            <div class="sm tx-3">{{ fieldDrawer.table.name }} · {{ fieldDrawer.col.type }}</div>
          </div>
          <button class="btn sm ghost" type="button" @click="fieldDrawer = null">✕</button>
        </div>
        <div class="drawer-body">
          <div class="card mb-3">
            <div class="card-title"><i class="bar"></i>字段信息</div>
            <div class="kv"><span class="k">业务描述</span><span class="v">{{ fieldDrawer.col.desc }}</span></div>
            <div class="kv"><span class="k">字段类型</span><span class="v">{{ fieldDrawer.col.type }}</span></div>
          </div>
          <div class="card mb-3">
            <div class="card-title"><i class="bar"></i>敏感级别（实时生效）</div>
            <div class="seg-row" style="margin-top: 8px">
              <span
                v-for="lv in SENSITIVE_LEVELS"
                :key="lv"
                class="seg-item"
                :class="{ active: fieldDrawer!.col.sensitive === lv }"
                @click="setFieldSensitive(fieldDrawer!.table, fieldDrawer!.col.name, lv)"
              >
                {{ lv === '—' ? '无' : lv }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ===== 标准详情抽屉 ===== -->
    <div v-if="stdDrawer" class="drawer-mask" @click="stdDrawer = null">
      <div class="drawer" @click.stop>
        <div class="drawer-head">
          <div>
            <div class="drawer-title">{{ stdDrawer.name }} <span class="tag" :class="stdDrawer.status === '已发布' ? 'ok' : ''">{{ stdDrawer.status }}</span></div>
            <div class="sm tx-3">{{ stdDrawer.category }} · 维护人 {{ stdDrawer.owner }}</div>
          </div>
          <button class="btn sm ghost" type="button" @click="stdDrawer = null">✕</button>
        </div>
        <div class="drawer-body">
          <div class="card mb-3">
            <div class="card-title"><i class="bar"></i>标准内容</div>
            <div class="def-caliber">{{ stdDrawer.summary }}</div>
            <div class="kv" style="margin-top: 8px"><span class="k">被引用</span><span class="v num">{{ stdDrawer.refs }} 处</span></div>
          </div>
          <div class="flex" style="gap: 10px">
            <button class="btn primary" type="button" @click="openStdEdit(stdDrawer)">编辑</button>
            <button v-if="stdDrawer.status !== '已发布'" class="btn" type="button" @click="publishStd(stdDrawer)">发布</button>
            <button class="btn danger" type="button" @click="onDeleteStd(stdDrawer)">删除</button>
          </div>
        </div>
      </div>
    </div>

    <!-- ===== 新建/编辑规则弹窗 ===== -->
    <div v-if="ruleForm" class="drawer-mask" @click="ruleForm = null">
      <div class="modal" @click.stop>
        <div class="drawer-head">
          <div class="drawer-title">{{ ruleForm.id ? '编辑质量规则' : '新建质量规则' }}</div>
          <button class="btn sm ghost" type="button" @click="ruleForm = null">✕</button>
        </div>
        <div class="drawer-body">
          <div class="form-item"><label class="form-label">规则名称 *</label><input v-model="ruleForm.name" class="input" placeholder="如：井号唯一性" /></div>
          <div class="form-item"><label class="form-label">数据源 *</label>
            <select v-model="ruleForm.sourceId" class="input" @change="onRuleSourceChange">
              <option value="">请选择…</option>
              <option v-for="s in sources" :key="s.id" :value="s.id">{{ s.title }}</option>
            </select>
          </div>
          <div class="form-item"><label class="form-label">数据表 *</label>
            <select v-model="ruleForm.tableName" class="input" @change="onRuleTableChange">
              <option value="">请选择…</option>
              <option v-for="t in ruleTables" :key="t" :value="t">{{ t }}</option>
            </select>
          </div>
          <div class="form-item"><label class="form-label">校验字段 *</label>
            <select v-model="ruleForm.columnName" class="input">
              <option value="">请选择…</option>
              <option v-for="c in ruleColumns" :key="c" :value="c">{{ c }}</option>
            </select>
          </div>
          <div class="flex" style="gap: 12px">
            <div class="form-item grow"><label class="form-label">规则类型 *</label>
              <select v-model="ruleForm.type" class="input"><option v-for="t in RULE_TYPES" :key="t" :value="t">{{ t }}</option></select>
            </div>
            <div class="form-item grow"><label class="form-label">阈值 / 正则（范围与格式必填）</label><input v-model="ruleForm.threshold" class="input" placeholder="范围：0~100" /></div>
          </div>
          <div class="form-item"><label class="form-label">检测频率</label>
            <select v-model="ruleForm.freq" class="input"><option v-for="f in FREQ_OPTS" :key="f" :value="f">{{ f }}</option></select>
          </div>
          <div class="flex" style="gap: 10px; margin-top: 14px">
            <button class="btn primary grow" type="button" @click="submitRule">保存并启用</button>
            <button class="btn" type="button" @click="ruleForm = null">取消</button>
          </div>
        </div>
      </div>
    </div>

    <!-- ===== 异常处理弹窗 ===== -->
    <div v-if="issueView" class="drawer-mask" @click="issueView = null">
      <div class="modal" @click.stop>
        <div class="drawer-head">
          <div class="drawer-title">异常处理 · {{ issueView.rule }}</div>
          <button class="btn sm ghost" type="button" @click="issueView = null">✕</button>
        </div>
        <div class="drawer-body">
          <div class="kv"><span class="k">校验对象</span><span class="v">{{ issueView.target }}</span></div>
          <div class="kv"><span class="k">触发详情</span><span class="v">{{ issueView.detail }}</span></div>
          <div class="kv"><span class="k">失败/总数</span><span class="v num">{{ issueView.failed }} / {{ issueView.total }}</span></div>
          <div class="form-item" style="margin-top: 14px"><label class="form-label">处理意见</label>
            <textarea v-model="issueNote" class="input" rows="3" placeholder="如：已通知源端补数，次日复检通过"></textarea>
          </div>
          <div class="flex" style="gap: 10px; margin-top: 14px">
            <button class="btn primary grow" type="button" @click="submitIssue">标记已处理</button>
            <button class="btn" type="button" @click="issueView = null">取消</button>
          </div>
        </div>
      </div>
    </div>

    <!-- ===== 扫描敏感字段弹窗 ===== -->
    <div v-if="scanOpen" class="drawer-mask" @click="!scanning && (scanOpen = false)">
      <div class="modal wizard-modal" @click.stop>
        <div class="drawer-head">
          <div class="drawer-title">扫描敏感字段 <span class="tag brand">真实采样识别</span></div>
          <button class="btn sm ghost" type="button" :disabled="scanning" @click="scanOpen = false">✕</button>
        </div>
        <div class="drawer-body">
          <div class="form-item"><label class="form-label">数据源 *</label>
            <select v-model="scanSourceId" class="input" @change="onScanSourceChange">
              <option value="">请选择…</option>
              <option v-for="s in sources" :key="s.id" :value="s.id">{{ s.title }}</option>
            </select>
          </div>
          <div class="form-item"><label class="form-label">数据表 *</label>
            <select v-model="scanTable" class="input" @change="onScanTableChange">
              <option value="">请选择…</option>
              <option v-for="t in scanTables" :key="t" :value="t">{{ t }}</option>
            </select>
          </div>
          <div class="form-item"><label class="form-label">扫描列（默认全部）</label>
            <div class="chip-zone">
              <span v-for="c in scanColumns" :key="c" class="z-chip" :class="{ on: scanSel.includes(c) }" @click="toggleScanCol(c)">{{ c }}</span>
            </div>
          </div>
          <button class="btn primary" style="margin-top: 8px" type="button" :disabled="scanning || !scanTable" @click="runScan">
            {{ scanning ? '扫描中…' : '开始扫描（采样 200 行）' }}
          </button>

          <div v-if="scanResult.length" class="table-wrap" style="margin-top: 14px">
            <table class="tbl">
              <thead><tr><th>列</th><th style="width: 90px">识别类型</th><th style="width: 80px">命中</th><th>样本</th><th style="width: 90px">操作</th></tr></thead>
              <tbody>
                <tr v-for="(r, i) in scanResult" :key="i">
                  <td>{{ r.col }}</td>
                  <td><span class="tag danger">{{ r.type }}</span></td>
                  <td class="num">{{ r.hits }}</td>
                  <td class="sm tx-3">{{ r.sample }}</td>
                  <td><span class="link" @click="addScanToSecure(r)">加入清单</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <!-- ===== 血缘生成弹窗 ===== -->
    <div v-if="lineageOpen" class="drawer-mask" @click="!lineageBuilding && (lineageOpen = false)">
      <div class="modal" @click.stop>
        <div class="drawer-head">
          <div class="drawer-title">生成数据集血缘</div>
          <button class="btn sm ghost" type="button" :disabled="lineageBuilding" @click="lineageOpen = false">✕</button>
        </div>
        <div class="drawer-body">
          <div class="tx-3 sm mb-2">选择 SQL 数据集，解析其 SQL 的 FROM / JOIN 表，生成数据集 → 来源表的真实血缘</div>
          <div class="form-item"><label class="form-label">SQL 数据集 *</label>
            <select v-model="lineageDsId" class="input" @change="onLineageDsChange">
              <option value="">请选择…</option>
              <option v-for="d in lineageDsOptions" :key="d.id" :value="d.id">{{ d.name }}</option>
            </select>
          </div>
          <div class="flex" style="gap: 10px; margin-top: 14px">
            <button class="btn primary grow" type="button" :disabled="lineageBuilding" @click="buildLineage">
              {{ lineageBuilding ? '解析中…' : '解析并生成' }}
            </button>
            <button class="btn" type="button" @click="lineageOpen = false">取消</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 新建/编辑标准弹窗 -->
    <div v-if="stdForm" class="drawer-mask" @click="stdForm = null">
      <div class="modal" @click.stop>
        <div class="drawer-head">
          <div class="drawer-title">{{ stdEditId ? '编辑数据标准' : '新建数据标准' }}</div>
          <button class="btn sm ghost" type="button" @click="stdForm = null">✕</button>
        </div>
        <div class="drawer-body">
          <div class="form-item"><label class="form-label">标准名称 *</label><input v-model="stdForm.name" class="input" placeholder="如：井号编码规范" /></div>
          <div class="form-item"><label class="form-label">类别</label>
            <div class="seg-row">
              <span v-for="c in STD_CATS" :key="c" class="seg-item" :class="{ active: stdForm.category === c }" @click="stdForm.category = c">{{ c }}</span>
            </div>
          </div>
          <div class="form-item"><label class="form-label">标准内容摘要 *</label><textarea v-model="stdForm.summary" class="input" rows="3" placeholder="如：井号 = 矿区代码 + 井型 + 序号"></textarea></div>
          <div class="form-item"><label class="form-label">维护人</label><input v-model="stdForm.owner" class="input" /></div>
          <div class="flex" style="gap: 10px; margin-top: 14px">
            <button class="btn primary grow" type="button" @click="submitStd">保存</button>
            <button class="btn" type="button" @click="stdForm = null">取消</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tabs-row { display: flex; gap: 4px; border-bottom: 1px solid var(--line-1); flex-wrap: wrap; }
.tab-item { padding: 9px 18px; font-size: 13px; color: var(--tx-3); cursor: pointer; border-bottom: 2px solid transparent; display: inline-flex; gap: 6px; align-items: center; }
.tab-item:hover { color: var(--tx-1); }
.tab-item.active { color: var(--brand); border-bottom-color: var(--brand); }
.tab-item em { font-style: normal; font-size: 10.5px; padding: 1px 7px; border-radius: 8px; background: var(--bg-glass-2); color: var(--tx-3); }
.tab-item em.danger-tag { background: rgba(248, 113, 113, 0.15); color: #f87171; }
.gov-layout { display: grid; grid-template-columns: 230px 1fr; gap: 12px; align-items: start; }
.meta-tree { padding: 12px; }
.tree-node { padding: 7px 10px; border-radius: 8px; font-size: 12.5px; color: var(--tx-2); cursor: pointer; }
.tree-node.root { color: var(--tx-4); font-size: 11px; cursor: default; }
.tree-node.tbl:hover { background: var(--bg-glass-2); color: var(--tx-1); }
.tree-node.tbl.sel { background: var(--brand-soft); color: var(--brand); }
.meta-cols { padding: 12px; min-width: 0; }
.meta-row { cursor: pointer; }
.batch-bar {
  display: flex; align-items: center; gap: 10px; margin-top: 10px; padding: 9px 14px;
  border-radius: 10px; background: var(--brand-soft); border: 1px solid var(--brand-line); font-size: 12.5px; color: var(--tx-1);
}
.ok-num { color: #34d399; }
.bad-num { color: #f87171; }
.spark-mini { display: inline-flex; align-items: flex-end; gap: 2px; height: 22px; }
.spark-mini i { width: 4px; border-radius: 2px; background: rgba(52, 211, 153, 0.5); }
.spark-mini i.bad { background: rgba(248, 113, 113, 0.6); }
.issue-card { padding: 12px; }
.issue-item { display: flex; align-items: center; gap: 10px; padding: 9px 12px; border-radius: 10px; font-size: 12.5px; color: var(--tx-2); border: 1px solid var(--line-1); margin-bottom: 8px; cursor: pointer; }
.issue-item:hover { background: var(--bg-glass-2); }
.issue-item.danger { border-left: 3px solid #f87171; }
.issue-item.warn { border-left: 3px solid #fbbf24; }
.issue-item.resolved { border-left: 3px solid #34d399; opacity: 0.7; }
.issue-item b { color: var(--tx-1); }
.lineage-card { padding: 16px; }
.lineage-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-top: 8px; }
.ln-level { font-size: 10px; color: var(--tx-4); margin-bottom: 8px; letter-spacing: 1px; }
.ln-node {
  padding: 10px 12px; border-radius: 10px; font-size: 12px; color: var(--tx-2);
  background: var(--bg-glass); border: 1px solid var(--line-1); margin-bottom: 8px; cursor: pointer;
}
.ln-node:hover { border-color: var(--brand-line); color: var(--tx-1); }
.ln-node.sel { background: var(--brand-soft); color: var(--brand); border-color: var(--brand-line); }
.node-detail { margin-top: 12px; padding: 12px 14px; border-radius: 10px; background: var(--bg-glass); border: 1px solid var(--brand-line); }
.nd-title { font-size: 13px; font-weight: 700; color: var(--brand); margin-bottom: 8px; }
.nd-row { display: flex; gap: 10px; align-items: baseline; font-size: 12px; color: var(--tx-2); margin-bottom: 5px; flex-wrap: wrap; }
.f-lbl { color: var(--tx-4); width: 36px; flex: none; }
.kv { display: flex; justify-content: space-between; gap: 12px; padding: 8px 0; border-bottom: 1px dashed var(--line-1); font-size: 12.5px; }
.kv .k { color: var(--tx-3); flex: none; }
.kv .v { color: var(--tx-1); text-align: right; word-break: break-all; }
.def-caliber { font-size: 13px; color: var(--tx-1); }
.seg-row { display: inline-flex; gap: 4px; padding: 3px; border-radius: 10px; background: var(--bg-glass); border: 1px solid var(--line-1); flex-wrap: wrap; }
.seg-item { padding: 5px 14px; border-radius: 8px; font-size: 12.5px; color: var(--tx-3); cursor: pointer; }
.seg-item:hover { color: var(--tx-1); }
.seg-item.active { background: var(--brand-soft); color: var(--brand); }
.chip-zone { display: flex; gap: 5px; flex-wrap: wrap; align-items: center; border: 1px dashed var(--line-2); border-radius: 10px; padding: 6px 10px; }
.z-chip { padding: 4px 10px; border-radius: 8px; border: 1px solid var(--line-2); font-size: 11.5px; color: var(--tx-3); cursor: pointer; }
.z-chip.on { border-color: var(--brand-line); background: var(--brand-soft); color: var(--brand); }
.ds-picker { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; max-height: 260px; overflow-y: auto; }
.qb-src { display: flex; flex-direction: column; gap: 3px; padding: 10px 12px; border: 1px solid var(--line-1); border-radius: 10px; cursor: pointer; }
.qb-src:hover { background: var(--bg-glass-2); }
.qb-src.sel { border-color: var(--brand-line); background: var(--brand-soft); }
.drawer-mask { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.55); z-index: 100; display: flex; align-items: center; justify-content: center; }
.modal { width: 560px; max-width: 92vw; max-height: 86vh; background: #0d1420; border: 1px solid var(--line-2); border-radius: 14px; display: flex; flex-direction: column; overflow: hidden; }
.wizard-modal { width: 640px; }
.drawer-head { flex: none; display: flex; align-items: center; justify-content: space-between; padding: 15px 20px; border-bottom: 1px solid var(--line-1); }
.drawer-title { font-size: 15px; font-weight: 700; color: var(--tx-1); display: flex; gap: 8px; align-items: center; }
.drawer-body { flex: 1; overflow-y: auto; padding: 16px 20px 22px; }
.form-item { margin-bottom: 13px; }
.form-label { font-size: 12px; color: var(--tx-2); margin-bottom: 5px; display: block; }
.grow { flex: 1; min-width: 0; }
.danger-btn { color: #f87171; }
.btn.danger { color: #f87171; border-color: rgba(248, 113, 113, 0.35); }
.btn.danger:hover { background: rgba(248, 113, 113, 0.1); }
.disabled { opacity: 0.5; pointer-events: none; }
.mb-3 { margin-bottom: 14px; }
.mb-2 { margin-bottom: 10px; }
.mt-3 { margin-top: 14px; }
.collect-progress { padding: 12px 14px; border-radius: 10px; background: var(--bg-glass); border: 1px solid var(--line-1); }
.cp-line { font-size: 13px; color: var(--tx-1); margin-bottom: 8px; }
.cp-bar { height: 10px; border-radius: 5px; background: var(--bg-glass-2); overflow: hidden; }
.cp-bar i { display: block; height: 100%; border-radius: 5px; background: linear-gradient(90deg, #b06a2a, var(--brand)); transition: width 0.3s; }
.sql-code { margin: 0; padding: 10px 12px; border-radius: 8px; background: rgba(0, 0, 0, 0.35); border: 1px solid var(--line-1); font-family: monospace; font-size: 11.5px; color: #9ecbff; white-space: pre-wrap; }
.link.disabled { opacity: 0.5; }
</style>
