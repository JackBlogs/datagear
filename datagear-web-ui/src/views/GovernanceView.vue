<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  qualityRules,
  qualityIssues,
  sensitiveFields,
  metaColumns,
  metaTables,
  standards,
  lineageNodes,
  lineageEdges,
  type LineageNode,
  toggleQualityRule,
  markSensitive,
} from '@/mock/governanceData'
import { useOperationMessage } from '@/composables/useOperationMessage'
import {
  saveQualityRule,
  saveStandard,
} from '@/mock/governanceData'
import '@/styles/datasource-page.css'

/**
 * 数据治理（对齐 prototypev2 governance.html）：
 * 5 tab —— 元数据（目录树+字段清单）/ 数据标准 / 数据质量（规则启停+异常清单）/ 数据血缘 / 数据安全（敏感字段）。
 * 数据层为前端 mock（src/mock/governanceData.ts），后端治理模块（FR-GOV）就绪后一键切换。
 */
const { success, fail } = useOperationMessage()

type Pane = 'meta' | 'std' | 'quality' | 'lineage' | 'secure'
const pane = ref<Pane>('meta')

const qualityScore = computed(() => {
  const list = qualityRules.value
  if (!list.length) return '—'
  return (list.reduce((s, r) => s + r.pass, 0) / list.length).toFixed(1)
})
const activeTable = ref(metaTables[0])

function onToggleRule(id: string) {
  const enabled = toggleQualityRule(id)
  success(`规则已${enabled ? '启用' : '停用'}`)
}

function onMark(field: string) {
  markSensitive(field)
  success(`已标记敏感字段「${field}」`)
}

/* ---------- 新建质量规则（弹窗） ---------- */
const ruleForm = ref<{ name: string; type: string; target: string; freq: string } | null>(null)
const RULE_TYPES = ['非空', '唯一', '范围', '格式', '及时性']

function submitRule() {
  if (!ruleForm.value) return
  if (!ruleForm.value.name || !ruleForm.value.target) {
    fail('请填写规则名称与校验对象')
    return
  }
  saveQualityRule(ruleForm.value)
  ruleForm.value = null
  success('质量规则已保存并启用')
}

/* ---------- 新建数据标准（弹窗） ---------- */
const stdForm = ref<{ name: string; category: string; summary: string; owner: string } | null>(null)
const STD_CATS = ['命名规范', '值域', '格式']

function submitStd() {
  if (!stdForm.value) return
  if (!stdForm.value.name || !stdForm.value.summary) {
    fail('请填写标准名称与内容摘要')
    return
  }
  saveStandard(stdForm.value)
  stdForm.value = null
  success('数据标准已保存（试行）')
}

