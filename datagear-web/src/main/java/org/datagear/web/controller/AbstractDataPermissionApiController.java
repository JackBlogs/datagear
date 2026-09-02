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

import org.datagear.management.domain.CreateUserEntity;
import org.datagear.management.domain.DataPermissionEntity;
import org.datagear.management.domain.Entity;
import org.datagear.management.domain.User;
import org.datagear.management.service.DataPermissionEntityService;
import org.datagear.management.service.EntityService;
import org.datagear.management.util.PagingQuery;
import org.datagear.util.query.PagingData;
import org.datagear.web.util.OperationMessage;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseBody;

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

	@Override
	protected T getEntityForEdit(HttpServletRequest request, String id)
	{
		User user = getCurrentUser();
		return getByIdForEdit(getDataPermissionEntityService(), user, id);
	}

	@Override
	protected void persistEntity(HttpServletRequest request, T entity, boolean add)
	{
		User user = getCurrentUser();

		if (add && entity instanceof CreateUserEntity)
			inflateCreateUserAndTime((CreateUserEntity) entity, user);

		if (add)
			getDataPermissionEntityService().add(user, entity);
		else
			getDataPermissionEntityService().update(user, entity);
	}

	/**
	 * 删除实体（带数据权限校验）。
	 * 
	 * @param request
	 * @param ids
	 * @return
	 */
	@RequestMapping(value = "/delete", produces = CONTENT_TYPE_JSON)
	@ResponseBody
	public ResponseEntity<OperationMessage> delete(HttpServletRequest request, @RequestBody String[] ids)
	{
		if (isEmpty(ids))
			throw new IllegalInputException();

		User user = getCurrentUser();
		getDataPermissionEntityService().deleteByIds(user, ids);

		return optSuccessResponseEntity(request);
	}
}
