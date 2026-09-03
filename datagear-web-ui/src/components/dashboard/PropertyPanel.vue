<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { DgWidget } from '@/types/dashboardDesign'
import type { ChartEntity } from '@/api/chart'

/**
 * 设计器右侧属性面板：数据 / 样式 / 联动 三 Tab，直接编辑选中部件的响应式对象。
 */
const props = defineProps<{ widget: DgWidget | null; charts: ChartEntity[] }>()

type PTab = 'data' | 'style' | 'link'
const tab = ref<PTab>('data')

const w = computed(() => props.widget)
const st = computed(() => props.widget?.style ?? {})
const dt = computed(() => props.widget?.data ?? {})
const lk = computed(() => props.widget?.link ?? {})

const THEME_COLORS = ['#FF8A3D', '#22D3EE', '#A78BFA', '#E8B33C', '#34D399', '#F87171']
const fontSizeOptions: { label: string; value: 'small' | 'medium' | 'large' }[] = [
  { label: '小', value: 'small' },
  { label: '中', value: 'medium' },
  { label: '大', value: 'large' },
]

/* 过滤器 chips（对齐原型「添加过滤器」交互） */
const newFilter = ref('')
function addFilter() {
  const v = newFilter.value.trim()
  if (!v) return
  if (!dt.value.filters) dt.value.filters = []
  if (!dt.value.filters.includes(v)) dt.value.filters.push(v)
  newFilter.value = ''
}
function removeFilter(i: number) {
  dt.value.filters?.splice(i, 1)
}

const refreshOptions = [0, 60, 300, 900, 3600]
function refreshLabel(secs: number): string {
  if (!secs) return '手动刷新'
  if (secs < 3600) return `每 ${secs / 60} 分钟`
  return `每 ${secs / 3600} 小时`
}

/* 选中部件变化时切换初始 Tab 并保证子对象存在 */
watch(
  () => props.widget,
  (nw) => {
    if (nw) {
      nw.style = nw.style ?? {}
      nw.data = nw.data ?? {}
      nw.link = nw.link ?? {}
      tab.value = 'data'
    }
  },
  { immediate: true },
)

function chartName(id?: string): string {
  const c = props.charts.find((x) => x.id === id)
  return c ? c.name : (id ?? '')
}

function onPickChart(id?: string) {
  if (!w.value) return
  w.value.chartId = id
  if (id && w.value.type !== 'map') w.value.type = 'chart'
}

function removeChip(arr: string[], i: number) {
  arr.splice(i, 1)
}
</script>

