<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  qualityRules,
  qualityIssues,
  sensitiveFields,
  metaTables,
  activeMetaTable,
  standards,
  lineageNodes,
  lineageEdges,
  lineageDetail,
  type LineageNode,
  type MetaTable,
  type MetaColumn,
  type StdItem,
  type QualityRule,
  type QualityIssue,
  toggleQualityRule,
  markSensitive,
  updateColumnSensitive,
  updateQualityRule,
  deleteQualityRule,
  resolveIssue,
  updateStandard,
  deleteStandard,
  publishStandard,
  saveQualityRule,
  saveStandard,
} from '@/mock/governanceData'
import { useOperationMessage } from '@/composables/useOperationMessage'
import { useConfirm } from '@/composables/useConfirm'
import '@/styles/datasource-page.css'

/**
 * 数据治理（对齐 prototypev2 governance.html，多级钻取）：
 * L2 五大域 → L3 字段详情/标准详情/异常处理/节点详情 抽屉 → L4 编辑/批量标注/处理意见 → L5 保存落 localStorage。
 * 数据层为前端 mock（src/mock/governanceData.ts），后端治理模块（FR-GOV）就绪后一键切换。
 */
const { success, fail } = useOperationMessage()
const { confirmAction } = useConfirm()

type Pane = 'meta' | 'std' | 'quality' | 'lineage' | 'secure'
const pane = ref<Pane>('meta')

/* ================= 元数据（L2→L3 字段详情 → L4 编辑） ================= */
const metaKw = ref('')
const fieldDrawer = ref<{ table: MetaTable; col: MetaColumn } | null>(null)
const batchOpen = ref(false)
const batchSel = ref<string[]>([])
const batchSensitive = ref('手机号')
const SENSITIVE_LEVELS = ['—', '手机号', '身份证', '银行卡', '地址', '内部']

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

function setFieldSensitive(table: string, col: string, level: string) {
  updateColumnSensitive(table, col, level)
  if (level !== '—' && !sensitiveFields.value.some((s) => s.field === col)) {
    markSensitive(col)
  }
  if (fieldDrawer.value && fieldDrawer.value.col.name === col) {
    fieldDrawer.value.col.sensitive = level
  }
  success(`「${col}」敏感级别已设为 ${level === '—' ? '无' : level}`)
}

function toggleBatchSel(name: string) {
  const i = batchSel.value.indexOf(name)
  if (i >= 0) batchSel.value.splice(i, 1)
  else batchSel.value.push(name)
}

function submitBatch() {
  const table = currentTable.value?.name ?? ''
  batchSel.value.forEach((col) => {
    updateColumnSensitive(table, col, batchSensitive.value)
    const t = metaTables.value.find((x) => x.name === table)
    const c = t?.columns.find((x) => x.name === col)
    if (c) c.sensitive = batchSensitive.value
  })
  success(`已批量标注 ${batchSel.value.length} 个字段为「${batchSensitive.value}」`)
  batchOpen.value = false
  batchSel.value = []
}

/* ================= 数据标准（L2→L3 详情 → L4 编辑/发布） ================= */
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

/* ================= 数据质量（L2→L3 异常处理 → L4 规则编辑） ================= */
const qualityScore = computed(() => {
  const list = qualityRules.value
  if (!list.length) return '—'
  return (list.reduce((s, r) => s + r.pass, 0) / list.length).toFixed(1)
})
const openIssues = computed(() => qualityIssues.value.filter((i) => !i.resolved))

const ruleForm = ref<{ id?: string; name: string; type: string; target: string; freq: string } | null>(null)
const RULE_TYPES = ['非空', '唯一', '范围', '格式', '及时性']

function openRuleForm(r?: QualityRule) {
  ruleForm.value = r
    ? { id: r.id, name: r.name, type: r.type, target: r.target, freq: r.freq }
    : { name: '', type: '非空', target: '', freq: '每天 22:00' }
}

