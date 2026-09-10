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

package org.datagear.web.controller;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.util.ArrayList;
import java.util.Date;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;

import javax.servlet.http.HttpServletRequest;

import org.datagear.connection.ConnectionSource;
import org.datagear.management.domain.DtbsSource;
import org.datagear.management.domain.GovMetaTable;
import org.datagear.management.domain.GovQualityIssue;
import org.datagear.management.domain.GovQualityRule;
import org.datagear.management.domain.GovSensitiveField;
import org.datagear.management.domain.GovStandard;
import org.datagear.management.domain.User;
import org.datagear.management.service.DtbsSourceService;
import org.datagear.management.service.GovernanceService;
import org.datagear.management.service.PermissionDeniedException;
import org.datagear.management.util.DtbsSourceConnectionSupport;
import org.datagear.util.JdbcUtil;
import org.datagear.web.metric.MetricQueryEngine;
import org.datagear.web.util.OperationMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseBody;

/**
 * 数据治理 API 控制器（{@code /api/governance} 前缀，FR-GOV-01~05）。
 * <p>
 * 元数据目录/数据标准/质量规则/质量异常/敏感字段持久化；质量规则提供**服务端执行引擎**
 * （数据源直连抽样 → 确定性判定 → 结果与异常落库），行数在结果侧截断。
 * </p>
 *
 * @author datagear@163.com
 *
 */
@Controller
@RequestMapping("/api/governance")
public class GovernanceApiController extends AbstractController
{
	/** 质量抽样行数上限 */
	public static final int SAMPLE_LIMIT = 500;

	private static final Logger LOGGER = LoggerFactory.getLogger(GovernanceApiController.class);

	@Autowired
	private GovernanceService governanceService;

	@Autowired
	private DtbsSourceService dtbsSourceService;

	@Autowired
	private ConnectionSource connectionSource;

	private DtbsSourceConnectionSupport dtbsSourceConnectionSupport = new DtbsSourceConnectionSupport();

	public GovernanceApiController()
	{
		super();
	}

	public GovernanceService getGovernanceService()
	{
		return governanceService;
	}

	public void setGovernanceService(GovernanceService governanceService)
	{
		this.governanceService = governanceService;
	}

	public DtbsSourceService getDtbsSourceService()
	{
		return dtbsSourceService;
	}

	public void setDtbsSourceService(DtbsSourceService dtbsSourceService)
	{
		this.dtbsSourceService = dtbsSourceService;
	}

	public ConnectionSource getConnectionSource()
	{
		return connectionSource;
	}

	public void setConnectionSource(ConnectionSource connectionSource)
	{
		this.connectionSource = connectionSource;
	}

	public DtbsSourceConnectionSupport getDtbsSourceConnectionSupport()
	{
		return dtbsSourceConnectionSupport;
	}

	public void setDtbsSourceConnectionSupport(DtbsSourceConnectionSupport dtbsSourceConnectionSupport)
	{
		this.dtbsSourceConnectionSupport = dtbsSourceConnectionSupport;
	}

	/* ==================== 元数据目录 ==================== */

	@RequestMapping(value = "/meta/list", produces = CONTENT_TYPE_JSON)
	@ResponseBody
	public ResponseEntity<OperationMessage<List<GovMetaTable>>> metaList(HttpServletRequest request)
	{
		return success(request, this.governanceService.listMetaTables());
	}

	@RequestMapping(value = "/meta/save", produces = CONTENT_TYPE_JSON)
	@ResponseBody
	public ResponseEntity<OperationMessage<GovMetaTable>> metaSave(HttpServletRequest request,
			@RequestBody GovMetaTable entity)
	{
		this.governanceService.saveMetaTable(entity);
		return success(request, entity);
	}

	/* ==================== 数据标准 ==================== */

	@RequestMapping(value = "/standard/list", produces = CONTENT_TYPE_JSON)
	@ResponseBody
	public ResponseEntity<OperationMessage<List<GovStandard>>> standardList(HttpServletRequest request)
	{
		return success(request, this.governanceService.listStandards());
	}

	@RequestMapping(value = "/standard/save", produces = CONTENT_TYPE_JSON)
	@ResponseBody
	public ResponseEntity<OperationMessage<GovStandard>> standardSave(HttpServletRequest request,
			@RequestBody GovStandard entity)
	{
		if (isBlank(entity.getName()))
			throw new IllegalInputException("标准名称不能为空");

		boolean add = isBlank(entity.getId());
		this.governanceService.saveStandard(entity, add);
		return success(request, entity);
	}

	@RequestMapping(value = "/standard/delete", produces = CONTENT_TYPE_JSON)
	@ResponseBody
	public ResponseEntity<OperationMessage> standardDelete(HttpServletRequest request, @RequestBody String[] ids)
	{
		for (String id : ids)
			this.governanceService.deleteStandard(id);

		return optSuccessResponseEntity(request);
	}

