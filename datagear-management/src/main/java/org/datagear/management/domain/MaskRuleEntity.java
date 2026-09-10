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
 * 动态脱敏规则（FR-AUTH-11，SDS「权限管道：结果脱敏」）。
 * <p>
 * {@code tableName/fieldName} 指明作用的物理表与字段（可选）；查询结果按列名匹配后
 * 在结果侧应用脱敏算法（掩码/哈希/置空/截断）。
 * </p>
 *
 * @author datagear@163.com
 *
 */
public class MaskRuleEntity extends AbstractStringIdEntity implements Entity<String>, CreateTimeEntity
{
	private static final long serialVersionUID = 1L;

	/** 算法：掩码 */
	public static final String ALGO_MASK = "掩码";
	/** 算法：哈希 */
	public static final String ALGO_HASH = "哈希";
	/** 算法：置空 */
	public static final String ALGO_NULL = "置空";
	/** 算法：截断 */
	public static final String ALGO_TRUNCATE = "截断";

	/** 字段显示名，如「联系电话」 */
	private String field = "";

	/** 作用物理表名（可选，结果脱敏匹配用） */
	private String tableName = "";

	/** 作用物理字段（可选，结果集列名匹配用；空则按 field 匹配） */
	private String fieldName = "";

	/** 脱敏算法（掩码/哈希/置空/截断） */
	private String algo = ALGO_MASK;

	/** 示例（原始值 → 展示值） */
	private String sample = "";

	/** 生效角色说明 */
	private String roles = "";

	/** 是否启用（0/1） */
	private int enabled = 1;

	/** 创建时间 */
	private Date createTime = null;

	/** 创建用户 ID */
	private String createUserId = "";

	public MaskRuleEntity()
	{
		super();
	}

	public MaskRuleEntity(String id)
	{
		super(id);
	}

	public String getField()
	{
		return field;
	}

	public void setField(String field)
	{
		this.field = field;
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

	public String getAlgo()
	{
		return algo;
	}

	public void setAlgo(String algo)
	{
		this.algo = algo;
	}

	public String getSample()
	{
		return sample;
	}

	public void setSample(String sample)
	{
		this.sample = sample;
	}

	public String getRoles()
	{
		return roles;
	}

	public void setRoles(String roles)
	{
		this.roles = roles;
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
