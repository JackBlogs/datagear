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
 * 审计日志（FR-AUTH-12~14：关键操作留痕——权限变更/数据导出/越权访问等）。
 *
 * @author datagear@163.com
 *
 */
public class AuditLogEntity extends AbstractStringIdEntity implements Entity<String>, CreateTimeEntity
{
	private static final long serialVersionUID = 1L;

	/** 操作类型：权限变更 */
	public static final String OP_PERM = "权限变更";
	/** 操作类型：数据导出 */
	public static final String OP_EXPORT = "数据导出";
	/** 操作类型：越权访问 */
	public static final String OP_DENIED = "越权访问";
	/** 操作类型：登录失败 */
	public static final String OP_LOGIN_FAIL = "登录失败";

	/** 操作类型（权限变更/数据导出/越权访问/登录失败/…） */
	private String op = "";

	/** 操作用户名 */
	private String user = "";

	/** 操作对象描述 */
	private String target = "";

	/** 来源 IP（敏感位脱敏，如 10.12.**.**） */
	private String ip = "";

	/** 结果（成功/已拦截/已通知/失败） */
	private String result = "";

	/** 操作时间 */
	private Date createTime = null;

	public AuditLogEntity()
	{
		super();
	}

	public AuditLogEntity(String id)
	{
		super(id);
	}

	public String getOp()
	{
		return op;
	}

	public void setOp(String op)
	{
		this.op = op;
	}

	public String getUser()
	{
		return user;
	}

	public void setUser(String user)
	{
		this.user = user;
	}

	public String getTarget()
	{
		return target;
	}

	public void setTarget(String target)
	{
		this.target = target;
	}

	public String getIp()
	{
		return ip;
	}

	public void setIp(String ip)
	{
		this.ip = ip;
	}

	public String getResult()
	{
		return result;
	}

	public void setResult(String result)
	{
		this.result = result;
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
