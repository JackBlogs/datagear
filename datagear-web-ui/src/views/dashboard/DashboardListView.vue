<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import {
  dashboardPagingQueryData,
  deleteDashboards,
  getDashboard,
  saveDashboard,
  getDashboardResourceContent,
  saveDashboardResourceContent,
  type DashboardListItem,
} from '@/api/dashboard'
import { useOperationMessage } from '@/composables/useOperationMessage'
import type { Order } from '@/types'
import '@/styles/datasource-page.css'

/**
 * 看板管理（对齐 prototypev2 dashboards.html）：
 * 行业筛选 / 我的看板(排序+双视图+右键菜单+收藏) / 行业模板库(一键套用落库) / 回收站(快照恢复)。
 */
const router = useRouter()
const { success, fail } = useOperationMessage()

type Ind = 'oil' | 'gas' | 'chem' | 'coal' | 'common'
const IND_LB: Record<string, string> = { oil: '石油', gas: '天然气', chem: '化工', coal: '煤矿', common: '通用' }
const IND_COLOR: Record<string, string> = { oil: '#FF8A3D', gas: '#22D3EE', chem: '#A78BFA', coal: '#E8B33C', common: '#34D399' }
const INDS: Ind[] = ['oil', 'gas', 'chem', 'coal', 'common']

/** 行业推断（看板实体无行业字段，按名称关键词归类，与原型演示一致） */
function indOf(name: string): Ind {
  if (/油|井|采油|油田/.test(name)) return 'oil'
  if (/气|管网|管输|储气/.test(name)) return 'gas'
  if (/化工|甲醇|炼化|装置|烯烃/.test(name)) return 'chem'
  if (/煤|矿|瓦斯|安全/.test(name)) return 'coal'
  return 'common'
}

/* ---------- 行业模板库（一键套用生成可编辑副本，不污染模板源） ---------- */
interface TplItem { id: string; name: string; ind: Ind; desc: string; widgets: number; used: number; badge?: string; cover: string }
const TEMPLATES: TplItem[] = [
  { id: 'TPL-OIL', name: '油田生产驾驶舱', ind: 'oil', desc: '采油厂 · 区块 · 井场 · 注采比 · 含水率', widgets: 12, used: 38, badge: '官方推荐', cover: 'linear-gradient(135deg,#3a2410,#8a4d1f 45%,#b06a2a)' },
  { id: 'TPL-GAS', name: '天然气管网运行监控', ind: 'gas', desc: '管输量 · 门站压力 · 储气库 · 输差分析', widgets: 10, used: 21, cover: 'linear-gradient(135deg,#0c2a33,#0e5a66 50%,#12808f)' },
  { id: 'TPL-CHEM', name: '煤化工经营分析', ind: 'chem', desc: '甲醇 · 烯烃 · 产销存 · 优级品率', widgets: 14, used: 16, cover: 'linear-gradient(135deg,#241536,#4a2d6e 50%,#6b41a0)' },
  { id: 'TPL-COAL', name: '煤矿安全双重预防', ind: 'coal', desc: '瓦斯 · 顶板 · 人员定位 · 风险分级管控', widgets: 11, used: 29, badge: '安全合规', cover: 'linear-gradient(135deg,#332b0d,#7a6420 50%,#a68a2e)' },
  { id: 'TPL-REFINE', name: '炼化装置实时监控', ind: 'chem', desc: '常减压 · 催化裂化 · 能耗 · 联锁状态', widgets: 16, used: 12, cover: 'linear-gradient(135deg,#30131a,#6e2c3d 50%,#9c4058)' },
  { id: 'TPL-DAILY', name: '集团经营日报', ind: 'oil', desc: '油气煤化四产业 · 产量 · 成本 · 销售', widgets: 9, used: 45, cover: 'linear-gradient(135deg,#0d2233,#1f4d6e 50%,#2e7099)' },
]

