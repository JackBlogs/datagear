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

package org.datagear.management.domain;

import java.util.Date;

/**
 * ChatBI 问数消息（FR-AI-02：user 问题 / assistant 回答 JSON 快照）。
 *
 * @author datagear@163.com
 *
 */
public class AiMessage extends AbstractStringIdEntity implements Entity<String>, CreateTimeEntity
{
	private static final long serialVersionUID = 1L;

	public static final String ROLE_USER = "user";
	public static final String ROLE_ASSISTANT = "assistant";

	/** 所属会话 ID */
	private String sessionId = "";

	/** 角色（user/assistant） */
	private String role = ROLE_USER;

	/** 内容：user 为问题原文；assistant 为回答 JSON */
	private String content = "";

	/** 时间 */
	private Date createTime = null;

	public AiMessage()
	{
		super();
	}

	public AiMessage(String id)
	{
		super(id);
	}

	public String getSessionId()
	{
		return sessionId;
	}

	public void setSessionId(String sessionId)
	{
		this.sessionId = sessionId;
	}

	public String getRole()
	{
		return role;
	}

	public void setRole(String role)
	{
		this.role = role;
	}

	public String getContent()
	{
		return content;
	}

	public void setContent(String content)
	{
		this.content = content;
	}

	@Override
	public Date getCreateTime()
	{
		return createTime;
	}

	@Override
	public void setCreateTime(Date createTime)
	{
		this.createTime = createTime;
	}
}
