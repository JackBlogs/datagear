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

package org.datagear.web.config;

import java.util.List;

import org.datagear.util.Global;
import org.datagear.util.IOUtil;
import org.datagear.web.config.support.ClearCssCommentResourceTransformer;
import org.datagear.web.config.support.ClearJsCommentResourceTransformer;
import org.datagear.web.config.support.CustomErrorPageRegistrar;
import org.datagear.web.config.support.EnumCookieThemeResolver;
import org.datagear.web.util.ThemeSpec;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.web.server.ErrorPageRegistrar;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.converter.HttpMessageConverter;
import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter;
import org.springframework.ui.context.support.ResourceBundleThemeSource;
import org.springframework.web.multipart.MultipartResolver;
import org.springframework.web.multipart.commons.CommonsMultipartResolver;
import org.springframework.web.servlet.LocaleResolver;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import org.springframework.web.servlet.i18n.CookieLocaleResolver;
import org.springframework.web.servlet.i18n.LocaleChangeInterceptor;
import org.springframework.web.servlet.theme.ThemeChangeInterceptor;

import com.fasterxml.jackson.databind.ObjectMapper;

/**
 * Web配置。
 * <p>
 * 子类应该添加如下注解：
 * </p>
 * <pre>
 * {@code @Configuration}
 * {@code @ComponentScan(basePackageClasses = org.datagear.web.controller.MainController.class)}
 * </pre>
 * <p>
 * Spring会递归处理{@linkplain Configuration @Configuration}类的父类，可能会导致某些非预期的父类配置被加载，
 * 所以此类没有添加{@linkplain Configuration @Configuration}。
 * </p>
 * 
 * @author datagear@163.com
 *
 */
public class WebMvcConfigurerConfigSupport implements WebMvcConfigurer
{
	/** 系统静态资源路径通配模式 */
	public static final String STATIC_RES_PATH_PATTERN = "/static/**";

	/** 系统CSS静态资源路径通配模式 */
	public static final String STATIC_RES_CSS_PATH_PATTERN = "/static/css/**/*.css";

	/** 系统JS静态资源路径通配模式 */
	public static final String STATIC_RES_JS_PATH_PATTERN = "/static/script/**/*.js";

	/** 系统theme静态资源路径通配模式 */
	public static final String STATIC_RES_THEME_PATH_PATTERN = "/static/theme/**/*.css";

	/** 系统看板API的CSS静态资源路径通配模式 */
	public static final String STATIC_RES_ANALYSISAPI_CSS_PATH_PATTERN = "/static/analysisapi/**/*.css";

	/** 系统看板API的JS静态资源路径通配模式 */
	public static final String STATIC_RES_ANALYSISAPI_JS_PATH_PATTERN = "/static/analysisapi/**/*.js";

	/** 系统静态资源位置 */
	public static final String STATIC_RES_LOCATION = "classpath:org/datagear/web/static/";

	/** 系统主题配置基础前缀 */
	public static final String THEME_SOURCE_BASENAME_PREFIX = "org.datagear.web.theme.";

	public static final String THEME_PARAM = "THEME";

	public static final String LOCALE_PARAM = "LOCALE";

	private CoreConfigSupport coreConfig;

	@Autowired
	public WebMvcConfigurerConfigSupport(CoreConfigSupport coreConfig)
	{
		super();
		this.coreConfig = coreConfig;
	}

	public CoreConfigSupport getCoreConfig()
	{
		return coreConfig;
	}

	public void setCoreConfig(CoreConfigSupport coreConfig)
	{
		this.coreConfig = coreConfig;
	}

	@Override
	public void addResourceHandlers(ResourceHandlerRegistry registry)
	{
		registry.addResourceHandler(STATIC_RES_PATH_PATTERN).addResourceLocations(STATIC_RES_LOCATION)
			.resourceChain(false)
			.addTransformer(clearCssCommentResourceTransformer())
			.addTransformer(clearJsCommentResourceTransformer());

		// SPA（Vue/Vite）产物：/index.html 与 /assets/**
		registry.addResourceHandler("/index.html").addResourceLocations(STATIC_RES_LOCATION);
		registry.addResourceHandler("/assets/**").addResourceLocations(STATIC_RES_LOCATION + "assets/");
	}
	
