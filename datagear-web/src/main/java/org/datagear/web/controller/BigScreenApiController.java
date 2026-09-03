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

import org.datagear.management.domain.BigScreenEntity;
import org.datagear.management.service.BigScreenService;
import org.datagear.management.service.EntityService;
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
 * 数据大屏 API 控制器（{@code /api/bigScreen} 前缀）。
 * 
 * @author datagear@163.com
 *
 */
@Controller
@RequestMapping("/api/bigScreen")
public class BigScreenApiController extends AbstractEntityApiController<BigScreenEntity>
{
	@Autowired
	private BigScreenService bigScreenService;

	public BigScreenApiController()
	{
		super();
	}

	@Override
	protected EntityService<String, BigScreenEntity> getEntityService()
	{
		return this.bigScreenService;
	}

	@Override
	protected String getModuleName()
	{
		return "bigScreen";
	}

	@Override
	protected List<Map<String, Object>> buildMetaColumns(HttpServletRequest request)
	{
		List<Map<String, Object>> columns = new ArrayList<Map<String, Object>>();
		columns.add(column("id", "ID", true));
		columns.add(column("name", "名称", true));
		columns.add(column("description", "描述", false));
		columns.add(column("theme", "主题", false));
		columns.add(column("createTime", "创建时间", false));
		return columns;
	}

	@Override
	protected void checkSaveEntity(HttpServletRequest request, BigScreenEntity entity)
	{
		if (isBlank(entity.getName()))
			throw new IllegalInputException();
	}

	/**
	 * 获取大屏设计产物 JSON。
	 */
	@RequestMapping(value = "/getDesign/{id}", produces = CONTENT_TYPE_JSON)
	@ResponseBody
	public ResponseEntity<OperationMessage<String>> getDesign(HttpServletRequest request,
			@PathVariable("id") String id)
	{
		BigScreenEntity entity = this.bigScreenService.getById(id);
		if (entity == null)
			throw new IllegalInputException();

		String designJson = (entity.getDesignJson() == null ? "" : entity.getDesignJson());

		OperationMessage<String> om = OperationMessage.valueOfSuccess("operationSuccess",
				getMessage(request, "operationSuccess"), designJson);

		return new ResponseEntity<OperationMessage<String>>(om, HttpStatus.OK);
	}

	/**
	 * 保存大屏设计产物 JSON。
	 */
	@RequestMapping(value = "/saveDesign", produces = CONTENT_TYPE_JSON)
	@ResponseBody
	public ResponseEntity<OperationMessage<String>> saveDesign(HttpServletRequest request,
			@RequestBody BigScreenDesignForm form)
	{
		if (isEmpty(form.getId()))
			throw new IllegalInputException();

		BigScreenEntity entity = this.bigScreenService.getById(form.getId());
		if (entity == null)
			throw new IllegalInputException();

		entity.setDesignJson(form.getDesignJson() == null ? "" : form.getDesignJson());
		this.bigScreenService.update(entity);

		OperationMessage<String> om = OperationMessage.valueOfSuccess("operationSuccess",
				getMessage(request, "operationSuccess"), entity.getDesignJson());

		return new ResponseEntity<OperationMessage<String>>(om, HttpStatus.OK);
	}

	public BigScreenService getBigScreenService()
	{
		return bigScreenService;
	}

	public void setBigScreenService(BigScreenService bigScreenService)
	{
		this.bigScreenService = bigScreenService;
	}

	/** 大屏设计保存请求体 */
	public static class BigScreenDesignForm implements ControllerForm
	{
		private static final long serialVersionUID = 1L;

		private String id;

		private String designJson;

		public BigScreenDesignForm()
		{
			super();
		}

		public String getId()
		{
			return id;
		}

		public void setId(String id)
		{
			this.id = id;
		}

		public String getDesignJson()
		{
			return designJson;
		}

		public void setDesignJson(String designJson)
		{
			this.designJson = designJson;
		}
	}
}
