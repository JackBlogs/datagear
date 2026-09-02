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
import java.util.Arrays;
import java.util.List;
import java.util.Map;

import javax.servlet.http.HttpServletRequest;

import org.datagear.management.domain.User;
import org.datagear.management.service.EntityService;
import org.datagear.management.service.UserService;
import org.datagear.util.IDUtil;
import org.datagear.web.util.OperationMessage;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseBody;

/**
 * 用户管理 API 控制器（{@code /api/user} 前缀）。
 * 
 * @author datagear@163.com
 *
 */
@Controller
@RequestMapping("/api/user")
public class UserApiController extends AbstractEntityApiController<User>
{
	@Autowired
	private UserService userService;

	public UserApiController()
	{
		super();
	}

	@Override
	protected EntityService<String, User> getEntityService()
	{
		return this.userService;
	}

	@Override
	protected String getModuleName()
	{
		return "user";
	}

	@Override
	protected List<Map<String, Object>> buildMetaColumns(HttpServletRequest request)
	{
		List<Map<String, Object>> columns = new ArrayList<Map<String, Object>>();
		columns.add(column("id", "ID", true));
		columns.add(column("name", "用户名", true));
		columns.add(column("realName", "姓名", true));
		columns.add(column("email", "邮箱", false));
		columns.add(column("admin", "管理员", false));
		return columns;
	}

	/**
	 * 保存用户（新增或更新）。新增强制要求密码、强制禁用新建管理员、校验用户名唯一。
	 * 
	 * @param request
	 * @param entity
	 * @return
	 */
	@Override
	@RequestMapping(value = "/save", produces = CONTENT_TYPE_JSON)
	@ResponseBody
	public ResponseEntity<OperationMessage<User>> save(HttpServletRequest request, @RequestBody User entity)
	{
		boolean add = isEmpty(entity.getId());
		if (add)
			entity.setId(IDUtil.randomIdOnTime20());

		// 禁用新建管理员账号功能
		entity.setAdmin(User.isAdminUser(entity));
		if (add)
			inflateCreateTime(entity);

		if (isBlank(entity.getName()))
			throw new IllegalInputException();

		if (add && isBlank(entity.getPassword()))
			throw new IllegalInputException();

		User namedEntity = this.userService.getByNameNoPassword(entity.getName());
		if (namedEntity != null && !namedEntity.getId().equals(entity.getId()))
		{
			String message = getMessage(request, "usernameExists", entity.getName());
			OperationMessage<User> failOm = OperationMessage.valueOfFail("usernameExists", message);
			return new ResponseEntity<OperationMessage<User>>(failOm, HttpStatus.BAD_REQUEST);
		}

		if (add)
			this.userService.add(entity);
		else
			this.userService.update(entity);

		entity.clearPassword();

		OperationMessage<User> om = OperationMessage.valueOfSuccess("operationSuccess",
				getMessage(request, "operationSuccess"), entity);
		return new ResponseEntity<OperationMessage<User>>(om, HttpStatus.OK);
	}

	/**
	 * 删除用户（将其创建的业务数据迁移至目标用户）。
	 * 
	 * @param request
	 * @param form
	 * @return
	 */
	@RequestMapping(value = "/delete", produces = CONTENT_TYPE_JSON)
	@ResponseBody
	public ResponseEntity<OperationMessage> delete(HttpServletRequest request, @RequestBody DeleteUserForm form)
	{
		if (isEmpty(form.getIds()) || isEmpty(form.getMigrateToId()))
			throw new IllegalInputException();

		if (Arrays.asList(form.getIds()).contains(form.getMigrateToId()))
			return optFailResponseEntity(request, HttpStatus.BAD_REQUEST, "deleteUserCanNotBeMigrateUser");

		if (User.containsAdminUser(form.getIds()))
			return optFailResponseEntity(request, HttpStatus.BAD_REQUEST, "deleteAdminUserDenied");

		User user = this.userService.getById(form.getMigrateToId());
		if (user == null)
			throw new IllegalInputException();

		this.userService.deleteByIds(form.getIds(), form.getMigrateToId());

		return optSuccessResponseEntity(request);
	}

	@Override
	protected void toFormResponseData(HttpServletRequest request, User entity)
	{
		entity.clearPassword();
	}

	/**
	 * 修改用户密码（管理员，替代旧 /user/saveEditPsd）。
	 */
	@RequestMapping(value = "/password", produces = CONTENT_TYPE_JSON)
	@ResponseBody
	public ResponseEntity<OperationMessage> password(HttpServletRequest request, @RequestBody ChangePasswordForm form)
	{
		if (isEmpty(form.getId()) || isBlank(form.getPassword()))
			throw new IllegalInputException();

		this.userService.updatePasswordById(form.getId(), form.getPassword(), true);

		return optSuccessResponseEntity(request);
	}

	/** 修改密码请求体 */
	public static class ChangePasswordForm
	{
		private static final long serialVersionUID = 1L;

		private String id;

		private String password;

		public ChangePasswordForm()
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

		public String getPassword()
		{
			return password;
		}

		public void setPassword(String password)
		{
			this.password = password;
		}
	}

	/** 删除用户请求体（待删用户 + 业务数据迁移目标用户） */
	public static class DeleteUserForm
	{
		private static final long serialVersionUID = 1L;

		private String[] ids;

		private String migrateToId;

		public DeleteUserForm()
		{
			super();
		}

		public String[] getIds()
		{
			return ids;
		}

		public void setIds(String[] ids)
		{
			this.ids = ids;
		}

		public String getMigrateToId()
		{
			return migrateToId;
		}

		public void setMigrateToId(String migrateToId)
		{
			this.migrateToId = migrateToId;
		}
	}

	public UserService getUserService()
	{
		return userService;
	}

	public void setUserService(UserService userService)
	{
		this.userService = userService;
	}
}