	protected ClearCssCommentResourceTransformer clearCssCommentResourceTransformer()
	{
		return new ClearCssCommentResourceTransformer(STATIC_RES_CSS_PATH_PATTERN, STATIC_RES_THEME_PATH_PATTERN,
				STATIC_RES_ANALYSISAPI_CSS_PATH_PATTERN);
	}
	
	protected ClearJsCommentResourceTransformer clearJsCommentResourceTransformer()
	{
		return new ClearJsCommentResourceTransformer(STATIC_RES_JS_PATH_PATTERN,
				STATIC_RES_ANALYSISAPI_JS_PATH_PATTERN);
	}

	@Override
	public void addInterceptors(InterceptorRegistry registry)
	{
		addThemeChangeInterceptor(registry);
		addLocaleChangeInterceptor(registry);
	}

	protected void addThemeChangeInterceptor(InterceptorRegistry registry)
	{
		ThemeChangeInterceptor themeChangeInterceptor = createThemeChangeInterceptor();
		// 拦截所有请求，便于外部系统嵌入任意功能页面时都可以设置主题
		registry.addInterceptor(themeChangeInterceptor).addPathPatterns("/**");
	}

	protected void addLocaleChangeInterceptor(InterceptorRegistry registry)
	{
		LocaleChangeInterceptor localeChangeInterceptor = createLocaleChangeInterceptor();
		// 拦截所有请求，便于外部系统嵌入任意功能页面时都可以设置语言
		registry.addInterceptor(localeChangeInterceptor).addPathPatterns("/**");
	}

	protected ThemeChangeInterceptor createThemeChangeInterceptor()
	{
		ThemeChangeInterceptor interceptor = new ThemeChangeInterceptor();
		interceptor.setParamName(THEME_PARAM);

		return interceptor;
	}

	protected LocaleChangeInterceptor createLocaleChangeInterceptor()
	{
		LocaleChangeInterceptor interceptor = new LocaleChangeInterceptor();
		interceptor.setParamName(LOCALE_PARAM);
		// 忽略非法语言，避免抛出异常
		interceptor.setIgnoreInvalidLocale(true);

		return interceptor;
	}

	@Override
	public void extendMessageConverters(List<HttpMessageConverter<?>> converters)
	{
		int oldIndex = -1;

		for (int i = 0; i < converters.size(); i++)
		{
			HttpMessageConverter<?> converter = converters.get(i);

			if (converter instanceof MappingJackson2HttpMessageConverter)
			{
				oldIndex = i;
				break;
			}
		}

		ObjectMapper objectMapper = this.coreConfig.objectMapperBuilder().std().build();
		MappingJackson2HttpMessageConverter messageConverter = new MappingJackson2HttpMessageConverter(objectMapper);

		if (oldIndex > -1)
			converters.add(oldIndex, messageConverter);
		else
			converters.add(messageConverter);
	}

	@Bean("themeSource")
	public ResourceBundleThemeSource themeSource()
	{
		ResourceBundleThemeSource bean = new ResourceBundleThemeSource();
		bean.setBasenamePrefix(THEME_SOURCE_BASENAME_PREFIX);

		return bean;
	}

	@Bean("themeResolver")
	public EnumCookieThemeResolver themeResolver()
	{
		EnumCookieThemeResolver bean = new EnumCookieThemeResolver(this.themeSpec());
		return bean;
	}
	
	@Bean
	public ThemeSpec themeSpec()
	{
		ThemeSpec bean = new ThemeSpec();
		return bean;
	}

	@Bean("localeResolver")
	public LocaleResolver localeResolver()
	{
		CookieLocaleResolver bean = new CookieLocaleResolver();
		bean.setCookieMaxAge(60 * 60 * 24 * 365);
		bean.setCookieName(Global.NAME_SHORT_UCUS + "LOCALE");

		// 不设置默认语言，这样当没有"LOCALE"的cookie值时，可以根据客户端语言自动选择更合适的i18n
		// bean.setDefaultLocale(Locale.CHINESE);

		return bean;
	}

	@Bean("multipartResolver")
	@ConfigurationProperties("multipart")
	public MultipartResolver multipartResolver()
	{
		CommonsMultipartResolver bean = new CommonsMultipartResolver();
		return bean;
	}

	@Bean
	public ErrorPageRegistrar errorPageRegistrar()
	{
		CustomErrorPageRegistrar bean = new CustomErrorPageRegistrar();
		return bean;
	}
}
