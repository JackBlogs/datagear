const a=[{id:"CS-01",title:"上月各采油厂产量同比",time:"今天 08:40",turns:4},{id:"CS-02",title:"华东管网输差分析",time:"昨天 16:22",turns:6},{id:"CS-03",title:"甲醇装置开工率趋势",time:"昨天 09:10",turns:2},{id:"CS-04",title:"吨油完全成本环比拆解",time:"3 天前",turns:8},{id:"CS-05",title:"瓦斯超限次数排名",time:"3 天前",turns:3}],i={metric:"M-OIL-001",title:"上月各采油厂原油产量的同比变化",conclusion:'上月（2026年8月）全集团原油产量 <b>385.2 万吨</b>，同比 <b style="color:var(--ok,#34d399)">+5.1%</b>。其中<b>长庆采油厂</b>增幅最大（+12.3%，+10.4 万吨），主要来自安塞区块新井投产；大庆采油厂同比 -1.8%，受老区自然递减影响。',dims:["长庆采油厂","大庆采油厂","塔里木采油厂","胜利采油厂","华北采油厂"],values:[94.8,88.6,71.5,68.2,62.1],lastYear:[84.4,90.2,67.9,66.5,58.8],yoy:["+12.3%","-1.8%","+5.3%","+2.6%","+5.6%"],drivers:["安塞·靖安","老区递减","轮南·哈得","孤岛·孤东","任丘·霸州"],dsl:{metric:"M-OIL-001",dimensions:["plant"],time_range:{type:"last_month",granularity:"month"},compare:"yoy",filters:{well_status:"生产井"}},sql:`SELECT plant_name,
  SUM(commercial_qty) AS qty
FROM ods_fact_oil_daily
WHERE dt BETWEEN \${pc(month_start)}
  AND \${pc(month_end)}   -- 行级权限注入：AND org_id IN ('HB01')
GROUP BY plant_name
ORDER BY qty DESC`,attribution:[{dim:"区块",pct:62},{dim:"油藏类型",pct:23},{dim:"井别",pct:11},{dim:"其他",pct:4}],followup:{q:"长庆为什么涨这么多？",a:"长庆采油厂同比 +12.3%（+10.4 万吨）主要由三方面驱动：① 安塞区块 23 口新井 7 月下旬投产，贡献 +6.8 万吨（65%）；② 靖安区块措施井（压裂改造 12 口）增产 +2.4 万吨（23%）；③ 去年同期检修低基数 +1.2 万吨（12%）。"}},s={metric:"M-COAL-003",title:"瓦斯超限次数排名",conclusion:'昨日全集团瓦斯超限 <b>2 次</b>，同比 <b style="color:var(--ok,#34d399)">-33.3%</b>。超限集中在<b>大同矿区 3# 工作面</b>（1 次，峰值 1.24%，持续 4 分钟）与<b>神东矿区 12# 工作面</b>（1 次，峰值 1.08%）。均已按预案停产撤人，复测恢复正常。',dims:["大同矿区","神东矿区","晋城矿区","两淮矿区","兖州矿区"],values:[1,1,0,0,0],lastYear:[2,1,1,0,0],yoy:["-50%","0%","-100%","—","—"],drivers:["3#工作面","12#工作面","—","—","—"],dsl:{metric:"M-COAL-003",dimensions:["mine","working_face"],time_range:{type:"yesterday",granularity:"day"},compare:"yoy",order:[{field:"cnt",dir:"desc"}]},sql:`SELECT mine_name, working_face,
  COUNT(DISTINCT alarm_id) AS cnt
FROM ods_gas_monitor
WHERE dt = \${pc(date)}
  AND gas_conc > 1.0
GROUP BY mine_name, working_face
ORDER BY cnt DESC`,attribution:[{dim:"工作面",pct:78},{dim:"班次",pct:14},{dim:"通风方式",pct:8}]},r={metric:"M-CHEM-001",title:"甲醇装置开工率趋势",conclusion:"近 6 个月甲醇装置开工率均值 <b>91.2%</b>，8 月达 <b>93.5%</b>（环比 +1.4pct）。其中煤制甲醇装置开工率 95.1%，天然气制装置 88.6%。7 月天然气制装置检修导致当月下探 87.2%。",dims:["3月","4月","5月","6月","7月","8月"],values:[89.5,90.2,91.8,92.4,87.2,93.5],lastYear:[86.1,87,88.5,89.2,85.4,90.1],yoy:["+3.4","+3.2","+3.3","+3.2","+1.8","+3.4"],drivers:["煤制装置","气制装置","检修影响","—","—"],dsl:{metric:"M-CHEM-001",dimensions:["month"],time_range:{type:"recent_months",value:6},compare:"none",filters:{product:"甲醇"}},sql:`SELECT month,
  AVG(run_rate) AS rate
FROM ods_chem_device_daily
WHERE month >= \${pc(month_from)}
  AND product = '甲醇'
GROUP BY month ORDER BY month`,attribution:[{dim:"原料路线",pct:55},{dim:"检修计划",pct:32},{dim:"负荷调整",pct:13}]};function o(n){const e=n.trim();if(!e)return{type:"clarify",message:"问题不能为空"};let t=null;return/同比|产量|采油厂|原油/.test(e)?t=i:/瓦斯|超限|煤矿|安全/.test(e)?t=s:/甲醇|开工率|化工|装置/.test(e)&&(t=r),t?{type:"answer",...t,explain:{metric:t.metric,dsl:t.dsl,sql:t.sql,permission:"已按行级权限过滤：仅华北油田分公司可见数据；敏感列已脱敏",costMs:842,cacheHit:!1}}:{type:"clarify",question:e,message:"这个问题我没有十足把握，为避免取错数，请确认您的意图：",options:["查“原油产量”月度同比","查“瓦斯超限次数”排名","查“甲醇装置开工率”趋势"]}}function c(){return{type:"answer",...i,explain:{metric:"M-OIL-001",dsl:i.dsl,sql:i.sql,permission:"行级权限已注入",costMs:655,cacheHit:!1}}}function l(n){return{chartId:"CH-NEW-"+Date.now()%1e3,name:n||"问数图表",msg:"已生成图表部件，可继续添加到看板"}}export{o as a,c as b,a as c,l as s};