	/* ==================== 质量规则 ==================== */

	@RequestMapping(value = "/quality/rule/list", produces = CONTENT_TYPE_JSON)
	@ResponseBody
	public ResponseEntity<OperationMessage<List<GovQualityRule>>> ruleList(HttpServletRequest request)
	{
		return success(request, this.governanceService.listQualityRules());
	}

	@RequestMapping(value = "/quality/rule/save", produces = CONTENT_TYPE_JSON)
	@ResponseBody
	public ResponseEntity<OperationMessage<GovQualityRule>> ruleSave(HttpServletRequest request,
			@RequestBody GovQualityRule entity)
	{
		if (isBlank(entity.getName()) || isBlank(entity.getTableName()) || isBlank(entity.getColumnName()))
			throw new IllegalInputException("规则名、数据表与字段不能为空");

		checkIdentifier(entity.getTableName(), "数据表");
		checkIdentifier(entity.getColumnName(), "字段");

		if (entity.getEnabled() < 0)
			entity.setEnabled(1);

		boolean add = isBlank(entity.getId());
		this.governanceService.saveQualityRule(entity, add);
		return success(request, entity);
	}

	@RequestMapping(value = "/quality/rule/delete", produces = CONTENT_TYPE_JSON)
	@ResponseBody
	public ResponseEntity<OperationMessage> ruleDelete(HttpServletRequest request, @RequestBody String[] ids)
	{
		for (String id : ids)
			this.governanceService.deleteQualityRule(id);

		return optSuccessResponseEntity(request);
	}

	/**
	 * 质量规则执行（FR-GOV-04）：数据源直连抽样 → 确定性判定 → 结果/异常落库。
	 */
	@RequestMapping(value = "/quality/rule/run", produces = CONTENT_TYPE_JSON)
	@ResponseBody
	public ResponseEntity<OperationMessage<Map<String, Object>>> ruleRun(HttpServletRequest request,
			@RequestBody IdForm form)
	{
		GovQualityRule rule = findById(this.governanceService.listQualityRules(), form.getId());

		if (rule == null)
			throw new RecordNotFoundException();

		User user = getCurrentUser();
		DtbsSource dtbsSource = this.dtbsSourceService.getById(user, rule.getSourceId());

		if (dtbsSource == null)
			throw new PermissionDeniedException();

		List<String> values = fetchColumnSample(dtbsSource, rule.getTableName(), rule.getColumnName());

		int total = values.size();
		int failed = judge(rule.getType(), values, rule.getThreshold());

		double passRate = total == 0 ? 100 : Math.round((total - failed) * 1000.0 / total) / 10.0;

		this.governanceService.updateQualityRuleRun(rule.getId(), new Date(), passRate, total, failed, total);

		rule.setLastRunTime(new Date());
		rule.setPassRate(passRate);
		rule.setTotal(total);
		rule.setFailed(failed);
		rule.setSample(total);

		if (failed > 0)
		{
			GovQualityIssue issue = new GovQualityIssue();
			issue.setRuleId(rule.getId());
			issue.setRule(rule.getName());
			issue.setTarget(rule.getSourceName() + " · " + rule.getTableName() + "." + rule.getColumnName());
			issue.setDetail(rule.getType() + "校验失败 " + failed + "/" + total + "（通过率 " + passRate + "%）");
			issue.setLevel(failed * 10 > total ? "danger" : "warn");
			issue.setFailed(failed);
			issue.setTotal(total);
			this.governanceService.saveQualityIssue(issue);
		}

		Map<String, Object> result = new java.util.LinkedHashMap<String, Object>();
		result.put("passRate", passRate);
		result.put("total", total);
		result.put("failed", failed);
		result.put("sample", total);
		result.put("rule", rule);

		return success(request, result);
	}

	/* ==================== 质量异常 ==================== */

	@RequestMapping(value = "/quality/issue/list", produces = CONTENT_TYPE_JSON)
	@ResponseBody
	public ResponseEntity<OperationMessage<List<GovQualityIssue>>> issueList(HttpServletRequest request,
			@RequestParam(value = "all", required = false) Boolean all)
	{
		return success(request, this.governanceService.listQualityIssues(Boolean.TRUE.equals(all)));
	}

	@RequestMapping(value = "/quality/issue/resolve", produces = CONTENT_TYPE_JSON)
	@ResponseBody
	public ResponseEntity<OperationMessage> issueResolve(HttpServletRequest request, @RequestBody ResolveForm form)
	{
		if (form == null || isBlank(form.getId()))
			throw new IllegalInputException();

		this.governanceService.resolveQualityIssue(form.getId(), form.getNote());
		return optSuccessResponseEntity(request);
	}

	/* ==================== 敏感字段 ==================== */

	@RequestMapping(value = "/sensitive/list", produces = CONTENT_TYPE_JSON)
	@ResponseBody
	public ResponseEntity<OperationMessage<List<GovSensitiveField>>> sensitiveList(HttpServletRequest request)
	{
		return success(request, this.governanceService.listSensitiveFields());
	}

