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
 * ChatBI 问数会话（FR-AI-01）。
 *
 * @author datagear@163.com
 *
 */
public class AiSession extends AbstractStringIdEntity implements Entity<String>, CreateTimeEntity
{
	private static final long serialVersionUID = 1L;

	/** 会话标题（取首个问题的截断） */
	private String title = "";

	/** 创建用户 ID */
	private String createUserId = "";

	/** 创建时间 */
	private Date createTime = null;

	/** 最近更新时间（按其倒序展示） */
	private Date updateTime = null;

	/** 回合数（非持久化，查询时计算） */
	private int turns = 0;

	public AiSession()
	{
		super();
	}

	public AiSession(String id)
	{
		super(id);
	}

	public String getTitle()
	{
		return title;
	}

	public void setTitle(String title)
	{
		this.title = title;
	}

	public String getCreateUserId()
	{
		return createUserId;
	}

	public void setCreateUserId(String createUserId)
	{
		this.createUserId = createUserId;
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

	public Date getUpdateTime()
	{
		return updateTime;
	}

	public void setUpdateTime(Date updateTime)
	{
		this.updateTime = updateTime;
	}

	public int getTurns()
	{
		return turns;
	}

	public void setTurns(int turns)
	{
		this.turns = turns;
	}
}