function submitRule() {
  if (!ruleForm.value) return
  if (!ruleForm.value.name || !ruleForm.value.target) {
    fail('请填写规则名称与校验对象')
    return
  }
  if (ruleForm.value.id) {
    const target = qualityRules.value.find((x) => x.id === ruleForm.value!.id)
    if (target) {
      target.name = ruleForm.value.name
      target.type = ruleForm.value.type
      target.target = ruleForm.value.target
      target.freq = ruleForm.value.freq
      updateQualityRule(target)
    }
    success('规则已更新')
  } else {
    saveQualityRule(ruleForm.value)
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

function onToggleRule(id: string) {
  const enabled = toggleQualityRule(id)
  success(`规则已${enabled ? '启用' : '停用'}`)
}

/* ================= 数据血缘（L2→L3 节点详情） ================= */
const lineageCols = computed(() => {
  const maxLevel = Math.max(...lineageNodes.value.map((n) => n.level))
  const cols: LineageNode[][] = []
  for (let l = 0; l <= maxLevel; l++) cols.push(lineageNodes.value.filter((n) => n.level === l))
  return cols
})
function nodeLinked(nodeId: string): boolean {
  return lineageEdges.value.some((e) => e.from === nodeId || e.to === nodeId)
}
const nodeDetail = ref<string | null>(null)
const nodeDetailData = computed(() => (nodeDetail.value ? lineageDetail(nodeDetail.value) : null))
const nodeDetailName = computed(() => lineageNodes.value.find((n) => n.id === nodeDetail.value)?.name ?? '')

/* ================= 数据安全 ================= */
</script>

<template>
  <div class="ds-page">
    <!-- 页头 -->
    <div class="page-head">
      <div>
        <div class="page-title">数据治理 <span class="tag brand">FR-GOV</span></div>
        <div class="page-desc">元数据 — 数据标准 — 数据质量 — 数据血缘 — 数据安全 轻量治理闭环</div>
      </div>
      <div class="page-actions">
        <button class="btn primary" type="button" @click="success('元数据采集任务已创建（复用 datagear-meta 解析）')">采集元数据</button>
      </div>
    </div>

    <!-- Tabs -->
    <div class="tabs-row mb-2">
      <div class="tab-item" :class="{ active: pane === 'meta' }" @click="pane = 'meta'">元数据</div>
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
            :key="t.name"
            class="tree-node tbl"
            :class="{ sel: activeMetaTable === t.name }"
            @click="activeMetaTable = t.name"
          >
            ▦ {{ t.name }}
          </div>
          <button class="btn sm" style="margin-top: 12px" type="button" @click="batchOpen = true">批量标注 ›</button>
        </div>
        <div class="card meta-cols">
          <div class="card-title"><i class="bar"></i>{{ currentTable?.name }} · 字段清单
            <span class="sm tx-4" style="margin-left: auto">{{ currentTable?.source }} · {{ currentTable?.rows }} 行</span>
          </div>
          <div class="flex mb-2" style="max-width: 340px">
            <input v-model="metaKw" class="input" placeholder="检索字段名 / 业务描述" />
          </div>
          <div class="table-wrap">
            <table class="tbl">
              <thead>
                <tr><th style="width: 34px"></th><th>字段名</th><th style="width: 90px">类型</th><th>业务描述</th><th style="width: 90px">敏感级别</th><th style="width: 130px">质量规则</th><th style="width: 90px">操作</th></tr>
              </thead>
              <tbody>
                <tr v-if="!filteredColumns.length"><td colspan="7"><div class="empty">没有匹配的字段</div></td></tr>
                <tr v-for="c in filteredColumns" :key="c.name" class="meta-row" @click="openFieldDrawer(c)">
                  <td><input type="checkbox" :checked="batchSel.includes(c.name)" @click.stop @change="toggleBatchSel(c.name)" /></td>
                  <td><span class="cell-main">{{ c.name }}</span></td>
                  <td class="sm">{{ c.type }}</td>
                  <td class="sm tx-3">{{ c.desc }}</td>
                  <td>
                    <span v-if="c.sensitive !== '—'" class="tag danger">{{ c.sensitive }}</span>
                    <span v-else class="tx-4 sm">—</span>
                  </td>
                  <td class="sm">{{ c.rule }}</td>
                  <td @click.stop>
                    <span class="link" @click="openFieldDrawer(c)">详情</span>
                  </td>
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
          <div class="s-sub">覆盖 128 张表 · 日检</div>
        </div>
        <div class="stat-card">
          <div class="s-label">质量规则</div>
          <div class="s-value num">{{ qualityRules.length }} <small>条</small></div>
          <div class="s-sub">通过率 96.8%</div>
        </div>
        <div class="stat-card">
          <div class="s-label">待处理异常</div>
          <div class="s-value num" style="color: #f87171">{{ openIssues.length }} <small>项</small></div>
          <div class="s-sub">挂调度定时校验</div>
        </div>
      </div>

      <div class="flex mb-2">
        <button class="btn primary sm" type="button" @click="openRuleForm()">＋ 新建质量规则</button>
      </div>
      <div class="table-wrap mb-3">
        <table class="tbl">
          <thead>
            <tr><th>规则</th><th style="width: 80px">类型</th><th>校验对象</th><th style="width: 100px">频率</th><th style="width: 110px">最近通过率</th><th style="width: 130px">近 7 日趋势</th><th style="width: 70px">启用</th><th style="width: 140px">操作</th></tr>
          </thead>
          <tbody>
            <tr v-if="!qualityRules.length"><td colspan="8"><div class="empty">暂无质量规则</div></td></tr>
            <tr v-for="r in qualityRules" :key="r.id">
              <td><span class="cell-main">{{ r.name }}</span></td>
              <td><span class="tag info">{{ r.type }}</span></td>
              <td class="sm tx-3">{{ r.target }}</td>
              <td class="sm">{{ r.freq }}</td>
              <td class="num" :class="r.pass >= 99 ? 'ok-num' : (r.pass < 98 ? 'bad-num' : '')">{{ r.pass }}%</td>
              <td>
                <span class="spark-mini">
                  <i v-for="(v, i) in r.trend" :key="i" :style="{ height: (v - 95) * 18 + 'px' }" :class="{ bad: v < 98 }"></i>
                </span>
              </td>
              <td><label class="switch"><input type="checkbox" :checked="r.enabled" @change="onToggleRule(r.id)" /><i></i></label></td>
              <td>
                <span class="link" @click="openRuleForm(r)">编辑</span> ·
                <span class="link danger" @click="onDeleteRule(r)">删除</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="card issue-card">
        <div class="card-title"><i class="bar"></i>质量异常清单 <span class="tag danger">待处理 {{ openIssues.length }}</span></div>
        <div v-for="i in qualityIssues" :key="i.id" class="issue-item" :class="i.resolved ? 'resolved' : i.level" @click="openIssue(i)">
          <span class="tag" :class="i.resolved ? 'ok' : i.level === 'danger' ? 'danger' : ''">{{ i.resolved ? '已处理' : i.level === 'danger' ? '严重' : '警告' }}</span>
          <b>{{ i.rule }}</b>
          <span class="sm tx-3 ellipsis" style="max-width: 300px">{{ i.target }} · {{ i.detail }}</span>
          <span class="sm tx-4" style="margin-left: auto">{{ i.time }}</span>
        </div>
        <div v-if="!qualityIssues.length" class="empty">暂无异常</div>
      </div>
    </template>

    <!-- ===== 数据血缘 ===== -->
    <template v-else-if="pane === 'lineage'">
      <div class="card lineage-card">
        <div class="card-title"><i class="bar"></i>全链路血缘（数据源 → 数据集 → 指标 → 看板/告警）<span class="sm tx-4" style="margin-left: auto">点击节点查看详情 ›</span></div>
        <div class="lineage-grid">
          <div v-for="(col, ci) in lineageCols" :key="ci" class="ln-col">
            <div class="ln-level">L{{ ci }}</div>
            <div
              v-for="n in col"
              :key="n.id"
              class="ln-node"
              :class="{ linked: nodeLinked(n.id), sel: nodeDetail === n.id }"
              @click="nodeDetail = n.id"
            >
              {{ n.name }}
            </div>
          </div>
        </div>
        <div v-if="nodeDetail && nodeDetailData" class="node-detail">
          <div class="nd-title">{{ nodeDetailName }}</div>
          <div class="nd-row"><span class="f-lbl">上游</span><span>{{ nodeDetailData.upstream.join('、') || '—' }}</span></div>
          <div class="nd-row"><span class="f-lbl">下游</span><span>{{ nodeDetailData.downstream.join('、') || '—' }}</span></div>
          <div class="nd-row"><span class="f-lbl">映射</span><span v-for="fm in nodeDetailData.fieldMap" :key="fm" class="tag info" style="margin-right: 4px">{{ fm }}</span></div>
          <div class="nd-row"><span class="f-lbl">频率</span><span>{{ nodeDetailData.updateFreq }}</span></div>
        </div>
        <div class="tx-3 sm" style="margin-top: 12px">
          字段级血缘随数据集 / 指标保存增量更新（FR-GOV-11~13）；解析失败的 SQL 标记「解析失败」不阻断保存。
        </div>
      </div>
    </template>

    <!-- ===== 数据安全 ===== -->
    <template v-else>
      <div class="table-wrap">
        <table class="tbl">
          <thead>
            <tr><th>敏感字段</th><th>位置（库.表.字段）</th><th style="width: 90px">类型</th><th style="width: 130px">识别方式</th><th style="width: 120px">脱敏规则</th></tr>
          </thead>
          <tbody>
            <tr v-if="!sensitiveFields.length"><td colspan="5"><div class="empty">暂无敏感字段标记</div></td></tr>
            <tr v-for="s in sensitiveFields" :key="s.id">
              <td><span class="cell-main">{{ s.field }}</span></td>
              <td class="sm tx-3">{{ s.pos }}</td>
              <td><span class="tag danger">{{ s.type }}</span></td>
              <td class="sm">{{ s.mode }}</td>
              <td class="sm">{{ s.rule }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="tx-3 sm" style="margin-top: 10px">
        正则自动识别（手机号/身份证/银行卡）+ 手动标记；动态脱敏在查询链路按角色生效（掩码/截断/替换/哈希四方式，FR-GOV-14~16）。
      </div>
    </template>

    <!-- ===== L3 字段详情抽屉 ===== -->
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
            <div class="kv"><span class="k">关联质量规则</span><span class="v">{{ fieldDrawer.col.rule }}</span></div>
            <div class="kv"><span class="k">表数据量</span><span class="v num">{{ fieldDrawer.table.rows }}</span></div>
          </div>
          <div class="card mb-3">
            <div class="card-title"><i class="bar"></i>敏感级别（L4 编辑）</div>
            <div class="seg-row" style="margin-top: 8px">
              <span
                v-for="lv in SENSITIVE_LEVELS"
                :key="lv"
                class="seg-item"
                :class="{ active: fieldDrawer!.col.sensitive === lv }"
                @click="setFieldSensitive(fieldDrawer!.table.name, fieldDrawer!.col.name, lv)"
              >
                {{ lv === '—' ? '无' : lv }}
              </span>
            </div>
            <div class="tx-3 sm" style="margin-top: 8px">设置后自动进入数据安全清单，并在查询链路按角色动态脱敏。</div>
          </div>
        </div>
      </div>
    </div>

    <!-- ===== L3 标准详情抽屉 ===== -->
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

    <!-- ===== L3 异常处理弹窗 ===== -->
    <div v-if="issueView" class="drawer-mask" @click="issueView = null">
      <div class="modal" @click.stop>
        <div class="drawer-head">
          <div class="drawer-title">异常处理 · {{ issueView.rule }}</div>
          <button class="btn sm ghost" type="button" @click="issueView = null">✕</button>
        </div>
        <div class="drawer-body">
          <div class="kv"><span class="k">校验对象</span><span class="v">{{ issueView.target }}</span></div>
          <div class="kv"><span class="k">触发详情</span><span class="v">{{ issueView.detail }}</span></div>
          <div class="kv"><span class="k">触发时间</span><span class="v">{{ issueView.time }}</span></div>
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

    <!-- ===== L4 批量标注弹窗 ===== -->
    <div v-if="batchOpen" class="drawer-mask" @click="batchOpen = false">
      <div class="modal" @click.stop>
        <div class="drawer-head">
          <div class="drawer-title">批量标注 · {{ currentTable?.name }}</div>
          <button class="btn sm ghost" type="button" @click="batchOpen = false; batchSel = []">✕</button>
        </div>
        <div class="drawer-body">
          <div class="form-item"><label class="form-label">选择字段（可多选）</label>
            <div class="chip-zone">
              <span v-for="c in currentTable?.columns ?? []" :key="c.name" class="z-chip dim" :class="{ on: batchSel.includes(c.name) }" @click="toggleBatchSel(c.name)">
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

    <!-- ===== 新建/编辑质量规则弹窗 ===== -->
    <div v-if="ruleForm" class="drawer-mask" @click="ruleForm = null">
      <div class="modal" @click.stop>
        <div class="drawer-head">
          <div class="drawer-title">{{ ruleForm.id ? '编辑质量规则' : '新建质量规则' }}</div>
          <button class="btn sm ghost" type="button" @click="ruleForm = null">✕</button>
        </div>
        <div class="drawer-body">
          <div class="form-item"><label class="form-label">规则名称 *</label><input v-model="ruleForm.name" class="input" placeholder="如：井号唯一性" /></div>
          <div class="flex" style="gap: 12px">
            <div class="form-item grow"><label class="form-label">类型</label>
              <select v-model="ruleForm.type" class="input"><option v-for="t in RULE_TYPES" :key="t" :value="t">{{ t }}</option></select>
            </div>
            <div class="form-item grow"><label class="form-label">频率</label>
              <select v-model="ruleForm.freq" class="input"><option>每天 22:00</option><option>每小时</option><option>实时</option></select>
            </div>
          </div>
          <div class="form-item"><label class="form-label">校验对象 *</label><input v-model="ruleForm.target" class="input" placeholder="如：ODS_采油日报表.井号" /></div>
          <div class="flex" style="gap: 10px; margin-top: 14px">
            <button class="btn primary grow" type="button" @click="submitRule">保存并启用</button>
            <button class="btn" type="button" @click="ruleForm = null">取消</button>
          </div>
        </div>
      </div>
    </div>

    <!-- ===== 新建/编辑标准弹窗 ===== -->
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
              <span v-for="c in STD_CATS" :key="c" class="seg-item" :class="{ active: stdForm!.category === c }" @click="stdForm!.category = c">{{ c }}</span>
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
.ln-node.linked { border-color: var(--brand-line); color: var(--tx-1); }
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
.z-chip.dim { background: rgba(96, 165, 250, 0.1); border-color: rgba(96, 165, 250, 0.3); color: #60a5fa; }
.drawer-mask { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.55); z-index: 100; display: flex; align-items: center; justify-content: center; }
.drawer {
  position: relative;
  width: 640px; max-width: 94vw; height: min(84vh, 860px); background: #0d1420;
  border: 1px solid var(--line-2); border-radius: 16px;
  display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 24px 70px rgba(0, 0, 0, 0.55);
}
.modal { width: 560px; max-width: 92vw; max-height: 86vh; background: #0d1420; border: 1px solid var(--line-2); border-radius: 14px; display: flex; flex-direction: column; overflow: hidden; }
.drawer-head { flex: none; display: flex; align-items: center; justify-content: space-between; padding: 15px 20px; border-bottom: 1px solid var(--line-1); }
.drawer-title { font-size: 15px; font-weight: 700; color: var(--tx-1); }
.drawer-body { flex: 1; overflow-y: auto; padding: 16px 20px 22px; }
.form-item { margin-bottom: 13px; }
.form-label { font-size: 12px; color: var(--tx-2); margin-bottom: 5px; display: block; }
.grow { flex: 1; min-width: 0; }
.danger-btn { color: #f87171; }
.btn.danger { color: #f87171; border-color: rgba(248, 113, 113, 0.35); }
.btn.danger:hover { background: rgba(248, 113, 113, 0.1); }
.mb-3 { margin-bottom: 14px; }
.mb-2 { margin-bottom: 10px; }
.mt-3 { margin-top: 14px; }
</style>