<template>
  <div class="prop-panel">
    <div class="tabs">
      <div class="tab" :class="{ active: tab === 'data' }" @click="tab = 'data'">数据</div>
      <div class="tab" :class="{ active: tab === 'style' }" @click="tab = 'style'">样式</div>
      <div class="tab" :class="{ active: tab === 'link' }" @click="tab = 'link'">联动</div>
    </div>

    <div v-if="!w" class="prop-empty">未选中部件</div>

    <div v-else class="prop-scroll">
      <!-- ============ 数据 ============ -->
      <div v-show="tab === 'data'" class="pane">
        <template v-if="w.type === 'chart' || w.type === 'map'">
          <div class="form-item">
            <label class="form-label">绑定图表</label>
            <div class="p-inputgroup">
              <input
                :value="chartName(w.chartId)"
                type="text"
                class="input"
                readonly
                placeholder="选择图表用于取数"
              />
              <select
                class="select"
                :value="w.chartId ?? ''"
                @change="onPickChart(($event.target as HTMLSelectElement).value || undefined)"
              >
                <option value="">请选择…</option>
                <option v-for="c in charts" :key="c.id" :value="c.id">{{ c.name }}</option>
              </select>
            </div>
          </div>
        </template>

        <template v-else>
          <div v-if="w.type === 'kpi'" class="form-item">
            <label class="form-label">指标值</label>
            <input v-model="w.value" type="text" class="input" placeholder="数值，如 12.86" />
          </div>
          <div v-if="w.type === 'kpi'" class="form-item">
            <label class="form-label">单位</label>
            <input v-model="w.unit" type="text" class="input" placeholder="如 万吨" />
          </div>
          <div v-if="w.type === 'kpi'" class="form-item">
            <label class="form-label">环比（%）</label>
            <input v-model="w.trend" type="number" class="input" placeholder="如 2.4" />
          </div>
          <div v-for="tw in ['title', 'text']" :key="tw" v-show="w.type === tw" class="form-item">
            <label class="form-label">内容</label>
            <textarea v-model="w.text" rows="3" class="input w-full" placeholder="文本内容"></textarea>
          </div>
        </template>

        <div class="form-item">
          <label class="form-label">数据集</label>
          <input v-model="dt.dataset" type="text" class="input" placeholder="数据集名称或 ID" />
        </div>

        <div class="form-item">
          <label class="form-label">维度（拖入此处）</label>
          <div class="chip-zone">
            <span v-for="(d, i) in dt.dims" :key="d + i" class="z-chip dim">
              {{ d }}<i @click="removeChip(dt.dims!, i)">✕</i>
            </span>
            <input
              class="chip-input"
              :value="dt.dims?.join(',') ?? ''"
              placeholder="用逗号分隔，如 采油厂,日期"
              @input="dt.dims = ($event.target as HTMLInputElement).value.split(',').map((s) => s.trim()).filter(Boolean)"
            />
          </div>
        </div>
        <div class="form-item">
          <label class="form-label">度量 / 指标</label>
          <div class="chip-zone">
            <span v-for="(m, i) in dt.measures" :key="m + i" class="z-chip">
              {{ m }}<i @click="removeChip(dt.measures!, i)">✕</i>
            </span>
            <input
              class="chip-input"
              :value="dt.measures?.join(',') ?? ''"
              placeholder="用逗号分隔，如 原油产量（求和）"
              @input="dt.measures = ($event.target as HTMLInputElement).value.split(',').map((s) => s.trim()).filter(Boolean)"
            />
          </div>
        </div>
        <div class="form-item">
          <label class="form-label">过滤器（可添加多条）</label>
          <div v-if="(dt.filters ?? []).length || dt.filter" class="filter-chips">
            <span v-for="(f, i) in dt.filters ?? []" :key="'f' + i" class="z-chip dim">
              {{ f }}<i @click="removeFilter(i)">✕</i>
            </span>
            <span v-if="dt.filter && !(dt.filters ?? []).length" class="z-chip dim">
              {{ dt.filter }}<i @click="dt.filter = ''">✕</i>
            </span>
          </div>
          <div class="p-inputgroup">
            <input
              v-model="newFilter"
              type="text"
              class="input"
              placeholder="如 日期 = 近7日，回车添加"
              @keydown.enter.prevent="addFilter"
            />
            <button class="btn sm" type="button" @click="addFilter">＋ 添加过滤器</button>
          </div>
        </div>

        <div class="form-item">
          <label class="form-label">刷新频率</label>
          <select v-model="dt.refresh" class="select">
            <option v-for="r in refreshOptions" :key="r" :value="r">{{ refreshLabel(r) }}</option>
          </select>
        </div>

        <div class="style-row">
          <span>启用行级权限继承</span>
          <label class="switch">
            <input v-model="dt.inheritRowAuth" type="checkbox" />
            <i></i>
          </label>
        </div>
      </div>

      <!-- ============ 样式 ============ -->
      <div v-show="tab === 'style'" class="pane">
        <div class="form-item">
          <label class="form-label">部件标题</label>
          <input v-model="st.title" type="text" class="input" placeholder="如 原油产量 · 昨日" />
        </div>
        <div class="style-row">
          <span>主题配色</span>
          <span class="flex gap-1">
            <i
              v-for="c in THEME_COLORS"
              :key="c"
              class="swatch"
              :class="{ on: st.color === c }"
              :style="{ background: c }"
              @click="st.color = c"
            ></i>
          </span>
        </div>
        <div class="style-row">
          <span>圆角</span>
          <input v-model="st.radius" type="range" min="0" max="20" />
          <b class="val">{{ st.radius ?? 10 }}px</b>
        </div>
        <div class="style-row">
          <span>背景透明度</span>
          <input v-model="st.opacity" type="range" min="0" max="100" />
          <b class="val">{{ st.opacity ?? 85 }}%</b>
        </div>
        <div class="style-row">
          <span>数值字号</span>
          <div class="seg">
            <span
              v-for="f in fontSizeOptions"
              :key="f.value"
              class="seg-item"
              :class="{ active: (st.fontSize ?? 'medium') === f.value }"
              @click="st.fontSize = f.value"
            >{{ f.label }}</span>
          </div>
        </div>
        <div class="style-row">
          <span>显示同比/环比</span>
          <label class="switch"><input v-model="st.showTrend" type="checkbox" /><i></i></label>
        </div>
        <div class="style-row">
          <span>显示迷你趋势</span>
          <label class="switch"><input v-model="st.showMini" type="checkbox" /><i></i></label>
        </div>
      </div>

      <!-- ============ 联动 ============ -->
      <div v-show="tab === 'link'" class="pane">
        <div class="sm tx-3 mb-2">当用户与当前部件交互时触发：</div>
        <div class="link-cfg">
          <span class="tag brand">点击此部件</span>
          <span class="l-arrow">→</span>
          <input
            :value="lk.filters?.join(',') ?? ''"
            type="text"
            class="input grow"
            placeholder="联动过滤目标部件名，逗号分隔"
            @change="lk.filters = ($event.target as HTMLInputElement).value.split(',').map((s) => s.trim()).filter(Boolean)"
          />
        </div>
        <div class="link-cfg">
          <span class="tag brand">点击此部件</span>
          <span class="l-arrow">→</span>
          <input v-model="lk.drill" type="text" class="input grow" placeholder="下钻到（如 井场明细）" />
        </div>
        <div class="link-cfg">
          <span class="tag info">悬停提示</span>
          <span class="l-arrow">→</span>
          <input v-model="lk.hover" type="text" class="input grow" placeholder="展示浮层（如 单井产量构成）" />
        </div>
        <button class="btn sm w-full add-link" @click="lk.filters = lk.filters ?? []">+ 新增联动规则</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.prop-panel { display: flex; flex-direction: column; min-height: 0; }
