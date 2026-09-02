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
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import javax.servlet.http.HttpServletRequest;

import org.datagear.management.domain.User;
import org.datagear.web.security.ModulePermissions;
import org.datagear.web.util.OperationMessage;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseBody;

/**
 * 认证/权限元数据 API 控制器（{@code /api/auth} 前缀）。
 * <p>
 * 阶段二新增：{@code GET /api/auth/me} 返回当前用户、角色、模块可见权限，
 * 替代 main.ftl 的 {@code modulePermissions} 模板注入（见《方案》§5.1.7）。
 * </p>
 * 
 * @author datagear@163.com
 *
 */
@Controller
@RequestMapping("/api/auth")
public class AuthApiController extends AbstractController
{
	public AuthApiController()
	{
		super();
	}

	/**
	 * 返回当前用户、角色、模块可见权限。
	 * 
	 * @param request
	 * @return
	 */
	@RequestMapping(value = "/me", produces = CONTENT_TYPE_JSON)
	@ResponseBody
	public ResponseEntity<OperationMessage<Map<String, Object>>> me(HttpServletRequest request)
	{
		Authentication auth = getCurrentAuthentication();
		User user = getCurrentUser();

		boolean anonymous = getAuthenticationSecurity().isAnonymous(auth);
		// 与 AbstractController.isReadonlyAction 等价：匿名用户只能只读，数据管理员可写
		boolean readonlyAction = !getAuthenticationSecurity().hasDataManager(auth);
		ModulePermissions modulePermissions = getAuthenticationSecurity().resolveModulePermissions(auth);

		Map<String, Object> userMap = new HashMap<String, Object>();
		userMap.put("id", user.getId());
		userMap.put("name", user.getName());
		userMap.put("realName", user.getRealName());
		userMap.put("admin", user.isAdmin());
		userMap.put("anonymous", anonymous);

		Collection<? extends GrantedAuthority> authorities = auth.getAuthorities();
		List<String> roles = new ArrayList<String>(authorities.size());
		for (GrantedAuthority ga : authorities)
			roles.add(ga.getAuthority());

		Map<String, Object> data = new HashMap<String, Object>();
		data.put("user", userMap);
		data.put("roles", roles);
		data.put("anonymous", anonymous);
		data.put("readonlyAction", readonlyAction);
		data.put("modulePermissions", modulePermissions);

		OperationMessage<Map<String, Object>> om = OperationMessage.valueOfSuccess("operationSuccess",
				getMessage(request, "operationSuccess"), data);

		return new ResponseEntity<OperationMessage<Map<String, Object>>>(om, HttpStatus.OK);
	}
}
