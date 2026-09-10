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
 * 业务术语与同义词（FR-SEM-04，ChatBI 意图识别 grounding 基础）。
 *
 * @author datagear@163.com
 *
 */
public class GlossaryEntity extends AbstractStringIdEntity implements Entity<String>, CreateTimeEntity
{
	private static final long serialVersionUID = 1L;

	/** 术语 */
	private String term = "";

	/** 同义词（JSON 数组字符串） */
	private String synonyms = "[]";

	/** 业务说明 */
	private String bizDesc = "";

	/** 关联指标 ID（grounding：术语命中 → 指标） */
	private String refMetricId = "";

	/** 创建时间 */
	private Date createTime = null;

	public GlossaryEntity()
	{
		super();
	}

	public GlossaryEntity(String id)
	{
		super(id);
	}

	public String getTerm()
	{
		return term;
	}

	public void setTerm(String term)
	{
		this.term = term;
	}

	public String getSynonyms()
	{
		return synonyms;
	}

	public void setSynonyms(String synonyms)
	{
		this.synonyms = synonyms;
	}

	public String getBizDesc()
	{
		return bizDesc;
	}

	public void setBizDesc(String bizDesc)
	{
		this.bizDesc = bizDesc;
	}

	public String getRefMetricId()
	{
		return refMetricId;
	}

	public void setRefMetricId(String refMetricId)
	{
		this.refMetricId = refMetricId;
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
