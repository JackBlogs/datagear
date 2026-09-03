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

import org.datagear.management.domain.MetricEntity;
import org.datagear.management.domain.MetricVersion;
import org.datagear.management.service.MetricService;
import org.datagear.management.util.dialect.MbSqlDialect;
import org.datagear.util.IDUtil;
import org.apache.ibatis.session.SqlSessionFactory;
import org.mybatis.spring.SqlSessionTemplate;

/**
 * {@linkplain MetricService}实现类。
 *
 * @author datagear@163.com
 *
 */
public class MetricServiceImpl extends AbstractMybatisEntityService<String, MetricEntity>
		implements MetricService
{
	protected static final String SQL_NAMESPACE = MetricEntity.class.getName();

	public MetricServiceImpl()
	{
		super();
	}

	public MetricServiceImpl(SqlSessionFactory sqlSessionFactory, MbSqlDialect dialect)
	{
		super(sqlSessionFactory, dialect);
	}

	public MetricServiceImpl(SqlSessionTemplate sqlSessionTemplate, MbSqlDialect dialect)
	{
		super(sqlSessionTemplate, dialect);
	}

	@Override
	protected String getSqlNamespace()
	{
		return SQL_NAMESPACE;
	}

	@Override
	public void insertVersion(String metricId, String snapshot, String changeNote, String createUserId)
	{
		Integer max = selectOneMybatis("maxVersionNo", toVersionParam("metricId", metricId));
		int nextNo = (max == null ? 0 : max.intValue()) + 1;

		Map<String, Object> params = new HashMap<String, Object>();
		MetricVersion version = new MetricVersion(IDUtil.uuid(), metricId, nextNo);
		version.setSnapshot(snapshot == null ? "" : snapshot);
		version.setChangeNote(changeNote == null ? "" : changeNote);
		version.setCreateTime(new Date());
		version.setCreateUserId(createUserId == null ? "" : createUserId);
		params.put("version", version);

		insertMybatis("insertVersion", params);
	}

	@Override
	public List<MetricVersion> listVersions(String metricId)
	{
		return selectListMybatis("listVersions", toVersionParam("metricId", metricId));
	}

	@Override
	public void updateCertified(String id, boolean certified)
	{
		// 走标准实体更新路径，确保实体缓存同步失效（直改SQL会导致getById读到旧缓存）
		MetricEntity entity = getById(id);

		if (entity == null)
			return;

		entity.setCertified(certified ? 1 : 0);
		update(entity);
	}

	protected Map<String, Object> toVersionParam(String key, String value)
	{
		Map<String, Object> params = new HashMap<String, Object>();
		params.put(key, value);
		return params;
	}

	@Override
	public boolean[] deleteByIds(String[] ids)
	{
		// 先清理版本快照，避免孤儿数据
		if (ids != null)
		{
			for (String id : ids)
				deleteMybatis("deleteVersionsByMetricId", toVersionParam("metricId", id));
		}

		return super.deleteByIds(ids);
	}
}
