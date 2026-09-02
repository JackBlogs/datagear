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

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.datagear.management.domain.Entity;
import org.datagear.management.service.EntityService;
import org.datagear.management.util.PagingQuery;
import org.datagear.util.IDUtil;
import org.datagear.util.query.PagingData;
import org.datagear.web.util.OperationMessage;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseBody;

/**
 * 实体 CRUD 模块 API 控制器基类（阶段二模范切片）。
 * <p>
 * 为基于 {@linkplain EntityService} 的常规模块提供统一的 {@code /api} 前缀端点，
 * 与旧 {@code /{module}} 前缀控制器（供旧前端，裸返回）双轨并存。
 * 子类只需提供 {@linkplain #getEntityService()}、{@linkplain #getModuleName()} 与
 * {@linkplain #buildMetaColumns(HttpServletRequest)}。
 * </p>
 * 
 * @author datagear@163.com
 *
 * @param <T>
 */
public abstract class AbstractEntityApiController<T extends Entity<String>> extends AbstractController
{
	public AbstractEntityApiController()
	{
		super();
	}

	/**
	 * 获取实体服务。
	 * 
	 * @return
	 */
	protected abstract EntityService<String, T> getEntityService();

	/**
	 * 获取模块名（用于 {@code /api/{module}/meta} 的返回）。
	 * 
	 * @return
	 */
	protected abstract String getModuleName();

	/**
	 * 构建列表列定义。
	 * 
	 * @param request
	 * @return
	 */
	protected abstract List<Map<String, Object>> buildMetaColumns(HttpServletRequest request);

	/**
	 * 分页查询（{@code OperationMessage<PagingData<T>>} 包装）。
	 * 
	 * @param request
	 * @param response
	 * @param pagingQuery
	 * @return
	 * @throws Exception
	 */
	@RequestMapping(value = "/pagingQueryData", produces = CONTENT_TYPE_JSON)
	@ResponseBody
	public ResponseEntity<OperationMessage<PagingData<T>>> pagingQueryData(HttpServletRequest request,
			HttpServletResponse response, @RequestBody(required = false) PagingQuery pagingQuery) throws Exception
	{
		pagingQuery = (pagingQuery == null ? new PagingQuery() : pagingQuery);

		PagingData<T> pagingData = doPagingQuery(request, pagingQuery);
		toQueryResponseData(request, pagingData.getItems());

		OperationMessage<PagingData<T>> om = OperationMessage.valueOfSuccess("operationSuccess",
				getMessage(request, "operationSuccess"), pagingData);

		return new ResponseEntity<OperationMessage<PagingData<T>>>(om, HttpStatus.OK);
	}

	/**
	 * 执行分页查询。
	 * <p>
	 * 子类可覆盖以使用带用户/数据权限参数的查询（见 {@code AbstractDataPermissionApiController}）。
	 * </p>
	 * 
	 * @param request
	 * @param pagingQuery
	 * @return
	 * @throws Exception
	 */
	protected PagingData<T> doPagingQuery(HttpServletRequest request, PagingQuery pagingQuery) throws Exception
	{
		return getEntityService().pagingQuery(pagingQuery);
	}

	/**
	 * 模块元数据（列定义、只读动作），替代旧模板的 {@code <@writeJson var=formModel/>}。
	 * 
	 * @param request
	 * @return
	 */
	@RequestMapping(value = "/meta", produces = CONTENT_TYPE_JSON)
	@ResponseBody
	public ResponseEntity<OperationMessage<Map<String, Object>>> meta(HttpServletRequest request)
	{
		Authentication auth = getCurrentAuthentication();
		boolean readonlyAction = !getAuthenticationSecurity().hasDataManager(auth);

		Map<String, Object> meta = new HashMap<String, Object>();
		meta.put("module", getModuleName());
		meta.put("readonlyAction", readonlyAction);
		meta.put("columns", buildMetaColumns(request));

		OperationMessage<Map<String, Object>> om = OperationMessage.valueOfSuccess("operationSuccess",
				getMessage(request, "operationSuccess"), meta);

		return new ResponseEntity<OperationMessage<Map<String, Object>>>(om, HttpStatus.OK);
	}