/* 血缘：按层级分列展示 */
const lineageCols = computed(() => {
  const maxLevel = Math.max(...lineageNodes.value.map((n) => n.level))
  const cols: LineageNode[][] = []
  for (let l = 0; l <= maxLevel; l++) cols.push(lineageNodes.value.filter((n) => n.level === l))
  return cols
})
function nodeLinked(nodeId: string): boolean {
  return lineageEdges.value.some((e) => e.from === nodeId || e.to === nodeId)
}
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
        数据质量 <em class="danger-tag">{{ qualityIssues.length }} 异常</em>
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
            :key="t"
            class="tree-node tbl"
            :class="{ sel: activeTable === t }"
            @click="activeTable = t"
          >
            ▦ {{ t }}
          </div>
          <button class="btn sm" style="margin-top: 12px" type="button" @click="success('批量标注：为字段补充业务描述与敏感级别')">批量标注 ›</button>
        </div>
        <div class="card meta-cols">
          <div class="card-title"><i class="bar"></i>{{ activeTable }} · 字段清单</div>
          <div class="table-wrap">
            <table class="tbl">
              <thead>
                <tr><th>字段名</th><th style="width: 90px">类型</th><th>业务描述</th><th style="width: 90px">敏感级别</th><th style="width: 130px">质量规则</th><th style="width: 90px">操作</th></tr>
              </thead>
              <tbody>
                <tr v-for="c in metaColumns" :key="c.name">
                  <td><span class="cell-main">{{ c.name }}</span></td>
                  <td class="sm">{{ c.type }}</td>
                  <td class="sm tx-3">{{ c.desc }}</td>
                  <td>
                    <span v-if="c.sensitive !== '—'" class="tag danger">{{ c.sensitive }}</span>
                    <span v-else class="tx-4 sm">—</span>
                  </td>
                  <td class="sm">{{ c.rule }}</td>
                  <td>
                    <span v-if="c.sensitive === '—'" class="link" @click="onMark(c.name)">标记敏感</span>
                    <span v-else class="tx-4 sm">已标记</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </template>

    <!-- ===== 数据标准 ===== -->
    <template v-else-if="pane === 'std'">
      <div class="flex mb-2">
        <span class="tx-3 sm">标准被数据集 / 指标引用后，字段命名与值域自动校验</span>
        <button class="btn primary sm" style="margin-left: auto" type="button" @click="stdForm = { name: '', category: '命名规范', summary: '', owner: 'admin' }">新建标准 ›</button>
      </div>
      <div class="table-wrap">
        <table class="tbl">
          <thead>
            <tr><th>标准名称</th><th style="width: 100px">类别</th><th>标准内容摘要</th><th style="width: 90px">状态</th><th style="width: 90px">被引用</th><th style="width: 110px">维护人</th></tr>
          </thead>
          <tbody>
            <tr v-for="s in standards" :key="s.id">
              <td><span class="cell-main">{{ s.name }}</span></td>
              <td><span class="tag info">{{ s.category }}</span></td>
              <td class="sm tx-3">{{ s.summary }}</td>
              <td><span class="tag" :class="s.status === '已发布' ? 'ok' : ''">{{ s.status }}</span></td>
              <td class="num">{{ s.refs }}</td>
              <td class="sm">{{ s.owner }}</td>
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
          <div class="s-value num" style="color: #f87171">{{ qualityIssues.length }} <small>项</small></div>
          <div class="s-sub">挂调度定时校验</div>
        </div>
      </div>

      <div class="flex mb-2">
        <button class="btn primary sm" type="button" @click="ruleForm = { name: '', type: '非空', target: '', freq: '每天 22:00' }">＋ 新建质量规则</button>
      </div>
      <div class="table-wrap mb-3">
        <table class="tbl">
          <thead>
            <tr><th>规则</th><th style="width: 80px">类型</th><th>校验对象</th><th style="width: 100px">频率</th><th style="width: 110px">最近通过率</th><th style="width: 130px">近 7 日趋势</th><th style="width: 70px">启用</th></tr>
          </thead>
          <tbody>
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
            </tr>
          </tbody>
        </table>
      </div>

      <div class="card issue-card">
        <div class="card-title"><i class="bar"></i>质量异常清单 <span class="tag danger">待处理</span></div>
        <div v-for="i in qualityIssues" :key="i.id" class="issue-item" :class="i.level">
          <span class="tag" :class="i.level === 'danger' ? 'danger' : ''">{{ i.level === 'danger' ? '严重' : '警告' }}</span>
          <b>{{ i.rule }}</b>
          <span class="sm tx-3">{{ i.target }} · {{ i.detail }}</span>
          <span class="sm tx-4" style="margin-left: auto">{{ i.time }}</span>
        </div>
      </div>
    </template>

    <!-- ===== 数据血缘 ===== -->
    <template v-else-if="pane === 'lineage'">
      <div class="card lineage-card">
        <div class="card-title"><i class="bar"></i>全链路血缘（数据源 → 数据集 → 指标 → 看板/告警）</div>
        <div class="lineage-grid">
          <div v-for="(col, ci) in lineageCols" :key="ci" class="ln-col">
            <div class="ln-level">L{{ ci }}</div>
            <div v-for="n in col" :key="n.id" class="ln-node" :class="{ linked: nodeLinked(n.id) }">{{ n.name }}</div>
          </div>
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

    <!-- 新建质量规则弹窗 -->
    <div v-if="ruleForm" class="drawer-mask" @click="ruleForm = null">
      <div class="modal" @click.stop>
        <div class="drawer-head">
          <div class="drawer-title">新建质量规则</div>
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

    <!-- 新建标准弹窗 -->
    <div v-if="stdForm" class="drawer-mask" @click="stdForm = null">
      <div class="modal" @click.stop>
        <div class="drawer-head">
          <div class="drawer-title">新建数据标准</div>
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
.drawer-mask { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.55); z-index: 100; display: flex; align-items: center; justify-content: center; }
.modal { width: 560px; max-width: 92vw; max-height: 86vh; background: #0d1420; border: 1px solid var(--line-2); border-radius: 14px; display: flex; flex-direction: column; overflow: hidden; }
.drawer-head { flex: none; display: flex; align-items: center; justify-content: space-between; padding: 15px 20px; border-bottom: 1px solid var(--line-1); }
.drawer-title { font-size: 15px; font-weight: 700; color: var(--tx-1); }
.drawer-body { flex: 1; overflow-y: auto; padding: 16px 20px 22px; }
.form-item { margin-bottom: 13px; }
.form-label { font-size: 12px; color: var(--tx-2); margin-bottom: 5px; display: block; }
.grow { flex: 1; min-width: 0; }
</style>

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
.ok-num { color: #34d399; }
.bad-num { color: #f87171; }
.spark-mini { display: inline-flex; align-items: flex-end; gap: 2px; height: 22px; }
.spark-mini i { width: 4px; border-radius: 2px; background: rgba(52, 211, 153, 0.5); }
.spark-mini i.bad { background: rgba(248, 113, 113, 0.6); }
.issue-card { padding: 12px; }
.issue-item { display: flex; align-items: center; gap: 10px; padding: 9px 12px; border-radius: 10px; font-size: 12.5px; color: var(--tx-2); border: 1px solid var(--line-1); margin-bottom: 8px; }
.issue-item.danger { border-left: 3px solid #f87171; }
.issue-item.warn { border-left: 3px solid #fbbf24; }
.issue-item b { color: var(--tx-1); }
.lineage-card { padding: 16px; }
.lineage-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-top: 8px; }
.ln-level { font-size: 10px; color: var(--tx-4); margin-bottom: 8px; letter-spacing: 1px; }
.ln-node {
  padding: 10px 12px; border-radius: 10px; font-size: 12px; color: var(--tx-2);
  background: var(--bg-glass); border: 1px solid var(--line-1); margin-bottom: 8px;
}
.ln-node.linked { border-color: var(--brand-line); color: var(--tx-1); }
.mb-3 { margin-bottom: 14px; }
.mt-3 { margin-top: 14px; }
</style>
