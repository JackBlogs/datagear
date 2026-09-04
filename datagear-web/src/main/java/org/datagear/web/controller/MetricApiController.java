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

import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Map;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.datagear.connection.ConnectionSource;
import org.datagear.management.domain.DtbsSource;
import org.datagear.management.domain.MetricEntity;
import org.datagear.management.domain.MetricVersion;
import org.datagear.management.domain.User;
import org.datagear.management.service.DtbsSourceService;
import org.datagear.management.service.MetricService;
import org.datagear.management.service.PermissionDeniedException;
import org.datagear.web.metric.MetricQueryEngine;
import org.datagear.web.metric.MetricQueryEngine.MetricQuery;
import org.datagear.web.metric.MetricQueryEngine.MetricQueryException;
import org.datagear.web.metric.MetricQueryEngine.MetricQueryResult;
import org.datagear.web.util.OperationMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseBody;

import com.fasterxml.jackson.databind.ObjectMapper;

/**
 * 语义层指标 API 控制器（{@code /api/metric} 前缀）。
 * <p>
 * 端点：CRUD（继承）+ 认证 + 版本历史 + 指标查询（查询引擎确定性执行，全程继承数据源权限）。
 * </p>
 *
 * @author datagear@163.com
 *
 */
@Controller
@RequestMapping("/api/metric")
public class MetricApiController extends AbstractEntityApiController<MetricEntity>
{
	@Autowired
	private MetricService metricService;

	@Autowired
	private MetricQueryEngine metricQueryEngine;

	@Autowired
	private DtbsSourceService dtbsSourceService;

	@Autowired
	private ConnectionSource connectionSource;

	private ObjectMapper objectMapper = new ObjectMapper();

	private static final Logger LOGGER = LoggerFactory.getLogger(MetricApiController.class);

	public MetricApiController()
	{
		super();
	}

	@Override
	public MetricService getEntityService()
	{
		return this.metricService;
	}

	@Override
	protected String getModuleName()
	{
		return "metric";
	}

	/**
	 * 保存即版本快照（FR-SEM-05）：新增写「初始版本」，更新写「修改保存」，认证另写「指标认证」。
	 */
	@Override
	protected void persistEntity(HttpServletRequest request, MetricEntity entity, boolean add)
	{
		super.persistEntity(request, entity, add);

		try
		{
			String snapshot = this.objectMapper.writeValueAsString(entity);
			this.metricService.insertVersion(entity.getId(), snapshot,
					add ? "初始版本" : "修改保存", getCurrentUser().getId());
		}
		catch (Exception e)
		{
			// 快照失败不阻断保存主流程
			LOGGER.warn("Write metric version snapshot failed", e);
		}
	}

	@Override
	protected List<Map<String, Object>> buildMetaColumns(HttpServletRequest request)
	{
		List<Map<String, Object>> columns = new ArrayList<Map<String, Object>>();
		columns.add(column("id", "ID", true));
		columns.add(column("name", "指标名称", true));
		columns.add(column("bizDomain", "业务域", true));
		columns.add(column("aggType", "聚合方式", false));
		columns.add(column("tableName", "数据表", false));
		columns.add(column("owner", "负责人", false));
		columns.add(column("certified", "认证", false));
		columns.add(column("createTime", "创建时间", false));

		return columns;
	}

	@Override
	protected void prepareSaveEntity(HttpServletRequest request, MetricEntity entity, boolean add)
	{
		if (add)
		{
			if (entity.getCreateTime() == null)
				entity.setCreateTime(new Date());
			if (entity.getCreateUserId() == null || entity.getCreateUserId().isEmpty())
				entity.setCreateUserId(getCurrentUser().getId());
		}

		if (entity.getMetricType() == null || entity.getMetricType().isEmpty())
			entity.setMetricType(MetricEntity.TYPE_ATOMIC);
	}

	@Override
	protected void checkSaveEntity(HttpServletRequest request, MetricEntity entity)
	{
		if (isBlank(entity.getName()))
			throw new IllegalInputException();

		if (isBlank(entity.getSourceId()) || isBlank(entity.getTableName()) || isBlank(entity.getValueField()))
			throw new IllegalInputException("指标必须绑定数据源、数据表与数值字段");

		if (!MetricQueryEngine.AGG_TYPES.contains(entity.getAggType() == null ? "" : entity.getAggType()))
			throw new IllegalInputException("非法聚合方式 : " + entity.getAggType());

		try
		{
			this.metricQueryEngine.validateDefinition(entity);
		}
		catch (MetricQueryException e)
		{
			throw new IllegalInputException(e.getMessage());
		}
	}

	@RequestMapping(value = "/delete", produces = CONTENT_TYPE_JSON)
	@ResponseBody
	public ResponseEntity<OperationMessage> delete(HttpServletRequest request, @RequestBody String[] ids)
	{
		return deleteByIds(request, ids);
	}

