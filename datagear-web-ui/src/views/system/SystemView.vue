<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { userPagingQueryData, type User } from '@/api/user'
import {
  rowPermList,
  saveRowPermApi,
  toggleRowPermApi,
  maskList,
  saveMaskApi,
  auditList,
  type RowPermEntity,
  type MaskRuleEntity,
  type AuditLogEntity,
} from '@/api/authData'
import { orgTree } from '@/mock/systemData'
import { useOperationMessage } from '@/composables/useOperationMessage'
import '@/styles/datasource-page.css'

/**
 * 系统管理（对齐 prototypev2 system.html）：
 * 6 tab —— 用户（真实 /api/user）/ 角色（真实 /role 入口）/ 组织 / 行列级权限（真实，FR-AUTH-10）
 * / 动态脱敏（真实，FR-AUTH-11，查询结果侧生效）/ 审计日志（真实，FR-AUTH-12 权限变更自动留痕）。
 */
const router = useRouter()
const { success, fail } = useOperationMessage()

type Pane = 'users' | 'roles' | 'orgs' | 'rc' | 'mask' | 'audit'
const pane = ref<Pane>('users')

/* ---------- 用户（真实 API） ---------- */
const users = ref<User[]>([])
const usersLoading = ref(false)
const userKw = ref('')

const filteredUsers = computed(() => {
  const kw = userKw.value.trim().toLowerCase()
  if (!kw) return users.value
  return users.value.filter(
    (u) => u.name.toLowerCase().includes(kw) || (u.realName || '').toLowerCase().includes(kw),
  )
})

async function loadUsers() {
  usersLoading.value = true
  try {
    const data = await userPagingQueryData({ page: 1, pageSize: 100 })
    users.value = data.items
  } catch (e) {
    fail((e as Error).message || '用户加载失败')
  } finally {
    usersLoading.value = false
  }
}

function roleNames(u: User): string {
  return u.roles?.map((r) => r.name).join('、') || (u.admin ? '管理员' : '—')
}

/* ---------- 组织 ---------- */
const orgSelected = ref(orgTree.value[0]?.name ?? '')

/* ---------- 行列级权限（真实 API，FR-AUTH-10） ---------- */
const rowPerms = ref<RowPermEntity[]>([])
const rpLoading = ref(false)

function rpRoles(r: RowPermEntity): string[] {
  try {
    return JSON.parse(r.rolesJson || '[]')
  } catch {
    return []
  }
}

async function loadRowPerms() {
  rpLoading.value = true
  try {
    rowPerms.value = await rowPermList()
  } catch (e) {
    fail((e as Error).message || '行级权限加载失败')
  } finally {
    rpLoading.value = false
  }
}

const rpForm = ref<{
  name: string
  resource: string
  cond: string
  tableName: string
  fieldName: string
} | null>(null)

async function submitRp() {
  if (!rpForm.value) return
  if (!rpForm.value.name || !rpForm.value.resource || !rpForm.value.cond) {
    fail('规则名、资源与过滤条件不能为空')
    return
  }
  try {
    await saveRowPermApi({
      name: rpForm.value.name,
      resource: rpForm.value.resource,
      cond: rpForm.value.cond,
      tableName: rpForm.value.tableName,
      fieldName: rpForm.value.fieldName,
      roles: ['业务人员'],
    })
    rpForm.value = null
    success('行级权限规则已保存并启用（查询链路自动注入行过滤）')
    await loadRowPerms()
  } catch (e) {
    fail((e as Error).message || '保存失败')
  }
}

async function onToggleRp(r: RowPermEntity) {
  try {
    const enabled = await toggleRowPermApi(r.id)
    r.enabled = enabled ? 1 : 0
    success(`规则「${r.name}」已${enabled ? '启用' : '停用'}`)
  } catch (e) {
    fail((e as Error).message || '操作失败')
  }
}

/* ---------- 动态脱敏（真实 API，FR-AUTH-11） ---------- */
const maskRules = ref<MaskRuleEntity[]>([])
const maskLoading = ref(false)

