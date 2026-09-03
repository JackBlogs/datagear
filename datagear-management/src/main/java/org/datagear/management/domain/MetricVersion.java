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

import java.io.Serializable;
import java.util.Date;

/**
 * 指标版本快照（FR-SEM-05）：保存/认证时写入定义快照，可追溯变更。
 *
 * @author datagear@163.com
 *
 */
public class MetricVersion implements Serializable
{
	private static final long serialVersionUID = 1L;

	private String id;
	private String metricId;
	private int versionNo;
	private String snapshot = "";
	private String changeNote = "";
	private Date createTime;
	private String createUserId = "";

	public MetricVersion()
	{
		super();
	}

	public MetricVersion(String id, String metricId, int versionNo)
	{
		super();
		this.id = id;
		this.metricId = metricId;
		this.versionNo = versionNo;
	}

	public String getId()
	{
		return id;
	}

	public void setId(String id)
	{
		this.id = id;
	}

	public String getMetricId()
	{
		return metricId;
	}

	public void setMetricId(String metricId)
	{
		this.metricId = metricId;
	}

	public int getVersionNo()
	{
		return versionNo;
	}

	public void setVersionNo(int versionNo)
	{
		this.versionNo = versionNo;
	}

	public String getSnapshot()
	{
		return snapshot;
	}

	public void setSnapshot(String snapshot)
	{
		this.snapshot = snapshot;
	}

	public String getChangeNote()
	{
		return changeNote;
	}

	public void setChangeNote(String changeNote)
	{
		this.changeNote = changeNote;
	}

	public Date getCreateTime()
	{
		return createTime;
	}

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
