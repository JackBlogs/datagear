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

import javax.servlet.http.HttpServletRequest;

import org.datagear.web.util.DriverInfo;
import org.datagear.web.util.DriverInfo.DefaultValue;
import org.datagear.web.util.DriverInfo.UrlTemplate;
import org.datagear.web.util.OperationMessage;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseBody;

/**
 * 数据源 JDBC URL 构建器 API（{@code /api/dtbsSourceUrlBuilder}）。
 * 
 * @author datagear@163.com
 *
 */
@Controller
@RequestMapping("/api/dtbsSourceUrlBuilder")
public class DtbsSourceUrlBuilderApiController extends AbstractController
{
	public DtbsSourceUrlBuilderApiController()
	{
		super();
	}

	/**
	 * 内置 URL 模板（dbType + template + 默认值）。
	 */
	@RequestMapping(value = "/builders", produces = CONTENT_TYPE_JSON)
	@ResponseBody
	public ResponseEntity<OperationMessage<List<DbTypeUrlTemplate>>> builders(HttpServletRequest request)
	{
		List<DbTypeUrlTemplate> items = new ArrayList<DbTypeUrlTemplate>();

		List<DriverInfo> driverInfos = DriverInfo.getCommonInDriverInfos();
		if (driverInfos != null)
		{
			for (DriverInfo driverInfo : driverInfos)
			{
				UrlTemplate urlTemplate = driverInfo.getUrlTemplate();
				if (isEmpty(driverInfo.getName()) || isEmpty(urlTemplate) || isEmpty(urlTemplate.getTemplate()))
					continue;

				DbTypeUrlTemplate nt = new DbTypeUrlTemplate(driverInfo.getName(), urlTemplate.getTemplate());
				if (urlTemplate.getDefaultValue() != null)
					nt.setDefaultValue(new DefaultValue(urlTemplate.getDefaultValue()));
				items.add(nt);
			}
		}

		OperationMessage<List<DbTypeUrlTemplate>> om = OperationMessage.valueOfSuccess("operationSuccess",
				getMessage(request, "operationSuccess"), items);

		return new ResponseEntity<OperationMessage<List<DbTypeUrlTemplate>>>(om, HttpStatus.OK);
	}

	public static class DbTypeUrlTemplate extends UrlTemplate
	{
		private static final long serialVersionUID = 1L;

		private String dbType = "";

		public DbTypeUrlTemplate()
		{
			super();
		}

		public DbTypeUrlTemplate(String dbType, String template)
		{
			super(template);
			this.dbType = dbType;
		}

		public String getDbType()
		{
			return dbType;
		}

		public void setDbType(String dbType)
		{
			this.dbType = dbType;
		}
	}
}
