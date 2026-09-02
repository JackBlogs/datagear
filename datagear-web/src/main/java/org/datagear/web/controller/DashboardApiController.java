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

import org.datagear.analysis.support.html.DashboardApiVersion;
import org.datagear.analysis.support.html.HtmlTplDashboardWidget;
import org.datagear.management.domain.HtmlTplDashboardWidgetEntity;
import org.datagear.management.domain.User;
import org.datagear.management.service.DataPermissionEntityService;
import org.datagear.management.service.HtmlTplDashboardWidgetEntityService;
import org.datagear.web.util.OperationMessage;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseBody;

/**
 * 看板 API 控制器（{@code /api/dashboard} 前缀）。
 * <p>
 * 阶段二仅铺开列表分页/元数据；看板设计器为阶段五（5c，包装迁移）。
 * </p>
 * 
 * @author datagear@163.com
 *
 */
@Controller
@RequestMapping("/api/dashboard")
public class DashboardApiController extends AbstractDataPermissionApiController<HtmlTplDashboardWidgetEntity>
{
	@Autowired
	private HtmlTplDashboardWidgetEntityService htmlTplDashboardWidgetEntityService;

	public DashboardApiController()
	{
		super();
	}

	@Override
	protected DataPermissionEntityService<String, HtmlTplDashboardWidgetEntity> getDataPermissionEntityService()
	{
		return this.htmlTplDashboardWidgetEntityService;
	}

	@Override
	protected String getModuleName()
	{
		return "dashboard";
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

	@Override
	protected void checkSaveEntity(HttpServletRequest request, HtmlTplDashboardWidgetEntity entity)
	{
		if (isBlank(entity.getName()))
			throw new IllegalInputException();
	}

	@Override
	protected void prepareSaveEntity(HttpServletRequest request, HtmlTplDashboardWidgetEntity entity, boolean add)
	{
		// 新增时初始化默认模板/编码/API 版本
		if (add)
		{
			entity.setTemplates(HtmlTplDashboardWidgetEntity.DEFAULT_TEMPLATES);
			entity.setTemplateEncoding(HtmlTplDashboardWidget.DEFAULT_TEMPLATE_ENCODING);
			entity.setApiVersion(DashboardApiVersion.V2);
		}
	}

	@Override
	protected void persistEntity(HttpServletRequest request, HtmlTplDashboardWidgetEntity entity, boolean add)
	{
		User user = getCurrentUser();

		if (add)
		{
			inflateCreateUserAndTime(entity, user);
			getDataPermissionEntityService().add(user, entity);
		}
		else
		{
			// 编辑时保留模板与编码（不允许通过表单修改）
			HtmlTplDashboardWidgetEntity persist = getByIdForEdit(getDataPermissionEntityService(), user, entity.getId());
			entity.setTemplates(persist.getTemplates());
			entity.setTemplateEncoding(persist.getTemplateEncoding());
			getDataPermissionEntityService().update(user, entity);
		}
	}

	/**
	 * 获取看板（含名称、模板，供设计器加载）。
	 * 
	 * @param request
	 * @param id
	 * @return
	 */
	@RequestMapping(value = "/get/{id}", produces = CONTENT_TYPE_JSON)
	@ResponseBody
	public ResponseEntity<OperationMessage<HtmlTplDashboardWidgetEntity>> get(HttpServletRequest request,
			@PathVariable("id") String id)
	{
		User user = getCurrentUser();
		HtmlTplDashboardWidgetEntity entity = getByIdForEdit(this.htmlTplDashboardWidgetEntityService, user, id);

		OperationMessage<HtmlTplDashboardWidgetEntity> om = OperationMessage.valueOfSuccess("operationSuccess",
				getMessage(request, "operationSuccess"), entity);

		return new ResponseEntity<OperationMessage<HtmlTplDashboardWidgetEntity>>(om, HttpStatus.OK);
	}

	public HtmlTplDashboardWidgetEntityService getHtmlTplDashboardWidgetEntityService()
	{
		return htmlTplDashboardWidgetEntityService;
	}

	public void setHtmlTplDashboardWidgetEntityService(HtmlTplDashboardWidgetEntityService htmlTplDashboardWidgetEntityService)
	{
		this.htmlTplDashboardWidgetEntityService = htmlTplDashboardWidgetEntityService;
	}
}
