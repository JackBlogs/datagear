// 数据源类型推导工具：从 JDBC URL 推导数据库类型 / 信创标记 / 来源分类。
// 对应原型 datasource.html 的类型列与信创 tag 规则。

/** 来源分类（对应原型四张分类卡） */
export type DsCategory = 'db' | 'file' | 'http' | 'stream'

export interface DsTypeInfo {
  /** 类型显示名（如 MySQL / 达梦 DM8 / JDBC） */
  label: string
  /** 是否国产信创库（显示「信创」tag） */
  xc: boolean
  /** 来源分类 */
  category: DsCategory
}

/** URL 前缀 → [显示名, 是否信创]（按 jdbc:xxx 第二段匹配，长前缀优先） */
const JDBC_TYPE_MAP: [string, string, boolean][] = [
  ['sqlserver', 'SQLServer', false],
  ['clickhouse', 'ClickHouse', false],
  ['kingbase', '金仓 Kingbase', true],
  ['gaussdb', 'GaussDB', true],
  ['mysql', 'MySQL', false],
  ['oracle', 'Oracle', false],
  ['dm', '达梦 DM8', true],
  ['hive', 'Hive', false],
  ['postgresql', 'PostgreSQL', false],
  ['db2', 'DB2', false],
  ['sqlite', 'SQLite', false],
  ['h2', 'H2', false],
  ['oceanbase', 'OceanBase', true],
  ['gbase', 'GBase', true],
  ['oscar', '神通 Oscar', true],
  ['sybase', 'Sybase', false],
  ['informix', 'Informix', false],
  ['derby', 'Derby', false],
  ['hsqldb', 'HSQLDB', false],
  ['presto', 'Presto', false],
  ['phoenix', 'Phoenix', false],
]

/** 从 URL 推导数据源类型信息 */
export function deriveDsType(url: string | undefined): DsTypeInfo {
  const u = (url ?? '').trim()
  if (!u) return { label: 'JDBC', xc: false, category: 'db' }
  const m = u.match(/^jdbc:([a-z0-9]+)/i)
  if (m) {
    const seg = m[1]!.toLowerCase()
    for (const [key, label, xc] of JDBC_TYPE_MAP) {
      if (seg === key || seg.startsWith(key)) return { label, xc, category: 'db' }
    }
    return { label: 'JDBC', xc: false, category: 'db' }
  }
  if (/^https?:/i.test(u)) return { label: 'HTTP', xc: false, category: 'http' }
  if (/^(kafka|mqtt|amqp|jms)/i.test(u)) return { label: '流', xc: false, category: 'stream' }
  if (/^(file|ftp|sftp|hdfs):/i.test(u) || /^[a-zA-Z]:[\\/]/.test(u) || u.startsWith('/'))
    return { label: '文件', xc: false, category: 'file' }
  // DataGear 实际只有 JDBC 数据源，未识别形态归数据库类
  return { label: 'JDBC', xc: false, category: 'db' }
}

/** 分类卡配色（对应原型四张卡的图标色/底色/光晕） */
export const CATEGORY_STYLE: Record<DsCategory, { color: string; bg: string; glow: string }> = {
  db: { color: 'var(--oil)', bg: 'var(--oil-soft)', glow: 'rgba(255,138,61,.12)' },
  file: { color: 'var(--coal)', bg: 'var(--coal-soft)', glow: 'rgba(232,179,60,.12)' },
  http: { color: 'var(--info)', bg: 'var(--info-soft)', glow: 'rgba(96,165,250,.12)' },
  stream: { color: 'var(--gas)', bg: 'var(--gas-soft)', glow: 'rgba(34,211,238,.12)' },
}

/** 连接地址打码（隐藏主机中间段，对应原型抽屉 KV 展示） */
export function maskUrl(url: string | undefined): string {
  if (!url) return ''
  return url.replace(/(\/\/)([^/:?]+)/, (_all, p1: string, host: string) => {
    // IPv4：打码中间两段；其余主机名：打码中段字符
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) {
      const segs = host.split('.')
      return `${p1}${segs[0]}.***.***.${segs[3]}`
    }
    if (host.length <= 3) return p1 + host
    return `${p1}${host.slice(0, 2)}***${host.slice(-1)}`
  })
}
