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

package org.datagear.management.service;

import java.util.Date;
import java.util.List;

import org.datagear.management.domain.GovMetaTable;
import org.datagear.management.domain.GovQualityIssue;
import org.datagear.management.domain.GovQualityRule;
import org.datagear.management.domain.GovSensitiveField;
import org.datagear.management.domain.GovStandard;

/**
 * 数据治理服务（FR-GOV-01~05：元数据目录/标准/质量/敏感字段）。
 *
 * @author datagear@163.com
 *
 */
public interface GovernanceService
{
	/* ---- 元数据目录 ---- */
	List<GovMetaTable> listMetaTables();

	void saveMetaTable(GovMetaTable entity);

	void deleteMetaTable(String id);

	/* ---- 数据标准 ---- */
	List<GovStandard> listStandards();

	GovStandard saveStandard(GovStandard entity, boolean add);

	void deleteStandard(String id);

	/* ---- 质量规则 ---- */
	List<GovQualityRule> listQualityRules();

	GovQualityRule saveQualityRule(GovQualityRule entity, boolean add);

	void deleteQualityRule(String id);

	void updateQualityRuleRun(String id, Date lastRunTime, double passRate, int total, int failed, int sample);

	/* ---- 质量异常 ---- */
	List<GovQualityIssue> listQualityIssues(boolean includeResolved);

	GovQualityIssue saveQualityIssue(GovQualityIssue entity);

	void resolveQualityIssue(String id, String note);

	void deleteQualityIssue(String id);

	/* ---- 敏感字段 ---- */
	List<GovSensitiveField> listSensitiveFields();

	GovSensitiveField saveSensitiveField(GovSensitiveField entity);

	void deleteSensitiveField(String id);
}