	protected Map<String, Object> column(String field, String header, boolean sortable)
	{
		Map<String, Object> column = new HashMap<String, Object>();
		column.put("field", field);
		column.put("header", header);
		column.put("sortable", sortable);
		return column;
	}

	/**
	 * 对查询结果做响应前的二次加工（子类按需覆盖，默认不做）。
	 * 
	 * @param request
	 * @param items
	 */
	protected void toQueryResponseData(HttpServletRequest request, List<T> items)
	{
	}

	/**
	 * 获取实体（{@code OperationMessage<T>} 包装，供编辑/查看表单加载）。
	 * 
	 * @param request
	 * @param id
	 * @return
	 */
	@RequestMapping(value = "/get/{id}", produces = CONTENT_TYPE_JSON)
	@ResponseBody
	public ResponseEntity<OperationMessage<T>> get(HttpServletRequest request, @PathVariable("id") String id)
	{
		T entity = getEntityForEdit(request, id);
		toFormResponseData(request, entity);

		OperationMessage<T> om = OperationMessage.valueOfSuccess("operationSuccess",
				getMessage(request, "operationSuccess"), entity);

		return new ResponseEntity<OperationMessage<T>>(om, HttpStatus.OK);
	}

	/**
	 * 保存实体（新增或更新，按 {@code id} 是否为空判定）。
	 * 
	 * @param request
	 * @param entity
	 * @return
	 */
	@RequestMapping(value = "/save", produces = CONTENT_TYPE_JSON)
	@ResponseBody
	public ResponseEntity<OperationMessage<T>> save(HttpServletRequest request, @RequestBody T entity)
	{
		boolean add = isEmpty(entity.getId());

		if (add)
			entity.setId(IDUtil.randomIdOnTime20());

		prepareSaveEntity(request, entity, add);
		checkSaveEntity(request, entity);

		persistEntity(request, entity, add);

		toFormResponseData(request, entity);

		OperationMessage<T> om = OperationMessage.valueOfSuccess("operationSuccess",
				getMessage(request, "operationSuccess"), entity);

		return new ResponseEntity<OperationMessage<T>>(om, HttpStatus.OK);
	}

	/**
	 * 删除实体（供子类 {@code /delete} 端点复用，默认按 ID 批量删除）。
	 * 
	 * @param request
	 * @param ids
	 * @return
	 */
	protected ResponseEntity<OperationMessage> deleteByIds(HttpServletRequest request, String[] ids)
	{
		if (isEmpty(ids))
			throw new IllegalInputException();

		getEntityService().deleteByIds(ids);

		return optSuccessResponseEntity(request);
	}

	/**
	 * 获取待编辑实体（子类可覆盖为带数据权限的获取）。
	 * 
	 * @param request
	 * @param id
	 * @return
	 */
	protected T getEntityForEdit(HttpServletRequest request, String id)
	{
		return getByIdForEdit(getEntityService(), id);
	}

	/**
	 * 保存前的二次加工（子类按需覆盖，默认不做）。
	 * 
	 * @param request
	 * @param entity
	 * @param add
	 *            是否新增
	 */
	protected void prepareSaveEntity(HttpServletRequest request, T entity, boolean add)
	{
	}

	/**
	 * 持久化实体（子类可覆盖为带数据权限/创建用户的保存，默认按 ID 判增删改）。
	 * 
	 * @param request
	 * @param entity
	 * @param add
	 */
	protected void persistEntity(HttpServletRequest request, T entity, boolean add)
	{
		if (add)
			getEntityService().add(entity);
		else
			getEntityService().update(entity);
	}

	/**
	 * 保存前的输入校验（子类按需覆盖，默认不做）。
	 * 
	 * @param request
	 * @param entity
	 */
	protected void checkSaveEntity(HttpServletRequest request, T entity)
	{
	}

	/**
	 * 表单响应前的二次加工（子类按需覆盖，默认不做，如清空密码）。
	 * 
	 * @param request
	 * @param entity
	 */
	protected void toFormResponseData(HttpServletRequest request, T entity)
	{
	}
}
