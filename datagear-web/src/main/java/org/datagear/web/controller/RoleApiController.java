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

import org.datagear.management.domain.Role;
import org.datagear.management.service.EntityService;
import org.datagear.management.service.RoleService;
import org.datagear.web.util.OperationMessage;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseBody;

/**
 * 角色管理 API 控制器（{@code /api/role} 前缀）。
 * <p>
 * 阶段二“模范模块”切片：与旧 {@linkplain RoleController}（{@code /role} 前缀，供旧前端）双轨并存。
 * </p>
 * 
 * @author datagear@163.com
 *
 */
@Controller
@RequestMapping("/api/role")
public class RoleApiController extends AbstractEntityApiController<Role>
{
	@Autowired
	private RoleService roleService;

	public RoleApiController()
	{
		super();
	}

	@Override
	protected EntityService<String, Role> getEntityService()
	{
		return this.roleService;
	}

	@Override
	protected String getModuleName()
	{
		return "role";
	}

	@Override
	protected List<Map<String, Object>> buildMetaColumns(HttpServletRequest request)
	{
		List<Map<String, Object>> columns = new ArrayList<Map<String, Object>>();
		columns.add(column("id", "ID", true));
		columns.add(column("name", "名称", true));
		columns.add(column("description", "描述", false));
		columns.add(column("enabled", "启用", false));
		return columns;
	}

	@Override
	protected void checkSaveEntity(HttpServletRequest request, Role entity)
	{
		if (isBlank(entity.getName()))
			throw new IllegalInputException();
	}

	@RequestMapping(value = "/delete", produces = CONTENT_TYPE_JSON)
	@ResponseBody
	public ResponseEntity<OperationMessage> delete(HttpServletRequest request, @RequestBody String[] ids)
	{
		return deleteByIds(request, ids);
	}

	public RoleService getRoleService()
	{
		return roleService;
	}

	public void setRoleService(RoleService roleService)
	{
		this.roleService = roleService;
	}
}
