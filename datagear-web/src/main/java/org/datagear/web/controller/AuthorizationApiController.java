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

import org.datagear.management.domain.Authorization;
import org.datagear.management.domain.User;
import org.datagear.management.service.AuthorizationService;
import org.datagear.management.service.PermissionDeniedException;
import org.datagear.management.service.impl.AuthorizationQueryContext;
import org.datagear.management.service.impl.EnumValueLabel;
import org.datagear.management.util.PagingQuery;
import org.datagear.util.IDUtil;
import org.datagear.web.util.AuthorizationResMetaManager;
import org.datagear.web.util.AuthorizationResMetaManager.PermissionMeta;
import org.datagear.web.util.AuthorizationResMetaManager.ResourceMeta;
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
 * 资源授权 API 控制器（{@code /api/authorization/{resourceType}/{resource}} 前缀）。
 * 
 * @author datagear@163.com
 *
 */
@Controller
@RequestMapping("/api/authorization")
public class AuthorizationApiController extends AbstractController
{
	@Autowired
	private AuthorizationService authorizationService;

	@Autowired
	private AuthorizationResMetaManager authorizationResMetaManager;

	public AuthorizationApiController()
	{
		super();
	}

	/**
	 * 授权资源元信息（权限选项）。
	 */
	@RequestMapping(value = "/{resourceType}/{resource}/meta", produces = CONTENT_TYPE_JSON)
	@ResponseBody
	public ResponseEntity<OperationMessage<Map<String, Object>>> meta(HttpServletRequest request,
			@PathVariable("resourceType") String resourceType, @PathVariable("resource") String resource)
	{
		checkIsAllowAuthorization(resourceType, resource);

		ResourceMeta rm = getResourceMetaNonNull(resourceType);

		List<Map<String, Object>> permissions = new ArrayList<Map<String, Object>>();
		for (PermissionMeta pm : rm.getPermissionMetas())
		{
			Map<String, Object> p = new HashMap<String, Object>();
			p.put("permission", pm.getPermission());
			p.put("label", getMessage(request, pm.getPermissionLabel()));
			permissions.add(p);
		}

		Map<String, Object> data = new HashMap<String, Object>();
		data.put("resourceType", resourceType);
		data.put("resource", resource);
		data.put("permissions", permissions);

		OperationMessage<Map<String, Object>> om = OperationMessage.valueOfSuccess("operationSuccess",
				getMessage(request, "operationSuccess"), data);

		return new ResponseEntity<OperationMessage<Map<String, Object>>>(om, HttpStatus.OK);
	}

	/**
	 * 授权列表。
	 */
	@RequestMapping(value = "/{resourceType}/{resource}/list", produces = CONTENT_TYPE_JSON)
	@ResponseBody
	public ResponseEntity<OperationMessage<List<Authorization>>> list(HttpServletRequest request,
			@PathVariable("resourceType") String resourceType, @PathVariable("resource") String resource)
	{
		checkIsAllowAuthorization(resourceType, resource);

		setAuthorizationQueryContext(request, resourceType, resource);

		List<Authorization> items = this.authorizationService.query(new PagingQuery());

		OperationMessage<List<Authorization>> om = OperationMessage.valueOfSuccess("operationSuccess",
				getMessage(request, "operationSuccess"), items);

		return new ResponseEntity<OperationMessage<List<Authorization>>>(om, HttpStatus.OK);
	}

	/**
	 * 保存授权（新增或更新）。
	 */
	@RequestMapping(value = "/{resourceType}/{resource}/save", produces = CONTENT_TYPE_JSON)
	@ResponseBody
	public ResponseEntity<OperationMessage<Authorization>> save(HttpServletRequest request,
			@PathVariable("resourceType") String resourceType, @PathVariable("resource") String resource,
			@RequestBody Authorization entity)
	{
		checkIsAllowAuthorization(resourceType, resource);

		boolean add = isEmpty(entity.getId());
		if (add)
			entity.setId(IDUtil.randomIdOnTime20());

		entity.setResourceType(resourceType);
		entity.setResource(resource);

		checkSaveEntity(entity);

		if (add)
			this.authorizationService.add(entity);
		else
			this.authorizationService.update(entity);

		OperationMessage<Authorization> om = OperationMessage.valueOfSuccess("operationSuccess",
				getMessage(request, "operationSuccess"), entity);

		return new ResponseEntity<OperationMessage<Authorization>>(om, HttpStatus.OK);
	}

	/**
	 * 删除授权。
	 */
	@RequestMapping(value = "/{resourceType}/{resource}/delete", produces = CONTENT_TYPE_JSON)
	@ResponseBody
	public ResponseEntity<OperationMessage> delete(HttpServletRequest request,
			@PathVariable("resourceType") String resourceType, @PathVariable("resource") String resource,
			@RequestBody String[] ids)
	{
		checkIsAllowAuthorization(resourceType, resource);

		if (isEmpty(ids))
			throw new IllegalInputException();

		this.authorizationService.deleteByIds(resourceType, resource, ids);

		return optSuccessResponseEntity(request);
	}

	protected void checkIsAllowAuthorization(String resourceType, String resource)
	{
		User user = getCurrentUser();
		if (!this.authorizationService.isAllowAuthorization(user, resourceType, resource))
			throw new PermissionDeniedException();
	}

	protected ResourceMeta getResourceMetaNonNull(String resourceType)
	{
		ResourceMeta rm = this.authorizationResMetaManager.get(resourceType);
		if (rm == null)
			throw new IllegalInputException();
		return rm;
	}

	protected void checkSaveEntity(Authorization entity)
	{
		if (isEmpty(entity.getId()) || isEmpty(entity.getResource()) || isEmpty(entity.getResourceType())
				|| isEmpty(entity.getPrincipal()) || isEmpty(entity.getPrincipalType())
				|| entity.getPermission() < Authorization.PERMISSION_MIN
				|| entity.getPermission() > Authorization.PERMISSION_MAX)
			throw new IllegalInputException();
	}

	protected void setAuthorizationQueryContext(HttpServletRequest request, String resourceType, String resource)
	{
		ResourceMeta rm = getResourceMetaNonNull(resourceType);

		AuthorizationQueryContext context = new AuthorizationQueryContext();
		context.setPrincipalAllLabel(getMessage(request, "authorization.principalType.ALL"));
		context.setPrincipalAnonymousLabel(getMessage(request, "authorization.principalType.ANONYMOUS"));
		context.setResourceType(resourceType);
		context.setResource(resource);

		PermissionMeta[] pms = rm.getPermissionMetas();
		EnumValueLabel<Integer>[] permissionLabels = new EnumValueLabel[pms.length];
		for (int i = 0; i < pms.length; i++)
			permissionLabels[i] = new EnumValueLabel<Integer>(pms[i].getPermission(),
					getMessage(request, pms[i].getPermissionLabel()));
		context.setPermissionLabels(permissionLabels);

		AuthorizationQueryContext.set(context);
	}

	public AuthorizationService getAuthorizationService()
	{
		return authorizationService;
	}

	public void setAuthorizationService(AuthorizationService authorizationService)
	{
		this.authorizationService = authorizationService;
	}

	public AuthorizationResMetaManager getAuthorizationResMetaManager()
	{
		return authorizationResMetaManager;
	}

	public void setAuthorizationResMetaManager(AuthorizationResMetaManager authorizationResMetaManager)
	{
		this.authorizationResMetaManager = authorizationResMetaManager;
	}
}