/* ---------- 收藏 / 回收站（localStorage 持久化，对齐原型行为） ---------- */
const FAV_KEY = 'dg_board_favs'
const BIN_KEY = 'dg_board_bin'
interface BinItem { id: string; name: string; deletedAt: number; by: string; snapshot: DashboardListItem }
function loadJSON<T>(key: string, fallback: T): T {
  try { return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback } catch { return fallback }
}
function saveJSON(key: string, v: unknown) {
  try { localStorage.setItem(key, JSON.stringify(v)) } catch { /* ignore */ }
}
const favs = ref<Record<string, boolean>>(loadJSON(FAV_KEY, {}))
const bin = ref<BinItem[]>(loadJSON(BIN_KEY, [] as BinItem[]))
const RETAIN_DAYS = 30
function daysLeft(ts: number): number {
  return Math.max(0, RETAIN_DAYS - Math.floor((Date.now() - ts) / 86400000))
}

/* ---------- 状态 ---------- */
const items = ref<DashboardListItem[]>([])
const loading = ref(false)
const keyword = ref('')
const activeTab = ref<'mine' | 'tpl' | 'bin'>('mine')
const indFilter = ref<'all' | Ind>('all')
const sortBy = ref<'updated' | 'hot' | 'fav'>('updated')
const viewMode = ref<'table' | 'card'>('table')

const ctxMenu = ref<{ x: number; y: number; item: DashboardListItem } | null>(null)

function indListOf(list: DashboardListItem) { return indOf(list.name) }
function matchInd(list: DashboardListItem): boolean {
  return indFilter.value === 'all' || indListOf(list) === indFilter.value
}

const mineItems = computed(() => {
  let list = items.value.filter(matchInd)
  const kw = keyword.value.trim().toLowerCase()
  if (kw) list = list.filter((b) => b.name.toLowerCase().includes(kw))
  if (sortBy.value === 'fav')
    list = [...list].sort((a, b) => (favs.value[b.id] ? 1 : 0) - (favs.value[a.id] ? 1 : 0) || String(b.createTime || '').localeCompare(String(a.createTime || '')))
  else if (sortBy.value === 'hot')
    list = [...list].sort((a, b) => a.name.localeCompare(b.name))
  else
    list = [...list].sort((a, b) => String(b.createTime || '').localeCompare(String(a.createTime || '')))
  return list
})

const tplItems = computed(() =>
  TEMPLATES.filter((t) => indFilter.value === 'all' || t.ind === indFilter.value).filter(
    (t) => !keyword.value.trim() || t.name.includes(keyword.value.trim()),
  ),
)

const binItems = computed(() =>
  bin.value.filter((b) => indFilter.value === 'all' || indOf(b.name) === indFilter.value),
)

async function load() {
  loading.value = true
  try {
    const data = await dashboardPagingQueryData({
      page: 1,
      pageSize: 500,
      keyword: keyword.value || undefined,
      orders: [{ name: 'createTime', type: 'DESC' }] as Order[],
    })
    items.value = data.items
  } catch (e) {
    fail((e as Error).message || '查询失败')
  } finally {
    loading.value = false
  }
}

/* ---------- 操作 ---------- */
function toggleFav(b: DashboardListItem) {
  favs.value[b.id] = !favs.value[b.id]
  saveJSON(FAV_KEY, favs.value)
  success(favs.value[b.id] ? '已收藏' : '已取消收藏')
}

async function copyBoard(b: DashboardListItem) {
  try {
    const src = await getDashboard(b.id)
    const copy = await saveDashboard({ ...src, id: undefined as unknown as string, name: `${b.name}（副本）` })
    try {
      const res = await getDashboardResourceContent(b.id)
      if (copy?.id && res) {
        const content = typeof res === 'string' ? res : String((res as { content?: string }).content ?? '')
        if (content) await saveDashboardResourceContent(copy.id, 'index.html', content)
      }
    } catch { /* 部分看板无自定义资源，忽略 */ }
    success('已复制为副本')
    await load()
  } catch (e) {
    fail((e as Error).message || '复制失败')
  }
}

