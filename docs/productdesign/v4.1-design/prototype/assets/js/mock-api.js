/* ============================================================
   DataGear V4.1 原型 · Mock API 层（前后端对接契约的可执行形态）
   - 端点路径 / 请求参数 / 响应结构 与《SDS-软件开发说明书-V1.0》
     「接口设计 · REST API 分组清单」一一对应
   - 统一响应信封 OperationMessage：{ code, message, data }
     code=0 成功；401 未认证；403 越权；429 限流；500 服务异常
   - 默认延迟 120~600ms 模拟真实网络；数据为能源行业演示数据
   ============================================================ */
(function () {
  'use strict';
  const DG = window.DG = window.DG || {};

  /* ================= 演示数据库（与 SDS DG_* 表对应） ================= */
  const db = {
    /* ---- 语义层（DG_METRIC / DG_DIMENSION / DG_MEASURE / DG_METRIC_VERSION / DG_GLOSSARY） ---- */
    catalog: [
      { id: 'dom-oil', name: '油气勘探开发', count: 32, children: [{ name: '采油生产', count: 18 }, { name: '注水注气', count: 8 }, { name: '地质油藏', count: 6 }] },
      { id: 'dom-refine', name: '炼油化工', count: 18, children: [{ name: '装置运行', count: 10 }, { name: '产销存', count: 8 }] },
      { id: 'dom-coal', name: '煤矿生产', count: 15, children: [{ name: '综采掘进', count: 9 }, { name: '安全监控', count: 6 }] },
      { id: 'dom-pipe', name: '天然气管输', count: 12, children: [{ name: '管输运行', count: 7 }, { name: '储气库', count: 5 }] },
      { id: 'dom-fin', name: '经营财务', count: 9, children: [{ name: '成本', count: 5 }, { name: '收入利润', count: 4 }] }
    ],
    metrics: [
      { id: 'M-OIL-001', name: '原油产量', code: 'M-OIL-001', domain: 'dom-oil', ind: 'oil', caliber: '采油厂井口产出原油经计量的商品量，不含自用油与损耗；按月口径为自然月累计。', type: '原子指标', measure: '日产油量(求和)', dims: ['采油厂', '区块', '日期'], period: '日/月', owner: '王建国 · 勘探开发部', certified: 1, status: 'certified', version: 'v1.2', refs: { board: 14, alert: 3, ask: 27 }, value: '385.2 万吨/月', yoy: '+5.1%', trend: [362, 368, 371, 359, 377, 380, 385.2], conflict: false, dataset: 'DS_采油日报' },
      { id: 'M-OIL-002', name: '吨油完全成本', code: 'M-OIL-002', domain: 'dom-fin', ind: 'oil', caliber: '一定时期内原油生产总成本（含操作成本、折旧折耗、期间费用）除以同期商品量。', type: '派生指标', measure: '总成本/商品量', dims: ['采油厂', '月份'], period: '月', owner: '李秀兰 · 财务资产部', certified: 1, status: 'certified', version: 'v1.0', refs: { board: 6, report: 4, ask: 11 }, value: '2,146 元/吨', yoy: '+3.8%', trend: [2015, 2058, 2090, 2066, 2112, 2146], conflict: false, dataset: 'DS_财务月报' },
      { id: 'M-OIL-009', name: '井口综合含水率', code: 'M-OIL-009', domain: 'dom-oil', ind: 'oil', caliber: '产液量中水所占体积百分比。', type: '原子指标', measure: '含水率(平均)', dims: ['采油厂', '井场'], period: '日', owner: '赵鹏 · 采油工程部', certified: 0, status: 'pending', version: 'v0.9', refs: { board: 5, alert: 2, ask: 8 }, value: '87.4 %', yoy: '+0.6pct', trend: [86.1, 86.5, 86.9, 87.0, 87.2, 87.4], conflict: true, dataset: 'DS_采油日报' },
      { id: 'M-COAL-001', name: '原煤入洗率', code: 'M-COAL-001', domain: 'dom-coal', ind: 'coal', caliber: '入洗原煤量占原煤产量的比例，反映煤炭洗选加工深度；按洗煤厂计量数据汇总。', type: '派生指标', measure: '入洗量/原煤产量', dims: ['煤矿', '洗煤厂', '月份'], period: '月', owner: '孙立军 · 洗选运销部', certified: 1, status: 'certified', version: 'v1.1', refs: { board: 3, report: 2, ask: 5 }, value: '72.8 %', yoy: '+4.2pct', trend: [66, 68.5, 69.2, 71, 71.8, 72.8], conflict: false, dataset: 'DS_洗选月报' },
      { id: 'M-CHEM-001', name: '甲醇优级品率', code: 'M-CHEM-001', domain: 'dom-refine', ind: 'chem', caliber: '甲醇优级品产量占甲醇总产量的比例，按质检化验结果统计。', type: '派生指标', measure: '优级品量/总产量', dims: ['装置', '月份'], period: '月', owner: '周婷 · 化工质检中心', certified: 0, status: 'draft', version: 'v0.3', refs: { board: 2, ask: 3 }, value: '96.5 %', yoy: '+0.8pct', trend: [94.2, 95.1, 95.5, 96.0, 96.2, 96.5], conflict: false, dataset: 'DS_化工质检' },
      { id: 'M-GAS-001', name: '管输周转量', code: 'M-GAS-001', domain: 'dom-pipe', ind: 'gas', caliber: '统计期内管道输送天然气量与平均运距乘积之和，单位亿方·公里。', type: '原子指标', measure: '输量×运距(求和)', dims: ['管线', '站场', '日期'], period: '日/月', owner: '陈广 · 管道分公司', certified: 0, status: 'pending', version: 'v1.0', refs: { board: 4, report: 1 }, value: '41.2 亿方·公里', yoy: '+6.4%', trend: [37.5, 38.2, 39.0, 39.8, 40.5, 41.2], conflict: false, dataset: 'DS_管网输量' },
      { id: 'M-COAL-003', name: '瓦斯超限次数', code: 'M-COAL-003', domain: 'dom-coal', ind: 'coal', caliber: '采掘工作面瓦斯浓度超过 1.0% 的传感器报警次数（去重后）。', type: '原子指标', measure: '报警次数(计数)', dims: ['煤矿', '工作面', '日期'], period: '日', owner: '马志强 · 安监部', certified: 1, status: 'certified', version: 'v2.0', refs: { board: 3, alert: 5, ask: 9 }, value: '2 次/日', yoy: '-33.3%', trend: [5, 4, 4, 3, 3, 2], conflict: false, dataset: 'DS_煤矿瓦斯监测' }
    ],
    metricVersions: [
      { v: 'v1.2', note: '口径修订：剔除自用油与损耗；调整统计粒度为自然月', user: '王建国', time: '2026-08-20 14:32', current: true },
      { v: 'v1.1', note: '新增区块维度；修复跨厂汇总重复计量', user: '王建国', time: '2026-06-11 09:15' },
      { v: 'v1.0', note: '首次认证发布', user: '赵静', time: '2026-03-02 16:40' }
    ],

    /* ---- 告警与调度（DG_ALERT_RULE / DG_ALERT_RECORD / DG_SUBSCRIPTION / DG_JOB） ---- */
    alertRules: [
      { id: 'AR-01', name: '日产油低于阈值', metric: '原油产量', metricId: 'M-OIL-001', cond: '< 100 万吨', freq: '每5分钟', cron: '0 0/5 * * * ?', channels: ['企业微信', '邮件'], receivers: '生产调度组', enabled: true, lastTrigger: '今天 08:12', today: 1 },
      { id: 'AR-02', name: '瓦斯浓度超限', metric: '瓦斯浓度', metricId: 'M-COAL-003', cond: '> 1.0 %', freq: '实时', cron: '实时流', channels: ['短信', '企业微信'], receivers: '安监部值班', enabled: true, lastTrigger: '昨天 22:41', today: 2 },
      { id: 'AR-03', name: '管网压力异常', metric: '管输压力', metricId: 'M-GAS-002', cond: '变化率 > 8 %', freq: '每小时', cron: '0 0 * * * ?', channels: ['钉钉'], receivers: '管道分公司', enabled: true, lastTrigger: '09-01 16:20', today: 0 },
      { id: 'AR-04', name: '甲醇装置开工率低', metric: '装置开工率', metricId: 'M-CHEM-002', cond: '< 75 %', freq: '每天 08:00', cron: '0 0 8 * * ?', channels: ['邮件'], receivers: '煤化工事业部', enabled: false, lastTrigger: '—', today: 0 },
      { id: 'AR-05', name: '吨油成本超预算', metric: '吨油完全成本', metricId: 'M-OIL-002', cond: '> 2,300 元/吨', freq: '每天 09:00', cron: '0 0 9 * * ?', channels: ['企业微信', 'Webhook'], receivers: '财务资产部', enabled: true, lastTrigger: '08-28 09:00', today: 0 }
    ],
    alertHistory: [
      { id: 'AH-101', rule: '日产油低于阈值', metric: '原油产量', value: '98.6 万吨', threshold: '< 100 万吨', time: '今天 08:12', notify: '已送达', handled: 0 },
      { id: 'AH-100', rule: '瓦斯浓度超限', metric: '瓦斯浓度', value: '1.24 %', threshold: '> 1.0 %', time: '昨天 22:41', notify: '已送达', handled: 1, note: '已停产撤人，30min 后复测正常' },
      { id: 'AH-099', rule: '管网压力异常', metric: '管输压力', value: '+9.6 %', threshold: '变化率 > 8 %', time: '09-01 16:20', notify: '已送达', handled: 1, note: '压缩机切换导致，已确认' }
    ],
    subscriptions: [
      { id: 'SB-01', name: '经营日报（决策层）', resource: '看板：集团经营日报', cron: '0 0 8 * * ?', freqText: '每天 08:00', channels: ['企业微信'], receivers: '经营分析群', format: '图片+PDF', enabled: true, last: '今天 08:00' },
      { id: 'SB-02', name: '管输量日报', resource: '报表：管输量日报', cron: '0 30 7 * * ?', freqText: '每天 07:30', channels: ['邮件'], receivers: '管道分公司', format: 'Excel', enabled: true, last: '今天 07:30' },
      { id: 'SB-03', name: '煤矿安全周报', resource: '看板：煤矿安全监控', cron: '0 0 9 ? * MON', freqText: '每周一 09:00', channels: ['钉钉', '邮件'], receivers: '安监部', format: 'PDF', enabled: true, last: '周一 09:00' },
      { id: 'SB-04', name: '甲醇产销存月报', resource: '报表：产销存月报', cron: '0 0 10 1 * ?', freqText: '每月1日 10:00', channels: ['邮件'], receivers: '化工经营组', format: 'Excel+PDF', enabled: false, last: '08-01 10:00' }
    ],
    jobs: [
      { id: 'JB-01', name: '告警检测-日产油', type: '告警检测', cron: '0 0/5 * * * ?', last: '08:15:00', next: '08:20:00', status: '正常' },
      { id: 'JB-02', name: '订阅推送-经营日报', type: '订阅推送', cron: '0 0 8 * * ?', last: '08:00:02', next: '明天 08:00', status: '正常' },
      { id: 'JB-03', name: '质量校验-采油日报表', type: '数据质量', cron: '0 0 22 * * ?', last: '昨天 22:00', next: '今天 22:00', status: '正常' },
      { id: 'JB-04', name: '数据抽取-ODS同步', type: '数据抽取', cron: '0 0/30 * * * ?', last: '08:00:00', next: '08:30:00', status: '失败·已重试' },
      { id: 'JB-05', name: '报表定时-产销存月报', type: '报表定时', cron: '0 0 10 1 * ?', last: '08-01 10:00', next: '09-01 10:00', status: '正常' },
      { id: 'JB-06', name: '系统库自动备份', type: '备份', cron: '0 0 2 * * ?', last: '今天 02:00', next: '明天 02:00', status: '正常' }
    ],
    channels: [
      { id: 'CH-01', name: '邮件', enabled: true, conf: 'smtp.energy.local:465 · noreply@****.cn', sent30d: 1286, rate: '99.8%' },
      { id: 'CH-02', name: '企业微信', enabled: true, conf: 'corp id: ww8f2**** · agent: 能源BI', sent30d: 3412, rate: '99.9%' },
      { id: 'CH-03', name: '钉钉', enabled: true, conf: '机器人 webhook https://oapi.dingtalk.com/****', sent30d: 765, rate: '99.5%' },
      { id: 'CH-04', name: 'Webhook', enabled: true, conf: 'https://ops.energy.local/hook/****', sent30d: 231, rate: '98.2%' },
      { id: 'CH-05', name: '短信', enabled: false, conf: '阿里云短信 · 签名【能源BI】', sent30d: 56, rate: '99.1%' }
    ],

    /* ---- 数据源 / 数据集（DG_DTBS_SOURCE / DG_DATA_SET） ---- */
    dataSources: [
      { id: 'DS-01', name: '华北油田生产库', type: 'MySQL', xinchuang: false, status: 'ok', tables: 128, owner: '张伟', visibility: '已共享', url: 'jdbc:mysql://10.***.***.12:3306/oil_prod', driver: 'mysql-8.0.33', health: [99.9, 100, 99.8, 100, 100, 99.4, 100] },
      { id: 'DS-02', name: '长庆气田SCADA', type: 'Kafka', xinchuang: false, status: 'ok', tables: 12, owner: '张伟', visibility: '私有', url: 'kafka://10.***.***.30:9092/scada', driver: 'stream-kafka', health: [100, 100, 100, 99.9, 100, 100, 100] },
      { id: 'DS-03', name: '煤化工ERP', type: 'Oracle', xinchuang: false, status: 'ok', tables: 342, owner: '张伟', visibility: '已共享', url: 'jdbc:oracle:thin:@10.***.***.41:1521:MEERP', driver: 'ojdbc8-19.3', health: [99.5, 99.8, 100, 100, 99.9, 100, 100] },
      { id: 'DS-04', name: '集团财务库(达梦)', type: '达梦DM8', xinchuang: true, status: 'ok', tables: 96, owner: '赵静', visibility: '已共享', url: 'jdbc:dm://10.***.***.55:5236/FIN', driver: 'Dm8JdbcDriver18', health: [100, 100, 100, 100, 100, 100, 100] },
      { id: 'DS-05', name: '煤矿安全监测库(金仓)', type: '金仓Kingbase', xinchuang: true, status: 'ok', tables: 58, owner: '张伟', visibility: '已共享', url: 'jdbc:kingbase8://10.***.***.60:54321/safety', driver: 'kingbase8-8.6', health: [99.9, 100, 100, 100, 99.7, 100, 100] },
      { id: 'DS-06', name: '经营分析OLAP(GaussDB)', type: 'GaussDB', xinchuang: true, status: 'error', tables: 24, owner: '张伟', visibility: '私有', url: 'jdbc:postgresql://10.***.***.71:8000/olap', driver: 'gaussdbjdbc-506', health: [100, 100, 99.2, 98.1, 96.4, 88.2, 61.5] },
      { id: 'DS-07', name: '企管部Excel台账', type: 'Excel', xinchuang: false, status: 'ok', tables: 6, owner: '王芳', visibility: '私有', url: 'file:///shared/qg/*.xlsx', driver: '内置文件驱动', health: [100, 100, 100, 100, 100, 100, 100] }
    ],
    dataSets: [
      { id: 'DS001', name: 'DS_采油日报', type: 'SQL', source: '华北油田生产库', params: ['month'], cache: '30 分钟', refs: 26, update: '张伟 · 昨天 18:22' },
      { id: 'DS002', name: 'DS_管网输量', type: 'SQL', source: '经营分析OLAP(GaussDB)', params: ['date'], cache: '10 分钟', refs: 12, update: '李明 · 昨天 16:05' },
      { id: 'DS003', name: 'DS_煤矿瓦斯监测', type: 'HTTP', source: '煤矿安全监测库(金仓)', params: [], cache: '不缓存', refs: 9, update: '张伟 · 3 天前' },
      { id: 'DS004', name: 'DS_洗选月报', type: 'SQL', source: '华北油田生产库', params: ['month'], cache: '1 小时', refs: 8, update: '孙立军 · 4 天前' },
      { id: 'DS005', name: 'DS_化工质检', type: 'SQL', source: '煤化工ERP', params: ['month'], cache: '30 分钟', refs: 7, update: '周婷 · 4 天前' },
      { id: 'DS006', name: 'DS_财务月报', type: 'SQL', source: '集团财务库(达梦)', params: ['month'], cache: '6 小时', refs: 15, update: '李秀兰 · 上周' }
    ],

    /* ---- 看板 / 报表 ---- */
    dashboards: [
      { id: 'DB-01', name: '华北油田生产日报', ind: 'oil', updated: '2 小时前', owner: '李明', share: '密码分享', widgets: 12 },
      { id: 'DB-02', name: '西气东输管网监控', ind: 'gas', updated: '昨天', owner: '陈广', share: '签名Token嵌入', widgets: 18 },
      { id: 'DB-03', name: '甲醇装置产销存', ind: 'chem', updated: '3 天前', owner: '周婷', share: '私有', widgets: 9 },
      { id: 'DB-04', name: '煤矿安全双重预防', ind: 'coal', updated: '昨天', owner: '马志强', share: '组织内公开', widgets: 15 },
      { id: 'DB-05', name: '集团经营日报', ind: 'oil', updated: '今天 08:00', owner: '李明', share: '签名Token嵌入', widgets: 21 },
      { id: 'DB-06', name: '炼化装置实时监控', ind: 'chem', updated: '上周', owner: '张伟', share: '私有', widgets: 11 }
    ],
    reports: [
      { id: 'RP-01', name: '原油产量月报', type: '交叉报表', updated: '昨天 22:00', owner: '李明', subscribed: true },
      { id: 'RP-02', name: '管输量日报', type: '分组报表', updated: '今天 07:30', owner: '陈广', subscribed: true },
      { id: 'RP-03', name: '煤矿产量旬报', type: '分组报表', updated: '09-01', owner: '马志强', subscribed: false },
      { id: 'RP-04', name: '化工品产销存月报', type: '电子表格', updated: '08-01', owner: '周婷', subscribed: true }
    ],

    /* ---- 开放与嵌入（DG_DATA_API / DG_API_KEY / DG_EMBED_KEY） ---- */
    dataApis: [
      { id: 'API-01', name: '原油产量查询', path: '/api/v1/metrics/M-OIL-001', source: '指标', limit: '1000 次/分', today: 8642, enabled: true, version: 'v1' },
      { id: 'API-02', name: '采油日报数据集', path: '/api/v1/datasets/DS001', source: '数据集', limit: '600 次/分', today: 3120, enabled: true, version: 'v1' },
      { id: 'API-03', name: '管输周转量', path: '/api/v1/metrics/M-GAS-001', source: '指标', limit: '300 次/分', today: 745, enabled: true, version: 'v1' },
      { id: 'API-04', name: '瓦斯监测实时值', path: '/api/v1/datasets/DS003', source: '数据集', limit: '1200 次/分', today: 18933, enabled: true, version: 'v2' },
      { id: 'API-05', name: '吨油成本月结', path: '/api/v1/metrics/M-OIL-002', source: '指标', limit: '100 次/分', today: 12, enabled: false, version: 'v1' }
    ],
    apiKeys: [
      { id: 'AK-01', name: '生产调度系统', prefix: 'dgak_8f3k****', scope: '只读 · 指标查询', limit: '1000/分', last: '10 秒前', enabled: true, created: '2026-05-11' },
      { id: 'AK-02', name: '集团门户集成', prefix: 'dgak_2m9x****', scope: '只读', limit: '300/分', last: '2 小时前', enabled: true, created: '2026-06-02' },
      { id: 'AK-03', name: '安监局数据报送', prefix: 'dgak_7q1p****', scope: '只读 · 指定API', limit: '100/分', last: '昨天 18:22', enabled: true, created: '2026-07-19' },
      { id: 'AK-04', name: '旧版MES对接', prefix: 'dgak_5t6y****', scope: '读写（已废弃）', limit: '60/分', last: '32 天前', enabled: false, created: '2025-11-08' }
    ],
    embedKeys: [
      { id: 'EK-01', name: '集团门户嵌入密钥', domains: 'portal.energy.local', expire: '2027-06-30', enabled: true, calls30d: 45210 },
      { id: 'EK-02', name: '生产调度大屏', domains: 'ops.energy.local, 10.***.***.0/24', expire: '2026-12-31', enabled: true, calls30d: 12330 }
    ],

    /* ---- 系统管理（DG_USER / DG_ROLE / DG_ROW_PERMISSION / DG_MASKING_RULE / DG_AUDIT_LOG） ---- */
    users: [
      { id: 'U-01', name: '李明', account: 'liming', org: '华北油田分公司', roles: ['数据分析师'], status: '正常', last: '今天 08:32' },
      { id: 'U-02', name: '王芳', account: 'wangfang', org: '华东区销售分公司', roles: ['业务人员'], status: '正常', last: '今天 08:15' },
      { id: 'U-03', name: '张伟', account: 'zhangwei', org: '集团数据中心', roles: ['数据工程师'], status: '正常', last: '今天 07:58' },
      { id: 'U-04', name: '陈磊', account: 'chenlei', org: '煤矿安监部', roles: ['业务人员'], status: '正常', last: '昨天 19:44' },
      { id: 'U-05', name: '赵静', account: 'zhaojing', org: '煤化工事业部', roles: ['数据分析师', '业务人员'], status: '正常', last: '昨天 18:02' },
      { id: 'U-06', name: '刘总', account: 'liuzong', org: '集团总部', roles: ['决策层'], status: '正常', last: '今天 08:00' },
      { id: 'U-07', name: '系统管理员', account: 'admin', org: '集团数据中心', roles: ['管理员'], status: '正常', last: '今天 08:05' },
      { id: 'U-08', name: '外部顾问-试用', account: 'guest_ext', org: '—', roles: ['开发人员'], status: '已锁定', last: '08-28 11:12' }
    ],
    rowPerms: [
      { id: 'RP-01', name: '区域数据隔离', resource: '华北油田生产日报看板', cond: "org_code = ${currentOrg}", roles: ['业务人员'], enabled: true },
      { id: 'RP-02', name: '销售大区自见', resource: '集团经营日报', cond: "region = ${currentOrg.region}", roles: ['业务人员', '决策层'], enabled: true },
      { id: 'RP-03', name: '井场承包数据', resource: '单井产量排名', cond: "contractor = ${currentUser}", roles: ['外部顾问'], enabled: false }
    ],
    colPerms: [
      { id: 'CP-01', name: '成本敏感列', resource: '吨油完全成本数据集', mode: '隐藏列', fields: '工资总额, 折旧明细', roles: ['业务人员'] },
      { id: 'CP-02', name: '联系方式脱敏', resource: '用户主数据', mode: '脱敏列', fields: '联系电话 → 138****1234', roles: ['全部非管理员'] }
    ],
    maskRules: [
      { id: 'MK-01', field: '联系电话', algo: '掩码', sample: '13812345678 → 138****5678', roles: '业务人员', enabled: true },
      { id: 'MK-02', field: '身份证号', algo: '掩码', sample: '1101**********1234', roles: '全部非管理员', enabled: true },
      { id: 'MK-03', field: '银行账号', algo: '哈希', sample: '6222 **** **** 9012 → e3b0c4…', roles: '业务人员', enabled: true }
    ],
    auditLogs: [
      { id: 'AL-01', time: '今天 08:32', user: '李明', op: '数据导出', target: '原油产量月报.xlsx', ip: '10.12.**.**', result: '成功' },
      { id: 'AL-02', time: '今天 08:05', user: 'admin', op: '权限变更', target: '行级规则 RP-02 启用', ip: '10.12.**.**', result: '成功' },
      { id: 'AL-03', time: '今天 07:41', user: 'guest_ext', op: '越权访问', target: '集团财务库', ip: '外网', result: '已拦截' },
      { id: 'AL-04', time: '昨天 22:41', user: 'system', op: '告警触发', target: '瓦斯浓度超限 AR-02', ip: '—', result: '已通知' },
      { id: 'AL-05', time: '昨天 18:30', user: '赵静', op: '指标认证', target: 'M-COAL-003 v2.0', ip: '10.15.**.**', result: '成功' },
      { id: 'AL-06', time: '昨天 17:20', user: '王芳', op: '登录失败', target: '连续 3 次密码错误', ip: '10.31.**.**', result: '已锁定15分钟' }
    ],

    /* ---- 治理（DG_METADATA / DG_QUALITY_RULE / DG_LINEAGE / DG_SENSITIVE_FIELD） ---- */
    qualityRules: [
      { id: 'QR-01', name: '采油日报非空校验', type: '非空', target: 'ODS_采油日报表.日产油量', freq: '每天 22:00', pass: 99.2, trend: [98.5, 99.0, 99.2, 99.1, 99.3, 99.2], enabled: true },
      { id: 'QR-02', name: '井号唯一性', type: '唯一', target: 'ODS_采油日报表.井号', freq: '每天 22:00', pass: 100, trend: [100, 100, 100, 100, 100, 100], enabled: true },
      { id: 'QR-03', name: '含水率范围 0~100', type: '范围', target: 'ODS_采油日报表.含水率', freq: '每天 22:00', pass: 96.8, trend: [97.5, 97.1, 96.9, 97.0, 96.6, 96.8], enabled: true },
      { id: 'QR-04', name: '管输量及时性', type: '及时性', target: 'ODS_管网输量.数据时间', freq: '每小时', pass: 98.9, trend: [99.2, 99.0, 98.8, 98.9, 99.0, 98.9], enabled: true },
      { id: 'QR-05', name: '瓦斯浓度格式', type: '格式', target: 'ODS_瓦斯监测.浓度值', freq: '实时', pass: 99.9, trend: [99.8, 99.9, 99.9, 100, 99.9, 99.9], enabled: true }
    ],
    qualityIssues: [
      { id: 'QI-01', rule: '含水率范围 0~100', target: 'ODS_采油日报表.含水率', detail: '空值率 3.2%（阈值 2%），涉及 华北采油厂 2 口井', time: '昨天 22:00', level: 'danger' },
      { id: 'QI-02', rule: '管输量及时性', target: 'ODS_管网输量', detail: '09-02 08 点批次延迟 12 分钟到达', time: '昨天 08:12', level: 'warn' }
    ],
    sensitiveFields: [
      { id: 'SF-01', field: '联系电话', pos: '集团财务库(达梦).供应商主数据.phone', type: '手机号', mode: '正则自动识别', rule: '掩码 MK-01' },
      { id: 'SF-02', field: '身份证号', pos: '集团财务库(达梦).员工主数据.id_card', type: '身份证', mode: '正则自动识别', rule: '掩码 MK-02' },
      { id: 'SF-03', field: '银行账号', pos: '煤化工ERP.应付账款.bank_no', type: '银行卡', mode: '手动标记', rule: '哈希 MK-03' }
    ],

    /* ---- 首页 ---- */
    todos: [
      { id: 'TD-01', kind: 'alert', title: '【告警】长庆区块日产油量低于阈值 100 万吨', sub: '阈值告警 · 08:12 · 点击查看归因', level: 'danger' },
      { id: 'TD-02', kind: 'sub', title: '【订阅】经营日报已推送至企业微信', sub: '订阅推送 · 08:00', level: 'warn' },
      { id: 'TD-03', kind: 'approve', title: '【审批】王芳申请「井口含水率」指标查看权限', sub: '权限审批 · 昨天 17:42', level: 'info' },
      { id: 'TD-04', kind: 'quality', title: '【质量】ODS_采油日报表 质量校验通过 98.6%', sub: '数据质量 · 昨天 22:00', level: 'ok' }
    ],
    favorites: [
      { id: 'FV-01', name: '集团经营驾驶舱', type: '大屏', href: 'screen.html' },
      { id: 'FV-02', name: '单井产量排名', type: '看板', href: 'dashboards.html' },
      { id: 'FV-03', name: '问数：上月同比分析', type: '问数', href: 'chatbi.html' },
      { id: 'FV-04', name: '原煤入洗率', type: '指标', href: 'metrics.html' }
    ],
    searchIndex: [
      { type: '指标', name: '原油产量', sub: 'M-OIL-001 · 已认证', href: 'metrics.html', icon: 'metric', c: 'var(--oil)' },
      { type: '指标', name: '吨油完全成本', sub: 'M-OIL-002 · 已认证', href: 'metrics.html', icon: 'metric', c: 'var(--coal)' },
      { type: '指标', name: '原煤入洗率', sub: 'M-COAL-001 · 已认证', href: 'metrics.html', icon: 'metric', c: 'var(--coal)' },
      { type: '指标', name: '管输周转量', sub: 'M-GAS-001 · 待认证', href: 'metrics.html', icon: 'metric', c: 'var(--gas)' },
      { type: '看板', name: '华北油田生产日报', sub: '12 部件 · 李明', href: 'dashboards.html', icon: 'board', c: 'var(--oil)' },
      { type: '看板', name: '煤矿安全双重预防', sub: '15 部件 · 马志强', href: 'dashboards.html', icon: 'board', c: 'var(--coal)' },
      { type: '大屏', name: '集团能源生产运营驾驶舱', sub: '大屏 · 实时', href: 'screen.html', icon: 'screen', c: 'var(--brand)' },
      { type: '数据集', name: 'DS_采油日报', sub: 'SQL · 华北油田生产库', href: 'dataset.html', icon: 'dataset', c: 'var(--info)' },
      { type: '报表', name: '原油产量月报', sub: '交叉报表', href: 'report.html', icon: 'report', c: 'var(--chem)' },
      { type: '数据源', name: '华北油田生产库', sub: 'MySQL · 128 表', href: 'datasource.html', icon: 'db', c: 'var(--ok)' }
    ],

    /* ---- ChatBI 会话 ---- */
    chatSessions: [
      { id: 'CS-01', title: '上月各采油厂产量同比', time: '今天 08:40', turns: 4 },
      { id: 'CS-02', title: '华东管网输差分析', time: '昨天 16:22', turns: 6 },
      { id: 'CS-03', title: '甲醇装置开工率趋势', time: '昨天 09:10', turns: 2 },
      { id: 'CS-04', title: '吨油完全成本环比拆解', time: '3 天前', turns: 8 },
      { id: 'CS-05', title: '瓦斯超限次数排名', time: '3 天前', turns: 3 }
    ]
  };

  /* =================  canned AI 回答 ================= */
  const cannedAnswers = {
    oil: {
      metric: 'M-OIL-001', title: '上月各采油厂原油产量的同比变化',
      conclusion: '上月（2026年8月）全集团原油产量 <b>385.2 万吨</b>，同比 <b class="num" style="color:var(--ok)">+5.1%</b>。其中<b>长庆采油厂</b>增幅最大（+12.3%，+10.4 万吨），主要来自安塞区块新井投产；大庆采油厂同比 -1.8%，受老区自然递减影响。',
      dims: ['长庆采油厂', '大庆采油厂', '塔里木采油厂', '胜利采油厂', '华北采油厂'],
      values: [94.8, 88.6, 71.5, 68.2, 62.1], lastYear: [84.4, 90.2, 67.9, 66.5, 58.8], yoy: ['+12.3%', '-1.8%', '+5.3%', '+2.6%', '+5.6%'],
      drivers: ['安塞·靖安', '老区递减', '轮南·哈得', '孤岛·孤东', '任丘·霸州'],
      dsl: { metric: 'M-OIL-001', dimensions: ['plant'], time_range: { type: 'last_month', granularity: 'month' }, compare: 'yoy', filters: { well_status: '生产井' } },
      sql: "SELECT plant_name,\n  SUM(commercial_qty) AS qty\nFROM ods_fact_oil_daily\nWHERE dt BETWEEN ${pc(month_start)}\n  AND ${pc(month_end)}   -- 行级权限注入：AND org_id IN ('HB01')\nGROUP BY plant_name\nORDER BY qty DESC",
      attribution: [{ dim: '区块', pct: 62 }, { dim: '油藏类型', pct: 23 }, { dim: '井别', pct: 11 }, { dim: '其他', pct: 4 }],
      followup: { q: '长庆为什么涨这么多？', a: '长庆采油厂同比 +12.3%（+10.4 万吨）主要由三方面驱动：① 安塞区块 23 口新井 7 月下旬投产，贡献 +6.8 万吨（65%）；② 靖安区块措施井（压裂改造 12 口）增产 +2.4 万吨（23%）；③ 去年同期检修低基数 +1.2 万吨（12%）。' }
    },
    coal: {
      metric: 'M-COAL-003', title: '瓦斯超限次数排名',
      conclusion: '昨日全集团瓦斯超限 <b>2 次</b>，同比 <b style="color:var(--ok)">-33.3%</b>。超限集中在<b>大同矿区 3# 工作面</b>（1 次，峰值 1.24%，持续 4 分钟）与<b>神东矿区 12# 工作面</b>（1 次，峰值 1.08%）。均已按预案停产撤人，复测恢复正常。',
      dims: ['大同矿区', '神东矿区', '晋城矿区', '两淮矿区', '兖州矿区'],
      values: [1, 1, 0, 0, 0], lastYear: [2, 1, 1, 0, 0], yoy: ['-50%', '0%', '-100%', '—', '—'],
      drivers: ['3#工作面', '12#工作面', '—', '—', '—'],
      dsl: { metric: 'M-COAL-003', dimensions: ['mine', 'working_face'], time_range: { type: 'yesterday', granularity: 'day' }, compare: 'yoy', order: [{ field: 'cnt', dir: 'desc' }] },
      sql: "SELECT mine_name, working_face,\n  COUNT(DISTINCT alarm_id) AS cnt\nFROM ods_gas_monitor\nWHERE dt = ${pc(date)}\n  AND gas_conc > 1.0\nGROUP BY mine_name, working_face\nORDER BY cnt DESC",
      attribution: [{ dim: '工作面', pct: 78 }, { dim: '班次', pct: 14 }, { dim: '通风方式', pct: 8 }]
    },
    chem: {
      metric: 'M-CHEM-001', title: '甲醇装置开工率趋势',
      conclusion: '近 6 个月甲醇装置开工率均值 <b>91.2%</b>，8 月达 <b>93.5%</b>（环比 +1.4pct）。其中煤制甲醇装置开工率 95.1%，天然气制装置 88.6%。7 月天然气制装置检修导致当月下探 87.2%。',
      dims: ['3月', '4月', '5月', '6月', '7月', '8月'],
      values: [89.5, 90.2, 91.8, 92.4, 87.2, 93.5], lastYear: [86.1, 87.0, 88.5, 89.2, 85.4, 90.1], yoy: ['+3.4', '+3.2', '+3.3', '+3.2', '+1.8', '+3.4'],
      drivers: ['煤制装置', '气制装置', '检修影响', '—', '—'],
      dsl: { metric: 'M-CHEM-001', dimensions: ['month'], time_range: { type: 'recent_months', value: 6 }, compare: 'none', filters: { product: '甲醇' } },
      sql: "SELECT month,\n  AVG(run_rate) AS rate\nFROM ods_chem_device_daily\nWHERE month >= ${pc(month_from)}\n  AND product = '甲醇'\nGROUP BY month ORDER BY month",
      attribution: [{ dim: '原料路线', pct: 55 }, { dim: '检修计划', pct: 32 }, { dim: '负荷调整', pct: 13 }]
    }
  };

  /* ================= 请求核心 ================= */
  let latencyRange = [120, 600];
  let failHook = null; // 调试时可注入：failHook(path) => true 则返回 500

  function delay() { const [a, b] = latencyRange; return a + Math.random() * (b - a); }
  function ok(data) { return { code: 0, message: 'success', data }; }
  function err(code, message) { return { code, message, data: null }; }

  function matchPath(pattern, path) {
    const pp = pattern.split('/'), pa = path.split('/');
    if (pp.length !== pa.length) return null;
    const params = {};
    for (let i = 0; i < pp.length; i++) {
      if (pp[i].startsWith(':')) params[pp[i].slice(1)] = decodeURIComponent(pa[i]);
      else if (pp[i] !== pa[i]) return null;
    }
    return params;
  }

  /* ================= 端点注册表（SDS REST 分组清单的原型实现） ================= */
  const routes = [];
  function route(method, path, handler, meta) { routes.push({ method, path, handler, meta }); }

  /* ---- 指标中心 /semantics/metric/*（FR-SEM-01~09） ---- */
  route('GET', '/semantics/metric/list', ({ query }) => {
    let rows = db.metrics.slice();
    if (query.domain && query.domain !== 'all') rows = rows.filter(m => m.domain === query.domain);
    if (query.status && query.status !== 'all') rows = rows.filter(m => m.status === query.status);
    if (query.keyword) rows = rows.filter(m => m.name.includes(query.keyword) || m.code.includes(query.keyword.toUpperCase()));
    return ok({ total: rows.length, rows });
  });
  route('GET', '/semantics/metric/detail/:id', ({ pathParams }) => {
    const m = db.metrics.find(x => x.id === pathParams.id);
    return m ? ok({ ...m, versions: db.metricVersions, sql: cannedAnswers.oil.sql }) : err(404, '指标不存在');
  });
  route('POST', '/semantics/metric/save', ({ body }) => {
    if (!body.name) return err(400, '指标名称不能为空');
    const id = body.id || 'M-NEW-' + String(Math.floor(Math.random() * 900 + 100));
    const row = { id, code: id, name: body.name, domain: body.domain || 'dom-oil', ind: 'oil', caliber: body.caliber || '', type: body.type || '原子指标', measure: body.measure || '—', dims: body.dims || [], period: body.period || '日', owner: '李明 · 数据分析师', certified: 0, status: 'draft', version: 'v0.1', refs: {}, value: '—', yoy: '—', trend: [0, 0, 0, 0, 0, 0], conflict: false, dataset: body.dataset || 'DS_采油日报' };
    const i = db.metrics.findIndex(x => x.id === id);
    if (i >= 0) db.metrics[i] = { ...db.metrics[i], ...row }; else db.metrics.unshift(row);
    return ok(row);
  });
  route('POST', '/semantics/metric/certify', () => ok({ certified: 1, by: '赵静', time: new Date().toLocaleString('zh-CN') }));
  route('GET', '/semantics/metric/versions', () => ok(db.metricVersions));
  route('POST', '/semantics/metric/query', ({ body }) => {
    const a = cannedAnswers.oil;
    return ok({ columns: ['采油厂', '产量(万吨)', '同比'], rows: a.dims.map((d, i) => [d, a.values[i], a.yoy[i]]), costMs: 236, cacheHit: false, caliber: '采油厂井口产出原油经计量的商品量', metric: body.metric });
  });
  route('GET', '/semantics/catalog', () => ok(db.catalog));

  /* ---- 告警订阅 /alert/*（FR-ALERT-01~06） ---- */
  route('GET', '/alert/rule/list', () => ok({ total: db.alertRules.length, rows: db.alertRules }));
  route('POST', '/alert/rule/save', ({ body }) => {
    const id = body.id || 'AR-' + String(db.alertRules.length + 1).padStart(2, '0');
    const row = { id, name: body.name, metric: body.metric, cond: body.cond, freq: body.freq || '每5分钟', cron: '0 0/5 * * * ?', channels: body.channels || ['邮件'], receivers: body.receivers || '—', enabled: true, lastTrigger: '—', today: 0 };
    const i = db.alertRules.findIndex(r => r.id === id);
    if (i >= 0) db.alertRules[i] = { ...db.alertRules[i], ...row }; else db.alertRules.push(row);
    return ok(row);
  });
  route('POST', '/alert/rule/toggle', ({ body }) => { const r = db.alertRules.find(x => x.id === body.id); if (r) r.enabled = !r.enabled; return ok({ id: body.id, enabled: r && r.enabled }); });
  route('DELETE', '/alert/rule/:id', ({ pathParams }) => { db.alertRules = db.alertRules.filter(r => r.id !== pathParams.id); return ok(true); });
  route('GET', '/alert/history/list', () => ok({ total: db.alertHistory.length, rows: db.alertHistory }));
  route('POST', '/alert/history/handle', ({ body }) => { const r = db.alertHistory.find(x => x.id === body.id); if (r) { r.handled = 1; r.note = body.note || '已处理'; } return ok(true); });
  route('GET', '/subscribe/list', () => ok({ total: db.subscriptions.length, rows: db.subscriptions }));
  route('POST', '/subscribe/toggle', ({ body }) => { const r = db.subscriptions.find(x => x.id === body.id); if (r) r.enabled = !r.enabled; return ok({ enabled: r && r.enabled }); });
  route('GET', '/job/list', () => ok({ total: db.jobs.length, rows: db.jobs }));
  route('POST', '/job/trigger', ({ body }) => ok({ fired: true, job: body.id, fireTime: new Date().toLocaleTimeString('zh-CN') }));
  route('GET', '/channel/list', () => ok(db.channels));
  route('POST', '/channel/test', ({ body }) => ok({ channel: body.id, delivered: true, costMs: 340 }));

  /* ---- 数据源 /dtbsSource/*（FR-DS-01~09，内部API） ---- */
  route('GET', '/dtbsSource/list', () => ok({ total: db.dataSources.length, rows: db.dataSources }));
  route('POST', '/dtbsSource/test', ({ body }) => {
    if (body.url && body.url.includes('GaussDB') || body.type === 'GaussDB') return err(500, '连接超时（3 秒）：无法连接 10.***.***.71:8000，请检查网络与账号');
    return ok({ connectMs: 182, version: '连接成功 · 服务版本 8.0.33' });
  });
  route('POST', '/dtbsSource/save', ({ body }) => {
    if (!body.name || !body.url) return err(400, '名称与连接地址不能为空');
    const id = 'DS-' + String(db.dataSources.length + 1).padStart(2, '0');
    const row = { id, name: body.name, type: body.type, xinchuang: ['达梦DM8', '金仓Kingbase', 'GaussDB'].includes(body.type), status: 'ok', tables: 0, owner: '李明', visibility: '私有', url: body.url, driver: '自动识别', health: [100] };
    db.dataSources.push(row); return ok(row);
  });
  route('DELETE', '/dtbsSource/:id', ({ pathParams }) => { db.dataSources = db.dataSources.filter(r => r.id !== pathParams.id); return ok(true); });

  /* ---- 数据集 /dataSet/*（FR-MODEL/PREP） ---- */
  route('GET', '/dataSet/list', () => ok({ total: db.dataSets.length, rows: db.dataSets }));
  route('POST', '/dataSet/preview', () => ok({
    columns: ['采油厂', '日期', '日产油(吨)', '日产水(吨)', '含水率(%)'],
    rows: [['长庆采油厂', '2026-08-31', '3021.5', '24512.3', '89.0'], ['大庆采油厂', '2026-08-31', '2863.2', '22986.1', '88.9'], ['塔里木采油厂', '2026-08-31', '2306.4', '12410.5', '84.3'], ['胜利采油厂', '2026-08-31', '2197.8', '19802.6', '90.0'], ['华北采油厂', '2026-08-31', '1998.1', '15320.8', '88.5']],
    sql: cannedAnswers.oil.sql, costMs: 182
  }));

  /* ---- AI 问数 /ai/*（FR-AI-01~10） ---- */
  route('POST', '/ai/chat/ask', ({ body }) => {
    const q = (body.question || '').trim();
    if (!q) return err(400, '问题不能为空');
    let a = null;
    if (/同比|产量|采油厂/.test(q)) a = cannedAnswers.oil;
    else if (/瓦斯|超限|煤矿|安全/.test(q)) a = cannedAnswers.coal;
    else if (/甲醇|开工率|化工|装置/.test(q)) a = cannedAnswers.chem;
    if (!a) return ok({ type: 'clarify', question: q, message: '这个问题我没有十足把握，为避免取错数，请确认您的意图：', options: ['查“原油产量”月度同比', '查“瓦斯超限次数”排名', '查“甲醇装置开工率”趋势'] });
    return ok({ type: 'answer', ...a, explain: { metric: a.metric, dsl: a.dsl, sql: a.sql, permission: '已按行级权限过滤：仅华北油田分公司可见数据；敏感列已脱敏', costMs: 842, cacheHit: false } });
  });
  route('POST', '/ai/chat/clarify', ({ body }) => ok({ type: 'answer', ...cannedAnswers.oil, explain: { metric: 'M-OIL-001', dsl: cannedAnswers.oil.dsl, sql: cannedAnswers.oil.sql, permission: '行级权限已注入', costMs: 655, cacheHit: false } }));
  route('GET', '/ai/session/list', () => ok(db.chatSessions));
  route('POST', '/ai/insight/attribute', () => ok(cannedAnswers.oil.attribution));
  route('POST', '/ai/chat/saveAsChart', ({ body }) => ok({ chartId: 'CH-NEW-' + Date.now() % 1000, name: body.name || '问数图表', msg: '已生成图表部件，可继续添加到看板' }));

  /* ---- 系统管理 /management/* + 行列权限 /auth/*（FR-AUTH-01~17） ---- */
  route('GET', '/management/user/list', () => ok({ total: db.users.length, rows: db.users }));
  route('POST', '/management/user/save', ({ body }) => {
    if (!body.name || !body.account) return err(400, '姓名与账号不能为空');
    const id = body.id || 'U-' + String(db.users.length + 1).padStart(2, '0');
    const row = { id, name: body.name, account: body.account, org: body.org || '未分配', roles: body.roles || ['业务人员'], status: '正常', last: '—' };
    const i = db.users.findIndex(u => u.id === id); if (i >= 0) db.users[i] = { ...db.users[i], ...row }; else db.users.push(row);
    return ok(row);
  });
  route('POST', '/management/user/toggle', ({ body }) => { const u = db.users.find(x => x.id === body.id); if (u) u.status = u.status === '正常' ? '已锁定' : '正常'; return ok({ status: u && u.status }); });
  route('GET', '/auth/rowperm/list', () => ok(db.rowPerms));
  route('POST', '/auth/rowperm/save', ({ body }) => { const row = { id: 'RP-' + String(db.rowPerms.length + 1).padStart(2, '0'), name: body.name, resource: body.resource, cond: body.cond, roles: body.roles || ['业务人员'], enabled: true }; db.rowPerms.push(row); return ok(row); });
  route('POST', '/auth/rowperm/toggle', ({ body }) => { const r = db.rowPerms.find(x => x.id === body.id); if (r) r.enabled = !r.enabled; return ok({ enabled: r && r.enabled }); });
  route('GET', '/auth/columnperm/list', () => ok(db.colPerms));
  route('GET', '/auth/mask/list', () => ok(db.maskRules));
  route('POST', '/auth/mask/save', ({ body }) => { const row = { id: 'MK-' + String(db.maskRules.length + 1).padStart(2, '0'), field: body.field, algo: body.algo || '掩码', sample: body.sample || '', roles: body.roles || '业务人员', enabled: true }; db.maskRules.push(row); return ok(row); });
  route('GET', '/management/audit/list', ({ query }) => { let rows = db.auditLogs.slice(); if (query.op) rows = rows.filter(r => r.op === query.op); return ok({ total: rows.length, rows }); });

  /* ---- 开放与嵌入 /openapi/* /embed/*（FR-EXCH / FR-EMBED） ---- */
  route('GET', '/openapi/api/list', () => ok({ total: db.dataApis.length, rows: db.dataApis }));
  route('POST', '/openapi/api/toggle', ({ body }) => { const r = db.dataApis.find(x => x.id === body.id); if (r) r.enabled = !r.enabled; return ok({ enabled: r && r.enabled }); });
  route('GET', '/openapi/key/list', () => ok(db.apiKeys));
  route('POST', '/openapi/key/save', ({ body }) => { const row = { id: 'AK-' + String(db.apiKeys.length + 1).padStart(2, '0'), name: body.name, prefix: 'dgak_' + Math.random().toString(36).slice(2, 6) + '****', scope: body.scope || '只读', limit: body.limit || '300/分', last: '—', enabled: true, created: '2026-09-03' }; db.apiKeys.push(row); return ok(row); });
  route('POST', '/openapi/key/revoke', ({ body }) => { const r = db.apiKeys.find(x => x.id === body.id); if (r) r.enabled = false; return ok(true); });
  route('GET', '/embed/key/list', () => ok(db.embedKeys));
  route('POST', '/embed/key/save', ({ body }) => { const row = { id: 'EK-' + String(db.embedKeys.length + 1).padStart(2, '0'), name: body.name, domains: body.domains, expire: body.expire || '2027-09-03', enabled: true, calls30d: 0 }; db.embedKeys.push(row); return ok({ ...row, secret: 'embsec_' + Math.random().toString(36).slice(2, 18) + '（仅本次展示，请立即保存）' }); });

  /* ---- 治理 /meta/* /quality/* /lineage/* ---- */
  route('GET', '/quality/rule/list', () => ok(db.qualityRules));
  route('POST', '/quality/rule/toggle', ({ body }) => { const r = db.qualityRules.find(x => x.id === body.id); if (r) r.enabled = !r.enabled; return ok({ enabled: r && r.enabled }); });
  route('GET', '/quality/issue/list', () => ok(db.qualityIssues));
  route('GET', '/sensitive/list', () => ok(db.sensitiveFields));
  route('POST', '/sensitive/mark', ({ body }) => ok({ marked: true, field: body.field }));

  /* ---- 看板 / 报表 ---- */
  route('GET', '/dashboard/list', ({ query }) => { let rows = db.dashboards.slice(); if (query.ind && query.ind !== 'all') rows = rows.filter(d => d.ind === query.ind); return ok({ total: rows.length, rows }); });
  route('POST', '/dashboard/copyFromTemplate', ({ body }) => ok({ id: 'DB-NEW-' + Date.now() % 1000, name: body.template + '（副本）', msg: '已生成可编辑副本，模板源未受影响' }));
  route('POST', '/dashboard/delete', ({ body }) => { db.dashboards = db.dashboards.filter(d => d.id !== body.id); return ok(true); });
  route('GET', '/report/list', () => ok(db.reports));
  route('POST', '/report/export', ({ body }) => ok({ file: body.name + '.' + (body.format || 'xlsx'), size: '1.2 MB', watermark: true }));

  /* ---- 首页 / 全局搜索（FR-HOME） ---- */
  route('GET', '/home/todo', () => ok(db.todos));
  route('GET', '/home/favorite', () => ok(db.favorites));
  route('GET', '/search', ({ query }) => {
    const q = (query.q || '').trim();
    if (!q) return ok({ groups: ['指标', '看板', '数据集'], rows: db.searchIndex.slice(0, 6) });
    return ok({ rows: db.searchIndex.filter(s => s.name.includes(q) || s.sub.includes(q)) });
  });
  route('POST', '/collab/favorite/toggle', ({ body }) => ok({ id: body.id, fav: true }));

  /* ---- 交付部署 /deliv/* /project/*（FR-DELIV） ---- */
  route('POST', '/deliv/backup/run', () => ok({ file: 'datagear-backup-20260903-0300.zip', size: '286 MB', time: new Date().toLocaleString('zh-CN') }));
  route('POST', '/project/pack/export', ({ body }) => ok({ file: 'project-' + (body.name || '能源分析项目') + '.dgpkg', size: '18.4 MB', includes: body.scope || [] }));

  /* ---- 认证 /auth/login ---- */
  route('POST', '/auth/login', ({ body }) => {
    if (!body.account || !body.password) return err(400, '请输入账号与密码');
    if (body.captcha && body.captcha.toUpperCase() !== '7K4D') return err(400, '验证码错误，请重新输入');
    return ok({ token: 'mock-session-' + Math.random().toString(36).slice(2, 10), user: { name: '李明', role: '数据分析师', org: '华北油田分公司' } });
  });

  /* ================= 调用入口 ================= */
  async function request(method, path, opts) {
    opts = opts || {};
    await new Promise(r => setTimeout(r, delay()));
    if (failHook && failHook(path)) return err(500, '服务繁忙，请稍后重试（模拟 500）');
    const url = path.split('?')[0];
    const query = Object.assign({}, opts.query || {});
    if (path.includes('?')) path.split('?')[1].split('&').forEach(kv => { const [k, v] = kv.split('='); query[k] = decodeURIComponent(v || ''); });
    for (const r of routes) {
      if (r.method !== method) continue;
      const pathParams = matchPath(r.path, url);
      if (pathParams) {
        try { return await r.handler({ query, body: opts.body || {}, pathParams }); }
        catch (e) { return err(500, e.message || '服务异常'); }
      }
    }
    return err(404, '接口不存在：' + method + ' ' + url);
  }

  DG.api = {
    request,
    get: (p, query) => request('GET', p, { query }),
    post: (p, body) => request('POST', p, { body }),
    put: (p, body) => request('PUT', p, { body }),
    del: (p) => request('DELETE', p),
    setLatency: (a, b) => { latencyRange = [a, b]; },
    _db: db, _routes: routes, _canned: cannedAnswers
  };
})();
