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

import org.datagear.analysis.support.html.DashboardApiVersion;
import org.datagear.analysis.support.html.HtmlTplDashboardWidget;
import org.datagear.management.domain.DashboardShareSet;
import org.datagear.management.domain.HtmlTplDashboardWidgetEntity;
import org.datagear.management.domain.User;
import org.datagear.management.service.DashboardShareSetService;
import org.datagear.management.service.DataPermissionEntityService;
import org.datagear.management.service.HtmlTplDashboardWidgetEntityService;
import org.datagear.web.util.OperationMessage;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseBody;
import org.springframework.web.multipart.MultipartFile;

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

	@Autowired
	private DashboardShareSetService dashboardShareSetService;

	@Autowired
	private DashboardController dashboardController;

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

	/**
	 * 获取看板分享设置。
	 */
	@RequestMapping(value = "/shareSet/{id}", produces = CONTENT_TYPE_JSON)
	@ResponseBody
	public ResponseEntity<OperationMessage<DashboardShareSet>> getShareSet(HttpServletRequest request,
			@PathVariable("id") String id)
	{
		User user = getCurrentUser();
		getByIdForEdit(this.htmlTplDashboardWidgetEntityService, user, id);

		DashboardShareSet entity = this.dashboardShareSetService.getById(id);
		if (entity == null)
		{
			entity = new DashboardShareSet(id);
			entity.setEnablePassword(false);
			entity.setAnonymousPassword(false);
		}

		entity.setPassword("");

		OperationMessage<DashboardShareSet> om = OperationMessage.valueOfSuccess("operationSuccess",
				getMessage(request, "operationSuccess"), entity);

		return new ResponseEntity<OperationMessage<DashboardShareSet>>(om, HttpStatus.OK);
	}

	/**
	 * 保存看板分享设置。
	 */
	@RequestMapping(value = "/shareSet", produces = CONTENT_TYPE_JSON)
	@ResponseBody
	public ResponseEntity<OperationMessage<DashboardShareSet>> saveShareSet(HttpServletRequest request,
			@RequestBody DashboardShareSet entity)
	{
		if (isEmpty(entity.getId()))
			throw new IllegalInputException();

		User user = getCurrentUser();
		getByIdForEdit(this.htmlTplDashboardWidgetEntityService, user, entity.getId());

		this.dashboardShareSetService.save(entity);

		entity.setPassword("");

		OperationMessage<DashboardShareSet> om = OperationMessage.valueOfSuccess("operationSuccess",
				getMessage(request, "operationSuccess"), entity);

		return new ResponseEntity<OperationMessage<DashboardShareSet>>(om, HttpStatus.OK);
	}

	/**
	 * 获取看板模板资源内容（替代旧 /dashboard/getResourceContent）。
	 */
	@RequestMapping(value = "/getResourceContent", produces = CONTENT_TYPE_JSON)
	@ResponseBody
	public Map<String, Object> getResourceContent(HttpServletRequest request, HttpServletResponse response, Model model,
			@RequestParam("id") String id, @RequestParam("resourceName") String resourceName) throws Exception
	{
		return this.dashboardController.getResourceContent(request, response, model, id, resourceName);
	}

	/**
	 * 保存看板模板资源内容（替代旧 /dashboard/saveResourceContent）。
	 */
	@RequestMapping(value = "/saveResourceContent", produces = CONTENT_TYPE_JSON)
	@ResponseBody
	public ResponseEntity<OperationMessage> saveResourceContent(HttpServletRequest request, HttpServletResponse response,
			@RequestParam("id") String id, @RequestParam("resourceName") String resourceName,
			@RequestParam("resourceContent") String resourceContent,
			@RequestParam(value = "isTemplate", required = false) Boolean isTemplate) throws Exception
	{
		return this.dashboardController.saveResourceContent(request, response, id, resourceName, resourceContent,
				isTemplate);
	}

	/**
	 * 上传看板导入文件（替代旧 /dashboard/uploadImportFile）。
	 */
	@RequestMapping(value = "/uploadImportFile", produces = CONTENT_TYPE_JSON)
	@ResponseBody
	public Map<String, Object> uploadImportFile(HttpServletRequest request, HttpServletResponse response,
			@RequestParam("file") MultipartFile multipartFile,
			@RequestParam(name = "zipFileNameEncoding", required = false) String zipFileNameEncoding) throws Exception
	{
		return this.dashboardController.uploadImportFile(request, response, multipartFile, zipFileNameEncoding);
	}

	/**
	 * 保存看板导入（替代旧 /dashboard/saveImport）。
	 */
	@RequestMapping(value = "/saveImport", produces = CONTENT_TYPE_JSON)
	@ResponseBody
	public ResponseEntity<OperationMessage> saveImport(HttpServletRequest request, HttpServletResponse response,
			@RequestBody DashboardController.DashboardImportForm form) throws Exception
	{
		return this.dashboardController.saveImport(request, response, form);
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