async function delBoard(b: DashboardListItem) {
  if (!window.confirm(`确定删除看板「${b.name}」吗？删除后可在回收站保留 ${RETAIN_DAYS} 天。`)) return
  try {
    bin.value.unshift({ id: b.id, name: b.name, deletedAt: Date.now(), by: 'admin', snapshot: { ...b } })
    saveJSON(BIN_KEY, bin.value)
    await deleteDashboards([b.id])
    success('已移入回收站')
    await load()
  } catch (e) {
    fail((e as Error).message || '删除失败')
  }
}

async function restoreBoard(b: BinItem) {
  try {
    await saveDashboard({ id: undefined as unknown as string, name: b.name, apiVersion: '2.0' })
    bin.value = bin.value.filter((x) => x.id !== b.id)
    saveJSON(BIN_KEY, bin.value)
    success('已恢复到我的看板')
    await load()
  } catch (e) {
    fail((e as Error).message || '恢复失败')
  }
}

async function applyTemplate(t: TplItem) {
  try {
    // 一键套用：生成可编辑副本（落库），不污染模板源
    await saveDashboard({ id: undefined as unknown as string, name: `${t.name}（副本）`, apiVersion: '2.0' })
    success(`已套用模板「${t.name}」，生成可编辑副本`)
    activeTab.value = 'mine'
    await load()
  } catch (e) {
    fail((e as Error).message || '套用失败')
  }
}

/* ---------- 右键菜单 ---------- */
function onRowCtx(e: MouseEvent, b: DashboardListItem) {
  e.preventDefault()
  ctxMenu.value = { x: e.clientX, y: e.clientY, item: b }
}
function closeCtx() {
  ctxMenu.value = null
}
function fmtTime(t?: string | number) {
  if (!t) return '-'
  const s = String(t)
  return s.length >= 16 ? s.slice(0, 16) : s
}

onMounted(async () => {
  await load()
  document.addEventListener('click', closeCtx)
})
onBeforeUnmount(() => document.removeEventListener('click', closeCtx))
</script>