	@RequestMapping(value = "/sensitive/save", produces = CONTENT_TYPE_JSON)
	@ResponseBody
	public ResponseEntity<OperationMessage<GovSensitiveField>> sensitiveSave(HttpServletRequest request,
			@RequestBody GovSensitiveField entity)
	{
		if (isBlank(entity.getField()))
			throw new IllegalInputException("字段不能为空");

		this.governanceService.saveSensitiveField(entity);
		return success(request, entity);
	}

	@RequestMapping(value = "/sensitive/delete", produces = CONTENT_TYPE_JSON)
	@ResponseBody
	public ResponseEntity<OperationMessage> sensitiveDelete(HttpServletRequest request, @RequestBody String[] ids)
	{
		for (String id : ids)
			this.governanceService.deleteSensitiveField(id);

		return optSuccessResponseEntity(request);
	}

	/* ==================== 执行引擎 ==================== */

	protected List<String> fetchColumnSample(DtbsSource dtbsSource, String tableName, String columnName)
	{
		checkIdentifier(tableName, "数据表");
		checkIdentifier(columnName, "字段");

		String sql = "SELECT " + columnName + " FROM " + tableName;

		Connection cn = null;
		List<String> values = new ArrayList<String>();

		try
		{
			cn = this.dtbsSourceConnectionSupport.getDtbsSourceConnection(this.connectionSource, dtbsSource);

			try (PreparedStatement st = cn.prepareStatement(sql))
			{
				try (ResultSet rs = st.executeQuery())
				{
					// 行数在结果侧截断（跨库兼容）
					while (rs.next() && values.size() < SAMPLE_LIMIT)
					{
						Object v = rs.getObject(1);
						values.add(v == null ? "" : String.valueOf(v));
					}
				}
			}
		}
		catch (Exception e)
		{
			throw new IllegalInputException("样本拉取失败 : " + e.getMessage());
		}
		finally
		{
			JdbcUtil.closeConnection(cn);
		}

		return values;
	}

	/**
	 * 确定性判定（与前端 judgeSamples 同口径）：非空/唯一/范围/格式。
	 */
	protected int judge(String type, List<String> values, String threshold)
	{
		int failed = 0;
		Set<String> seen = new HashSet<String>();
		Pattern regex = ("格式".equals(type) && threshold != null && !threshold.isEmpty())
				? Pattern.compile(threshold) : null;

		for (String v : values)
		{
			boolean empty = v == null || v.isEmpty() || "null".equals(v) || "undefined".equals(v);

			if ("非空".equals(type))
			{
				if (empty)
					failed++;
			}
			else if ("唯一".equals(type))
			{
				if (!empty && !seen.add(v))
					failed++;
			}
			else if ("范围".equals(type))
			{
				if (empty)
				{
					failed++;
					continue;
				}

				java.util.regex.Matcher m = Pattern.compile("^(-?[\\d.]+)~(-?[\\d.]+)$")
						.matcher(threshold == null ? "" : threshold);

				try
				{
					double n = Double.parseDouble(v);

					if (m.matches() && (n < Double.parseDouble(m.group(1)) || n > Double.parseDouble(m.group(2))))
						failed++;
				}
				catch (NumberFormatException e)
				{
					failed++;
				}
			}
			else if ("格式".equals(type))
			{
				if (!empty && regex != null && !regex.matcher(v).find())
					failed++;
			}
		}

		return failed;
	}

	protected void checkIdentifier(String identifier, String label)
	{
		if (isBlank(identifier))
			return;

		if (!MetricQueryEngine.PATTERN_IDENTIFIER.matcher(identifier).matches())
			throw new IllegalInputException("非法" + label + " : " + identifier);
	}

	protected <T extends org.datagear.management.domain.Entity<String>> T findById(List<T> list, String id)
	{
		if (list != null)
		{
			for (T entity : list)
			{
				if (entity.getId() != null && entity.getId().equals(id))
					return entity;
			}
		}

		return null;
	}

	protected <T> ResponseEntity<OperationMessage<T>> success(HttpServletRequest request, T data)
	{
		OperationMessage<T> om = OperationMessage.valueOfSuccess("operationSuccess",
				getMessage(request, "operationSuccess"), data);

		return new ResponseEntity<OperationMessage<T>>(om, HttpStatus.OK);
	}

	public static class IdForm
	{
		private String id;

		public String getId()
		{
			return id;
		}

		public void setId(String id)
		{
			this.id = id;
		}
	}

	public static class ResolveForm
	{
		private String id;
		private String note;

		public String getId()
		{
			return id;
		}

		public void setId(String id)
		{
			this.id = id;
		}

		public String getNote()
		{
			return note;
		}

		public void setNote(String note)
		{
			this.note = note;
		}
	}
}
