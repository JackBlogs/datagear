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

import org.datagear.management.domain.AiSession;
import org.datagear.management.service.AiSessionService;
import org.datagear.management.util.dialect.MbSqlDialect;
import org.datagear.util.IDUtil;
import org.apache.ibatis.session.SqlSessionFactory;
import org.mybatis.spring.SqlSessionTemplate;

/**
 * {@linkplain AiSessionService}实现类（轻量自定义语句，不走标准实体 CRUD）。
 *
 * @author datagear@163.com
 *
 */
public class AiSessionServiceImpl extends AbstractMybatisService<AiSession> implements AiSessionService
{
	protected static final String SQL_NAMESPACE = AiSession.class.getName();

	public static final int DEFAULT_LIMIT = 50;

	public AiSessionServiceImpl()
	{
		super();
	}

	public AiSessionServiceImpl(SqlSessionFactory sqlSessionFactory, MbSqlDialect dialect)
	{
		super(sqlSessionFactory, dialect);
	}

	public AiSessionServiceImpl(SqlSessionTemplate sqlSessionTemplate, MbSqlDialect dialect)
	{
		super(sqlSessionTemplate, dialect);
	}

	@Override
	protected String getSqlNamespace()
	{
		return SQL_NAMESPACE;
	}

	@Override
	public AiSession create(String title, String createUserId)
	{
		AiSession session = new AiSession(IDUtil.uuid());
		session.setTitle(title == null ? "新会话" : title);
		session.setCreateUserId(createUserId == null ? "" : createUserId);
		session.setCreateTime(new Date());
		session.setUpdateTime(session.getCreateTime());

		Map<String, Object> params = new HashMap<String, Object>();
		params.put("entity", session);
		insertMybatis("insertSession", params);

		return session;
	}

	@Override
	public void touch(String id, String title)
	{
		Map<String, Object> params = new HashMap<String, Object>();
		params.put("id", id);
		params.put("title", title);
		params.put("updateTime", new Date());
		updateMybatis("touchSession", params);
	}

	@Override
	public List<AiSession> listByUser(String createUserId, int limit)
	{
		Map<String, Object> params = new HashMap<String, Object>();
		params.put("createUserId", createUserId);
		params.put("limit", limit > 0 ? limit : DEFAULT_LIMIT);

		return selectListMybatis("listByUser", params);
	}

	@Override
	public AiSession getById(String id)
	{
		Map<String, Object> params = new HashMap<String, Object>();
		params.put("id", id);
		return selectOneMybatis("getSession", params);
	}

	@Override
	public void deleteById(String id)
	{
		Map<String, Object> params = new HashMap<String, Object>();
		params.put("id", id);
		deleteMybatis("deleteSession", params);
	}
}
