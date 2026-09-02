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

import org.datagear.management.domain.FileSource;
import org.datagear.management.service.DataPermissionEntityService;
import org.datagear.management.service.FileSourceService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;

/**
 * 文件源管理 API 控制器（{@code /api/fileSource} 前缀）。
 * 
 * @author datagear@163.com
 *
 */
@Controller
@RequestMapping("/api/fileSource")
public class FileSourceApiController extends AbstractDataPermissionApiController<FileSource>
{
	@Autowired
	private FileSourceService fileSourceService;

	public FileSourceApiController()
	{
		super();
	}

	@Override
	protected DataPermissionEntityService<String, FileSource> getDataPermissionEntityService()
	{
		return this.fileSourceService;
	}

	@Override
	protected String getModuleName()
	{
		return "fileSource";
	}

	@Override
	protected List<Map<String, Object>> buildMetaColumns(HttpServletRequest request)
	{
		List<Map<String, Object>> columns = new ArrayList<Map<String, Object>>();
		columns.add(column("id", "ID", true));
		columns.add(column("name", "名称", true));
		columns.add(column("directory", "目录", false));
		columns.add(column("description", "描述", false));
		return columns;
	}

	public FileSourceService getFileSourceService()
	{
		return fileSourceService;
	}

	public void setFileSourceService(FileSourceService fileSourceService)
	{
		this.fileSourceService = fileSourceService;
	}
}
