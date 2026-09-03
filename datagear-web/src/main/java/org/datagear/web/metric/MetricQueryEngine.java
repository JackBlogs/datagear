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

package org.datagear.web.metric;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.ResultSetMetaData;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

import org.datagear.connection.ConnectionSource;
import org.datagear.management.domain.DtbsSource;
import org.datagear.management.domain.MetricEntity;
import org.datagear.management.util.DtbsSourceConnectionSupport;
import org.datagear.util.JdbcUtil;

/**
 * 指标查询引擎 v1（FR-SEM-02/06，SDS「指标 SQL 编译」简化实现）。
 * <p>
 * 将「指标 + 分组维度 + 过滤条件」编译为单表聚合 SQL 并经 JDBC 确定性执行：
 * </p>
 * <ul>
 * <li>标识符白名单：表名/字段名必须匹配 {@code ^[A-Za-z_][A-Za-z0-9_]*$}，防注入；</li>
 * <li>操作符白名单：仅支持 {@code = != <> > < >= <= LIKE}；</li>
 * <li>值一律 PreparedStatement {@code ?} 参数化；</li>
 * <li>不在 SQL 中拼接 LIMIT（跨库兼容），行数在结果侧截断。</li>
 * </ul>
 * <p>
 * 后续演进：接入 Freemarker 参数化与 {@code ${pc()}} 预编译、行列权限改写管道（SDS 权限管道）。
 * </p>
 *
 * @author datagear@163.com
 *
 */
public class MetricQueryEngine
{
	/** 标识符白名单 */
	public static final Pattern PATTERN_IDENTIFIER = Pattern.compile("^[A-Za-z_][A-Za-z0-9_]*$");

	public static final List<String> AGG_TYPES = Collections
			.unmodifiableList(Arrays.asList("SUM", "AVG", "COUNT", "MAX", "MIN", "COUNT_DISTINCT"));

	public static final List<String> FILTER_OPS = Collections
			.unmodifiableList(Arrays.asList("=", "!=", "<>", ">", "<", ">=", "<=", "LIKE"));

	/** 结果行数硬上限 */
	public static final int MAX_ROWS = 1000;

	private ConnectionSource connectionSource;

	private DtbsSourceConnectionSupport dtbsSourceConnectionSupport = new DtbsSourceConnectionSupport();

