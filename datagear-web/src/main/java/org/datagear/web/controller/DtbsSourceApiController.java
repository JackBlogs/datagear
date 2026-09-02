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

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.datagear.management.domain.DtbsSource;
import org.datagear.management.service.DataPermissionEntityService;
import org.datagear.management.service.DtbsSourceService;
import org.datagear.management.util.PagingQuery;
import org.datagear.meta.SimpleTable;
import org.datagear.meta.Table;
import org.datagear.util.query.PagingData;
import org.datagear.web.util.OperationMessage;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseBody;

/**
 * 数据源管理 API 控制器（{@code /api/dtbsSource} 前缀）。
 * 
 * @author datagear@163.com
 *
 */
@Controller
@RequestMapping("/api/dtbsSource")
public class DtbsSourceApiController extends AbstractDataPermissionApiController<DtbsSource>
{
	@Autowired
	private DtbsSourceService dtbsSourceService;

	@Autowired
	private DtbsSourceController dtbsSourceController;

	public DtbsSourceApiController()
	{
		super();
	}

	@Override
	protected DataPermissionEntityService<String, DtbsSource> getDataPermissionEntityService()
	{
		return this.dtbsSourceService;
	}

	@Override
	protected String getModuleName()
	{
		return "dtbsSource";
	}

	@Override
	protected List<Map<String, Object>> buildMetaColumns(HttpServletRequest request)
	{
		List<Map<String, Object>> columns = new ArrayList<Map<String, Object>>();
		columns.add(column("id", "ID", true));
		columns.add(column("title", "标题", true));
		columns.add(column("url", "URL", false));
		columns.add(column("createTime", "创建时间", false));
		return columns;
	}

	@Override
	protected void checkSaveEntity(HttpServletRequest request, DtbsSource entity)
	{
		if (isBlank(entity.getTitle()) || isBlank(entity.getUrl()))
			throw new IllegalInputException();
	}

	@Override
	protected void toFormResponseData(HttpServletRequest request, DtbsSource entity)
	{
		entity.clearPassword();
	}

	/**
	 * 查询数据源下的数据表（替代旧 /dtbsSource/{id}/pagingQueryTable）。
	 */
	@RequestMapping(value = "/{dtbsSourceId}/pagingQueryTable", produces = CONTENT_TYPE_JSON)
	@ResponseBody
	public PagingData<SimpleTable> pagingQueryTable(HttpServletRequest request, HttpServletResponse response, Model model,
			@PathVariable("dtbsSourceId") String dtbsSourceId, @RequestBody(required = false) PagingQuery pagingQuery)
			throws Throwable
	{
		return this.dtbsSourceController.pagingQueryTable(request, response, model, dtbsSourceId, pagingQuery);
	}

	/**
	 * 获取数据表结构（替代旧 /dtbsSource/{id}/table/{tableName}）。
	 */
	@RequestMapping(value = "/{dtbsSourceId}/table/{tableName}", produces = CONTENT_TYPE_JSON)
	@ResponseBody
	public Table getTable(HttpServletRequest request, HttpServletResponse response, Model model,
			@PathVariable("dtbsSourceId") String dtbsSourceId, @PathVariable("tableName") String tableName,
			@RequestParam(value = "reload", required = false) Boolean forceReload) throws Throwable
	{
		return this.dtbsSourceController.getTable(request, response, model, dtbsSourceId, tableName, forceReload);
	}

	/**
	 * 测试数据源连接（POST /api/dtbsSource/testConnection）。
	 */
	@RequestMapping(value = "/testConnection", produces = CONTENT_TYPE_JSON)
	@ResponseBody
	public ResponseEntity<OperationMessage> testConnection(HttpServletRequest request, HttpServletResponse response,
			@RequestBody DtbsSource entity) throws Exception
	{
		return this.dtbsSourceController.testConnection(request, response, entity);
	}

	public DtbsSourceService getDtbsSourceService()
	{
		return dtbsSourceService;
	}

	public void setDtbsSourceService(DtbsSourceService dtbsSourceService)
	{
		this.dtbsSourceService = dtbsSourceService;
	}
}
