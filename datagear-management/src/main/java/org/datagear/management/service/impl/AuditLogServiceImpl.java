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

import org.datagear.management.domain.AuditLogEntity;
import org.datagear.management.service.AuditLogService;
import org.datagear.management.util.dialect.MbSqlDialect;
import org.datagear.util.IDUtil;
import org.apache.ibatis.session.SqlSessionFactory;
import org.mybatis.spring.SqlSessionTemplate;

/**
 * {@linkplain AuditLogService}实现类。
 *
 * @author datagear@163.com
 *
 */
public class AuditLogServiceImpl extends AbstractMybatisEntityService<String, AuditLogEntity>
		implements AuditLogService
{
	protected static final String SQL_NAMESPACE = AuditLogEntity.class.getName();

	/** 默认返回条数上限 */
	public static final int DEFAULT_LIMIT = 200;

	public AuditLogServiceImpl()
	{
		super();
	}

	public AuditLogServiceImpl(SqlSessionFactory sqlSessionFactory, MbSqlDialect dialect)
	{
		super(sqlSessionFactory, dialect);
	}

	public AuditLogServiceImpl(SqlSessionTemplate sqlSessionTemplate, MbSqlDialect dialect)
	{
		super(sqlSessionTemplate, dialect);
	}

	@Override
	protected String getSqlNamespace()
	{
		return SQL_NAMESPACE;
	}

	@Override
	public void append(String op, String user, String target, String ip, String result)
	{
		AuditLogEntity entity = new AuditLogEntity(IDUtil.uuid());
		entity.setOp(op == null ? "" : op);
		entity.setUser(user == null ? "" : user);
		entity.setTarget(target == null ? "" : target);
		entity.setIp(ip == null ? "" : ip);
		entity.setResult(result == null ? "" : result);
		entity.setCreateTime(new Date());

		insertMybatis("insertAudit", toAuditParam(entity));
	}

	@Override
	public List<AuditLogEntity> listByOp(String op, int limit)
	{
		Map<String, Object> params = new HashMap<String, Object>();
		params.put("op", op == null || op.isEmpty() ? null : op);

		List<AuditLogEntity> list = selectListMybatis("listByOp", params);

		// 行数在结果侧截断（跨库兼容，不用 SQL LIMIT），与 MetricQueryEngine 同一约定
		int max = limit > 0 ? limit : DEFAULT_LIMIT;

		if (list != null && list.size() > max)
			return list.subList(0, max);

		return list;
	}

	protected Map<String, Object> toAuditParam(AuditLogEntity entity)
	{
		Map<String, Object> params = new HashMap<String, Object>();
		params.put("entity", entity);
		return params;
	}
}
