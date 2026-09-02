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
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import javax.servlet.http.HttpServletRequest;

import org.datagear.analysis.ChartQuery;
import org.datagear.analysis.ChartResult;
import org.datagear.analysis.DataSetBind;
import org.datagear.analysis.DataSetField;
import org.datagear.analysis.DataSetResult;
import org.datagear.analysis.support.ChartWidget;
import org.datagear.management.domain.HtmlChartWidgetEntity;
import org.datagear.management.domain.User;
import org.datagear.management.service.DataPermissionEntityService;
import org.datagear.management.service.HtmlChartWidgetEntityService;
import org.datagear.web.util.OperationMessage;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseBody;

/**
 * 图表 API 控制器（{@code /api/chart} 前缀）。
 * <p>
 * 阶段二仅铺开列表分页/元数据；图表表单/设计为阶段三/四的范式 C 独立表单页。
 * </p>
 * 
 * @author datagear@163.com
 *
 */
@Controller
@RequestMapping("/api/chart")
public class ChartApiController extends AbstractDataPermissionApiController<HtmlChartWidgetEntity>
{
	@Autowired
	private HtmlChartWidgetEntityService htmlChartWidgetEntityService;

	public ChartApiController()
	{
		super();
	}

	@Override
	protected DataPermissionEntityService<String, HtmlChartWidgetEntity> getDataPermissionEntityService()
	{
		return this.htmlChartWidgetEntityService;
	}

	@Override
	protected String getModuleName()
	{
		return "chart";
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
	 * 获取图表（含数据绑定、插件，供设计器加载）。
	 * 
	 * @param request
	 * @param id
	 * @return
	 */
	@RequestMapping(value = "/get/{id}", produces = CONTENT_TYPE_JSON)
	@ResponseBody
	public ResponseEntity<OperationMessage<HtmlChartWidgetEntity>> get(HttpServletRequest request,
			@PathVariable("id") String id)
	{
		User user = getCurrentUser();
		HtmlChartWidgetEntity entity = getByIdForEdit(this.htmlChartWidgetEntityService, user, id);

		OperationMessage<HtmlChartWidgetEntity> om = OperationMessage.valueOfSuccess("operationSuccess",
				getMessage(request, "operationSuccess"), entity);

		return new ResponseEntity<OperationMessage<HtmlChartWidgetEntity>>(om, HttpStatus.OK);
	}

	/**
	 * 保存图表（供设计器回写）。
	 * <p>
	 * 注意：返回简单成功响应，避免序列化整个实体（dataSetBindVOs 在普通 DataSetBind 下会 ClassCastException）。
	 * </p>
	 * 
	 * @param request
	 * @param entity
	 * @return
	 */
	@RequestMapping(value = "/saveEdit", produces = CONTENT_TYPE_JSON)
	@ResponseBody
	public ResponseEntity<OperationMessage> saveEdit(HttpServletRequest request,
			@RequestBody HtmlChartWidgetEntity entity)
	{
		User user = getCurrentUser();

		if (isEmpty(entity.getId()) || isEmpty(entity.getName()))
			throw new IllegalInputException();

		this.htmlChartWidgetEntityService.update(user, entity);

		return optSuccessResponseEntity(request);
	}

	/**
	 * 预览图表（执行数据，返回列 + 行，供前端 ECharts 渲染，脱离 iframe）。
	 * 
	 * @param request
	 * @param id
	 * @return
	 * @throws Throwable
	 */
	@RequestMapping(value = "/preview/{id}", produces = CONTENT_TYPE_JSON)
	@ResponseBody
	public ResponseEntity<OperationMessage<Map<String, Object>>> preview(HttpServletRequest request,
			@PathVariable("id") String id) throws Throwable
	{
		User user = getCurrentUser();
		getByIdForEdit(this.htmlChartWidgetEntityService, user, id);

		ChartWidget widget = this.htmlChartWidgetEntityService.getChartWidget(id);
		ChartResult chartResult = widget.getResult(new ChartQuery());

		List<String> columns = new ArrayList<String>();
		Object rows = java.util.Collections.emptyList();
		List<String> dataSetSigns = java.util.Collections.emptyList();
		Map<String, List<String>> fieldSigns = java.util.Collections.emptyMap();

		DataSetBind[] binds = widget.getDataSetBinds();
		List<DataSetResult> results = chartResult.getDataSetResults();
		if (results != null && !results.isEmpty() && binds != null && binds.length > 0
				&& binds[0].getDataSet() != null)
		{
			DataSetResult r = results.get(0);
			List<DataSetField> fields = binds[0].getDataSet().getFields();
			if (fields != null)
			{
				for (DataSetField f : fields)
					columns.add(f.getName());
			}
			if (r.getData() != null)
				rows = r.getData();
			if (binds[0].getDataSetSigns() != null)
				dataSetSigns = binds[0].getDataSetSigns();
			if (binds[0].getFieldSigns() != null)
				fieldSigns = binds[0].getFieldSigns();
		}

		Map<String, Object> data = new HashMap<String, Object>();
		data.put("pluginId", (widget.getPlugin() == null ? null : widget.getPlugin().getId()));
		data.put("columns", columns);
		data.put("rows", rows);
		data.put("dataSetSigns", dataSetSigns);
		data.put("fieldSigns", fieldSigns);

		OperationMessage<Map<String, Object>> om = OperationMessage.valueOfSuccess("operationSuccess",
				getMessage(request, "operationSuccess"), data);

		return new ResponseEntity<OperationMessage<Map<String, Object>>>(om, HttpStatus.OK);
	}

	public HtmlChartWidgetEntityService getHtmlChartWidgetEntityService()
	{
		return htmlChartWidgetEntityService;
	}

	public void setHtmlChartWidgetEntityService(HtmlChartWidgetEntityService htmlChartWidgetEntityService)
	{
		this.htmlChartWidgetEntityService = htmlChartWidgetEntityService;
	}
}