.tabs { display: flex; gap: 4px; margin-bottom: 12px; }
.tab { padding: 6px 12px; font-size: 12.5px; border-radius: 8px; color: var(--tx-2); cursor: pointer; }
.tab:hover { color: var(--tx-1); }
.tab.active { background: var(--brand-soft); color: var(--brand); font-weight: 600; }
.prop-empty { padding: 30px 0; text-align: center; font-size: 12.5px; color: var(--tx-4); }
.prop-scroll { flex: 1; overflow-y: auto; min-height: 0; }
.pane { display: flex; flex-direction: column; }
.form-item { margin-bottom: 14px; }
.form-label { font-size: 12px; color: var(--tx-2); margin-bottom: 5px; }
.input, .select {
  width: 100%; background: var(--bg-glass); color: var(--tx-1);
  border: 1px solid var(--line-1); border-radius: var(--r-m);
  padding: 7px 10px; font-size: 12.5px; font-family: inherit;
}
.input:focus, .select:focus { border-color: var(--brand-line); outline: none; }
.p-inputgroup { display: flex; gap: 6px; }
.p-inputgroup .input { flex: 1; }
.chip-zone {
  min-height: 34px; border: 1px dashed var(--line-2); border-radius: var(--r-m);
  padding: 5px 8px; display: flex; gap: 5px; flex-wrap: wrap; align-items: center;
  font-size: 11px; color: var(--tx-4);
}
.chip-input { flex: 1; min-width: 120px; background: transparent; border: none; color: var(--tx-1); font-size: 11px; font-family: inherit; outline: none; }
.z-chip { font-size: 11px; padding: 2px 9px; border-radius: 7px; background: var(--brand-soft); color: var(--brand); border: 1px solid var(--brand-line); display: inline-flex; align-items: center; gap: 4px; }
.z-chip.dim { background: var(--info-soft); color: var(--info); border-color: rgba(96,165,250,.3); }
.z-chip i { cursor: pointer; font-style: normal; }
.style-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 7px 0; border-bottom: 1px solid rgba(255,255,255,.045); font-size: 12.5px; color: var(--tx-2); }
.style-row:last-child { border-bottom: none; }
.style-row input[type='range'] { accent-color: var(--brand); width: 110px; }
.swatch { width: 18px; height: 18px; border-radius: 5px; border: 2px solid transparent; cursor: pointer; }
.swatch.on { border-color: #fff; }
.flex { display: flex; align-items: center; }
.gap-1 { gap: 6px; }
.val { font-size: 12px; color: var(--tx-1); font-family: var(--font-num, monospace); }
.seg { display: flex; gap: 4px; }
.seg-item { font-size: 11.5px; padding: 3px 10px; border-radius: 7px; color: var(--tx-2); cursor: pointer; }
.seg-item.active { background: var(--brand-soft); color: var(--brand); }
.switch { position: relative; display: inline-flex; align-items: center; }
.switch input { opacity: 0; position: absolute; width: 0; }
.switch i { width: 34px; height: 19px; background: var(--line-2); border-radius: 99px; display: block; position: relative; transition: .18s; }
.switch i::after { content: ""; width: 15px; height: 15px; background: #fff; border-radius: 50%; position: absolute; left: 2px; top: 2px; transition: .18s; }
.switch input:checked + i { background: var(--brand); }
.switch input:checked + i::after { left: 17px; }
.link-cfg { display: flex; align-items: center; gap: 8px; font-size: 12px; padding: 8px 10px; background: var(--bg-glass); border: 1px solid var(--line-1); border-radius: var(--r-m); margin-bottom: 8px; }
.link-cfg .l-arrow { color: var(--tx-4); }
.filter-chips { display: flex; gap: 5px; flex-wrap: wrap; margin-bottom: 6px; }
.grow { flex: 1; min-width: 0; }
.tx-3 { color: var(--tx-3); }
.sm { font-size: 11.5px; }
.mb-2 { margin-bottom: 8px; }
.add-link { width: 100%; justify-content: center; margin-top: 4px; }
</style>
