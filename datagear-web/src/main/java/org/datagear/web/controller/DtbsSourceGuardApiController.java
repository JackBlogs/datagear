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

import org.datagear.management.domain.DtbsSourceGuard;
import org.datagear.management.service.DtbsSourceGuardService;
import org.datagear.management.service.EntityService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;

/**
 * 数据源防护 API 控制器（{@code /api/dtbsSourceGuard} 前缀）。
 * 
 * @author datagear@163.com
 *
 */
@Controller
@RequestMapping("/api/dtbsSourceGuard")
public class DtbsSourceGuardApiController extends AbstractEntityApiController<DtbsSourceGuard>
{
	@Autowired
	private DtbsSourceGuardService dtbsSourceGuardService;

	public DtbsSourceGuardApiController()
	{
		super();
	}

	@Override
	protected EntityService<String, DtbsSourceGuard> getEntityService()
	{
		return this.dtbsSourceGuardService;
	}

	@Override
	protected String getModuleName()
	{
		return "dtbsSourceGuard";
	}

	@Override
	protected List<Map<String, Object>> buildMetaColumns(HttpServletRequest request)
	{
		List<Map<String, Object>> columns = new ArrayList<Map<String, Object>>();
		columns.add(column("id", "ID", true));
		columns.add(column("name", "名称", true));
		columns.add(column("pattern", "匹配模式", false));
		columns.add(column("permitted", "允许", false));
		columns.add(column("enabled", "启用", false));
		return columns;
	}

	public DtbsSourceGuardService getDtbsSourceGuardService()
	{
		return dtbsSourceGuardService;
	}

	public void setDtbsSourceGuardService(DtbsSourceGuardService dtbsSourceGuardService)
	{
		this.dtbsSourceGuardService = dtbsSourceGuardService;
	}
}
