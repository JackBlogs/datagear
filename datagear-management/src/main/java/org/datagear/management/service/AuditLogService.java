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

import org.datagear.management.domain.AuditLogEntity;

/**
 * 审计日志服务（FR-AUTH-12~14）。
 *
 * @author datagear@163.com
 *
 */
public interface AuditLogService extends EntityService<String, AuditLogEntity>
{
	/**
	 * 追加一条审计日志。
	 *
	 * @param op
	 * @param user
	 * @param target
	 * @param ip
	 * @param result
	 */
	void append(String op, String user, String target, String ip, String result);

	/**
	 * 按操作类型过滤列出（最近在前）；{@code op} 为空返回全部。
	 *
	 * @param op
	 * @param limit
	 *            返回条数上限（&lt;=0 表示默认 200）
	 * @return
	 */
	List<AuditLogEntity> listByOp(String op, int limit);
}
