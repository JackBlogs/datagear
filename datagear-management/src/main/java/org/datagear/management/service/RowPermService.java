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

import org.datagear.management.domain.RowPermEntity;

/**
 * 行级数据权限规则服务（FR-AUTH-10）。
 *
 * @author datagear@163.com
 *
 */
public interface RowPermService extends EntityService<String, RowPermEntity>
{
	/**
	 * 列出全部规则（按创建时间倒序）。
	 *
	 * @return
	 */
	List<RowPermEntity> listAll();

	/**
	 * 列出对指定物理表生效的启用规则。
	 *
	 * @param tableName
	 * @return
	 */
	List<RowPermEntity> listEnabledByTable(String tableName);

	/**
	 * 切换规则启停。
	 *
	 * @param id
	 * @return 切换后的启用状态
	 */
	boolean toggleEnabled(String id);
}
