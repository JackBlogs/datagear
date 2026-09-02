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

import org.datagear.analysis.DataSetQuery;
import org.datagear.analysis.support.ProfileDataSet;
import org.datagear.analysis.support.datasettpl.DataSetFmkTemplateResolvers;
import org.datagear.analysis.support.datasettpl.TemplateContext;
import org.datagear.management.domain.CsvFileDataSetEntity;
import org.datagear.management.domain.CsvValueDataSetEntity;
import org.datagear.management.domain.DataSetEntity;
import org.datagear.management.domain.ExcelDataSetEntity;
import org.datagear.management.domain.HttpDataSetEntity;
import org.datagear.management.domain.JsonFileDataSetEntity;
import org.datagear.management.domain.JsonValueDataSetEntity;
import org.datagear.management.domain.SqlDataSetEntity;
import org.datagear.management.domain.User;
import org.datagear.management.service.DataPermissionEntityService;
import org.datagear.management.service.DataSetEntityService;
import org.datagear.web.analysis.WebDashboardQueryConverter;
import org.datagear.web.util.OperationMessage;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseBody;

/**
 * 数据集 API 控制器（{@code /api/dataSet} 前缀）。
 * <p>
 * 阶段二仅铺开列表分页/元数据；数据集表单（7 种类型）为阶段三/四的范式 C 独立表单页。
 * </p>
 * 
 * @author datagear@163.com
 *
 */
@Controller
@RequestMapping("/api/dataSet")
public class DataSetApiController extends AbstractDataPermissionApiController<DataSetEntity>
{
	@Autowired
	private DataSetEntityService dataSetEntityService;

	@Autowired
	private WebDashboardQueryConverter webDashboardQueryConverter;

	@Autowired
	private DataSetController dataSetController;

	public DataSetApiController()
	{
		super();
	}

	@Override
	protected DataPermissionEntityService<String, DataSetEntity> getDataPermissionEntityService()
	{
		return this.dataSetEntityService;
	}

	@Override
	protected String getModuleName()
	{
		return "dataSet";
	}

	@Override
	protected List<Map<String, Object>> buildMetaColumns(HttpServletRequest request)
	{
		List<Map<String, Object>> columns = new ArrayList<Map<String, Object>>();
		columns.add(column("id", "ID", true));
		columns.add(column("name", "名称", true));
		columns.add(column("createTime", "创建时间", false));
		return columns;
	}

	/**
	 * 解析 SQL 数据集模板（JSON 化，替代旧 {@code /dataSet/resolveSql} 的 HTML 返回）。
	 * 
	 * @param request
	 * @param param
	 * @return
	 * @throws Throwable
	 */
	@RequestMapping(value = "/resolveSql", produces = CONTENT_TYPE_JSON)
	@ResponseBody
	public ResponseEntity<OperationMessage<String>> resolveSql(HttpServletRequest request,
			@RequestBody DataSetController.ResolveSqlParam param) throws Throwable
	{
		DataSetQuery query = this.webDashboardQueryConverter.convert(param.getParamValues(), param.getDataSetParams(),
				getCurrentUser());

		String sql = DataSetFmkTemplateResolvers.resolveSql(param.getSql(), new TemplateContext(query.getParamValues()))
				.getResult();

		OperationMessage<String> om = OperationMessage.valueOfSuccess("operationSuccess",
				getMessage(request, "operationSuccess"), sql);

		return new ResponseEntity<OperationMessage<String>>(om, HttpStatus.OK);
	}

