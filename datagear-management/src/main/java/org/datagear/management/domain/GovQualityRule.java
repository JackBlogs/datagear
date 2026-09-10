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
 * 数据质量规则（FR-GOV-04：非空/唯一/范围/格式，绑定真实数据源表字段）。
 *
 * @author datagear@163.com
 *
 */
public class GovQualityRule extends AbstractStringIdEntity implements Entity<String>, CreateTimeEntity
{
	private static final long serialVersionUID = 1L;

	private String name = "";
	/** 非空 / 唯一 / 范围 / 格式 */
	private String type = "非空";
	private String sourceId = "";
	private String sourceName = "";
	private String tableName = "";
	private String columnName = "";
	/** 范围阈值 "0~100"；格式正则 */
	private String threshold = "";
	private String freq = "每日";
	private int enabled = 1;
	/** 最近执行：时间/通过率/样本/失败 */
	private Date lastRunTime = null;
	private double passRate = 0;
	private int total = 0;
	private int failed = 0;
	private int sample = 0;
	private Date createTime = null;

	public GovQualityRule()
	{
		super();
	}

	public GovQualityRule(String id)
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

	public String getType()
	{
		return type;
	}

	public void setType(String type)
	{
		this.type = type;
	}

	public String getSourceId()
	{
		return sourceId;
	}

	public void setSourceId(String sourceId)
	{
		this.sourceId = sourceId;
	}

	public String getSourceName()
	{
		return sourceName;
	}

	public void setSourceName(String sourceName)
	{
		this.sourceName = sourceName;
	}

	public String getTableName()
	{
		return tableName;
	}

	public void setTableName(String tableName)
	{
		this.tableName = tableName;
	}

	public String getColumnName()
	{
		return columnName;
	}

	public void setColumnName(String columnName)
	{
		this.columnName = columnName;
	}

	public String getThreshold()
	{
		return threshold;
	}

	public void setThreshold(String threshold)
	{
		this.threshold = threshold;
	}

	public String getFreq()
	{
		return freq;
	}

	public void setFreq(String freq)
	{
		this.freq = freq;
	}

	public int getEnabled()
	{
		return enabled;
	}

	public void setEnabled(int enabled)
	{
		this.enabled = enabled;
	}

	public Date getLastRunTime()
	{
		return lastRunTime;
	}

	public void setLastRunTime(Date lastRunTime)
	{
		this.lastRunTime = lastRunTime;
	}

	public double getPassRate()
	{
		return passRate;
	}

	public void setPassRate(double passRate)
	{
		this.passRate = passRate;
	}

	public int getTotal()
	{
		return total;
	}

	public void setTotal(int total)
	{
		this.total = total;
	}

	public int getFailed()
	{
		return failed;
	}

	public void setFailed(int failed)
	{
		this.failed = failed;
	}

	public int getSample()
	{
		return sample;
	}

	public void setSample(int sample)
	{
		this.sample = sample;
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
}
