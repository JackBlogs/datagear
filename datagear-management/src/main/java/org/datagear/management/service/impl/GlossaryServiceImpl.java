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

import org.datagear.management.domain.GlossaryEntity;
import org.datagear.management.service.GlossaryService;
import org.datagear.management.util.dialect.MbSqlDialect;
import org.datagear.util.IDUtil;
import org.apache.ibatis.session.SqlSessionFactory;
import org.mybatis.spring.SqlSessionTemplate;

/**
 * {@linkplain GlossaryService}实现类（轻量自定义语句）。
 *
 * @author datagear@163.com
 *
 */
public class GlossaryServiceImpl extends AbstractMybatisService<GlossaryEntity> implements GlossaryService
{
	protected static final String SQL_NAMESPACE = GlossaryEntity.class.getName();

	public GlossaryServiceImpl()
	{
		super();
	}

	public GlossaryServiceImpl(SqlSessionFactory sqlSessionFactory, MbSqlDialect dialect)
	{
		super(sqlSessionFactory, dialect);
	}

	public GlossaryServiceImpl(SqlSessionTemplate sqlSessionTemplate, MbSqlDialect dialect)
	{
		super(sqlSessionTemplate, dialect);
	}

	@Override
	protected String getSqlNamespace()
	{
		return SQL_NAMESPACE;
	}

	@Override
	public List<GlossaryEntity> listAll()
	{
		return selectListMybatis("listAll", new HashMap<String, Object>());
	}

	@Override
	public GlossaryEntity add(String term, String synonymsJson, String bizDesc, String refMetricId,
			String createUserId)
	{
		GlossaryEntity entity = new GlossaryEntity(IDUtil.uuid());
		entity.setTerm(term);
		entity.setSynonyms(synonymsJson == null || synonymsJson.isEmpty() ? "[]" : synonymsJson);
		entity.setBizDesc(bizDesc == null ? "" : bizDesc);
		entity.setRefMetricId(refMetricId == null ? "" : refMetricId);
		entity.setCreateTime(new Date());

		Map<String, Object> params = new HashMap<String, Object>();
		params.put("entity", entity);
		insertMybatis("insertGlossary", params);

		return entity;
	}

	@Override
	public void updateGlossary(GlossaryEntity entity)
	{
		Map<String, Object> params = new HashMap<String, Object>();
		params.put("entity", entity);
		updateMybatis("updateGlossary", params);
	}

	@Override
	public void deleteById(String id)
	{
		Map<String, Object> params = new HashMap<String, Object>();
		params.put("id", id);
		deleteMybatis("deleteGlossary", params);
	}
}
