/**
 * 开放与嵌入前端演示数据层（对齐 prototypev2 mock-api.js 契约）。
 * 端点形状：/openapi/api/*、/openapi/key/*、/embed/key/*。
 * 后端 openapi 模块（FR-EXCH-04~07 / FR-EMBED-01）就绪后替换为真实 API。
 */
import { ref } from 'vue'

export interface DataApi {
  id: string
  name: string
  path: string
  source: '指标' | '数据集'
  limit: string
  today: number
  enabled: boolean
  version: string
}

export interface ApiKey {
  id: string
  name: string
  prefix: string
  scope: string
  limit: string
  last: string
  enabled: boolean
  created: string
}

export interface EmbedKey {
  id: string
  name: string
  domains: string
  expire: string
  enabled: boolean
  calls30d: number
}

const LS_KEY = 'dg_mock_openapi_db'

interface OpenApiDb {
  apis: DataApi[]
  keys: ApiKey[]
  embeds: EmbedKey[]
}

function seed(): OpenApiDb {
  return {
    apis: [
      { id: 'API-01', name: '原油产量查询', path: '/api/v1/metrics/M-OIL-001', source: '指标', limit: '1000 次/分', today: 8642, enabled: true, version: 'v1' },
      { id: 'API-02', name: '采油日报数据集', path: '/api/v1/datasets/DS001', source: '数据集', limit: '600 次/分', today: 3120, enabled: true, version: 'v1' },
      { id: 'API-03', name: '管输周转量', path: '/api/v1/metrics/M-GAS-001', source: '指标', limit: '300 次/分', today: 745, enabled: true, version: 'v1' },
      { id: 'API-04', name: '瓦斯监测实时值', path: '/api/v1/datasets/DS003', source: '数据集', limit: '1200 次/分', today: 18933, enabled: true, version: 'v2' },
      { id: 'API-05', name: '吨油成本月结', path: '/api/v1/metrics/M-OIL-002', source: '指标', limit: '100 次/分', today: 12, enabled: false, version: 'v1' },
    ],
    keys: [
      { id: 'AK-01', name: '生产调度系统', prefix: 'dgak_8f3k****', scope: '只读 · 指标查询', limit: '1000/分', last: '10 秒前', enabled: true, created: '2026-05-11' },
      { id: 'AK-02', name: '集团门户集成', prefix: 'dgak_2m9x****', scope: '只读', limit: '300/分', last: '2 小时前', enabled: true, created: '2026-06-02' },
      { id: 'AK-03', name: '安监局数据报送', prefix: 'dgak_7q1p****', scope: '只读 · 指定API', limit: '100/分', last: '昨天 18:22', enabled: true, created: '2026-07-19' },
      { id: 'AK-04', name: '旧版MES对接', prefix: 'dgak_5t6y****', scope: '读写（已废弃）', limit: '60/分', last: '32 天前', enabled: false, created: '2025-11-08' },
    ],
    embeds: [
      { id: 'EK-01', name: '集团门户嵌入密钥', domains: 'portal.energy.local', expire: '2027-06-30', enabled: true, calls30d: 45210 },
      { id: 'EK-02', name: '生产调度大屏', domains: 'ops.energy.local, 10.***.***.0/24', expire: '2026-12-31', enabled: true, calls30d: 12330 },
    ],
  }
}

function loadDb(): OpenApiDb {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) return JSON.parse(raw) as OpenApiDb
  } catch { /* ignore */ }
  return seed()
}

function saveDb(db: OpenApiDb) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(db)) } catch { /* ignore */ }
}

const db = loadDb()

export const dataApis = ref<DataApi[]>(db.apis)
export const apiKeys = ref<ApiKey[]>(db.keys)
export const embedKeys = ref<EmbedKey[]>(db.embeds)

function persist() {
  saveDb({ apis: dataApis.value, keys: apiKeys.value, embeds: embedKeys.value })
}

/** 发布 API：指标/数据集一键生成端点（FR-EXCH-04） */
export function publishApi(body: { name: string; source: '指标' | '数据集'; refId: string; limit?: string }): DataApi {
  const path = body.source === '指标' ? `/api/v1/metrics/${body.refId}` : `/api/v1/datasets/${body.refId}`
  const row: DataApi = {
    id: 'API-' + String(dataApis.value.length + 1).padStart(2, '0'),
    name: body.name,
    path,
    source: body.source,
    limit: body.limit || '300 次/分',
    today: 0,
    enabled: true,
    version: 'v1',
  }
  dataApis.value.push(row)
  persist()
  return row
}

export function toggleApi(id: string): boolean {
  const a = dataApis.value.find((x) => x.id === id)
  if (a) a.enabled = !a.enabled
  persist()
  return a?.enabled ?? false
}

export function saveApiKey(body: { name: string; scope?: string; limit?: string }): ApiKey {
  const row: ApiKey = {
    id: 'AK-' + String(apiKeys.value.length + 1).padStart(2, '0'),
    name: body.name,
    prefix: 'dgak_' + Math.random().toString(36).slice(2, 6) + '****',
    scope: body.scope || '只读',
    limit: body.limit || '300/分',
    last: '—',
    enabled: true,
    created: '2026-09-04',
  }
  apiKeys.value.unshift(row)
  persist()
  return row
}

export function revokeKey(id: string) {
  const k = apiKeys.value.find((x) => x.id === id)
  if (k) k.enabled = false
  persist()
}

export function saveEmbedKey(body: { name: string; domains: string; expire?: string }): EmbedKey & { secret?: string } {
  const row: EmbedKey = {
    id: 'EK-' + String(embedKeys.value.length + 1).padStart(2, '0'),
    name: body.name,
    domains: body.domains,
    expire: body.expire || '2027-09-04',
    enabled: true,
    calls30d: 0,
  }
  embedKeys.value.unshift(row)
  persist()
  return { ...row, secret: 'embsec_' + Math.random().toString(36).slice(2, 18) + '（仅本次展示，请立即保存）' }
}

/** API 文档代码示例（对齐原型 cURL/JavaScript/Python 三语言） */
export function apiCodeSamples(path: string): Record<string, string> {
  return {
    cURL: `curl -X POST "https://bi.energy.local${path}" \\\n  -H "Authorization: Bearer $DG_API_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d '{"dimensions":["plant"],"time_range":"last_month"}'`,
    JavaScript: `const res = await fetch("https://bi.energy.local${path}", {\n  method: "POST",\n  headers: {\n    Authorization: "Bearer " + DG_API_KEY,\n    "Content-Type": "application/json",\n  },\n  body: JSON.stringify({ dimensions: ["plant"], time_range: "last_month" }),\n});\nconst { data } = await res.json();`,
    Python: `import requests\n\nres = requests.post(\n    "https://bi.energy.local${path}",\n    headers={"Authorization": f"Bearer {DG_API_KEY}"},\n    json={"dimensions": ["plant"], "time_range": "last_month"},\n)\ndata = res.json()["data"]`,
  }
}
