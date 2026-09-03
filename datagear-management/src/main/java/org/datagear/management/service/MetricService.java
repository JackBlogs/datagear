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

import java.util.List;

import org.datagear.management.domain.MetricEntity;
import org.datagear.management.domain.MetricVersion;

/**
 * 语义层指标服务（FR-SEM-02/03/05）。
 *
 * @author datagear@163.com
 *
 */
public interface MetricService extends EntityService<String, MetricEntity>
{
	/**
	 * 写入指标版本快照（保存/认证时调用），版本号自动递增。
	 *
	 * @param metricId
	 * @param snapshot
	 *            定义快照 JSON
	 * @param changeNote
	 * @param createUserId
	 */
	void insertVersion(String metricId, String snapshot, String changeNote, String createUserId);

	/**
	 * 列出指标版本（按版本号倒序）。
	 *
	 * @param metricId
	 * @return
	 */
	List<MetricVersion> listVersions(String metricId);

	/**
	 * 更新认证状态（FR-SEM-05）。
	 *
	 * @param id
	 * @param certified
	 */
	void updateCertified(String id, boolean certified);
}
