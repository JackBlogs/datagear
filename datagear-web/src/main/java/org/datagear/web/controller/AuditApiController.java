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

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import javax.servlet.http.HttpServletRequest;

import org.datagear.management.domain.AuditLogEntity;
import org.datagear.management.service.AuditLogService;
import org.datagear.web.util.OperationMessage;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseBody;

/**
 * 审计日志 API 控制器（{@code /api/management/audit} 前缀，FR-AUTH-12~14）。
 * <p>
 * 契约对齐 prototypev2 mock-api：{@code GET /management/audit/list?op=} 返回 {@code {total, rows}}。
 * </p>
 *
 * @author datagear@163.com
 *
 */
@Controller
@RequestMapping("/api/management/audit")
public class AuditApiController extends AbstractController
{
	@Autowired
	private AuditLogService auditLogService;

	public AuditApiController()
	{
		super();
	}

	public AuditLogService getAuditLogService()
	{
		return auditLogService;
	}

	public void setAuditLogService(AuditLogService auditLogService)
	{
		this.auditLogService = auditLogService;
	}

	@RequestMapping(value = "/list", produces = CONTENT_TYPE_JSON)
	@ResponseBody
	public ResponseEntity<OperationMessage<Map<String, Object>>> list(HttpServletRequest request,
			@RequestParam(value = "op", required = false) String op)
	{
		List<AuditLogEntity> rows = this.auditLogService.listByOp(op, 200);

		Map<String, Object> data = new HashMap<String, Object>();
		data.put("total", rows.size());
		data.put("rows", rows);

		OperationMessage<Map<String, Object>> om = OperationMessage.valueOfSuccess("operationSuccess",
				getMessage(request, "operationSuccess"), data);

		return new ResponseEntity<OperationMessage<Map<String, Object>>>(om, HttpStatus.OK);
	}
}
