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

import org.datagear.management.domain.AiSession;

/**
 * ChatBI 问数会话服务（FR-AI-01）。
 *
 * @author datagear@163.com
 *
 */
public interface AiSessionService
{
	/**
	 * 新建会话。
	 *
	 * @param title
	 * @param createUserId
	 * @return
	 */
	AiSession create(String title, String createUserId);

	/**
	 * 更新会话标题与更新时间。
	 *
	 * @param id
	 * @param title
	 */
	void touch(String id, String title);

	/**
	 * 列出用户的会话（按最近更新倒序），含回合数。
	 *
	 * @param createUserId
	 * @param limit
	 * @return
	 */
	List<AiSession> listByUser(String createUserId, int limit);

	/**
	 * 获取会话。
	 *
	 * @param id
	 * @return
	 */
	AiSession getById(String id);

	/**
	 * 删除会话及其消息。
	 *
	 * @param id
	 */
	void deleteById(String id);
}
