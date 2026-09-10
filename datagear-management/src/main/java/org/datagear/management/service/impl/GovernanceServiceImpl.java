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

import org.datagear.management.domain.GovMetaTable;
import org.datagear.management.domain.GovQualityIssue;
import org.datagear.management.domain.GovQualityRule;
import org.datagear.management.domain.GovSensitiveField;
import org.datagear.management.domain.GovStandard;
import org.datagear.management.service.GovernanceService;
import org.datagear.management.util.dialect.MbSqlDialect;
import org.datagear.util.IDUtil;
import org.apache.ibatis.session.SqlSessionFactory;
import org.mybatis.spring.SqlSessionTemplate;

/**
 * {@linkplain GovernanceService}实现类（统一轻量语句，命名空间 {@code GovernanceSupport}）。
 *
 * @author datagear@163.com
 *
 */
public class GovernanceServiceImpl extends AbstractMybatisService<Object> implements GovernanceService
{
	protected static final String SQL_NAMESPACE = "org.datagear.management.domain.GovernanceSupport";

	public GovernanceServiceImpl()
	{
		super();
	}

	public GovernanceServiceImpl(SqlSessionFactory sqlSessionFactory, MbSqlDialect dialect)
	{
		super(sqlSessionFactory, dialect);
	}

	public GovernanceServiceImpl(SqlSessionTemplate sqlSessionTemplate, MbSqlDialect dialect)
	{
		super(sqlSessionTemplate, dialect);
	}

	@Override
	protected String getSqlNamespace()
	{
		return SQL_NAMESPACE;
	}

	protected Map<String, Object> p(Object entity)
	{
		Map<String, Object> params = new HashMap<String, Object>();
		params.put("entity", entity);
		return params;
	}

	protected Map<String, Object> p(String key, Object value)
	{
		Map<String, Object> params = new HashMap<String, Object>();
		params.put(key, value);
		return params;
	}

	/* ==================== 元数据目录 ==================== */

	@Override
	public List<GovMetaTable> listMetaTables()
	{
		return selectListMybatis("listMetaTables", new HashMap<String, Object>());
	}

	@Override
	public void saveMetaTable(GovMetaTable entity)
	{
		GovMetaTable exist = selectOneMybatis("getMetaTable", p("id", entity.getId()));

		if (exist == null && entity.getName() != null)
			exist = selectOneMybatis("getMetaTableByName", p("name", entity.getName()));

		if (exist == null)
		{
			entity.setId(IDUtil.uuid());
			entity.setCreateTime(new Date());
			insertMybatis("insertMetaTable", p(entity));
		}
		else
		{
			entity.setId(exist.getId());
			updateMybatis("updateMetaTable", p(entity));
		}
	}

	@Override
	public void deleteMetaTable(String id)
	{
		deleteMybatis("deleteMetaTable", p("id", id));
	}

	/* ==================== 数据标准 ==================== */

	@Override
	public List<GovStandard> listStandards()
	{
		return selectListMybatis("listStandards", new HashMap<String, Object>());
	}

	@Override
	public GovStandard saveStandard(GovStandard entity, boolean add)
	{
		if (add)
		{
			entity.setId(IDUtil.uuid());
			entity.setCreateTime(new Date());
			insertMybatis("insertStandard", p(entity));
		}
		else
		{
			updateMybatis("updateStandard", p(entity));
		}

		return entity;
	}

	@Override
	public void deleteStandard(String id)
	{
		deleteMybatis("deleteStandard", p("id", id));
	}

	/* ==================== 质量规则 ==================== */

	@Override
	public List<GovQualityRule> listQualityRules()
	{
		return selectListMybatis("listQualityRules", new HashMap<String, Object>());
	}

	@Override
	public GovQualityRule saveQualityRule(GovQualityRule entity, boolean add)
	{
		if (add)
		{
			entity.setId(IDUtil.uuid());
			entity.setCreateTime(new Date());
			insertMybatis("insertQualityRule", p(entity));
		}
		else
		{
			updateMybatis("updateQualityRule", p(entity));
		}

		return entity;
	}

	@Override
	public void deleteQualityRule(String id)
	{
		deleteMybatis("deleteQualityRule", p("id", id));
	}

	@Override
	public void updateQualityRuleRun(String id, Date lastRunTime, double passRate, int total, int failed, int sample)
	{
		Map<String, Object> params = p("id", id);
		params.put("lastRunTime", lastRunTime);
		params.put("passRate", passRate);
		params.put("total", total);
		params.put("failed", failed);
		params.put("sample", sample);
		updateMybatis("updateQualityRuleRun", params);
	}

	/* ==================== 质量异常 ==================== */

	@Override
	public List<GovQualityIssue> listQualityIssues(boolean includeResolved)
	{
		Map<String, Object> params = new HashMap<String, Object>();
		params.put("includeResolved", includeResolved);
		return selectListMybatis("listQualityIssues", params);
	}

	@Override
	public GovQualityIssue saveQualityIssue(GovQualityIssue entity)
	{
		entity.setId(IDUtil.uuid());
		entity.setCreateTime(new Date());

		Map<String, Object> params = p(entity);
		params.put("resolved", entity.isResolved() ? 1 : 0);
		insertMybatis("insertQualityIssue", params);

		return entity;
	}

	@Override
	public void resolveQualityIssue(String id, String note)
	{
		Map<String, Object> params = p("id", id);
		params.put("note", note == null || note.isEmpty() ? "已处理" : note);
		updateMybatis("resolveQualityIssue", params);
	}

	@Override
	public void deleteQualityIssue(String id)
	{
		deleteMybatis("deleteQualityIssue", p("id", id));
	}

	/* ==================== 敏感字段 ==================== */

	@Override
	public List<GovSensitiveField> listSensitiveFields()
	{
		return selectListMybatis("listSensitiveFields", new HashMap<String, Object>());
	}

	@Override
	public GovSensitiveField saveSensitiveField(GovSensitiveField entity)
	{
		GovSensitiveField exist = selectOneMybatis("getSensitiveByTarget", p(entity));

		if (exist != null)
		{
			entity.setId(exist.getId());
			updateMybatis("updateSensitiveField", p(entity));
		}
		else
		{
			entity.setId(IDUtil.uuid());
			entity.setCreateTime(new Date());
			insertMybatis("insertSensitiveField", p(entity));
		}

		return entity;
	}

	@Override
	public void deleteSensitiveField(String id)
	{
		deleteMybatis("deleteSensitiveField", p("id", id));
	}
}
