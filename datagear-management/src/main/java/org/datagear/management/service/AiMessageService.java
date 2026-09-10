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

import org.datagear.management.domain.AiMessage;

/**
 * ChatBI 问数消息服务（FR-AI-02）。
 *
 * @author datagear@163.com
 *
 */
public interface AiMessageService
{
	/**
	 * 追加消息。
	 *
	 * @param sessionId
	 * @param role
	 * @param content
	 * @return
	 */
	AiMessage append(String sessionId, String role, String content);

	/**
	 * 会话消息（时间正序）。
	 *
	 * @param sessionId
	 * @param limit
	 * @return
	 */
	List<AiMessage> listBySession(String sessionId, int limit);
}
