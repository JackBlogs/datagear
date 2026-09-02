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

import org.datagear.analysis.DataSignSpec;
import org.datagear.analysis.support.html.HtmlChartPlugin;
import org.datagear.web.util.OperationMessage;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseBody;

/**
 * 图表插件 API 控制器（{@code /api/chartPlugin} 前缀）。
 * <p>
 * 为数据绑定面板提供图表插件的数据签名（{@linkplain DataSignSpec#getDataSigns()}）。
 * </p>
 * 
 * @author datagear@163.com
 *
 */
@Controller
@RequestMapping("/api/chartPlugin")
public class ChartPluginApiController extends AbstractChartPluginAwareController
{
	public ChartPluginApiController()
	{
		super();
	}

	/**
	 * 获取图表插件的数据签名规格。
	 * 
	 * @param request
	 * @param id
	 * @return
	 * @throws Exception
	 */
	@RequestMapping(value = "/dataSigns/{id}", produces = CONTENT_TYPE_JSON)
	@ResponseBody
	public ResponseEntity<OperationMessage<DataSignSpec>> dataSigns(HttpServletRequest request,
			@PathVariable("id") String id) throws Exception
	{
		HtmlChartPlugin plugin = getHtmlChartPlugin(id, true);
		DataSignSpec spec = plugin.getDataSignSpec();

		OperationMessage<DataSignSpec> om = OperationMessage.valueOfSuccess("operationSuccess",
				getMessage(request, "operationSuccess"), spec);

		return new ResponseEntity<OperationMessage<DataSignSpec>>(om, HttpStatus.OK);
	}

	/**
	 * 获取图表插件列表（id + 名称，供图表属性面板插件选择）。
	 * 
	 * @param request
	 * @return
	 * @throws Exception
	 */
	@RequestMapping(value = "/list", produces = CONTENT_TYPE_JSON)
	@ResponseBody
	public ResponseEntity<OperationMessage<List<Map<String, Object>>>> list(HttpServletRequest request)
			throws Exception
	{
		List<HtmlChartPlugin> plugins = getDirectoryHtmlChartPluginManager().getAll(HtmlChartPlugin.class, null);

		List<Map<String, Object>> items = new ArrayList<Map<String, Object>>();
		if (plugins != null)
		{
			for (HtmlChartPlugin plugin : plugins)
			{
				Map<String, Object> item = new HashMap<String, Object>();
				item.put("id", plugin.getId());
				item.put("name", (plugin.getNameLabel() == null ? plugin.getId() : plugin.getNameLabel().getValue()));
				items.add(item);
			}
		}

		OperationMessage<List<Map<String, Object>>> om = OperationMessage.valueOfSuccess("operationSuccess",
				getMessage(request, "operationSuccess"), items);

		return new ResponseEntity<OperationMessage<List<Map<String, Object>>>>(om, HttpStatus.OK);
	}
}
