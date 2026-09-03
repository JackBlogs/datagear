/*
 * Copyright 2018-present datagear.tech
 *
 * This file is part of DataGear.
 *
 * DataGear is free software: you can redistribute it and/or modify it under the terms of
 * the GNU Lesser General Public License as published by the Free Software Foundation,
 * either version 3 of the License, or (at your option) any later version.
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

import org.springframework.beans.BeanUtils;

/**
 * 数据大屏实体。
 * <p>
 * {@linkplain #getDesignJson()} 为可视化设计器产物（部件布局 JSON），前端大屏设计器/展示页共用。
 * </p>
 * 
 * @author datagear@163.com
 *
 */
public class BigScreenEntity extends AbstractStringIdEntity implements Entity<String>, CreateTimeEntity,
		DescriptionEntity, CloneableEntity
{
	private static final long serialVersionUID = 1L;

	/** 默认主题 */
	public static final String DEFAULT_THEME = "dark-energy";

	/** 名称 */
	private String name;

	/** 描述 */
	private String description = "";

	/** 主题（能源暗域） */
	private String theme = DEFAULT_THEME;

	/** 可视化设计产物 JSON */
	private String designJson = "";

	/** 创建时间 */
	private Date createTime = null;

	public BigScreenEntity()
	{
		super();
	}

	public BigScreenEntity(String id)
	{
		super(id);
	}

	public BigScreenEntity(String id, String name, String designJson)
	{
		super(id);
		this.name = name;
		this.designJson = designJson;
	}

	public String getName()
	{
		return name;
	}

	public void setName(String name)
	{
		this.name = name;
	}

	@Override
	public String getDescription()
	{
		return description;
	}

	@Override
	public void setDescription(String description)
	{
		this.description = description;
	}

	public String getTheme()
	{
		return theme;
	}

	public void setTheme(String theme)
	{
		this.theme = theme;
	}

	public String getDesignJson()
	{
		return designJson;
	}

	public void setDesignJson(String designJson)
	{
		this.designJson = designJson;
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

	@Override
	public BigScreenEntity clone()
	{
		BigScreenEntity entity = new BigScreenEntity();
		BeanUtils.copyProperties(this, entity);

		return entity;
	}
}
