/**
 * 系统管理前端演示数据层（对齐 prototypev2 mock-api：/management/*、/auth/*）。
 * 用户 tab 适配为真实 /api/user 列表；组织/行列级权限/脱敏/审计为前端 mock
 * （行列级权限 FR-AUTH-10/11 为 Phase 1 后端交付项）。
 */
import { ref } from 'vue'

export interface RowPerm {
  id: string
  name: string
  resource: string
  cond: string
  roles: string[]
  enabled: boolean
}

export interface MaskRule {
  id: string
  field: string
  algo: string
  sample: string
  roles: string
  enabled: boolean
}

export interface AuditLog {
  id: string
  time: string
  user: string
  op: string
  target: string
  ip: string
  result: string
}

export interface OrgNode {
  name: string
  count: number
  children?: { name: string; count: number }[]
}

const LS_KEY = 'dg_mock_system_db'

interface SysDb {
  rowPerms: RowPerm[]
  masks: MaskRule[]
  audit: AuditLog[]
}

function seed(): SysDb {
  return {
    rowPerms: [
      { id: 'RP-01', name: '区域数据隔离', resource: '华北油田生产日报看板', cond: 'org_code = ${currentOrg}', roles: ['业务人员'], enabled: true },
      { id: 'RP-02', name: '销售大区自见', resource: '集团经营日报', cond: 'region = ${currentOrg.region}', roles: ['业务人员', '决策层'], enabled: true },
      { id: 'RP-03', name: '井场承包数据', resource: '单井产量排名', cond: 'contractor = ${currentUser}', roles: ['外部顾问'], enabled: false },
    ],
    masks: [
      { id: 'MK-01', field: '联系电话', algo: '掩码', sample: '13812345678 → 138****5678', roles: '业务人员', enabled: true },
      { id: 'MK-02', field: '身份证号', algo: '掩码', sample: '1101**********1234', roles: '全部非管理员', enabled: true },
      { id: 'MK-03', field: '银行账号', algo: '哈希', sample: '6222 **** **** 9012 → e3b0c4…', roles: '业务人员', enabled: true },
    ],
    audit: [
      { id: 'AL-01', time: '今天 08:32', user: '李明', op: '数据导出', target: '原油产量月报.xlsx', ip: '10.12.**.**', result: '成功' },
      { id: 'AL-02', time: '今天 08:05', user: 'admin', op: '权限变更', target: '行级规则 RP-02 启用', ip: '10.12.**.**', result: '成功' },
      { id: 'AL-03', time: '今天 07:41', user: 'guest_ext', op: '越权访问', target: '集团财务库', ip: '外网', result: '已拦截' },
      { id: 'AL-04', time: '昨天 22:41', user: 'system', op: '告警触发', target: '瓦斯浓度超限 AR-02', ip: '—', result: '已通知' },
      { id: 'AL-05', time: '昨天 18:30', user: '赵静', op: '指标认证', target: 'M-COAL-003 v2.0', ip: '10.15.**.**', result: '成功' },
      { id: 'AL-06', time: '昨天 17:20', user: '王芳', op: '登录失败', target: '连续 3 次密码错误', ip: '10.31.**.**', result: '已锁定15分钟' },
    ],
  }
}

function loadDb(): SysDb {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) return JSON.parse(raw) as SysDb
  } catch { /* ignore */ }
  return seed()
}

function saveDb(db: SysDb) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(db)) } catch { /* ignore */ }
}

const db = loadDb()

export const rowPerms = ref<RowPerm[]>(db.rowPerms)
export const maskRules = ref<MaskRule[]>(db.masks)
export const auditLogs = ref<AuditLog[]>(db.audit)

export const orgTree = ref<OrgNode[]>([
  { name: '集团总部', count: 36, children: [{ name: '数据中心', count: 12 }, { name: '财务部', count: 9 }] },
  { name: '华北油田分公司', count: 128, children: [{ name: '第一采油厂', count: 42 }, { name: '第二采油厂', count: 38 }, { name: '井下作业公司', count: 21 }] },
  { name: '管道分公司', count: 64, children: [{ name: '输气一处', count: 22 }, { name: '储气库公司', count: 15 }] },
  { name: '煤化工事业部', count: 45, children: [{ name: '化工一厂', count: 18 }] },
])

function persist() {
  saveDb({ rowPerms: rowPerms.value, masks: maskRules.value, audit: auditLogs.value })
}

export function toggleRowPerm(id: string): boolean {
  const r = rowPerms.value.find((x) => x.id === id)
  if (r) r.enabled = !r.enabled
  persist()
  return r?.enabled ?? false
}

export function saveRowPerm(body: { name: string; resource: string; cond: string; roles?: string[] }): RowPerm {
  const row: RowPerm = {
    id: 'RP-' + String(rowPerms.value.length + 1).padStart(2, '0'),
    name: body.name,
    resource: body.resource,
    cond: body.cond,
    roles: body.roles || ['业务人员'],
    enabled: true,
  }
  rowPerms.value.push(row)
  persist()
  return row
}

export function saveMask(body: { field: string; algo?: string; sample?: string; roles?: string }): MaskRule {
  const row: MaskRule = {
    id: 'MK-' + String(maskRules.value.length + 1).padStart(2, '0'),
    field: body.field,
    algo: body.algo || '掩码',
    sample: body.sample || '',
    roles: body.roles || '业务人员',
    enabled: true,
  }
  maskRules.value.push(row)
  persist()
  return row
}