async function loadMasks() {
  maskLoading.value = true
  try {
    maskRules.value = await maskList()
  } catch (e) {
    fail((e as Error).message || '脱敏规则加载失败')
  } finally {
    maskLoading.value = false
  }
}

const maskForm = ref<{
  field: string
  algo: string
  sample: string
  roles: string
  tableName: string
  fieldName: string
} | null>(null)

async function submitMask() {
  if (!maskForm.value) return
  if (!maskForm.value.field) {
    fail('请填写脱敏字段')
    return
  }
  try {
    await saveMaskApi({
      field: maskForm.value.field,
      algo: maskForm.value.algo,
      sample: maskForm.value.sample,
      roles: maskForm.value.roles,
      tableName: maskForm.value.tableName,
      fieldName: maskForm.value.fieldName,
    })
    maskForm.value = null
    success('脱敏规则已保存（查询结果侧生效）')
    await loadMasks()
  } catch (e) {
    fail((e as Error).message || '保存失败')
  }
}

/* ---------- 审计日志（真实 API，FR-AUTH-12） ---------- */
const auditLogs = ref<AuditLogEntity[]>([])
const auditLoading = ref(false)

async function loadAudit() {
  auditLoading.value = true
  try {
    const data = await auditList()
    auditLogs.value = data.rows
  } catch (e) {
    fail((e as Error).message || '审计日志加载失败')
  } finally {
    auditLoading.value = false
  }
}