	public MetricQueryEngine()
	{
		super();
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

	/**
	 * 执行指标查询（聚合 + 可选分组维度 + 可选过滤）。
	 *
	 * @param dtbsSource
	 *            已做权限校验的数据源
	 * @param metric
	 * @param query
	 * @return
	 * @throws MetricQueryException
	 */
	public MetricQueryResult query(DtbsSource dtbsSource, MetricEntity metric, MetricQuery query)
			throws MetricQueryException
	{
		long start = System.currentTimeMillis();

		if (query == null)
			query = new MetricQuery();

		String aggExpr = buildAggExpression(metric.getAggType(), metric.getValueField());
		List<String> dims = filterDimensions(metric, query.getDimensions());

		StringBuilder sql = new StringBuilder();
		List<Object> params = new ArrayList<Object>();

		sql.append("SELECT ");

		if (dims.isEmpty())
		{
			sql.append(aggExpr).append(" AS METRIC_VALUE ");
		}
		else
		{
			for (int i = 0; i < dims.size(); i++)
			{
				if (i > 0)
					sql.append(", ");
				sql.append(dims.get(i));
			}
			sql.append(", ").append(aggExpr).append(" AS METRIC_VALUE ");
		}

		sql.append("FROM ").append(checkIdentifier(metric.getTableName())).append(" ");

		buildWhere(query, sql, params);

		if (!dims.isEmpty())
		{
			sql.append("GROUP BY ");
			for (int i = 0; i < dims.size(); i++)
			{
				if (i > 0)
					sql.append(", ");
				sql.append(dims.get(i));
			}
			sql.append(" ");
		}

		String orderBy = resolveOrderBy(query, aggExpr);
		if (orderBy != null && !orderBy.isEmpty())
			sql.append("ORDER BY ").append(orderBy).append(query.isOrderAsc() ? " ASC " : " DESC ");

		String sqlString = sql.toString();

		Connection cn = null;

		try
		{
			cn = this.dtbsSourceConnectionSupport.getDtbsSourceConnection(this.connectionSource, dtbsSource);

			try (PreparedStatement st = cn.prepareStatement(sqlString))
			{
				for (int i = 0; i < params.size(); i++)
					st.setObject(i + 1, params.get(i));

				try (ResultSet rs = st.executeQuery())
				{
					MetricQueryResult result = toResult(rs, query.getLimit());
					result.setSql(sqlString);
					result.setCostMs(System.currentTimeMillis() - start);
					return result;
				}
			}
		}
		catch (MetricQueryException e)
		{
			throw e;
		}
		catch (Exception e)
		{
			throw new MetricQueryException("Metric query execution failed : " + e.getMessage(), e);
		}
		finally
		{
			JdbcUtil.closeConnection(cn);
		}
	}

	protected String buildAggExpression(String aggType, String valueField)
	{
		String agg = (aggType == null || aggType.isEmpty() ? MetricEntity.AGG_SUM : aggType.toUpperCase());

		if (!AGG_TYPES.contains(agg))
			throw new MetricQueryException("Illegal aggregation type : " + aggType);

		if (MetricEntity.AGG_COUNT_DISTINCT.equals(agg))
			return "COUNT(DISTINCT " + checkIdentifier(valueField) + ")";

		if (MetricEntity.AGG_COUNT.equals(agg))
		{
			// COUNT 允许值字段为 * 表示计行数
			if ("*".equals(valueField) || valueField == null || valueField.isEmpty())
				return "COUNT(*)";
		}

		return agg + "(" + checkIdentifier(valueField) + ")";
	}

	protected void buildWhere(MetricQuery query, StringBuilder sql, List<Object> params)
	{
		if (query.getFilters() == null || query.getFilters().isEmpty())
			return;

		StringBuilder where = new StringBuilder();

		for (MetricQuery.Filter filter : query.getFilters())
		{
			String field = checkIdentifier(filter.getField());
			String op = filter.getOp() == null ? "=" : filter.getOp().trim();

			if (!FILTER_OPS.contains(op))
				throw new MetricQueryException("Illegal filter operator : " + filter.getOp());

			if (where.length() > 0)
				where.append(" AND ");

			where.append(field).append(" ").append(op).append(" ? ");
			params.add(filter.getValue());
		}

		if (where.length() > 0)
			sql.append("WHERE ").append(where);
	}

	protected String resolveOrderBy(MetricQuery query, String aggExpr)
	{
		String orderBy = query.getOrderBy();

		if (orderBy == null || orderBy.isEmpty() || "value".equalsIgnoreCase(orderBy))
			return aggExpr;

		return checkIdentifier(orderBy);
	}

	/**
	 * 过滤请求的分组维度：仅允许指标已定义的维度，且去重。
	 */
	protected List<String> filterDimensions(MetricEntity metric, List<String> requested)
	{
		List<String> defined = parseDimensions(metric);

		if (requested == null || requested.isEmpty())
			return Collections.emptyList();

		List<String> result = new ArrayList<String>();

		for (String dim : requested)
		{
			if (dim == null || dim.isEmpty())
				continue;

			if (!defined.contains(dim))
				throw new MetricQueryException("Dimension is not defined in metric : " + dim);

			checkIdentifier(dim);

			if (!result.contains(dim))
				result.add(dim);
		}

		return result;
	}

	/**
	 * 解析指标定义的维度 JSON 字符串数组（轻量解析，避免映射层引入 Jackson 依赖）。
	 */
	public List<String> parseDimensions(MetricEntity metric)
	{
		String json = metric.getDimensionsJson();

		if (json == null || json.isEmpty())
			return Collections.emptyList();

		String body = json.trim();
		if ("[]".equals(body))
			return Collections.emptyList();

		if (body.startsWith("[") && body.endsWith("]"))
			body = body.substring(1, body.length() - 1);

		List<String> dims = new ArrayList<String>();

		for (String part : body.split(","))
		{
			String dim = part.trim();
			if (dim.isEmpty())
				continue;

			if (dim.length() >= 2 && dim.startsWith("\"") && dim.endsWith("\""))
				dim = dim.substring(1, dim.length() - 1);

			dims.add(dim);
		}

		return dims;
	}

	protected String checkIdentifier(String identifier)
	{
		if (identifier == null || !PATTERN_IDENTIFIER.matcher(identifier).matches())
			throw new MetricQueryException("Illegal SQL identifier : " + identifier);

		return identifier;
	}

	/**
	 * 校验指标定义中的 SQL 标识符（表名/值字段/维度），非法时抛 {@link MetricQueryException}。
	 * <p>
	 * 供保存前校验复用。
	 * </p>
	 */
	public void validateDefinition(MetricEntity metric)
	{
		checkIdentifier(metric.getTableName());
		checkIdentifier(metric.getValueField());

		for (String dim : parseDimensions(metric))
			checkIdentifier(dim);
	}

	protected MetricQueryResult toResult(ResultSet rs, int limit) throws Exception
	{
		ResultSetMetaData meta = rs.getMetaData();
		int columnCount = meta.getColumnCount();

		List<String> columns = new ArrayList<String>(columnCount);
		for (int i = 1; i <= columnCount; i++)
			columns.add(meta.getColumnLabel(i));

		int max = limit > 0 ? Math.min(limit, MAX_ROWS) : MAX_ROWS;

		List<List<Object>> rows = new ArrayList<List<Object>>();

		while (rs.next() && rows.size() < max)
		{
			List<Object> row = new ArrayList<Object>(columnCount);
			for (int i = 1; i <= columnCount; i++)
				row.add(rs.getObject(i));
			rows.add(row);
		}

		return new MetricQueryResult(columns, rows);
	}

	/**
	 * 查询结果。
	 */
	public static class MetricQueryResult
	{
		private List<String> columns;
		private List<List<Object>> rows;
		private String sql = "";
		private long costMs = 0;

		public MetricQueryResult()
		{
			super();
		}

		public MetricQueryResult(List<String> columns, List<List<Object>> rows)
		{
			super();
			this.columns = columns;
			this.rows = rows;
		}

		public List<String> getColumns()
		{
			return columns;
		}

		public void setColumns(List<String> columns)
		{
			this.columns = columns;
		}

		public List<List<Object>> getRows()
		{
			return rows;
		}

		public void setRows(List<List<Object>> rows)
		{
			this.rows = rows;
		}

		public String getSql()
		{
			return sql;
		}

		public void setSql(String sql)
		{
			this.sql = sql;
		}

		public long getCostMs()
		{
			return costMs;
		}

		public void setCostMs(long costMs)
		{
			this.costMs = costMs;
		}

		/**
		 * 取第一行第一列（单值查询结果）。
		 */
		public Object firstValue()
		{
			if (rows == null || rows.isEmpty() || rows.get(0).isEmpty())
				return null;
			return rows.get(0).get(0);
		}
	}

	/**
	 * 指标查询请求。
	 */
	public static class MetricQuery
	{
		private List<String> dimensions = Collections.emptyList();
		private List<Filter> filters = Collections.emptyList();
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

		public List<Filter> getFilters()
		{
			return filters;
		}

		public void setFilters(List<Filter> filters)
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

		/**
		 * 过滤条件。
		 */
		public static class Filter implements java.io.Serializable
		{
			private static final long serialVersionUID = 1L;

			private String field;
			private String op = "=";
			private Object value;

			public Filter()
			{
				super();
			}

			public Filter(String field, String op, Object value)
			{
				super();
				this.field = field;
				this.op = op;
				this.value = value;
			}

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

	/**
	 * 查询异常。
	 */
	public static class MetricQueryException extends RuntimeException
	{
		private static final long serialVersionUID = 1L;

		public MetricQueryException(String message)
		{
			super(message);
		}

		public MetricQueryException(String message, Throwable cause)
		{
			super(message, cause);
		}
	}

	/**
	 * 便捷：列 + 行转 Map 行（供控制器组装 JSON）。
	 */
	public static List<Map<String, Object>> toMapRows(MetricQueryResult result)
	{
		List<Map<String, Object>> mapRows = new ArrayList<Map<String, Object>>();

		if (result.getRows() == null)
			return mapRows;

		for (List<Object> row : result.getRows())
		{
			Map<String, Object> map = new LinkedHashMap<String, Object>();
			for (int i = 0; i < result.getColumns().size() && i < row.size(); i++)
				map.put(result.getColumns().get(i), row.get(i));
			mapRows.add(map);
		}

		return mapRows;
	}
}
