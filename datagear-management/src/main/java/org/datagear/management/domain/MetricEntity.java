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

package org.datagear.management.domain;

import java.util.Date;

/**
 * 语义层指标实体（MVP：原子指标 = 数据源物理表数值字段 + 聚合；维度内嵌为 JSON 数组）。
 * <p>
 * 对应 PRD FR-SEM-01/02/03、SDS 3.4 DATAGEAR_METRIC。
 * </p>
 *
 * @author datagear@163.com
 *
 */
public class MetricEntity extends AbstractStringIdEntity implements Entity<String>, CreateTimeEntity
{
	private static final long serialVersionUID = 1L;

	/** 指标类型：原子 */
	public static final String TYPE_ATOMIC = "atomic";
	/** 指标类型：派生（表结构预留，v1 不支持定义） */
	public static final String TYPE_DERIVED = "derived";

	public static final String AGG_SUM = "SUM";
	public static final String AGG_AVG = "AVG";
	public static final String AGG_COUNT = "COUNT";
	public static final String AGG_COUNT_DISTINCT = "COUNT_DISTINCT";
	public static final String AGG_MAX = "MAX";
	public static final String AGG_MIN = "MIN";

	/** 名称 */
	private String name = "";

	/** 口径说明 */
	private String caliber = "";

	/** 指标类型（atomic/derived） */
	private String metricType = TYPE_ATOMIC;

	/** 数据源 ID（DtbsSource） */
	private String sourceId = "";

	/** 物理表名 */
	private String tableName = "";

	/** 数值字段 */
	private String valueField = "";

	/** 聚合方式（SUM/AVG/COUNT/COUNT_DISTINCT/MAX/MIN） */
	private String aggType = AGG_SUM;

	/** 维度字段 JSON 数组，如 ["region","month"] */
	private String dimensionsJson = "[]";

	/** 时间字段（可选，趋势/时间窗用） */
	private String timeField = "";

	/** 业务域 */
	private String bizDomain = "";

	/** 负责人 */
	private String owner = "";

	/** 是否已认证（0/1） */
	private int certified = 0;

	/** 创建时间 */
	private Date createTime = null;

	/** 创建用户 ID */
	private String createUserId = "";

	public MetricEntity()
	{
		super();
	}

	public MetricEntity(String id)
	{
		super(id);
	}

	public String getName()
	{
		return name;
	}

	public void setName(String name)
	{
		this.name = name;
	}

	public String getCaliber()
	{
		return caliber;
	}

	public void setCaliber(String caliber)
	{
		this.caliber = caliber;
	}

	public String getMetricType()
	{
		return metricType;
	}

	public void setMetricType(String metricType)
	{
		this.metricType = metricType;
	}

	public String getSourceId()
	{
		return sourceId;
	}

	public void setSourceId(String sourceId)
	{
		this.sourceId = sourceId;
	}

	public String getTableName()
	{
		return tableName;
	}

	public void setTableName(String tableName)
	{
		this.tableName = tableName;
	}

	public String getValueField()
	{
		return valueField;
	}

	public void setValueField(String valueField)
	{
		this.valueField = valueField;
	}

	public String getAggType()
	{
		return aggType;
	}

	public void setAggType(String aggType)
	{
		this.aggType = aggType;
	}

	public String getDimensionsJson()
	{
		return dimensionsJson;
	}

	public void setDimensionsJson(String dimensionsJson)
	{
		this.dimensionsJson = dimensionsJson;
	}

	public String getTimeField()
	{
		return timeField;
	}

	public void setTimeField(String timeField)
	{
		this.timeField = timeField;
	}

	public String getBizDomain()
	{
		return bizDomain;
	}

	public void setBizDomain(String bizDomain)
	{
		this.bizDomain = bizDomain;
	}

	public String getOwner()
	{
		return owner;
	}

	public void setOwner(String owner)
	{
		this.owner = owner;
	}

	public int getCertified()
	{
		return certified;
	}

	public void setCertified(int certified)
	{
		this.certified = certified;
	}

	@Override
	public Date getCreateTime()
	{
		return createTime;
	}

	@Override
	public void setCreateTime(Date createTime)
	{
		this.createTime = createTime;
	}

	public String getCreateUserId()
	{
		return createUserId;
	}

	public void setCreateUserId(String createUserId)
	{
		this.createUserId = createUserId;
	}
}
