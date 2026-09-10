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

package org.datagear.management.service.impl;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.datagear.management.domain.RowPermEntity;
import org.datagear.management.service.RowPermService;
import org.datagear.management.util.dialect.MbSqlDialect;
import org.apache.ibatis.session.SqlSessionFactory;
import org.mybatis.spring.SqlSessionTemplate;

/**
 * {@linkplain RowPermService}实现类。
 *
 * @author datagear@163.com
 *
 */
public class RowPermServiceImpl extends AbstractMybatisEntityService<String, RowPermEntity>
		implements RowPermService
{
	protected static final String SQL_NAMESPACE = RowPermEntity.class.getName();

	public RowPermServiceImpl()
	{
		super();
	}

	public RowPermServiceImpl(SqlSessionFactory sqlSessionFactory, MbSqlDialect dialect)
	{
		super(sqlSessionFactory, dialect);
	}

	public RowPermServiceImpl(SqlSessionTemplate sqlSessionTemplate, MbSqlDialect dialect)
	{
		super(sqlSessionTemplate, dialect);
	}

	@Override
	protected String getSqlNamespace()
	{
		return SQL_NAMESPACE;
	}

	@Override
	public List<RowPermEntity> listAll()
	{
		return selectListMybatis("listAll", new HashMap<String, Object>());
	}

	@Override
	public List<RowPermEntity> listEnabledByTable(String tableName)
	{
		Map<String, Object> params = new HashMap<String, Object>();
		params.put("tableName", tableName == null ? "" : tableName);
		return selectListMybatis("listEnabledByTable", params);
	}

	@Override
	public boolean toggleEnabled(String id)
	{
		// 走标准实体更新路径，确保实体缓存同步失效
		RowPermEntity entity = getById(id);

		if (entity == null)
			return false;

		boolean enabled = entity.getEnabled() <= 0;
		entity.setEnabled(enabled ? 1 : 0);
		update(entity);

		return enabled;
	}
}
