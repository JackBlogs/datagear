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

import org.datagear.connection.DriverEntity;
import org.datagear.connection.DriverEntityManager;
import org.datagear.util.IDUtil;
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
import org.springframework.web.multipart.MultipartFile;

/**
 * 数据库驱动程序 API 控制器（{@code /api/driverEntity} 前缀）。
 * <p>
 * 仅提供只读列表（驱动管理本身为连接层 {@linkplain DriverEntityManager}，非 EntityService）。
 * </p>
 * 
 * @author datagear@163.com
 *
 */
@Controller
@RequestMapping("/api/driverEntity")
public class DriverEntityApiController extends AbstractController
{
	@Autowired
	private DriverEntityManager driverEntityManager;

	@Autowired
	private DriverEntityController driverEntityController;

	public DriverEntityApiController()
	{
		super();
	}

	/**
	 * 上传驱动 jar 文件（替代旧 /driverEntity/uploadDriverFile）。
	 */
	@RequestMapping(value = "/uploadFile", produces = CONTENT_TYPE_JSON)
	@ResponseBody
	public Map<String, Object> uploadFile(HttpServletRequest request, @RequestParam("id") String id,
			@RequestParam("file") MultipartFile multipartFile) throws Exception
	{
		return this.driverEntityController.uploadDriverFile(request, id, multipartFile);
	}

	@RequestMapping(value = "/list", produces = CONTENT_TYPE_JSON)
	@ResponseBody
	public ResponseEntity<OperationMessage<List<DriverEntity>>> list(HttpServletRequest request)
	{
		List<DriverEntity> items = this.driverEntityManager.getAll();

		OperationMessage<List<DriverEntity>> om = OperationMessage.valueOfSuccess("operationSuccess",
				getMessage(request, "operationSuccess"), items);

		return new ResponseEntity<OperationMessage<List<DriverEntity>>>(om, HttpStatus.OK);
	}

	@RequestMapping(value = "/get/{id}", produces = CONTENT_TYPE_JSON)
	@ResponseBody
	public ResponseEntity<OperationMessage<DriverEntity>> get(HttpServletRequest request, @PathVariable("id") String id)
	{
		DriverEntity entity = this.driverEntityManager.get(id);
		checkNonNullEntity(entity);

		OperationMessage<DriverEntity> om = OperationMessage.valueOfSuccess("operationSuccess",
				getMessage(request, "operationSuccess"), entity);

		return new ResponseEntity<OperationMessage<DriverEntity>>(om, HttpStatus.OK);
	}

	@RequestMapping(value = "/save", produces = CONTENT_TYPE_JSON)
	@ResponseBody
	public ResponseEntity<OperationMessage<DriverEntity>> save(HttpServletRequest request,
			@RequestBody DriverEntity entity)
	{
		boolean add = isEmpty(entity.getId());

		if (add)
			entity.setId(IDUtil.randomIdOnTime20());

		if (isBlank(entity.getDriverClassName()))
			throw new IllegalInputException();

		if (add)
			this.driverEntityManager.add(entity);
		else
			this.driverEntityManager.update(entity);

		OperationMessage<DriverEntity> om = OperationMessage.valueOfSuccess("operationSuccess",
				getMessage(request, "operationSuccess"), entity);

		return new ResponseEntity<OperationMessage<DriverEntity>>(om, HttpStatus.OK);
	}

	@RequestMapping(value = "/delete", produces = CONTENT_TYPE_JSON)
	@ResponseBody
	public ResponseEntity<OperationMessage> delete(HttpServletRequest request, @RequestBody String[] ids)
	{
		if (isEmpty(ids))
			throw new IllegalInputException();

		this.driverEntityManager.delete(ids);

		return optSuccessResponseEntity(request);
	}

	public DriverEntityManager getDriverEntityManager()
	{
		return driverEntityManager;
	}

	public void setDriverEntityManager(DriverEntityManager driverEntityManager)
	{
		this.driverEntityManager = driverEntityManager;
	}
}
