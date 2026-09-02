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

package org.datagear.web.util;

import java.io.File;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.datagear.util.FileContentLoader;
import org.datagear.util.FileUtil;
import org.datagear.util.StringUtil;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * 欢迎页内容加载类。
 * <p>
 * 如果{@linkplain #getContent()}是以{@code "file:"}开头，将从文件中加载。
 * </p>
 * 
 * @author datagear@163.com
 *
 */
public class WelcomeContentLoader
{
	private static final Logger LOGGER = LoggerFactory.getLogger(WelcomeContentLoader.class);

	public static final String FILE_PREFIX = "file:";

	private final String content;

	private final FileContentLoader _fileContentLoader;

	public WelcomeContentLoader(String content, String fileEncoding)
	{
		super();
		this.content = content;

		// 文件
		if (!StringUtil.isEmpty(content) && content.startsWith(FILE_PREFIX))
		{
			File file = FileUtil.getFile(content.substring(FILE_PREFIX.length()));
			this._fileContentLoader = new FileContentLoader(file, fileEncoding);
		}
		else
			this._fileContentLoader = null;
	}

	public String getContent()
	{
		return content;
	}

	/**
	 * 加载欢迎内容。
	 * 
	 * @return 可能{@code null}
	 */
	public String load()
	{
		String re = null;

		if (this._fileContentLoader == null)
		{
			re = this.content;
		}
		else
		{
			try
			{
				re = this._fileContentLoader.load();
			}
			catch (Exception e)
			{
				if (LOGGER.isErrorEnabled())
					LOGGER.error("Load welcome content error", e);

				re = null;
			}
		}

		return sanitize(re);
	}

	/**
	 * 对欢迎页HTML内容进行安全清洗，保留常用排版标签，移除危险标签、事件处理器和危险URL。
	 *
	 * @param html
	 * @return
	 */
	protected String sanitize(String html)
	{
		if (StringUtil.isEmpty(html))
			return html;

		// 先彻底移除 script、style、iframe 等危险标签及其内容
		html = REMOVE_BLOCKS_PATTERN.matcher(html).replaceAll("");

		StringBuilder out = new StringBuilder(html.length());
		Matcher tagMatcher = TAG_PATTERN.matcher(html);
		int lastEnd = 0;

		while (tagMatcher.find())
		{
			out.append(escapeText(html.substring(lastEnd, tagMatcher.start())));

			String slash = tagMatcher.group(1);
			String tag = tagMatcher.group(2).toLowerCase(Locale.ROOT);
			String attrs = tagMatcher.group(3);

			if (ALLOWED_TAGS.contains(tag))
			{
				String sanitizedAttrs = sanitizeAttributes(tag, attrs);
				out.append('<').append(slash).append(tag).append(sanitizedAttrs).append('>');
			}
			// 不允许的标签直接丢弃，不输出到页面

			lastEnd = tagMatcher.end();
		}

		out.append(escapeText(html.substring(lastEnd)));
		return out.toString();
	}

	/**
	 * 转义HTML文本中的特殊字符。
	 *
	 * @param text
	 * @return
	 */
	protected String escapeText(String text)
	{
		if (StringUtil.isEmpty(text))
			return text;

		return text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;");
	}

	/**
	 * 清洗标签属性。
	 *
	 * @param tag
	 * @param attrs
	 * @return
	 */
	protected String sanitizeAttributes(String tag, String attrs)
	{
		if (StringUtil.isEmpty(attrs))
			return "";

		Set<String> allowed = ALLOWED_ATTRIBUTES.get(tag);
		if (allowed == null)
			return "";

		StringBuilder out = new StringBuilder();
		Matcher attrMatcher = ATTR_PATTERN.matcher(attrs);

		while (attrMatcher.find())
		{
			String name = attrMatcher.group(1).toLowerCase(Locale.ROOT);

			// 移除所有事件处理器属性
			if (name.startsWith("on"))
				continue;

			if (!allowed.contains(name))
				continue;

			String value = (attrMatcher.group(2) != null ? attrMatcher.group(2)
					: (attrMatcher.group(3) != null ? attrMatcher.group(3) : attrMatcher.group(4)));

			if (value == null)
				value = "";

			if ("href".equals(name) || "src".equals(name))
			{
				if (!isSafeUrl(value))
					continue;
			}

			out.append(' ').append(name).append("=\"").append(escapeAttribute(value)).append('"');
		}

		return out.toString();
	}

	/**
	 * 判断URL是否安全，禁止 javascript:、data:、vbscript:、file: 等危险协议。
	 *
	 * @param url
	 * @return
	 */
	protected boolean isSafeUrl(String url)
	{
		if (StringUtil.isEmpty(url))
			return true;

		url = url.trim();

		if (url.isEmpty())
			return true;

		Matcher schemeMatcher = SCHEME_PATTERN.matcher(url);
		if (!schemeMatcher.find())
			return true;

		String scheme = schemeMatcher.group(1).toLowerCase(Locale.ROOT);
		return ALLOWED_URL_SCHEMES.contains(scheme);
	}

	/**
	 * 转义HTML属性值中的特殊字符。
	 *
	 * @param value
	 * @return
	 */
	protected String escapeAttribute(String value)
	{
		return value.replace("&", "&amp;").replace("\"", "&quot;").replace("<", "&lt;").replace(">", "&gt;");
	}

	private static final Set<String> ALLOWED_TAGS;

	private static final Map<String, Set<String>> ALLOWED_ATTRIBUTES;

	private static final Set<String> ALLOWED_URL_SCHEMES = Collections.unmodifiableSet(
			new HashSet<>(Arrays.asList("http", "https", "mailto")));

	private static final Pattern TAG_PATTERN = Pattern.compile("<(/?)([a-zA-Z][a-zA-Z0-9]*)\\b([^>]*)>");

	private static final Pattern ATTR_PATTERN = Pattern
			.compile("([a-zA-Z_][a-zA-Z0-9\\-_]*)(?:\\s*=\\s*(?:\"([^\"]*)\"|'([^']*)'|([^\\s>]+)))?");

	private static final Pattern SCHEME_PATTERN = Pattern.compile("^([a-zA-Z][a-zA-Z0-9+.-]*):");

	private static final Pattern REMOVE_BLOCKS_PATTERN = Pattern
			.compile("<(?i)(script|style|iframe|object|embed|form|input|textarea|select)\\b[^>]*>.*?</\\1>",
					Pattern.DOTALL);

	static
	{
		Set<String> tags = new HashSet<>(Arrays.asList("b", "strong", "i", "em", "u", "p", "br", "hr", "h1", "h2",
				"h3", "h4", "h5", "h6", "span", "div", "a", "img", "ol", "ul", "li", "table", "thead", "tbody", "tfoot",
				"tr", "td", "th", "caption", "col", "colgroup"));
		ALLOWED_TAGS = Collections.unmodifiableSet(tags);

		Map<String, Set<String>> attrs = new HashMap<>();
		attrs.put("a", new HashSet<>(Arrays.asList("href", "target", "title")));
		attrs.put("img", new HashSet<>(Arrays.asList("src", "alt", "title", "width", "height")));
		for (String t : tags)
		{
			if (!attrs.containsKey(t))
				attrs.put(t, Collections.<String>emptySet());
		}
		ALLOWED_ATTRIBUTES = Collections.unmodifiableMap(attrs);
	}
}