	/**
	 * 认证/取消认证（FR-SEM-05）：管理员打「已认证」标记，写入版本快照。
	 */
	@RequestMapping(value = "/certify/{id}", produces = CONTENT_TYPE_JSON)
	@ResponseBody
	public ResponseEntity<OperationMessage> certify(HttpServletRequest request, @PathVariable("id") String id,
			@RequestBody CertifyForm form) throws Exception
	{
		MetricEntity metric = this.metricService.getById(id);
		if (metric == null)
			throw new RecordNotFoundException();

		boolean certified = form != null && form.isCertified();
		this.metricService.updateCertified(id, certified);

		String snapshot = this.objectMapper.writeValueAsString(metric);
		this.metricService.insertVersion(id, snapshot,
				certified ? "指标认证" : "取消认证" + (form.getNote() == null ? "" : "：" + form.getNote()),
				getCurrentUser().getId());

		return optSuccessResponseEntity(request);
	}

	/**
	 * 指标版本历史（FR-SEM-05）。
	 */
	@RequestMapping(value = "/versions/{id}", produces = CONTENT_TYPE_JSON)
	@ResponseBody
	public ResponseEntity<OperationMessage<List<MetricVersion>>> versions(HttpServletRequest request,
			@PathVariable("id") String id)
	{
		List<MetricVersion> versions = this.metricService.listVersions(id);

		OperationMessage<List<MetricVersion>> om = OperationMessage.valueOfSuccess("operationSuccess",
				getMessage(request, "operationSuccess"), versions);

		return new ResponseEntity<OperationMessage<List<MetricVersion>>>(om, HttpStatus.OK);
	}

	/**
	 * 指标查询（FR-SEM-06）：指标 + 分组维度 + 过滤 → 编译为参数化 SQL 确定性执行。
	 * <p>
	 * 数据源经当前用户权限校验，未授权不可查询。
	 * </p>
	 */
	@RequestMapping(value = "/query/{id}", produces = CONTENT_TYPE_JSON)
	@ResponseBody
	public ResponseEntity<OperationMessage<MetricQueryResult>> query(HttpServletRequest request,
			@PathVariable("id") String id, @RequestBody(required = false) MetricQueryForm form)
			throws MetricQueryException
	{
		MetricEntity metric = this.metricService.getById(id);
		if (metric == null)
			throw new RecordNotFoundException();

		DtbsSource dtbsSource = getReadableDtbsSourceNotNull(request, metric.getSourceId());

		MetricQuery query = toEngineQuery(form);
		MetricQueryResult result;

		try
		{
			result = this.metricQueryEngine.query(dtbsSource, metric, query);
		}
		catch (MetricQueryException e)
		{
			throw new IllegalInputException(e.getMessage());
		}

		OperationMessage<MetricQueryResult> om = OperationMessage.valueOfSuccess("operationSuccess",
				getMessage(request, "operationSuccess"), result);

		return new ResponseEntity<OperationMessage<MetricQueryResult>>(om, HttpStatus.OK);
	}

	/**
	 * 指标单值查询（无分组，供指标卡当前值）。
	 */
	@RequestMapping(value = "/queryValue/{id}", produces = CONTENT_TYPE_JSON)
	@ResponseBody
	public ResponseEntity<OperationMessage<Map<String, Object>>> queryValue(HttpServletRequest request,
			@PathVariable("id") String id, @RequestBody(required = false) MetricQueryForm form)
			throws MetricQueryException
	{
		MetricEntity metric = this.metricService.getById(id);
		if (metric == null)
			throw new RecordNotFoundException();

		DtbsSource dtbsSource = getReadableDtbsSourceNotNull(request, metric.getSourceId());

		MetricQuery query = toEngineQuery(form);
		query.setDimensions(new ArrayList<String>(0));
		query.setLimit(1);

		MetricQueryResult result;

		try
		{
			result = this.metricQueryEngine.query(dtbsSource, metric, query);
		}
		catch (MetricQueryException e)
		{
			throw new IllegalInputException(e.getMessage());
		}

		Map<String, Object> data = new java.util.LinkedHashMap<String, Object>();
		data.put("value", result.firstValue());
		data.put("sql", result.getSql());
		data.put("costMs", result.getCostMs());

		OperationMessage<Map<String, Object>> om = OperationMessage.valueOfSuccess("operationSuccess",
				getMessage(request, "operationSuccess"), data);

		return new ResponseEntity<OperationMessage<Map<String, Object>>>(om, HttpStatus.OK);
	}

