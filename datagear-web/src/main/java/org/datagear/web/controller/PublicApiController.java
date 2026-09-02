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

import java.io.IOException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import javax.servlet.http.HttpServletRequest;

import org.datagear.util.Global;
import org.datagear.util.version.ChangelogResolver;
import org.datagear.util.version.Version;
import org.datagear.util.version.VersionContent;
import org.datagear.web.util.OperationMessage;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseBody;

/**
 * 公共只读 API（{@code /api/about}、{@code /api/changelog}），替代旧 about.ftl / changelog.ftl。
 * 
 * @author datagear@163.com
 *
 */
@Controller
public class PublicApiController extends AbstractController
{
	@Autowired
	private ChangelogResolver changelogResolver;

	public PublicApiController()
	{
		super();
	}

	@RequestMapping(value = "/api/about", produces = CONTENT_TYPE_JSON)
	@ResponseBody
	public ResponseEntity<OperationMessage<Map<String, Object>>> about(HttpServletRequest request)
	{
		Map<String, Object> data = new HashMap<String, Object>();
		data.put("name", Global.PRODUCT_NAME_EN);
		data.put("version", Global.VERSION);

		OperationMessage<Map<String, Object>> om = OperationMessage.valueOfSuccess("operationSuccess",
				getMessage(request, "operationSuccess"), data);

		return new ResponseEntity<OperationMessage<Map<String, Object>>>(om, HttpStatus.OK);
	}

	@RequestMapping(value = "/api/changelog", produces = CONTENT_TYPE_JSON)
	@ResponseBody
	public ResponseEntity<OperationMessage<List<VersionContent>>> changelog(HttpServletRequest request) throws IOException
	{
		List<VersionContent> versionChangelogs = this.changelogResolver.resolveAll();

		if (versionChangelogs == null)
			versionChangelogs = new ArrayList<VersionContent>();

		OperationMessage<List<VersionContent>> om = OperationMessage.valueOfSuccess("operationSuccess",
				getMessage(request, "operationSuccess"), versionChangelogs);

		return new ResponseEntity<OperationMessage<List<VersionContent>>>(om, HttpStatus.OK);
	}

	@SuppressWarnings("unused")
	private Version getLatestVersion() throws Exception
	{
		return Version.valueOf(Global.VERSION);
	}

	public ChangelogResolver getChangelogResolver()
	{
		return changelogResolver;
	}

	public void setChangelogResolver(ChangelogResolver changelogResolver)
	{
		this.changelogResolver = changelogResolver;
	}
}