	/**
	 * 获取数据集概要（含字段，供数据绑定面板映射数据签名）。
	 * 
	 * @param request
	 * @param ids
	 * @return
	 */
	@RequestMapping(value = "/getProfileDataSetByIds", produces = CONTENT_TYPE_JSON)
	@ResponseBody
	public ResponseEntity<OperationMessage<List<ProfileDataSet>>> getProfileDataSetByIds(HttpServletRequest request,
			@RequestParam("id") String[] ids)
	{
		User user = getCurrentUser();
		List<ProfileDataSet> dataSets = new ArrayList<ProfileDataSet>(ids.length);

		for (String id : ids)
		{
			ProfileDataSet dataSet = this.dataSetEntityService.getProfileDataSet(user, id);
			if (dataSet == null)
				throw new RecordNotFoundException();

			dataSets.add(dataSet);
		}

		OperationMessage<List<ProfileDataSet>> om = OperationMessage.valueOfSuccess("operationSuccess",
				getMessage(request, "operationSuccess"), dataSets);

		return new ResponseEntity<OperationMessage<List<ProfileDataSet>>>(om, HttpStatus.OK);
	}

	/**
	 * 新增 SQL 数据集（替代旧 /dataSet/saveAdd/SQL）。
	 */
	@RequestMapping(value = "/saveAdd/SQL", produces = CONTENT_TYPE_JSON)
	@ResponseBody
	public ResponseEntity<OperationMessage> saveAddSql(HttpServletRequest request, HttpServletResponse response,
			@RequestBody SqlDataSetEntity entity)
	{
		return this.dataSetController.saveAddSql(request, response, entity);
	}

	/**
	 * 新增 JSON 值数据集。
	 */
	@RequestMapping(value = "/saveAdd/JsonValue", produces = CONTENT_TYPE_JSON)
	@ResponseBody
	public ResponseEntity<OperationMessage> saveAddJsonValue(HttpServletRequest request, HttpServletResponse response,
			@RequestBody JsonValueDataSetEntity entity)
	{
		return this.dataSetController.saveAddJsonValue(request, response, entity);
	}

	/**
	 * 新增 JSON 文件数据集。
	 */
	@RequestMapping(value = "/saveAdd/JsonFile", produces = CONTENT_TYPE_JSON)
	@ResponseBody
	public ResponseEntity<OperationMessage> saveAddJsonFile(HttpServletRequest request, HttpServletResponse response,
			@RequestBody JsonFileDataSetEntity entity) throws Throwable
	{
		return this.dataSetController.saveAddJsonFile(request, response, entity);
	}

	/**
	 * 新增 Excel 数据集。
	 */
	@RequestMapping(value = "/saveAdd/Excel", produces = CONTENT_TYPE_JSON)
	@ResponseBody
	public ResponseEntity<OperationMessage> saveAddExcel(HttpServletRequest request, HttpServletResponse response,
			@RequestBody ExcelDataSetEntity entity) throws Throwable
	{
		return this.dataSetController.saveAddExcel(request, response, entity);
	}

	/**
	 * 新增 CSV 值数据集。
	 */
	@RequestMapping(value = "/saveAdd/CsvValue", produces = CONTENT_TYPE_JSON)
	@ResponseBody
	public ResponseEntity<OperationMessage> saveAddCsvValue(HttpServletRequest request, HttpServletResponse response,
			@RequestBody CsvValueDataSetEntity entity) throws Throwable
	{
		return this.dataSetController.saveAddCsvValue(request, response, entity);
	}

	/**
	 * 新增 CSV 文件数据集。
	 */
	@RequestMapping(value = "/saveAdd/CsvFile", produces = CONTENT_TYPE_JSON)
	@ResponseBody
	public ResponseEntity<OperationMessage> saveAddCsvFile(HttpServletRequest request, HttpServletResponse response,
			@RequestBody CsvFileDataSetEntity entity) throws Throwable
	{
		return this.dataSetController.saveAddCsvFile(request, response, entity);
	}

	/**
	 * 新增 HTTP 数据集。
	 */
	@RequestMapping(value = "/saveAdd/Http", produces = CONTENT_TYPE_JSON)
	@ResponseBody
	public ResponseEntity<OperationMessage> saveAddHttp(HttpServletRequest request, HttpServletResponse response,
			@RequestBody HttpDataSetEntity entity) throws Throwable
	{
		return this.dataSetController.saveAddHttp(request, response, entity);
	}

