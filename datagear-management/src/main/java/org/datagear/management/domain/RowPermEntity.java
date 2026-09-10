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
 * 行级数据权限规则（FR-AUTH-10，SDS「权限管道：行过滤」）。
 * <p>
 * 条件模板形如 {@code org_code = ${currentOrg}}，变量在查询执行时解析为参数化过滤条件；
 * {@code tableName/fieldName} 指明规则作用的物理表与字段（可选，用于指标查询改写）。
 * </p>
 *
 * @author datagear@163.com
 *
 */
public class RowPermEntity extends AbstractStringIdEntity implements Entity<String>, CreateTimeEntity
{
	private static final long serialVersionUID = 1L;

	/** 规则名 */
	private String name = "";

	/** 生效资源（看板/数据集等显示名） */
	private String resource = "";

	/** 过滤条件模板，如 org_code = ${currentOrg} */
	private String cond = "";

	/** 生效角色 JSON 数组字符串，如 ["业务人员"] */
	private String rolesJson = "[]";

	/** 作用物理表名（可选，指标查询改写用） */
	private String tableName = "";

	/** 作用物理字段（可选，与条件模板左侧一致时用于校验） */
	private String fieldName = "";

	/** 是否启用（0/1） */
	private int enabled = 1;

	/** 创建时间 */
	private Date createTime = null;

	/** 创建用户 ID */
	private String createUserId = "";

	public RowPermEntity()
	{
		super();
	}

	public RowPermEntity(String id)
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

	public String getResource()
	{
		return resource;
	}

	public void setResource(String resource)
	{
		this.resource = resource;
	}

	public String getCond()
	{
		return cond;
	}

	public void setCond(String cond)
	{
		this.cond = cond;
	}

	public String getRolesJson()
	{
		return rolesJson;
	}

	public void setRolesJson(String rolesJson)
	{
		this.rolesJson = rolesJson;
	}

	public String getTableName()
	{
		return tableName;
	}

	public void setTableName(String tableName)
	{
		this.tableName = tableName;
	}

	public String getFieldName()
	{
		return fieldName;
	}

	public void setFieldName(String fieldName)
	{
		this.fieldName = fieldName;
	}

	public int getEnabled()
	{
		return enabled;
	}

	public void setEnabled(int enabled)
	{
		this.enabled = enabled;
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
