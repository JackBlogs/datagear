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

import org.datagear.management.domain.HtmlChartWidgetEntity;
import org.datagear.management.service.DataPermissionEntityService;
import org.datagear.management.service.HtmlChartWidgetEntityService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;

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

	public HtmlChartWidgetEntityService getHtmlChartWidgetEntityService()
	{
		return htmlChartWidgetEntityService;
	}

	public void setHtmlChartWidgetEntityService(HtmlChartWidgetEntityService htmlChartWidgetEntityService)
	{
		this.htmlChartWidgetEntityService = htmlChartWidgetEntityService;
	}
}
