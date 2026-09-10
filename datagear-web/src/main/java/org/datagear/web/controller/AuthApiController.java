/*
 * Copyright 2018-present datagear.tech
 *
 * This file is part of DataGear.
 *
 * DataGear is free software: you can redistribute it and/or modify it under the terms of
 * the GNU Lesser General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
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
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import javax.servlet.http.HttpServletRequest;

import org.datagear.management.domain.AuditLogEntity;
import org.datagear.management.domain.MaskRuleEntity;
import org.datagear.management.domain.RowPermEntity;
import org.datagear.management.domain.User;
import org.datagear.management.service.MaskRuleService;
import org.datagear.management.service.RowPermService;
import org.datagear.util.IDUtil;
import org.datagear.web.metric.DataPermissionService;
import org.datagear.web.metric.MetricQueryEngine;
import org.datagear.web.security.ModulePermissions;
import org.datagear.web.util.OperationMessage;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseBody;

/**
 * 认证/权限 API 控制器（{@code /api/auth} 前缀）。
 * <p>
 * {@code GET /me} 返回当前用户、角色、模块可见权限；
 * 行列级数据权限端点（FR-AUTH-10/11，契约对齐 prototypev2 mock-api）：
 * {@code /rowperm/list|save|toggle/{id}|delete}、{@code /mask/list|save|toggle/{id}|delete}；
 * 权限变更写审计日志（FR-AUTH-12）。
 * </p>
 *
 * @author datagear@163.com
 *
 */
@Controller
@RequestMapping("/api/auth")
public class AuthApiController extends AbstractController
{
	@Autowired
	private RowPermService rowPermService;

	@Autowired
	private MaskRuleService maskRuleService;

	@Autowired
	private DataPermissionService dataPermissionService;

	public AuthApiController()
	{
		super();
	}

	public RowPermService getRowPermService()
	{
		return rowPermService;
	}

	public void setRowPermService(RowPermService rowPermService)
	{
		this.rowPermService = rowPermService;
	}

	public MaskRuleService getMaskRuleService()
	{
		return maskRuleService;
	}

	public void setMaskRuleService(MaskRuleService maskRuleService)
	{
		this.maskRuleService = maskRuleService;
	}

	public DataPermissionService getDataPermissionService()
	{
		return dataPermissionService;
	}