function fmtAuditTime(t?: string): string {
  if (!t) return '—'
  const d = new Date(t.replace(' ', 'T'))
  if (Number.isNaN(d.getTime())) return t
  const now = new Date()
  const hm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  const day = (x: Date) => `${x.getFullYear()}-${x.getMonth()}-${x.getDate()}`
  if (day(d) === day(now)) return `今天 ${hm}`
  const yd = new Date(now.getTime() - 86400000)
  if (day(d) === day(yd)) return `昨天 ${hm}`
  return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${hm}`
}

const auditOp = ref('')
const RISK_OPS = ['权限变更', '数据导出', '登录失败', '越权访问']
function isRisk(op: string): boolean {
  return RISK_OPS.some((o) => op.includes(o))
}
const filteredAudit = computed(() => {
  if (!auditOp.value) return auditLogs.value
  return auditLogs.value.filter((a) => a.op === auditOp.value)
})

watch(pane, (p) => {
  if (p === 'rc' && !rowPerms.value.length) loadRowPerms()
  else if (p === 'mask' && !maskRules.value.length) loadMasks()
  else if (p === 'audit' && !auditLogs.value.length) loadAudit()
})

onMounted(loadUsers)
</script>

<template>
  <div class="ds-page">
    <!-- 页头 -->
    <div class="page-head">
      <div>
        <div class="page-title">系统管理 <span class="tag brand">平台</span></div>
        <div class="page-desc">用户与组织 · 角色权限 · 行列级数据权限 · 动态脱敏 · 审计日志（FR-AUTH-01~17）</div>
      </div>
      <div class="page-actions">
        <button class="btn" type="button" @click="router.push('/user')">用户管理（完整版）</button>
        <button class="btn" type="button" @click="router.push('/role')">角色管理</button>
      </div>
    </div>

    <!-- Tabs -->
    <div class="tabs-row mb-2">
      <div class="tab-item" :class="{ active: pane === 'users' }" @click="pane = 'users'">用户 <em>{{ users.length }}</em></div>
      <div class="tab-item" :class="{ active: pane === 'roles' }" @click="pane = 'roles'">角色</div>
      <div class="tab-item" :class="{ active: pane === 'orgs' }" @click="pane = 'orgs'">组织</div>
      <div class="tab-item" :class="{ active: pane === 'rc' }" @click="pane = 'rc'">行列级权限 <em>{{ rowPerms.length }}</em></div>
      <div class="tab-item" :class="{ active: pane === 'mask' }" @click="pane = 'mask'">动态脱敏 <em>{{ maskRules.length }}</em></div>
      <div class="tab-item" :class="{ active: pane === 'audit' }" @click="pane = 'audit'">审计日志</div>
    </div>

    <!-- ===== 用户（真实数据） ===== -->
    <template v-if="pane === 'users'">
      <div class="flex mb-2" style="gap: 10px; max-width: 420px">
        <input v-model="userKw" class="input" placeholder="搜索用户名 / 姓名" />
      </div>
      <div class="table-wrap">
        <table class="tbl">
          <thead>
            <tr>
              <th>用户</th><th>账号</th><th>角色</th><th style="width: 90px">状态</th><th style="width: 130px">创建时间</th><th style="width: 120px">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="usersLoading"><td colspan="6"><div class="empty">加载中…</div></td></tr>
            <tr v-else-if="!filteredUsers.length"><td colspan="6"><div class="empty">没有符合条件的用户</div></td></tr>
            <tr v-for="u in filteredUsers" :key="u.id">
              <td>
                <div class="flex" style="gap: 10px">
                  <span class="u-avatar">{{ (u.realName || u.name || '?').slice(0, 1).toUpperCase() }}</span>
                  <span class="cell-main">{{ u.realName || u.name }}</span>
                  <span v-if="u.admin" class="tag brand">管理员</span>
                </div>
              </td>
              <td class="sm">{{ u.name }}</td>
              <td class="sm">{{ roleNames(u) }}</td>
              <td><span class="tag ok">正常</span></td>
              <td class="sm tx-3">{{ u.createTime ? String(u.createTime).slice(0, 16) : '—' }}</td>
              <td>
                <span class="link" @click="router.push(`/user/${u.id}/edit`)">编辑</span> ·
                <span class="link" @click="router.push(`/user/${u.id}/password`)">改密</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <!-- ===== 角色 ===== -->
    <template v-else-if="pane === 'roles'">
      <div class="card" style="padding: 16px">
        <div class="card-title"><i class="bar"></i>角色管理（完整功能在「角色」页面）</div>
        <div class="role-cards">
          <div class="role-card" @click="router.push('/role')"><b>管理员</b><span>全部权限</span></div>
          <div class="role-card" @click="router.push('/role')"><b>数据分析师</b><span>建数据集/图表/看板</span></div>
          <div class="role-card" @click="router.push('/role')"><b>数据工程师</b><span>数据源/数据集管理</span></div>
          <div class="role-card" @click="router.push('/role')"><b>业务人员</b><span>消费看板/报表</span></div>
          <div class="role-card" @click="router.push('/role')"><b>决策层</b><span>看板/大屏查看</span></div>
          <div class="role-card" @click="router.push('/role')"><b>外部顾问</b><span>受限只读</span></div>
        </div>
      </div>
    </template>

    <!-- ===== 组织 ===== -->
    <template v-else-if="pane === 'orgs'">
      <div class="gov-layout">
        <div class="card org-tree">
          <div class="card-title"><i class="bar"></i>组织架构树</div>
          <template v-for="o in orgTree" :key="o.name">
            <div class="org-node root" :class="{ sel: orgSelected === o.name }" @click="orgSelected = o.name">
              ▣ {{ o.name }} <b>{{ o.count }} 人</b>
            </div>
            <div v-for="c in o.children || []" :key="c.name" class="org-node leaf" @click="orgSelected = c.name">
              └ {{ c.name }} <b>{{ c.count }} 人</b>
            </div>
          </template>
          <button class="btn sm" style="margin-top: 12px" type="button" @click="success('组织架构同步任务已触发（对接组织主数据）')">同步组织架构</button>
        </div>
        <div class="card org-detail">
          <div class="card-title"><i class="bar"></i>{{ orgSelected }} · 组织详情</div>
          <div class="tx-3 sm">组织树支持按层级做行级权限过滤（${'{'}currentOrg{'}'} 变量，见「行列级权限」页签）。</div>
          <div class="tx-3 sm" style="margin-top: 8px">组织详情页可查看成员列表与权限配置；批量导入用户支持按组织分配默认角色。</div>
        </div>
      </div>
    </template>

    <!-- ===== 行列级权限 ===== -->
    <template v-else-if="pane === 'rc'">
      <div class="flex mb-2">
        <button class="btn primary sm" type="button" @click="rpForm = { name: '', resource: '', cond: '', tableName: '', fieldName: '' }">＋ 新建规则 ›</button>
        <span class="tx-3 sm" style="margin-left: auto">查询链路统一改写：规则绑定物理表后，指标查询自动注入行过滤（PreparedStatement 参数化）→ 结果侧动态脱敏（SDS 权限管道）</span>
      </div>
      <div class="table-wrap">
        <table class="tbl">
          <thead>
            <tr><th>规则名</th><th>生效资源</th><th>过滤条件</th><th>生效角色</th><th style="width: 90px">状态</th></tr>
          </thead>
          <tbody>
            <tr v-if="rpLoading"><td colspan="5"><div class="empty">加载中…</div></td></tr>
            <tr v-else-if="!rowPerms.length"><td colspan="5"><div class="empty">暂无规则</div></td></tr>
            <tr v-for="r in rowPerms" :key="r.id">
              <td><span class="cell-main">{{ r.name }}</span></td>
              <td class="sm">
                {{ r.resource }}
                <div v-if="r.tableName" class="tx-4" style="font-size: 10.5px">物理表 {{ r.tableName }}{{ r.fieldName ? ' · ' + r.fieldName : '' }}</div>
              </td>
              <td><span class="cond">{{ r.cond }}</span></td>
              <td><span v-for="role in rpRoles(r)" :key="role" class="tag info" style="margin-right: 4px">{{ role }}</span></td>
              <td><label class="switch"><input type="checkbox" :checked="r.enabled === 1" @change="onToggleRp(r)" /><i></i></label></td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="flex" style="gap: 12px; margin-top: 12px; flex-wrap: wrap">
        <div class="card" style="padding: 12px; flex: 1"><div class="card-title"><i class="bar"></i>列级权限</div><div class="sm tx-3">成本敏感列对业务人员隐藏（吨油完全成本数据集 · 隐藏列）；联系方式脱敏列（用户主数据 → 138****1234）。</div></div>
      </div>
    </template>

    <!-- ===== 动态脱敏 ===== -->
    <template v-else-if="pane === 'mask'">
      <div class="flex mb-2">
        <button class="btn primary sm" type="button" @click="maskForm = { field: '', algo: '掩码', sample: '', roles: '业务人员', tableName: '', fieldName: '' }">＋ 新建脱敏规则</button>
      </div>
      <div class="table-wrap">
        <table class="tbl">
          <thead>
            <tr><th>脱敏字段</th><th style="width: 90px">算法</th><th>原始值 → 展示值</th><th style="width: 130px">生效角色</th><th style="width: 90px">状态</th></tr>
          </thead>
          <tbody>
            <tr v-if="maskLoading"><td colspan="5"><div class="empty">加载中…</div></td></tr>
            <tr v-else-if="!maskRules.length"><td colspan="5"><div class="empty">暂无脱敏规则</div></td></tr>
            <tr v-for="m in maskRules" :key="m.id">
              <td>
                <span class="cell-main">{{ m.field }}</span>
                <div v-if="m.tableName" class="tx-4" style="font-size: 10.5px">{{ m.tableName }}{{ m.fieldName ? ' · ' + m.fieldName : '' }}</div>
              </td>
              <td><span class="tag info">{{ m.algo }}</span></td>
              <td class="sm">{{ m.sample || '—' }}</td>
              <td class="sm">{{ m.roles || '全部' }}</td>
              <td><span class="tag" :class="m.enabled === 1 ? 'ok' : ''">{{ m.enabled === 1 ? '生效中' : '已停用' }}</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <!-- ===== 审计日志 ===== -->
    <template v-else>
      <div class="flex mb-2" style="gap: 8px; align-items: center; flex-wrap: wrap">
        <div class="seg-row">
          <span class="seg-item" :class="{ active: auditOp === '' }" @click="auditOp = ''">全部</span>
          <span v-for="op in ['权限变更', '数据导出', '越权访问', '登录失败']" :key="op" class="seg-item" :class="{ active: auditOp === op }" @click="auditOp = op">{{ op }}</span>
        </div>
        <span class="tx-3 sm" style="margin-left: auto">关键操作（权限变更/导出/登录失败）红色高亮 · 可导出</span>
      </div>
      <div class="table-wrap">
        <table class="tbl">
          <thead>
            <tr><th style="width: 130px">时间</th><th style="width: 100px">用户</th><th style="width: 110px">操作类型</th><th>对象</th><th style="width: 110px">来源 IP</th><th style="width: 120px">结果</th></tr>
          </thead>
          <tbody>
            <tr v-if="auditLoading"><td colspan="6"><div class="empty">加载中…</div></td></tr>
            <tr v-else-if="!filteredAudit.length"><td colspan="6"><div class="empty">暂无日志</div></td></tr>
            <tr v-for="a in filteredAudit" :key="a.id" :class="{ risk: isRisk(a.op) }">
              <td class="sm tx-3">{{ fmtAuditTime(a.createTime) }}</td>
              <td class="sm">{{ a.user }}</td>
              <td><span class="tag" :class="isRisk(a.op) ? 'danger' : 'info'">{{ a.op }}</span></td>
              <td class="sm">{{ a.target }}</td>
              <td class="sm tx-3">{{ a.ip }}</td>
              <td><span class="tag" :class="a.result.includes('拦截') || a.result.includes('锁定') ? 'danger' : 'ok'">{{ a.result }}</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <!-- 行级权限新建弹窗 -->
    <div v-if="rpForm" class="drawer-mask" @click="rpForm = null">
      <div class="modal" @click.stop>
        <div class="drawer-head">
          <div class="drawer-title">新建行级权限规则</div>
          <button class="btn sm ghost" type="button" @click="rpForm = null">✕</button>
        </div>
        <div class="drawer-body">
          <div class="form-item"><label class="form-label">规则名 *</label><input v-model="rpForm.name" class="input" placeholder="如：区域数据隔离" /></div>
          <div class="form-item"><label class="form-label">生效资源 *</label><input v-model="rpForm.resource" class="input" placeholder="如：华北油田生产日报看板" /></div>
          <div class="form-item"><label class="form-label">过滤条件 *（支持 ${'{'}currentUser{'}'} / ${'{'}currentOrg{'}'} 变量）</label><input v-model="rpForm.cond" class="input" placeholder="如 org_code = ${currentOrg}" /></div>
          <div class="flex" style="gap: 10px">
            <div class="form-item grow"><label class="form-label">作用物理表（选填，绑定后指标查询自动注入）</label><input v-model="rpForm.tableName" class="input" placeholder="如 DG_SALES_FACT" /></div>
            <div class="form-item grow"><label class="form-label">物理字段（选填）</label><input v-model="rpForm.fieldName" class="input" placeholder="如 REGION" /></div>
          </div>
          <div class="flex" style="gap: 10px; margin-top: 16px">
            <button class="btn primary grow" type="button" @click="submitRp">保存并启用</button>
            <button class="btn" type="button" @click="rpForm = null">取消</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 脱敏新建弹窗 -->
    <div v-if="maskForm" class="drawer-mask" @click="maskForm = null">
      <div class="modal" @click.stop>
        <div class="drawer-head">
          <div class="drawer-title">新建脱敏规则</div>
          <button class="btn sm ghost" type="button" @click="maskForm = null">✕</button>
        </div>
        <div class="drawer-body">
          <div class="form-item"><label class="form-label">脱敏字段 *</label><input v-model="maskForm.field" class="input" placeholder="如：联系电话" /></div>
          <div class="form-item"><label class="form-label">算法</label>
            <select v-model="maskForm.algo" class="input"><option>掩码</option><option>哈希</option><option>置空</option><option>截断</option></select>
          </div>
          <div class="form-item"><label class="form-label">示例（原始值 → 展示值）</label><input v-model="maskForm.sample" class="input" placeholder="如：13812345678 → 138****5678" /></div>
          <div class="flex" style="gap: 10px">
            <div class="form-item grow"><label class="form-label">作用物理表（选填，绑定后结果列自动匹配）</label><input v-model="maskForm.tableName" class="input" placeholder="如 DG_SALES_FACT" /></div>
            <div class="form-item grow"><label class="form-label">物理字段（选填）</label><input v-model="maskForm.fieldName" class="input" placeholder="如 CONTACT" /></div>
          </div>
          <div class="form-item"><label class="form-label">生效角色</label><input v-model="maskForm.roles" class="input" placeholder="如：业务人员" /></div>
          <div class="flex" style="gap: 10px; margin-top: 16px">
            <button class="btn primary grow" type="button" @click="submitMask">保存</button>
            <button class="btn" type="button" @click="maskForm = null">取消</button>
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
.tab-item em.brand-tag { background: var(--brand-soft); color: var(--brand); }
.u-avatar { width: 28px; height: 28px; border-radius: 50%; background: var(--bg-glass-2); color: var(--brand); display: inline-flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; flex: none; }
.seg-row { display: inline-flex; gap: 4px; padding: 3px; border-radius: 10px; background: var(--bg-glass); border: 1px solid var(--line-1); flex-wrap: wrap; }
.seg-item { padding: 5px 14px; border-radius: 8px; font-size: 12.5px; color: var(--tx-3); cursor: pointer; }
.seg-item.active { background: var(--brand-soft); color: var(--brand); }
.cond { font-family: monospace; font-size: 11.5px; color: #9ecbff; background: rgba(0,0,0,.3); padding: 2px 8px; border-radius: 6px; }
.gov-layout { display: grid; grid-template-columns: 280px 1fr; gap: 12px; align-items: start; }
.org-tree { padding: 12px; }
.org-node { padding: 7px 10px; border-radius: 8px; font-size: 12.5px; color: var(--tx-2); cursor: pointer; display: flex; justify-content: space-between; }
.org-node b { color: var(--tx-4); font-weight: 400; font-size: 11px; }
.org-node.root { font-weight: 700; color: var(--tx-1); }
.org-node.leaf { padding-left: 26px; }
.org-node:hover { background: var(--bg-glass-2); }
.org-node.sel { background: var(--brand-soft); color: var(--brand); }
.org-detail { padding: 16px; }
.role-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 10px; }
.role-card { padding: 14px; border-radius: 12px; border: 1px solid var(--line-1); cursor: pointer; display: flex; flex-direction: column; gap: 4px; }
.role-card:hover { border-color: var(--brand-line); background: var(--bg-glass-2); }
.role-card b { color: var(--tx-1); font-size: 13px; }
.role-card span { font-size: 11px; color: var(--tx-4); }
tr.risk td { background: rgba(248, 113, 113, 0.06); }
.form-item { margin-bottom: 13px; }
.form-label { font-size: 12px; color: var(--tx-2); margin-bottom: 5px; display: block; }
.drawer-mask { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.55); z-index: 100; display: flex; align-items: center; justify-content: center; }
.modal { width: 540px; max-width: 92vw; max-height: 86vh; background: #0d1420; border: 1px solid var(--line-2); border-radius: 14px; display: flex; flex-direction: column; overflow: hidden; }
.drawer-head { flex: none; display: flex; align-items: center; justify-content: space-between; padding: 15px 20px; border-bottom: 1px solid var(--line-1); }
.drawer-title { font-size: 15px; font-weight: 700; color: var(--tx-1); }
.drawer-body { flex: 1; overflow-y: auto; padding: 16px 20px 22px; }
.grow { flex: 1; min-width: 0; }
</style>
