/*
 * Copyright 2018-present datagear.tech
 *
 * This file is part of DataGear.
 *
 * DataGear is free software: you can redistribute it and/or modify it under the terms of
 * the GNU Lesser General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * DataGear is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY;
 * without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License along with DataGear.
 * If not, see <https://www.gnu.org/licenses/>.
 */

package org.datagear.web.ai;

import java.util.ArrayList;
import java.util.Calendar;
import java.util.Date;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.datagear.connection.ConnectionSource;
import org.datagear.management.domain.AiMessage;
import org.datagear.management.domain.AiSession;
import org.datagear.management.domain.DtbsSource;
import org.datagear.management.domain.MetricEntity;
import org.datagear.management.domain.User;
import org.datagear.management.service.AiMessageService;
import org.datagear.management.service.AiSessionService;
import org.datagear.management.service.DtbsSourceService;
import org.datagear.management.service.GlossaryService;
import org.datagear.management.service.MetricService;
import org.datagear.util.IDUtil;
import org.datagear.util.JdbcUtil;
import org.datagear.web.metric.DataPermissionService;
import org.datagear.web.metric.MetricQueryEngine;
import org.datagear.web.metric.MetricQueryEngine.MetricQuery;
import org.datagear.web.metric.MetricQueryEngine.MetricQueryResult;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * ChatBI 问数服务（FR-AI-01~07，SDS「Text2DSL 通道 A：语义层确定性 Grounding」实现）。
 * <p>
 * 管道：意图识别（问题 → 指标命中）→ DSL 中间层 → 指标引擎编译 SQL（复用行列权限管道）
 * → 执行 → 结论模板生成 + 图表推荐（规则引擎，不消耗 Token）。
 * </p>
 * <p>
 * 意图识别为确定性规则（指标名/口径关键词命中），无 LLM 依赖；BYO-LLM 接入后可替换
 * {@link #recognize} 为模型识别（接口已按 DSL 中间层隔离）。
 * </p>
 *
 * @author datagear@163.com
 *
 */
public class ChatService
{
	protected static final Pattern PATTERN_LAST_MONTH = Pattern.compile("上月|上个月");
	protected static final Pattern PATTERN_THIS_MONTH = Pattern.compile("本月|这个月|当月");
	protected static final Pattern PATTERN_YESTERDAY = Pattern.compile("昨日|昨天");
	protected static final Pattern PATTERN_TODAY = Pattern.compile("今日|今天");
	protected static final Pattern PATTERN_RECENT = Pattern.compile("近\\s*(\\d+)\\s*个月|最近\\s*(\\d+)\\s*个月");
	protected static final Pattern PATTERN_YEAR_MONTH = Pattern.compile("(\\d{4})\\s*年\\s*(\\d{1,2})\\s*月");

	private static final Logger LOGGER = LoggerFactory.getLogger(ChatService.class);

	private MetricService metricService;

	private DtbsSourceService dtbsSourceService;

	private MetricQueryEngine metricQueryEngine;

	private DataPermissionService dataPermissionService;

	private AiSessionService aiSessionService;

	private AiMessageService aiMessageService;

	private GlossaryService glossaryService;

	private ConnectionSource connectionSource;

	public ChatService()
	{
		super();
	}

	public MetricService getMetricService()
	{
		return metricService;
	}

	public void setMetricService(MetricService metricService)
	{
		this.metricService = metricService;
	}

	public DtbsSourceService getDtbsSourceService()
	{
		return dtbsSourceService;
	}

	public void setDtbsSourceService(DtbsSourceService dtbsSourceService)
	{
		this.dtbsSourceService = dtbsSourceService;
	}

	public MetricQueryEngine getMetricQueryEngine()
	{
		return metricQueryEngine;
	}

	public void setMetricQueryEngine(MetricQueryEngine metricQueryEngine)
	{
		this.metricQueryEngine = metricQueryEngine;
	}

	public DataPermissionService getDataPermissionService()
	{
		return dataPermissionService;
	}

	public void setDataPermissionService(DataPermissionService dataPermissionService)
	{
		this.dataPermissionService = dataPermissionService;
	}

	public AiSessionService getAiSessionService()
	{
		return aiSessionService;
	}

	public void setAiSessionService(AiSessionService aiSessionService)
	{
		this.aiSessionService = aiSessionService;
	}

	public AiMessageService getAiMessageService()
	{
		return aiMessageService;
	}

	public void setAiMessageService(AiMessageService aiMessageService)
	{
		this.aiMessageService = aiMessageService;
	}

	public GlossaryService getGlossaryService()
	{
		return glossaryService;
	}

	public void setGlossaryService(GlossaryService glossaryService)
	{
		this.glossaryService = glossaryService;
	}

	public ConnectionSource getConnectionSource()
	{
		return connectionSource;
	}

	public void setConnectionSource(ConnectionSource connectionSource)
	{
		this.connectionSource = connectionSource;
	}

	/* ==================== 意图识别（确定性规则，可替换为 LLM） ==================== */

	/**
	 * 意图识别结果（DSL 中间层 + 命中指标）。
	 */
	public static class Intent
	{
		private MetricEntity metric;
		private int score = 0;
		/** 命中的关键词（意图透明化展示） */
		private String hitTerm = "";
		private TimeRange timeRange = new TimeRange();
		private boolean grouped = false;

		public MetricEntity getMetric()
		{
			return metric;
		}

		public void setMetric(MetricEntity metric)
		{
			this.metric = metric;
		}

		public int getScore()
		{
			return score;
		}

		public void setScore(int score)
		{
			this.score = score;
		}

		public String getHitTerm()
		{
			return hitTerm;
		}

		public void setHitTerm(String hitTerm)
		{
			this.hitTerm = hitTerm;
		}

		public TimeRange getTimeRange()
		{
			return timeRange;
		}

		public void setTimeRange(TimeRange timeRange)
		{
			this.timeRange = timeRange;
		}

		public boolean isGrouped()
		{
			return grouped;
		}

		public void setGrouped(boolean grouped)
		{
			this.grouped = grouped;
		}
	}

	/**
	 * 时空范围（DSL time_range）。
	 */
	public static class TimeRange
	{
		/** none/last_month/this_month/yesterday/today/recent_months/year_month */
		private String type = "none";
		private int value = 0;
		private Date start = null;
		private Date end = null;

		public String getType()
		{
			return type;
		}

		public void setType(String type)
		{
			this.type = type;
		}

		public int getValue()
		{
			return value;
		}

		public void setValue(int value)
		{
			this.value = value;
		}

		public Date getStart()
		{
			return start;
		}

		public void setStart(Date start)
		{
			this.start = start;
		}

		public Date getEnd()
		{
			return end;
		}

		public void setEnd(Date end)
		{
			this.end = end;
		}
	}

	/**
	 * 识别问题命中的指标与时空范围。命中候选 &gt; 1 时由控制器发起澄清。
	 *
	 * @param question
	 * @param pinnedMetricId
	 *            澄清后指定的指标（可空）
	 * @return 候选列表（按得分倒序）
	 */
	public List<Intent> recognize(String question, String pinnedMetricId)
	{
		List<MetricEntity> metrics = this.metricService.query(new org.datagear.management.util.Query());
		String q = question == null ? "" : question.trim();

		List<Intent> candidates = new ArrayList<Intent>();

		if (metrics == null)
			return candidates;

		// 术语表 grounding（FR-SEM-04）：术语/同义词 → 关联指标
		Map<String, Integer> glossaryScore = new HashMap<String, Integer>();
		Map<String, String> glossaryHit = new HashMap<String, String>();

		if (this.glossaryService != null)
		{
			try
			{
				for (org.datagear.management.domain.GlossaryEntity g : this.glossaryService.listAll())
				{
					if (g.getRefMetricId() == null || g.getRefMetricId().isEmpty())
						continue;

					int gs = 0;
					String hit = null;

					for (String word : collectGlossaryWords(g))
					{
						if (word.length() >= 2 && q.contains(word))
						{
							gs += word.length() * 8;
							if (hit == null)
								hit = word;
						}
					}

					if (gs > 0)
					{
						glossaryScore.merge(g.getRefMetricId(), gs, Integer::sum);
						glossaryHit.putIfAbsent(g.getRefMetricId(), hit);
					}
				}
			}
			catch (Exception e)
			{
				LOGGER.warn("Glossary grounding failed", e);
			}
		}

		for (MetricEntity metric : metrics)
		{
			int score = 0;
			String hitTerm = null;

			if (pinnedMetricId != null && !pinnedMetricId.isEmpty())
			{
				if (pinnedMetricId.equals(metric.getId()))
				{
					score = 100;
					hitTerm = metric.getName();
				}
			}
			else
			{
				String name = metric.getName() == null ? "" : metric.getName();

				if (!name.isEmpty() && q.contains(name))
				{
					score += name.length() * 10;
					hitTerm = name;
				}
				else
				{
					// 口径描述关键词兜底：口径分词后问句包含即加分
					String caliber = metric.getCaliber() == null ? "" : metric.getCaliber();

					for (String token : caliber.split("[，。；、,;\\s]+"))
					{
						if (token.length() >= 2 && q.contains(token))
						{
							score += 5;
							if (hitTerm == null)
								hitTerm = token;
						}
					}
				}
			}

			Integer termScore = glossaryScore.get(metric.getId());

			if (termScore != null && termScore > score)
			{
				score = termScore;
				hitTerm = glossaryHit.get(metric.getId());
			}
			else if (termScore != null)
			{
				score += termScore;
			}

			if (score > 0)
			{
				Intent intent = new Intent();
				intent.setMetric(metric);
				intent.setScore(score);
				intent.setHitTerm(hitTerm == null ? glossaryHit.get(metric.getId()) : hitTerm);
				intent.setTimeRange(parseTimeRange(q));
				intent.setGrouped(GROUP_HINT.matcher(q).find());
				candidates.add(intent);
			}
		}

		candidates.sort((a, b) -> b.getScore() - a.getScore());
		return candidates;
	}

	/**
	 * 收集术语词条：term + 同义词 JSON 数组（轻量解析）。
	 */
	protected List<String> collectGlossaryWords(org.datagear.management.domain.GlossaryEntity g)
	{
		List<String> words = new ArrayList<String>();

		if (g.getTerm() != null && !g.getTerm().isEmpty())
			words.add(g.getTerm());

		String json = g.getSynonyms();

		if (json != null && json.startsWith("[") && json.endsWith("]"))
		{
			String body = json.substring(1, json.length() - 1);

			for (String part : body.split(","))
			{
				String w = part.trim();

				if (w.length() >= 2 && w.startsWith("\"") && w.endsWith("\""))
					w = w.substring(1, w.length() - 1);

				if (!w.isEmpty())
					words.add(w);
			}
		}

		return words;
	}

	protected String name(MetricEntity metric)
	{
		return metric.getName() == null ? metric.getId() : metric.getName();
	}

	protected static final Pattern GROUP_HINT = Pattern.compile("各|按|排名|分布|对比|排行|明细");

	/**
	 * 解析问题中的时空范围（上月/本月/昨日/今日/近N月/YYYY年M月）。
	 */
	public TimeRange parseTimeRange(String q)
	{
		TimeRange range = new TimeRange();
		Calendar cal = Calendar.getInstance();

		if (PATTERN_TODAY.matcher(q).find())
		{
			range.type = "today";
			cal.set(Calendar.HOUR_OF_DAY, 0);
			cal.set(Calendar.MINUTE, 0);
			cal.set(Calendar.SECOND, 0);
			range.start = cal.getTime();
			cal.add(Calendar.DAY_OF_MONTH, 1);
			range.end = cal.getTime();
			return range;
		}

		if (PATTERN_YESTERDAY.matcher(q).find())
		{
			range.type = "yesterday";
			cal.set(Calendar.HOUR_OF_DAY, 0);
			cal.set(Calendar.MINUTE, 0);
			cal.set(Calendar.SECOND, 0);
			cal.add(Calendar.DAY_OF_MONTH, -1);
			range.start = cal.getTime();
			range.end = new Date(range.start.getTime() + 86400000L);
			return range;
		}

		if (PATTERN_LAST_MONTH.matcher(q).find())
		{
			range.type = "last_month";
			cal.set(Calendar.DAY_OF_MONTH, 1);
			cal.set(Calendar.HOUR_OF_DAY, 0);
			cal.set(Calendar.MINUTE, 0);
			cal.set(Calendar.SECOND, 0);
			range.end = cal.getTime();
			cal.add(Calendar.MONTH, -1);
			range.start = cal.getTime();
			return range;
		}

		if (PATTERN_THIS_MONTH.matcher(q).find())
		{
			range.type = "this_month";
			cal.set(Calendar.DAY_OF_MONTH, 1);
			cal.set(Calendar.HOUR_OF_DAY, 0);
			cal.set(Calendar.MINUTE, 0);
			cal.set(Calendar.SECOND, 0);
			range.start = cal.getTime();
			cal.add(Calendar.MONTH, 1);
			range.end = cal.getTime();
			return range;
		}

		Matcher rm = PATTERN_RECENT.matcher(q);

		if (rm.find())
		{
			int n = Integer.parseInt(rm.group(1) != null ? rm.group(1) : rm.group(2));
			range.type = "recent_months";
			range.value = n;
			cal.set(Calendar.DAY_OF_MONTH, 1);
			cal.set(Calendar.HOUR_OF_DAY, 0);
			cal.set(Calendar.MINUTE, 0);
			cal.set(Calendar.SECOND, 0);
			range.end = cal.getTime();
			cal.add(Calendar.MONTH, -n);
			range.start = cal.getTime();
			return range;
		}

		Matcher ym = PATTERN_YEAR_MONTH.matcher(q);

		if (ym.find())
		{
			int year = Integer.parseInt(ym.group(1));
			int month = Integer.parseInt(ym.group(2)) - 1;
			range.type = "year_month";
			cal.clear();
			cal.set(year, month, 1, 0, 0, 0);
			range.start = cal.getTime();
			cal.add(Calendar.MONTH, 1);
			range.end = cal.getTime();
			return range;
		}

		return range;
	}

	/* ==================== 问数管道 ==================== */

	/**
	 * 问数主流程：识别 → DSL → 编译执行（含行列权限管道）→ 结论 + 图表推荐 → 持久化。
	 *
	 * @return 回答 JSON（answer/clarify），供控制器直接返回与消息持久化
	 */
	public Map<String, Object> ask(User user, String sessionId, String question, String pinnedMetricId)
			throws Exception
	{
		List<Intent> candidates = recognize(question, pinnedMetricId);

		if (candidates.isEmpty())
			return clarify("未在语义层命中相关指标，请补充指标名称或换个问法：", optionsFromMetrics(3));

		if (candidates.size() > 1 && candidates.get(0).getScore() == candidates.get(1).getScore())
		{
			StringBuilder opts = new StringBuilder();
			for (int i = 0; i < Math.min(3, candidates.size()); i++)
				opts.append(candidates.get(i).getMetric().getName()).append(i < Math.min(3, candidates.size()) - 1 ? "、" : "");

			return clarify("命中多个相近指标（" + opts + "），为避免取错数请确认：", optionNames(candidates, 3));
		}

		Intent intent = candidates.get(0);
		Map<String, Object> answer = executeIntent(user, intent, question);

		// 会话与消息持久化
		if (this.aiSessionService != null && this.aiMessageService != null)
		{
			AiSession session = this.aiSessionService.getById(sessionId);

			if (session == null)
				session = this.aiSessionService.create(truncate(question, 40), user.getId());

			this.aiMessageService.append(session.getId(), AiMessage.ROLE_USER, question);
			this.aiMessageService.append(session.getId(), AiMessage.ROLE_ASSISTANT, toJson(answer));

			// 会话标题取首个问题
			String title = session.getTitle();
			if (title == null || title.isEmpty() || "新会话".equals(title))
				this.aiSessionService.touch(session.getId(), truncate(question, 40));
			else
				this.aiSessionService.touch(session.getId(), null);

			answer.put("sessionId", session.getId());
		}

		return answer;
	}

	protected String truncate(String s, int max)
	{
		if (s == null)
			return "";

		return s.length() <= max ? s : s.substring(0, max);
	}

	protected List<String> optionsFromMetrics(int n)
	{
		List<MetricEntity> metrics = this.metricService.query(new org.datagear.management.util.Query());
		return optionNamesFrom(metrics, n);
	}

	protected List<String> optionNames(List<Intent> candidates, int n)
	{
		List<String> options = new ArrayList<String>();

		for (int i = 0; i < Math.min(n, candidates.size()); i++)
			options.add(candidates.get(i).getMetric().getName());

		return options;
	}

	protected List<String> optionNamesFrom(List<MetricEntity> metrics, int n)
	{
		List<String> options = new ArrayList<String>();

		if (metrics != null)
		{
			for (int i = 0; i < Math.min(n, metrics.size()); i++)
				options.add(name(metrics.get(i)));
		}

		return options;
	}

	protected Map<String, Object> clarify(String message, List<String> options)
	{
		Map<String, Object> answer = new LinkedHashMap<String, Object>();
		answer.put("type", "clarify");
		answer.put("message", message);
		answer.put("options", options);
		return answer;
	}

	/**
	 * 执行意图：DSL → 编译 SQL（行级过滤注入 + 结果脱敏）→ 执行 → 结论/图表模板。
	 */
	public Map<String, Object> executeIntent(User user, Intent intent, String question) throws Exception
	{
		long start = System.currentTimeMillis();

		MetricEntity metric = intent.getMetric();

		if (metric.getSourceId() == null || metric.getSourceId().isEmpty())
			return clarify("指标「" + name(metric) + "」未绑定数据源，请先在指标中心完善定义：", null);

		DtbsSource dtbsSource = this.dtbsSourceService.getById(user, metric.getSourceId());

		if (dtbsSource == null)
			return clarify("您没有指标「" + name(metric) + "」所属数据源的访问权限，请联系管理员授权：", null);

		// DSL 中间层（Grounding 后）
		Map<String, Object> dsl = new LinkedHashMap<String, Object>();
		dsl.put("metric", metric.getId());
		dsl.put("metricName", name(metric));
		dsl.put("dimensions", metricQueryEngine.parseDimensions(metric));
		dsl.put("time_range", intent.getTimeRange().getType());
		dsl.put("grouped", intent.isGrouped());

		MetricQuery query = new MetricQuery();

		List<String> dims = new ArrayList<String>(metricQueryEngine.parseDimensions(metric));
		query.setDimensions(dims);

		// 时空过滤（时间字段存在时生效）
		if (intent.getTimeRange().getStart() != null && metric.getTimeField() != null
				&& !metric.getTimeField().isEmpty())
		{
			List<MetricQuery.Filter> filters = new ArrayList<MetricQuery.Filter>();
			filters.add(new MetricQuery.Filter(metric.getTimeField(), ">=", intent.getTimeRange().getStart()));
			filters.add(new MetricQuery.Filter(metric.getTimeField(), "<", intent.getTimeRange().getEnd()));
			query.setFilters(filters);
		}

		query.setLimit(50);

		// 行级权限管道（FR-AUTH-10）
		List<MetricQuery.Filter> permFilters = new ArrayList<MetricQuery.Filter>();
		List<String> appliedRowPerms = this.dataPermissionService.applyRowFilters(user, metric.getTableName(),
				permFilters);

		if (!permFilters.isEmpty())
		{
			if (query.getFilters() == null || query.getFilters().isEmpty())
				query.setFilters(permFilters);
			else
			{
				List<MetricQuery.Filter> merged = new ArrayList<MetricQuery.Filter>(query.getFilters());
				merged.addAll(permFilters);
				query.setFilters(merged);
			}
		}

		MetricQueryResult result;

		try
		{
			result = this.metricQueryEngine.query(dtbsSource, metric, query);
			result.setAppliedRowPerms(appliedRowPerms);
			result.setAppliedMasks(this.dataPermissionService.applyMasks(user, metric.getTableName(), result));
		}
		catch (MetricQueryEngine.MetricQueryException e)
		{
			throw e;
		}

		long costMs = System.currentTimeMillis() - start;

		// 结论 + 图表推荐（规则引擎）
		String dimLabel = dims.isEmpty() ? "" : dims.get(dims.size() - 1);
		Map<String, Object> conclusion = buildConclusion(metric, result, intent);

		Map<String, Object> answer = new LinkedHashMap<String, Object>();
		answer.put("type", "answer");
		answer.put("metric", metric.getId());
		answer.put("title", name(metric));
		answer.put("conclusion", conclusion.get("html"));
		answer.put("data", MetricQueryEngine.toMapRows(result));
		answer.put("columns", result.getColumns());
		answer.put("chart", chartSpec(result, dims, intent));
		answer.put("dimLabel", dimLabel);

		Map<String, Object> explain = new LinkedHashMap<String, Object>();
		explain.put("metric", metric.getId());
		explain.put("metricName", name(metric));
		explain.put("dsl", dsl);
		explain.put("sql", result.getSql());
		explain.put("permission", appliedRowPerms.isEmpty() ? "未命中行级权限规则（或管理员）" : "已注入：" + String.join("、", appliedRowPerms));
		explain.put("costMs", costMs);
		explain.put("cacheHit", false);
		explain.put("appliedRowPerms", appliedRowPerms);
		explain.put("appliedMasks", result.getAppliedMasks());
		answer.put("explain", explain);

		return answer;
	}

	/**
	 * 结论模板（规则生成；LLM 接入后可替换为模型润色）。
	 */
	protected Map<String, Object> buildConclusion(MetricEntity metric, MetricQueryResult result, Intent intent)
	{
		String html;

		List<List<Object>> rows = result.getRows();
		int valueCol = result.getColumns().indexOf("METRIC_VALUE");

		if (rows == null || rows.isEmpty() || result.firstValue() == null)
		{
			html = "语义层已命中指标「<b>" + escapeHtml(name(metric)) + "</b>」，但当前时空范围内没有数据。";
		}
		else if (result.getColumns().size() <= 1)
		{
			html = "「<b>" + escapeHtml(name(metric)) + "</b>」为 <b>"
					+ escapeHtml(String.valueOf(result.firstValue())) + "</b>（取数详见右侧面板）。";
		}
		else
		{
			int topIdx = 0;
			double total = 0;

			for (int i = 0; i < rows.size(); i++)
			{
				double v = toDouble(rows.get(i).get(valueCol));

				if (v > toDouble(rows.get(topIdx).get(valueCol)))
					topIdx = i;

				total += v;
			}

			List<Object> topRow = rows.get(topIdx);
			String topDim = String.valueOf(topRow.get(0));
			String topVal = String.valueOf(topRow.get(valueCol));

			html = "「<b>" + escapeHtml(name(metric)) + "</b>」共 " + rows.size() + " 项，合计 <b>" + formatNum(total)
					+ "</b>；最高为 <b>" + escapeHtml(topDim) + "</b>（" + escapeHtml(topVal) + "，占比 "
					+ (total == 0 ? 0 : Math.round(toDouble(topRow.get(valueCol)) * 100 / total)) + "%）。"
					+ "取数全过程见右侧「取数逻辑透明化」面板。";
		}

		Map<String, Object> map = new HashMap<String, Object>();
		map.put("html", html);
		return map;
	}

	/**
	 * 图表推荐（规则引擎，不消耗 Token）：时间字段分组 → 折线；否则柱状。
	 */
	protected Map<String, Object> chartSpec(MetricQueryResult result, List<String> dims, Intent intent)
	{
		Map<String, Object> spec = new LinkedHashMap<String, Object>();
		int valueCol = result.getColumns().indexOf("METRIC_VALUE");

		List<Object> x = new ArrayList<Object>();
		List<Object> y = new ArrayList<Object>();

		int dimCount = dims.size();

		for (List<Object> row : result.getRows())
		{
			// 多维度分组时 x 轴拼接各维度值（如 华东/苏州）
			if (dimCount <= 1)
				x.add(row.get(0));
			else
			{
				StringBuilder label = new StringBuilder();

				for (int i = 0; i < dimCount && i < row.size(); i++)
				{
					if (i > 0)
						label.append("/");
					label.append(row.get(i));
				}

				x.add(label.toString());
			}

			y.add(valueCol >= 0 ? row.get(valueCol) : null);
		}

		boolean timeDim = !dims.isEmpty() && dims.get(dims.size() - 1).toLowerCase().contains("month")
				|| !dims.isEmpty() && dims.get(dims.size() - 1).toLowerCase().contains("date")
				|| !dims.isEmpty() && dims.get(dims.size() - 1).toLowerCase().contains("time");

		spec.put("type", (timeDim || "recent_months".equals(intent.getTimeRange().getType())) ? "line" : "bar");
		spec.put("x", x);
		spec.put("y", y);
		spec.put("yName", "METRIC_VALUE");

		return spec;
	}

	/* ==================== 归因（维度贡献度，FR-AI-08） ==================== */

	/**
	 * 波动归因 MVP：按指标各维度逐一分组取 Top 维值占比（结果侧计算，无 LLM）。
	 */
	public List<Map<String, Object>> attribute(User user, String metricId) throws Exception
	{
		MetricEntity metric = this.metricService.getById(metricId);

		if (metric == null || metric.getSourceId() == null || metric.getSourceId().isEmpty())
			return new ArrayList<Map<String, Object>>();

		DtbsSource dtbsSource = this.dtbsSourceService.getById(user, metric.getSourceId());

		if (dtbsSource == null)
			return new ArrayList<Map<String, Object>>();

		List<Map<String, Object>> out = new ArrayList<Map<String, Object>>();
		List<String> dims = metricQueryEngine.parseDimensions(metric);

		for (String dim : dims)
		{
			MetricQuery query = new MetricQuery();
			query.setDimensions(new ArrayList<String>(java.util.Collections.singletonList(dim)));
			query.setLimit(5);

			MetricQueryResult result;

			try
			{
				result = this.metricQueryEngine.query(dtbsSource, metric, query);
			}
			catch (MetricQueryEngine.MetricQueryException e)
			{
				LOGGER.warn("Attribute query failed for dim {}", dim, e);
				continue;
			}

			if (result.getRows().isEmpty())
				continue;

			int valueCol = result.getColumns().indexOf("METRIC_VALUE");
			double total = 0;

			for (List<Object> row : result.getRows())
				total += toDouble(valueCol >= 0 ? row.get(valueCol) : null);

			List<Object> topRow = result.getRows().get(0);

			Map<String, Object> item = new LinkedHashMap<String, Object>();
			item.put("dim", dim);
			item.put("topValue", String.valueOf(topRow.get(0)));
			item.put("pct", total == 0 ? 0 : Math.round(toDouble(valueCol >= 0 ? topRow.get(valueCol) : null) * 100 / total));
			item.put("seriesCount", result.getRows().size());
			out.add(item);
		}

		return out;
	}

	/* ==================== 消息历史 ==================== */

	public List<Map<String, Object>> history(String sessionId) throws Exception
	{
		List<AiMessage> messages = this.aiMessageService.listBySession(sessionId, 200);

		List<Map<String, Object>> out = new ArrayList<Map<String, Object>>();

		for (AiMessage message : messages)
		{
			Map<String, Object> item = new LinkedHashMap<String, Object>();
			item.put("role", message.getRole());
			item.put("content", message.getContent());
			item.put("time", message.getCreateTime());
			out.add(item);
		}

		return out;
	}

	/* ==================== 会话 ==================== */

	public AiSession createSession(User user, String title)
	{
		return this.aiSessionService.create(title == null || title.isEmpty() ? "新会话" : title, user.getId());
	}

	public List<AiSession> listSessions(User user)
	{
		return this.aiSessionService.listByUser(user.getId(), 50);
	}

	public void deleteSession(String sessionId)
	{
		this.aiSessionService.deleteById(sessionId);
	}

	/* ==================== 工具 ==================== */

	protected double toDouble(Object v)
	{
		if (v == null)
			return 0;

		if (v instanceof Number)
			return ((Number) v).doubleValue();

		try
		{
			return Double.parseDouble(String.valueOf(v));
		}
		catch (Exception e)
		{
			return 0;
		}
	}

	protected String formatNum(double v)
	{
		if (v == Math.floor(v) && !Double.isInfinite(v))
			return String.valueOf((long) v);

		return String.format("%.2f", v);
	}

	protected String escapeHtml(String s)
	{
		if (s == null)
			return "";

		return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;");
	}

	/**
	 * 回答 JSON 序列化（控制器共享同一 ObjectMapper 风格；消息持久化用）。
	 */
	public String toJson(Object obj)
	{
		try
		{
			return new com.fasterxml.jackson.databind.ObjectMapper().writeValueAsString(obj);
		}
		catch (Exception e)
		{
			return String.valueOf(obj);
		}
	}
}