	public void setDataPermissionService(DataPermissionService dataPermissionService)
	{
		this.dataPermissionService = dataPermissionService;
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

	/* ==================== 行级权限（FR-AUTH-10） ==================== */

	@RequestMapping(value = "/rowperm/list", produces = CONTENT_TYPE_JSON)
	@ResponseBody
	public ResponseEntity<OperationMessage<List<RowPermEntity>>> rowPermList(HttpServletRequest request)
	{
		List<RowPermEntity> list = this.rowPermService.listAll();

		OperationMessage<List<RowPermEntity>> om = OperationMessage.valueOfSuccess("operationSuccess",
				getMessage(request, "operationSuccess"), list);

		return new ResponseEntity<OperationMessage<List<RowPermEntity>>>(om, HttpStatus.OK);
	}

	@RequestMapping(value = "/rowperm/save", produces = CONTENT_TYPE_JSON)
	@ResponseBody
	public ResponseEntity<OperationMessage<RowPermEntity>> rowPermSave(HttpServletRequest request,
			@RequestBody RowPermForm form)
	{
		if (form == null || isBlank(form.getName()) || isBlank(form.getResource()) || isBlank(form.getCond()))
			throw new IllegalInputException("规则名、资源与过滤条件不能为空");

		checkIdentifier(form.getTableName(), "数据表名");
		checkIdentifier(form.getFieldName(), "物理字段名");

		User user = getCurrentUser();

		RowPermEntity entity = (form.getId() == null || form.getId().isEmpty()) ? null
				: this.rowPermService.getById(form.getId());

		boolean add = (entity == null);

		if (add)
		{
			entity = new RowPermEntity(IDUtil.uuid());
			entity.setCreateTime(new Date());
			entity.setCreateUserId(user.getId());
		}

		entity.setName(form.getName());
		entity.setResource(form.getResource());
		entity.setCond(form.getCond());
		entity.setRolesJson(toRolesJson(form.getRoles()));
		entity.setTableName(isBlank(form.getTableName()) ? "" : form.getTableName());
		entity.setFieldName(isBlank(form.getFieldName()) ? "" : form.getFieldName());
		entity.setEnabled(1);

		if (add)
			this.rowPermService.add(entity);
		else
			this.rowPermService.update(entity);

		this.dataPermissionService.audit(request, AuditLogEntity.OP_PERM, user,
				"行级规则「" + entity.getName() + "」" + (add ? "新建" : "修改"));

		OperationMessage<RowPermEntity> om = OperationMessage.valueOfSuccess("operationSuccess",
				getMessage(request, "operationSuccess"), entity);

		return new ResponseEntity<OperationMessage<RowPermEntity>>(om, HttpStatus.OK);
	}

	@RequestMapping(value = "/rowperm/toggle/{id}", produces = CONTENT_TYPE_JSON)
	@ResponseBody
	public ResponseEntity<OperationMessage<Map<String, Object>>> rowPermToggle(HttpServletRequest request,
			@PathVariable("id") String id)
	{
		RowPermEntity entity = this.rowPermService.getById(id);

		if (entity == null)
			throw new RecordNotFoundException();

		boolean enabled = this.rowPermService.toggleEnabled(id);

		this.dataPermissionService.audit(request, AuditLogEntity.OP_PERM, getCurrentUser(),
				"行级规则「" + entity.getName() + "」" + (enabled ? "启用" : "停用"));

		OperationMessage<Map<String, Object>> om = OperationMessage.valueOfSuccess("operationSuccess",
				getMessage(request, "operationSuccess"), toEnabledData(enabled));

		return new ResponseEntity<OperationMessage<Map<String, Object>>>(om, HttpStatus.OK);
	}

	@RequestMapping(value = "/rowperm/delete", produces = CONTENT_TYPE_JSON)
	@ResponseBody
	public ResponseEntity<OperationMessage> rowPermDelete(HttpServletRequest request, @RequestBody String[] ids)
	{
		if (ids == null || ids.length == 0)
			throw new IllegalInputException();

		List<RowPermEntity> entities = filterByIds(this.rowPermService.listAll(), ids);

		this.rowPermService.deleteByIds(ids);

		User user = getCurrentUser();

		if (entities != null)
		{
			for (RowPermEntity entity : entities)
				this.dataPermissionService.audit(request, AuditLogEntity.OP_PERM, user,
						"行级规则「" + entity.getName() + "」删除");
		}

		return optSuccessResponseEntity(request);
	}

	/* ==================== 动态脱敏（FR-AUTH-11） ==================== */

	@RequestMapping(value = "/mask/list", produces = CONTENT_TYPE_JSON)
	@ResponseBody
	public ResponseEntity<OperationMessage<List<MaskRuleEntity>>> maskList(HttpServletRequest request)
	{
		List<MaskRuleEntity> list = this.maskRuleService.listAll();

		OperationMessage<List<MaskRuleEntity>> om = OperationMessage.valueOfSuccess("operationSuccess",
				getMessage(request, "operationSuccess"), list);

		return new ResponseEntity<OperationMessage<List<MaskRuleEntity>>>(om, HttpStatus.OK);
	}

	@RequestMapping(value = "/mask/save", produces = CONTENT_TYPE_JSON)
	@ResponseBody
	public ResponseEntity<OperationMessage<MaskRuleEntity>> maskSave(HttpServletRequest request,
			@RequestBody MaskForm form)
	{
		if (form == null || isBlank(form.getField()))
			throw new IllegalInputException("脱敏字段不能为空");

		checkIdentifier(form.getTableName(), "数据表名");
		checkIdentifier(form.getFieldName(), "物理字段名");

		User user = getCurrentUser();

		MaskRuleEntity entity = (form.getId() == null || form.getId().isEmpty()) ? null
				: this.maskRuleService.getById(form.getId());

		boolean add = (entity == null);

		if (add)
		{
			entity = new MaskRuleEntity(IDUtil.uuid());
			entity.setCreateTime(new Date());
			entity.setCreateUserId(user.getId());
		}

		entity.setField(form.getField());
		entity.setTableName(isBlank(form.getTableName()) ? "" : form.getTableName());
		entity.setFieldName(isBlank(form.getFieldName()) ? "" : form.getFieldName());
		entity.setAlgo(isBlank(form.getAlgo()) ? MaskRuleEntity.ALGO_MASK : form.getAlgo());
		entity.setSample(isBlank(form.getSample()) ? "" : form.getSample());
		entity.setRoles(isBlank(form.getRoles()) ? "" : form.getRoles());
		entity.setEnabled(1);

		if (add)
			this.maskRuleService.add(entity);
		else
			this.maskRuleService.update(entity);

		this.dataPermissionService.audit(request, AuditLogEntity.OP_PERM, user,
				"脱敏规则「" + entity.getField() + "」" + (add ? "新建" : "修改"));

		OperationMessage<MaskRuleEntity> om = OperationMessage.valueOfSuccess("operationSuccess",
				getMessage(request, "operationSuccess"), entity);

		return new ResponseEntity<OperationMessage<MaskRuleEntity>>(om, HttpStatus.OK);
	}

	@RequestMapping(value = "/mask/toggle/{id}", produces = CONTENT_TYPE_JSON)
	@ResponseBody
	public ResponseEntity<OperationMessage<Map<String, Object>>> maskToggle(HttpServletRequest request,
			@PathVariable("id") String id)
	{
		MaskRuleEntity entity = this.maskRuleService.getById(id);

		if (entity == null)
			throw new RecordNotFoundException();

		boolean enabled = this.maskRuleService.toggleEnabled(id);

		this.dataPermissionService.audit(request, AuditLogEntity.OP_PERM, getCurrentUser(),
				"脱敏规则「" + entity.getField() + "」" + (enabled ? "启用" : "停用"));

		OperationMessage<Map<String, Object>> om = OperationMessage.valueOfSuccess("operationSuccess",
				getMessage(request, "operationSuccess"), toEnabledData(enabled));

		return new ResponseEntity<OperationMessage<Map<String, Object>>>(om, HttpStatus.OK);
	}

	@RequestMapping(value = "/mask/delete", produces = CONTENT_TYPE_JSON)
	@ResponseBody
	public ResponseEntity<OperationMessage> maskDelete(HttpServletRequest request, @RequestBody String[] ids)
	{
		if (ids == null || ids.length == 0)
			throw new IllegalInputException();

		List<MaskRuleEntity> entities = filterByIds(this.maskRuleService.listAll(), ids);

		this.maskRuleService.deleteByIds(ids);

		User user = getCurrentUser();

		if (entities != null)
		{
			for (MaskRuleEntity entity : entities)
				this.dataPermissionService.audit(request, AuditLogEntity.OP_PERM, user,
						"脱敏规则「" + entity.getField() + "」删除");
		}

		return optSuccessResponseEntity(request);
	}

	protected <T extends org.datagear.management.domain.Entity<String>> List<T> filterByIds(List<T> all, String[] ids)
	{
		List<T> result = new ArrayList<T>();

		if (all == null || ids == null)
			return result;

		for (T entity : all)
		{
			for (String id : ids)
			{
				if (entity.getId() != null && entity.getId().equals(id))
				{
					result.add(entity);
					break;
				}
			}
		}

		return result;
	}

	protected Map<String, Object> toEnabledData(boolean enabled)
	{
		Map<String, Object> data = new HashMap<String, Object>();
		data.put("enabled", enabled);
		return data;
	}

	protected void checkIdentifier(String identifier, String label)
	{
		if (isBlank(identifier))
			return;

		if (!MetricQueryEngine.PATTERN_IDENTIFIER.matcher(identifier).matches())
			throw new IllegalInputException("非法" + label + " : " + identifier);
	}

	protected String toRolesJson(List<String> roles)
	{
		if (roles == null || roles.isEmpty())
			return "[]";

		StringBuilder sb = new StringBuilder("[");

		for (int i = 0; i < roles.size(); i++)
		{
			if (i > 0)
				sb.append(",");
			sb.append("\"").append(roles.get(i).replace("\"", "\\\"")).append("\"");
		}

		return sb.append("]").toString();
	}

	public static class RowPermForm
	{
		private String id;
		private String name;
		private String resource;
		private String cond;
		private List<String> roles;
		private String tableName = "";
		private String fieldName = "";

		public String getId()
		{
			return id;
		}

		public void setId(String id)
		{
			this.id = id;
		}

		public String getName()
		{
			return name;
		}

		public void setName(String name)
		{
			this.name = name;
		}

		public String getResource()
		{
			return resource;
		}

		public void setResource(String resource)
		{
			this.resource = resource;
		}

		public String getCond()
		{
			return cond;
		}

		public void setCond(String cond)
		{
			this.cond = cond;
		}

		public List<String> getRoles()
		{
			return roles;
		}

		public void setRoles(List<String> roles)
		{
			this.roles = roles;
		}

		public String getTableName()
		{
			return tableName;
		}

		public void setTableName(String tableName)
		{
			this.tableName = tableName;
		}

		public String getFieldName()
		{
			return fieldName;
		}

		public void setFieldName(String fieldName)
		{
			this.fieldName = fieldName;
		}
	}

	public static class MaskForm
	{
		private String id;
		private String field;
		private String tableName = "";
		private String fieldName = "";
		private String algo;
		private String sample;
		private String roles;

		public String getId()
		{
			return id;
		}

		public void setId(String id)
		{
			this.id = id;
		}

		public String getField()
		{
			return field;
		}

		public void setField(String field)
		{
			this.field = field;
		}

		public String getTableName()
		{
			return tableName;
		}

		public void setTableName(String tableName)
		{
			this.tableName = tableName;
		}

		public String getFieldName()
		{
			return fieldName;
		}

		public void setFieldName(String fieldName)
		{
			this.fieldName = fieldName;
		}

		public String getAlgo()
		{
			return algo;
		}

		public void setAlgo(String algo)
		{
			this.algo = algo;
		}

		public String getSample()
		{
			return sample;
		}

		public void setSample(String sample)
		{
			this.sample = sample;
		}

		public String getRoles()
		{
			return roles;
		}

		public void setRoles(String roles)
		{
			this.roles = roles;
		}
	}
}
