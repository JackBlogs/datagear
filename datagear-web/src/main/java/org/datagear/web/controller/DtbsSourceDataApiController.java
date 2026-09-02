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

import java.util.List;
import java.util.Map;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.datagear.persistence.PagingQuery;
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
 * 数据管理 API 控制器（{@code /api/dtbsSourceData}），委托旧 {@linkplain DtbsSourceDataController} 的
 * 数据连接执行逻辑，实现「API 单轨」（前端仅调用 /api）。
 * 
 * @author datagear@163.com
 *
 */
@Controller
@RequestMapping("/api/dtbsSourceData")
public class DtbsSourceDataApiController extends AbstractController
{
	@Autowired
	private DtbsSourceDataController dtbsSourceDataController;

	public DtbsSourceDataApiController()
	{
		super();
	}

	@RequestMapping(value = "/{dtbsSourceId}/{tableName}/pagingQueryData", produces = CONTENT_TYPE_JSON)
	public void pagingQueryData(HttpServletRequest request, HttpServletResponse response, Model model,
			@PathVariable("dtbsSourceId") String dtbsSourceId, @PathVariable("tableName") String tableName,
			@RequestBody(required = false) PagingQuery pagingQuery) throws Throwable
	{
		this.dtbsSourceDataController.pagingQueryData(request, response, model, dtbsSourceId, tableName, pagingQuery);
	}

	@RequestMapping(value = "/{dtbsSourceId}/{tableName}/saveAdd", produces = CONTENT_TYPE_JSON)
	@ResponseBody
	public ResponseEntity<OperationMessage> saveAdd(HttpServletRequest request, HttpServletResponse response, Model model,
			@PathVariable("dtbsSourceId") String dtbsSourceId, @PathVariable("tableName") String tableName,
			@RequestBody Map<String, ?> paramData) throws Throwable
	{
		return this.dtbsSourceDataController.saveAdd(request, response, model, dtbsSourceId, tableName, paramData);
	}

	@RequestMapping(value = "/{dtbsSourceId}/{tableName}/saveEdit", produces = CONTENT_TYPE_JSON)
	@ResponseBody
	public ResponseEntity<OperationMessage> saveEdit(HttpServletRequest request, HttpServletResponse response, Model model,
			@PathVariable("dtbsSourceId") String dtbsSourceId, @PathVariable("tableName") String tableName,
			@RequestParam(value = DtbsSourceDataController.PARAM_IGNORE_DUPLICATION, required = false) Boolean ignoreDuplication,
			@RequestBody Map<String, ?> paramData) throws Throwable
	{
		return this.dtbsSourceDataController.saveEdit(request, response, model, dtbsSourceId, tableName, ignoreDuplication,
				paramData);
	}

	@RequestMapping(value = "/{dtbsSourceId}/{tableName}/delete", produces = CONTENT_TYPE_JSON)
	@ResponseBody
	public ResponseEntity<OperationMessage> delete(HttpServletRequest request, HttpServletResponse response, Model model,
			@PathVariable("dtbsSourceId") String dtbsSourceId, @PathVariable("tableName") String tableName,
			@RequestParam(value = DtbsSourceDataController.PARAM_IGNORE_DUPLICATION, required = false) Boolean ignoreDuplication,
			@RequestBody List<Map<String, ?>> paramData) throws Throwable
	{
		return this.dtbsSourceDataController.delete(request, response, model, dtbsSourceId, tableName, ignoreDuplication,
				paramData);
	}
}
