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
import java.io.InputStream;
import java.io.OutputStream;
import java.util.HashMap;
import java.util.Map;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.datagear.util.IOUtil;
import org.datagear.util.StringUtil;
import org.datagear.web.config.ApplicationProperties;
import org.datagear.web.security.ModulePermissions;
import org.datagear.web.util.DetectNewVersionScriptResolver;
import org.datagear.web.util.WelcomeContentLoader;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseBody;
import org.springframework.web.context.request.WebRequest;

/**
 * 主页控制器。
 * 
 * @author datagear@163.com
 *
 */
@Controller
public class MainController extends AbstractController
{
	public static final String FAVICON_CLASS_PATH = "org/datagear/web/static/image/favicon.ico";

	@Autowired
	private ApplicationProperties applicationProperties;

	@Autowired
	private DetectNewVersionScriptResolver detectNewVersionScriptResolver;

	@Autowired
	private WelcomeContentLoader welcomeContentLoader;

	public MainController()
	{
		super();
	}

	public ApplicationProperties getApplicationProperties()
	{
		return applicationProperties;
	}

	public void setApplicationProperties(ApplicationProperties applicationProperties)
	{
		this.applicationProperties = applicationProperties;
	}

	public DetectNewVersionScriptResolver getDetectNewVersionScriptResolver()
	{
		return detectNewVersionScriptResolver;
	}

	public void setDetectNewVersionScriptResolver(DetectNewVersionScriptResolver detectNewVersionScriptResolver)
	{
		this.detectNewVersionScriptResolver = detectNewVersionScriptResolver;
	}

	public WelcomeContentLoader getWelcomeContentLoader()
	{
		return welcomeContentLoader;
	}

	public void setWelcomeContentLoader(WelcomeContentLoader welcomeContentLoader)
	{
		this.welcomeContentLoader = welcomeContentLoader;
	}

	/**
	 * 打开主页面（SPA，转发到 index.html）。
	 * 
	 * @param request
	 * @param model
	 * @return
	 */
	@RequestMapping({ "", "/" })
	public String main(HttpServletRequest request, HttpServletResponse response, Model model)
	{
		return "forward:/index.html";
	}

	/**
	 * SPA 前端路由回落：非 API/静态/冻结面的深层链接转发到 index.html（Vue Router history 模式）。
	 * 
	 * @return
	 */
	@RequestMapping({ "/{path:[^\\.]*}", "/**/{path:[^\\.]*}" })
	public String forwardToIndex()
	{
		return "forward:/index.html";
	}

	@RequestMapping("/about")
	public String about(HttpServletRequest request)
	{
		return "forward:/index.html";
	}

	@RequestMapping(value = "/changeThemeData")
	public String changeThemeData(HttpServletRequest request, HttpServletResponse response)
	{
		response.setContentType(CONTENT_TYPE_JSON);

		return "/change_theme_data";
	}

	@RequestMapping(value = "/changeLocale", produces = CONTENT_TYPE_JSON)
	@ResponseBody
	public Object changeLocale(HttpServletRequest request, HttpServletResponse response)
	{
		Map<String, Object> map = new HashMap<>();
		map.put("status", "ok");
		return map;
	}
	
	@RequestMapping("/favicon.ico")
	public void favicon(HttpServletRequest request, HttpServletResponse response, WebRequest webRequest) throws IOException
	{
		ClassPathResource res = new ClassPathResource(FAVICON_CLASS_PATH, getClass().getClassLoader());
		
		long lastModified = 0;
		try
		{
			lastModified = res.lastModified();
		}
		catch(Throwable t)
		{
			lastModified = CONTROLLER_LOAD_TIME;
		}
		
		if (webRequest.checkNotModified(lastModified))
			return;

		response.setContentType("image/x-icon");
		setCacheControlNoCache(response);

		OutputStream out = response.getOutputStream();
		InputStream in = null;
		
		try
		{
			in = res.getInputStream();
			IOUtil.write(in, out);
		}
		finally
		{
			IOUtil.close(in);
		}
	}
}