	/**
	 * 编辑 SQL 数据集（替代旧 /dataSet/saveEdit/SQL）。
	 */
	@RequestMapping(value = "/saveEdit/SQL", produces = CONTENT_TYPE_JSON)
	@ResponseBody
	public ResponseEntity<OperationMessage> saveEditSql(HttpServletRequest request, HttpServletResponse response,
			@RequestBody SqlDataSetEntity entity)
	{
		return this.dataSetController.saveEditSql(request, response, entity);
	}

	/**
	 * 编辑 JSON 值数据集。
	 */
	@RequestMapping(value = "/saveEdit/JsonValue", produces = CONTENT_TYPE_JSON)
	@ResponseBody
	public ResponseEntity<OperationMessage> saveEditJsonValue(HttpServletRequest request, HttpServletResponse response,
			@RequestBody JsonValueDataSetEntity entity)
	{
		return this.dataSetController.saveEditJsonValue(request, response, entity);
	}

	/**
	 * 编辑 JSON 文件数据集。
	 */
	@RequestMapping(value = "/saveEdit/JsonFile", produces = CONTENT_TYPE_JSON)
	@ResponseBody
	public ResponseEntity<OperationMessage> saveEditJsonFile(HttpServletRequest request, HttpServletResponse response,
			@RequestBody JsonFileDataSetEntity entity,
			@RequestParam(value = "originalFileName", required = false) String originalFileName) throws Throwable
	{
		return this.dataSetController.saveEditJsonFile(request, response, entity, originalFileName);
	}

	/**
	 * 编辑 Excel 数据集。
	 */
	@RequestMapping(value = "/saveEdit/Excel", produces = CONTENT_TYPE_JSON)
	@ResponseBody
	public ResponseEntity<OperationMessage> saveEditExcel(HttpServletRequest request, HttpServletResponse response,
			@RequestBody ExcelDataSetEntity entity,
			@RequestParam(value = "originalFileName", required = false) String originalFileName) throws Throwable
	{
		return this.dataSetController.saveEditExcel(request, response, entity, originalFileName);
	}

	/**
	 * 编辑 CSV 值数据集。
	 */
	@RequestMapping(value = "/saveEdit/CsvValue", produces = CONTENT_TYPE_JSON)
	@ResponseBody
	public ResponseEntity<OperationMessage> saveEditCsvValue(HttpServletRequest request, HttpServletResponse response,
			@RequestBody CsvValueDataSetEntity entity)
	{
		return this.dataSetController.saveEditCsvValue(request, response, entity);
	}

	/**
	 * 编辑 CSV 文件数据集。
	 */
	@RequestMapping(value = "/saveEdit/CsvFile", produces = CONTENT_TYPE_JSON)
	@ResponseBody
	public ResponseEntity<OperationMessage> saveEditCsvFile(HttpServletRequest request, HttpServletResponse response,
			@RequestBody CsvFileDataSetEntity entity,
			@RequestParam(value = "originalFileName", required = false) String originalFileName) throws Throwable
	{
		return this.dataSetController.saveEditCsvFile(request, response, entity, originalFileName);
	}

	/**
	 * 编辑 HTTP 数据集。
	 */
	@RequestMapping(value = "/saveEdit/Http", produces = CONTENT_TYPE_JSON)
	@ResponseBody
	public ResponseEntity<OperationMessage> saveEditHttp(HttpServletRequest request, HttpServletResponse response,
			@RequestBody HttpDataSetEntity entity) throws Throwable
	{
		return this.dataSetController.saveEditHttp(request, response, entity);
	}

	public DataSetEntityService getDataSetEntityService()
	{
		return dataSetEntityService;
	}

	public void setDataSetEntityService(DataSetEntityService dataSetEntityService)
	{
		this.dataSetEntityService = dataSetEntityService;
	}
}