<template>
  <div class="ds-page">
    <!-- 页头 -->
    <div class="page-head">
      <div>
        <div class="page-title">看板</div>
        <div class="page-desc">可视化看板的创建、管理与分享 —— 行业模板一键套用，生成可编辑副本不污染模板源</div>
      </div>
      <div class="page-actions">
        <button class="btn primary" type="button" @click="router.push('/dashboard/add')">＋ 新建看板</button>
      </div>
    </div>

    <!-- 行业筛选 + 搜索 -->
    <div class="flex mb-2" style="gap: 10px; flex-wrap: wrap; align-items: center">
      <div class="seg-row">
        <span class="seg-item" :class="{ active: indFilter === 'all' }" @click="indFilter = 'all'">全部</span>
        <span v-for="ind in INDS" :key="ind" class="seg-item" :class="{ active: indFilter === ind }" @click="indFilter = ind">
          {{ IND_LB[ind] }}
        </span>
      </div>
      <form class="flex grow" style="gap: 10px; max-width: 360px; margin-left: auto" @submit.prevent="load()">
        <input v-model="keyword" class="input" placeholder="搜索看板 / 模板…" />
        <button class="btn" type="submit">查询</button>
      </form>
    </div>

    <!-- 三 Tab -->
    <div class="tabs-row mb-2">
      <div class="tab-item" :class="{ active: activeTab === 'mine' }" @click="activeTab = 'mine'">
        我的看板 <em>{{ items.length }}</em>
      </div>
      <div class="tab-item" :class="{ active: activeTab === 'tpl' }" @click="activeTab = 'tpl'">
        行业模板库 <em>{{ TEMPLATES.length }}</em>
      </div>
      <div class="tab-item" :class="{ active: activeTab === 'bin' }" @click="activeTab = 'bin'">
        回收站 <em>{{ bin.length }}</em>
      </div>
    </div>

    <!-- 我的看板工具条 -->
    <div v-if="activeTab === 'mine'" class="flex mb-2" style="gap: 14px; align-items: center; flex-wrap: wrap">
      <span class="lbl">排序</span>
      <div class="seg-row">
        <span class="seg-item" :class="{ active: sortBy === 'updated' }" @click="sortBy = 'updated'">最近更新</span>
        <span class="seg-item" :class="{ active: sortBy === 'hot' }" @click="sortBy = 'hot'">最热</span>
        <span class="seg-item" :class="{ active: sortBy === 'fav' }" @click="sortBy = 'fav'">收藏优先</span>
      </div>
      <span class="lbl" style="margin-left: 10px">视图</span>
      <div class="seg-row">
        <span class="seg-item" :class="{ active: viewMode === 'table' }" @click="viewMode = 'table'">表格</span>
        <span class="seg-item" :class="{ active: viewMode === 'card' }" @click="viewMode = 'card'">卡片</span>
      </div>
      <span class="tx-3 sm" style="margin-left: auto">{{ mineItems.length }} 个看板</span>
    </div>

    <div v-if="loading" class="empty">数据加载中…</div>

    <!-- ===== 我的看板 ===== -->
    <template v-else-if="activeTab === 'mine'">
      <!-- 表格视图 -->
      <div v-if="viewMode === 'table'" class="table-wrap">
        <table class="tbl">
          <thead>
            <tr>
              <th>看板名称</th>
              <th style="width: 80px">行业</th>
              <th style="width: 110px">创建人</th>
              <th style="width: 160px">创建时间</th>
              <th style="width: 280px">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!mineItems.length">
              <td colspan="5"><div class="empty">没有符合条件的看板</div></td>
            </tr>
            <tr v-for="b in mineItems" :key="b.id" @contextmenu="onRowCtx($event, b)">
              <td>
                <div class="flex" style="gap: 10px; cursor: pointer" @click="router.push(`/dashboard/${b.id}/viewer`)">
                  <span class="db-icon">▦</span>
                  <span class="cell-main ellipsis" style="max-width: 260px">{{ b.name }}</span>
                  <span v-if="favs[b.id]" class="star" title="已收藏" @click.stop="toggleFav(b)">★</span>
                </div>
              </td>
              <td><span class="ind-tag" :style="{ '--c': IND_COLOR[indListOf(b)] }">{{ IND_LB[indListOf(b)] }}</span></td>
              <td class="sm">{{ b.createUser?.realName || b.createUser?.name || '-' }}</td>
              <td class="sm tx-3">{{ fmtTime(b.createTime) }}</td>
              <td @click.stop>
                <span class="link" @click="router.push(`/dashboard/${b.id}/viewer`)">预览</span> ·
                <span class="link" @click="router.push(`/dashboard/${b.id}/design`)">编辑</span> ·
                <span class="link" @click="router.push(`/dashboard/${b.id}/share`)">分享</span> ·
                <span class="link" @click="toggleFav(b)">{{ favs[b.id] ? '取消收藏' : '收藏' }}</span> ·
                <span class="link" @click="copyBoard(b)">复制</span> ·
                <span class="link danger" @click="delBoard(b)">删除</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 卡片视图 -->
      <div v-else class="tpl-grid">
        <div v-for="b in mineItems" :key="b.id" class="db-card" @contextmenu="onRowCtx($event, b)">
          <div class="c-cover" :style="{ background: `linear-gradient(135deg,#101826,#1b2a42 55%,${IND_COLOR[indListOf(b)]}44)` }">
            <div class="cover-blocks"><i></i><i></i><i></i><i></i></div>
            <span v-if="favs[b.id]" class="cover-star" title="已收藏" @click.stop="toggleFav(b)">★</span>
          </div>
          <div class="c-body">
            <div class="c-name ellipsis" :title="b.name">{{ b.name }}</div>
            <div class="c-meta">
              <span class="ind-tag" :style="{ '--c': IND_COLOR[indListOf(b)] }">{{ IND_LB[indListOf(b)] }}</span>
              <span class="sm tx-3">{{ fmtTime(b.createTime) }}</span>
            </div>
            <div class="c-actions">
              <button class="btn sm" type="button" @click="router.push(`/dashboard/${b.id}/viewer`)">预览</button>
              <button class="btn sm" type="button" @click="router.push(`/dashboard/${b.id}/design`)">编辑</button>
              <button class="btn sm" type="button" @click="copyBoard(b)">复制</button>
              <button class="btn sm danger" type="button" @click="delBoard(b)">删除</button>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- ===== 行业模板库 ===== -->
    <template v-else-if="activeTab === 'tpl'">
      <div class="tpl-grid">
        <div v-for="t in tplItems" :key="t.id" class="db-card">
          <div class="c-cover" :style="{ background: t.cover }">
            <span v-if="t.badge" class="cover-badge">{{ t.badge }}</span>
            <div class="cover-blocks"><i></i><i></i><i></i><i></i></div>
          </div>
          <div class="c-body">
            <div class="c-name">{{ t.name }}</div>
            <div class="c-desc">{{ t.desc }}</div>
            <div class="c-meta">
              <span class="ind-tag" :style="{ '--c': IND_COLOR[t.ind] }">{{ IND_LB[t.ind] }}</span>
              <span class="sm tx-3">{{ t.widgets }} 部件 · 被套用 {{ t.used }} 次</span>
              <button class="btn sm primary" style="margin-left: auto" type="button" @click="applyTemplate(t)">一键套用</button>
            </div>
          </div>
        </div>
        <div v-if="!tplItems.length" class="empty" style="grid-column: 1/-1">该行业暂无模板</div>
      </div>
    </template>

    <!-- ===== 回收站 ===== -->
    <template v-else>
      <div class="table-wrap">
        <table class="tbl">
          <thead>
            <tr>
              <th>看板名称</th>
              <th style="width: 110px">删除人</th>
              <th style="width: 170px">删除时间</th>
              <th style="width: 110px">剩余保留期</th>
              <th style="width: 160px">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!binItems.length">
              <td colspan="5"><div class="empty">回收站为空</div></td>
            </tr>
            <tr v-for="b in binItems" :key="b.id">
              <td><span class="cell-main">{{ b.name }}</span></td>
              <td class="sm">{{ b.by }}</td>
              <td class="sm tx-3">{{ new Date(b.deletedAt).toLocaleString('zh-CN', { hour12: false }) }}</td>
              <td><span class="tag" :class="daysLeft(b.deletedAt) <= 7 ? 'danger' : ''">{{ daysLeft(b.deletedAt) }} 天</span></td>
              <td>
                <span class="link" @click="restoreBoard(b)">恢复</span> ·
                <span
                  class="link danger"
                  @click="
                    () => {
                      bin = bin.filter((x) => x.id !== b.id)
                      saveJSON(BIN_KEY, bin)
                      success('已彻底删除')
                    }
                  "
                >彻底删除</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <!-- 右键菜单 -->
    <div v-if="ctxMenu" class="ctx-menu" :style="{ top: ctxMenu.y + 'px', left: ctxMenu.x + 'px' }">
      <div class="mi" @click="router.push(`/dashboard/${ctxMenu.item.id}/viewer`); closeCtx()">预览</div>
      <div class="mi" @click="router.push(`/dashboard/${ctxMenu.item.id}/design`); closeCtx()">编辑</div>
      <div class="mi" @click="router.push(`/dashboard/${ctxMenu.item.id}/share`); closeCtx()">分享</div>
      <div class="mi" @click="toggleFav(ctxMenu.item); closeCtx()">{{ favs[ctxMenu.item.id] ? '取消收藏' : '收藏' }}</div>
      <div class="mi" @click="copyBoard(ctxMenu.item); closeCtx()">创建副本</div>
      <div class="mi danger" @click="delBoard(ctxMenu.item); closeCtx()">删除</div>
    </div>
  </div>
