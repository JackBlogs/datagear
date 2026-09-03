<script setup lang="ts">
import { ref, computed } from 'vue'
import { reports, exportReport, REPORT_TYPES, type ReportItem } from '@/mock/reportData'
import { useOperationMessage } from '@/composables/useOperationMessage'
import { useConfirm } from '@/composables/useConfirm'
import '@/styles/datasource-page.css'

/**
 * 统计报表（对齐 prototypev2 report.html）：
 * 类型筛选 + 报表清单 + 中国式报表预览（斜线表头/完成率）+ 导出/订阅工具栏。
 * 报表引擎为 P3 企业版增值（FR-RPT）；开源版提供基础报表模板与预览，数据层为前端 mock。
 */
const { success } = useOperationMessage()
const { confirmAction } = useConfirm()

const typeFilter = ref<'全部' | (typeof REPORT_TYPES)[number]>('全部')
const selected = ref<ReportItem>(reports[0])

const filtered = computed(() => {
  if (typeFilter.value === '全部') return reports
  return reports.filter((r) => r.type === typeFilter.value)
})

function typeCount(t: string): number {
  return t === '全部' ? reports.length : reports.filter((r) => r.type === t).length
}

function selectReport(r: ReportItem) {
  selected.value = r
}

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

/** 完成率着色（≥100 绿，<98 红，其余默认） */
function rateClass(v: string): string {
  const n = parseFloat(v)
  if (!Number.isFinite(n)) return ''
  if (n >= 100) return 'rate-good'
  if (n < 98) return 'rate-bad'
  return ''
}
</script>

<template>
  <div class="ds-page">
    <!-- 页头 -->
    <div class="page-head">
      <div>
        <div class="page-title">统计报表 <span class="tag brand">P3 预览</span></div>
        <div class="page-desc">中国式复杂报表 —— 分组 / 交叉 / 电子表格模板与定时推送（FR-RPT）</div>
      </div>
      <div class="page-actions">
        <button class="btn primary" type="button" @click="success('报表设计器为企业版增值模块，开源版提供基础报表模板')">＋ 新建报表</button>
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
          <div class="ri-name">{{ r.name }}</div>
          <div class="ri-meta">
            <span class="tag info">{{ r.type }}</span>
            <span class="sm tx-3">{{ r.updated }}</span>
          </div>
        </div>
        <div v-if="!filtered.length" class="empty">该类型暂无报表</div>
      </div>

      <!-- 右：报表预览 -->
      <div class="card preview-card">
        <div class="card-title"><i class="bar"></i>{{ selected.name }} · 预览</div>
        <div class="toolbar">
          <button class="btn sm" type="button" @click="doExport()">导出 Excel</button>
          <button class="btn sm" type="button" @click="doExport()">导出 PDF</button>
          <button class="btn sm" type="button" @click="toggleSub(selected)">定时推送</button>
          <button class="btn sm" type="button" @click="success('条件格式为企业版增值能力')">条件格式</button>
          <button class="btn sm" type="button" @click="success('已调起打印预览')">打印</button>
          <span class="tx-3 sm" style="margin-left: auto">数据源：DS_采油日报 · 参数 month=2026-08 · 已按行级权限过滤</span>
        </div>

        <!-- 中国式报表样张 -->
        <div class="sheet">
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
                <th v-for="c in selected.sheet.cols" :key="c" colspan="1">{{ c }}</th>
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
.sheet-foot { display: flex; justify-content: space-between; font-size: 11px; margin-top: 8px; color: #475069; }
.num { font-family: 'Barlow', monospace; }
.ent-bar { padding: 10px 14px; border-radius: 10px; background: rgba(251, 191, 36, 0.1); border: 1px solid rgba(251, 191, 36, 0.3); font-size: 12px; color: var(--tx-2); }
.mt-3 { margin-top: 14px; }
.mb-3 { margin-bottom: 14px; }
.grow { flex: 1; min-width: 0; }
.tpl-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 12px; }
.db-card { border: 1px solid var(--line-1); border-radius: 14px; overflow: hidden; background: var(--bg-glass); }
.c-body { padding: 16px; }
.c-name { font-size: 14px; font-weight: 700; color: var(--tx-1); }
.c-desc { font-size: 12px; color: var(--tx-3); margin: 6px 0 12px; }
</style>
