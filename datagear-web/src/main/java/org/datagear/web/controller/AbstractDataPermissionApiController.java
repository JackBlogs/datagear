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

package org.datagear.web.controller;

import javax.servlet.http.HttpServletRequest;

import org.datagear.management.domain.DataPermissionEntity;
import org.datagear.management.domain.Entity;
import org.datagear.management.domain.User;
import org.datagear.management.service.DataPermissionEntityService;
import org.datagear.management.service.EntityService;
import org.datagear.management.util.PagingQuery;
import org.datagear.util.query.PagingData;

/**
 * 数据权限实体模块 API 控制器基类。
 * <p>
 * 在 {@linkplain AbstractEntityApiController} 基础上，分页查询使用
 * {@linkplain DataPermissionEntityService#pagingQuery(User, PagingQuery)}，以当前用户做数据权限过滤。
 * </p>
 * 
 * @author datagear@163.com
 *
 * @param <T>
 */
public abstract class AbstractDataPermissionApiController<T extends DataPermissionEntity & Entity<String>>
		extends AbstractEntityApiController<T>
{
	public AbstractDataPermissionApiController()
	{
		super();
	}

	/**
	 * 获取数据权限实体服务。
	 * 
	 * @return
	 */
	protected abstract DataPermissionEntityService<String, T> getDataPermissionEntityService();

	@Override
	protected EntityService<String, T> getEntityService()
	{
		return getDataPermissionEntityService();
	}

	@Override
	protected PagingData<T> doPagingQuery(HttpServletRequest request, PagingQuery pagingQuery) throws Exception
	{
		User user = getCurrentUser();
		return getDataPermissionEntityService().pagingQuery(user, pagingQuery);
	}
}