</template>

<style scoped>
.seg-row { display: inline-flex; gap: 4px; padding: 3px; border-radius: 10px; background: var(--bg-glass); border: 1px solid var(--line-1); }
.seg-item { padding: 5px 14px; border-radius: 8px; font-size: 12.5px; color: var(--tx-3); cursor: pointer; white-space: nowrap; }
.seg-item:hover { color: var(--tx-1); }
.seg-item.active { background: var(--brand-soft); color: var(--brand); }
.lbl { font-size: 12px; color: var(--tx-4); }
.tabs-row { display: flex; gap: 4px; border-bottom: 1px solid var(--line-1); }
.tab-item { padding: 9px 18px; font-size: 13px; color: var(--tx-3); cursor: pointer; border-bottom: 2px solid transparent; display: inline-flex; gap: 6px; align-items: center; }
.tab-item:hover { color: var(--tx-1); }
.tab-item.active { color: var(--brand); border-bottom-color: var(--brand); }
.tab-item em { font-style: normal; font-size: 10.5px; padding: 1px 7px; border-radius: 8px; background: var(--bg-glass-2); color: var(--tx-3); }
.db-icon {
  width: 30px; height: 30px; border-radius: 8px; background: rgba(255, 138, 61, 0.14); color: var(--brand);
  display: inline-flex; align-items: center; justify-content: center; flex: none; font-size: 13px;
}
.star { color: #e8b33c; cursor: pointer; font-size: 13px; }
.ind-tag {
  font-size: 11px; padding: 2px 9px; border-radius: 7px; color: var(--c, var(--tx-2)); white-space: nowrap;
  background: color-mix(in srgb, var(--c, #888) 14%, transparent); border: 1px solid color-mix(in srgb, var(--c, #888) 35%, transparent);
}
.ctx-menu { position: fixed; z-index: 200; min-width: 130px; background: #141d2c; border: 1px solid var(--line-2); border-radius: 10px; padding: 5px; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5); }
.ctx-menu .mi { padding: 7px 14px; border-radius: 7px; font-size: 12.5px; color: var(--tx-2); cursor: pointer; }
.ctx-menu .mi:hover { background: var(--bg-glass-2); color: var(--tx-1); }
.ctx-menu .mi.danger { color: #f87171; }
.tpl-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 14px; }
.db-card { border: 1px solid var(--line-1); border-radius: 14px; overflow: hidden; background: var(--bg-glass); transition: border-color 0.15s, transform 0.15s; }
.db-card:hover { border-color: var(--brand-line); transform: translateY(-2px); }
.c-cover { height: 150px; position: relative; }
.cover-badge { position: absolute; top: 10px; left: 10px; z-index: 1; font-size: 10.5px; padding: 3px 9px; border-radius: 7px; background: rgba(0, 0, 0, 0.4); color: #ffd9b8; border: 1px solid rgba(255, 138, 61, 0.4); }
.cover-star { position: absolute; top: 10px; right: 12px; color: #e8b33c; font-size: 16px; cursor: pointer; z-index: 1; }
.cover-blocks { position: absolute; top: 18px; right: 18px; display: grid; grid-template-columns: repeat(2, 34px); gap: 6px; opacity: 0.5; }
.cover-blocks i { height: 20px; border-radius: 4px; background: rgba(255, 255, 255, 0.25); }
.c-body { padding: 12px 14px 14px; }
.c-name { font-size: 14px; font-weight: 700; color: var(--tx-1); }
.c-desc { font-size: 12px; color: var(--tx-3); margin: 5px 0 9px; }
.c-meta { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.c-actions { display: flex; gap: 6px; margin-top: 10px; }
</style>
