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

import org.datagear.management.domain.GlossaryEntity;

/**
 * 业务术语服务（FR-SEM-04）。
 *
 * @author datagear@163.com
 *
 */
public interface GlossaryService
{
	List<GlossaryEntity> listAll();

	GlossaryEntity add(String term, String synonymsJson, String bizDesc, String refMetricId, String createUserId);

	void updateGlossary(GlossaryEntity entity);

	void deleteById(String id);
}
