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

package org.datagear.management.service.impl;

import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.datagear.management.domain.AiMessage;
import org.datagear.management.service.AiMessageService;
import org.datagear.management.util.dialect.MbSqlDialect;
import org.datagear.util.IDUtil;
import org.apache.ibatis.session.SqlSessionFactory;
import org.mybatis.spring.SqlSessionTemplate;

/**
 * {@linkplain AiMessageService}实现类（轻量自定义语句，不走标准实体 CRUD）。
 *
 * @author datagear@163.com
 *
 */
public class AiMessageServiceImpl extends AbstractMybatisService<AiMessage> implements AiMessageService
{
	protected static final String SQL_NAMESPACE = AiMessage.class.getName();

	public static final int DEFAULT_LIMIT = 200;

	public AiMessageServiceImpl()
	{
		super();
	}

	public AiMessageServiceImpl(SqlSessionFactory sqlSessionFactory, MbSqlDialect dialect)
	{
		super(sqlSessionFactory, dialect);
	}

	public AiMessageServiceImpl(SqlSessionTemplate sqlSessionTemplate, MbSqlDialect dialect)
	{
		super(sqlSessionTemplate, dialect);
	}

	@Override
	protected String getSqlNamespace()
	{
		return SQL_NAMESPACE;
	}

	@Override
	public AiMessage append(String sessionId, String role, String content)
	{
		AiMessage message = new AiMessage(IDUtil.uuid());
		message.setSessionId(sessionId == null ? "" : sessionId);
		message.setRole(role == null ? AiMessage.ROLE_USER : role);
		message.setContent(content == null ? "" : content);
		message.setCreateTime(new Date());

		Map<String, Object> params = new HashMap<String, Object>();
		params.put("entity", message);
		insertMybatis("insertMessage", params);

		return message;
	}

	@Override
	public List<AiMessage> listBySession(String sessionId, int limit)
	{
		Map<String, Object> params = new HashMap<String, Object>();
		params.put("sessionId", sessionId);

		List<AiMessage> list = selectListMybatis("listBySession", params);

		// 时间正序返回；超过上限时从头部丢弃（保留最近消息）
		int max = limit > 0 ? limit : DEFAULT_LIMIT;

		if (list != null && list.size() > max)
			return list.subList(list.size() - max, list.size());

		return list;
	}
}