	/**
	 * 指标试算（定义向导预览用）：指标定义不落库，直接编译执行。
	 */
	@RequestMapping(value = "/preview", produces = CONTENT_TYPE_JSON)
	@ResponseBody
	public ResponseEntity<OperationMessage<MetricQueryResult>> preview(HttpServletRequest request,
			@RequestBody MetricPreviewForm form) throws MetricQueryException
	{
		MetricEntity metric = (form == null ? null : form.getMetric());

		if (metric == null || isBlank(metric.getSourceId()) || isBlank(metric.getTableName())
				|| isBlank(metric.getValueField()))
			throw new IllegalInputException("试算必须提供完整指标定义");

		try
		{
			this.metricQueryEngine.validateDefinition(metric);
		}
		catch (MetricQueryException e)
		{
			throw new IllegalInputException(e.getMessage());
		}

		DtbsSource dtbsSource = getReadableDtbsSourceNotNull(request, metric.getSourceId());

		MetricQuery query = toEngineQuery(form.getQuery());
		MetricQueryResult result;

		try
		{
			result = this.metricQueryEngine.query(dtbsSource, metric, query);
		}
		catch (MetricQueryException e)
		{
			throw new IllegalInputException(e.getMessage());
		}

		OperationMessage<MetricQueryResult> om = OperationMessage.valueOfSuccess("operationSuccess",
				getMessage(request, "operationSuccess"), result);

		return new ResponseEntity<OperationMessage<MetricQueryResult>>(om, HttpStatus.OK);
	}

	protected DtbsSource getReadableDtbsSourceNotNull(HttpServletRequest request, String dtbsSourceId)
	{
		User user = getCurrentUser();
		DtbsSource dtbsSource = this.dtbsSourceService.getById(user, dtbsSourceId);

		if (dtbsSource == null)
			throw new PermissionDeniedException();

		return dtbsSource;
	}

	protected MetricQuery toEngineQuery(MetricQueryForm form)
	{
		MetricQuery query = new MetricQuery();

		if (form == null)
			return query;

		if (form.getDimensions() != null)
			query.setDimensions(form.getDimensions());

		if (form.getFilters() != null)
		{
			List<MetricQuery.Filter> filters = new ArrayList<MetricQuery.Filter>();
			for (MetricQueryForm.FilterForm ff : form.getFilters())
			{
				if (ff == null || ff.getField() == null || ff.getField().isEmpty())
					continue;
				filters.add(new MetricQuery.Filter(ff.getField(), ff.getOp(), ff.getValue()));
			}
			query.setFilters(filters);
		}

		if (form.getOrderBy() != null && !form.getOrderBy().isEmpty())
			query.setOrderBy(form.getOrderBy());

		query.setOrderAsc(form.isOrderAsc());
		query.setLimit(form.getLimit() > 0 ? form.getLimit() : 100);

		return query;
	}

	public MetricService getMetricService()
	{
		return metricService;
	}

	public void setMetricService(MetricService metricService)
	{
		this.metricService = metricService;
	}

	public MetricQueryEngine getMetricQueryEngine()
	{
		return metricQueryEngine;
	}

	public void setMetricQueryEngine(MetricQueryEngine metricQueryEngine)
	{
		this.metricQueryEngine = metricQueryEngine;
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

	public static class MetricPreviewForm
	{
		private MetricEntity metric;
		private MetricQueryForm query;

		public MetricEntity getMetric()
		{
			return metric;
		}

		public void setMetric(MetricEntity metric)
		{
			this.metric = metric;
		}

		public MetricQueryForm getQuery()
		{
			return query;
		}

		public void setQuery(MetricQueryForm query)
		{
			this.query = query;
		}
	}

	public static class CertifyForm
	{
		private boolean certified = true;
		private String note = "";

		public boolean isCertified()
		{
			return certified;
		}

		public void setCertified(boolean certified)
		{
			this.certified = certified;
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

	public static class MetricQueryForm
	{
		private List<String> dimensions;
		private List<FilterForm> filters;
		private String orderBy = "value";
		private boolean orderAsc = false;
		private int limit = 100;

		public List<String> getDimensions()
		{
			return dimensions;
		}

		public void setDimensions(List<String> dimensions)
		{
			this.dimensions = dimensions;
		}

		public List<FilterForm> getFilters()
		{
			return filters;
		}

		public void setFilters(List<FilterForm> filters)
		{
			this.filters = filters;
		}

		public String getOrderBy()
		{
			return orderBy;
		}

		public void setOrderBy(String orderBy)
		{
			this.orderBy = orderBy;
		}

		public boolean isOrderAsc()
		{
			return orderAsc;
		}

		public void setOrderAsc(boolean orderAsc)
		{
			this.orderAsc = orderAsc;
		}

		public int getLimit()
		{
			return limit;
		}

		public void setLimit(int limit)
		{
			this.limit = limit;
		}

		public static class FilterForm
		{
			private String field;
			private String op = "=";
			private Object value;

			public String getField()
			{
				return field;
			}

			public void setField(String field)
			{
				this.field = field;
			}

			public String getOp()
			{
				return op;
			}

			public void setOp(String op)
			{
				this.op = op;
			}

			public Object getValue()
			{
				return value;
			}

			public void setValue(Object value)
			{
				this.value = value;
			}
		}
	}
}
