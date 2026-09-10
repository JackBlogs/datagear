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

package org.datagear.web.metric;

import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.datagear.management.domain.AuditLogEntity;
import org.datagear.management.domain.MaskRuleEntity;
import org.datagear.management.domain.RowPermEntity;
import org.datagear.management.domain.User;
import org.datagear.management.service.AuditLogService;
import org.datagear.management.service.MaskRuleService;
import org.datagear.management.service.RowPermService;
import org.datagear.util.StringUtil;
import org.datagear.web.metric.MetricQueryEngine.MetricQuery.Filter;
import org.datagear.web.metric.MetricQueryEngine.MetricQueryException;
import org.datagear.web.metric.MetricQueryEngine.MetricQueryResult;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.servlet.http.HttpServletRequest;

/**
 * 数据权限管道服务（FR-AUTH-10/11，SDS「查询链路统一改写」简化实现）：
 * <ul>
 * <li>行级过滤：按物理表匹配启用的行权限规则，将条件模板
 * {@code field op ${currentUser}/${currentOrg}/字面量} 解析为参数化过滤条件；</li>
 * <li>结果脱敏：按物理表 + 结果列名匹配启用的脱敏规则，在结果侧应用掩码/哈希/置空/截断；</li>
 * <li>审计留痕：权限变更等关键操作写入审计日志。</li>
 * </ul>
 * <p>
 * 管理员（{@code user.isAdmin()}）不做行级过滤与脱敏；条件解析仅接受白名单操作符，
 * 字段名经 {@link MetricQueryEngine#PATTERN_IDENTIFIER} 校验，值一律 PreparedStatement 参数化。
 * </p>
 *
 * @author datagear@163.com
 *
 */
public class DataPermissionService
{
	protected static final Pattern PATTERN_COND = Pattern.compile(
			"^([A-Za-z_][A-Za-z0-9_]*)\\s*(=|!=|<>|>=|<=|>|<|LIKE)\\s*(.+)$",
			Pattern.CASE_INSENSITIVE);

	private static final Logger LOGGER = LoggerFactory.getLogger(DataPermissionService.class);

	private RowPermService rowPermService;

	private MaskRuleService maskRuleService;

	private AuditLogService auditLogService;

	public DataPermissionService()
	{
		super();
	}

	public RowPermService getRowPermService()
	{
		return rowPermService;
	}

	public void setRowPermService(RowPermService rowPermService)
	{
		this.rowPermService = rowPermService;
	}

	public MaskRuleService getMaskRuleService()
	{
		return maskRuleService;
	}

	public void setMaskRuleService(MaskRuleService maskRuleService)
	{
		this.maskRuleService = maskRuleService;
	}

	public AuditLogService getAuditLogService()
	{
		return auditLogService;
	}

	public void setAuditLogService(AuditLogService auditLogService)
	{
		this.auditLogService = auditLogService;
	}

	/**
	 * 解析当前用户对指定物理表的行级过滤条件；无规则、规则未配表或管理员时返回空列表。
	 *
	 * @param user
	 *            已认证用户
	 * @param tableName
	 *            指标绑定的物理表名
	 * @return 应用到的规则名（供前端「取数透明化」展示）
	 * @throws MetricQueryException
	 *             条件模板非法时抛出
	 */
	public List<String> applyRowFilters(User user, String tableName, List<Filter> filters)
			throws MetricQueryException
	{
		List<String> applied = new ArrayList<String>();

		if (user == null || user.isAdmin() || StringUtil.isEmpty(tableName) || this.rowPermService == null)
			return applied;

		List<RowPermEntity> rules = this.rowPermService.listEnabledByTable(tableName);

		if (rules == null)
			return applied;

		for (RowPermEntity rule : rules)
		{
			Filter filter = toFilter(user, rule);

			if (filter == null)
				continue;

			filters.add(filter);
			applied.add(rule.getName());
		}

		return applied;
	}

	/**
	 * 将条件模板解析为参数化过滤条件；变量 {@code ${currentUser}} → 用户 ID、
	 * {@code ${currentOrg}...} → 当前为空串（组织主数据接入后替换）。
	 */
	protected Filter toFilter(User user, RowPermEntity rule) throws MetricQueryException
	{
		String cond = rule.getCond();

		if (StringUtil.isEmpty(cond))
			return null;

		Matcher m = PATTERN_COND.matcher(cond.trim());

		if (!m.matches())
		{
			LOGGER.warn("Skip illegal row perm cond : {} ({})", cond, rule.getId());
			return null;
		}

		String field = m.group(1);
		String op = m.group(2).toUpperCase();
		String valueExpr = m.group(3).trim();

		if (!MetricQueryEngine.PATTERN_IDENTIFIER.matcher(field).matches())
		{
			LOGGER.warn("Skip illegal row perm field : {} ({})", field, rule.getId());
			return null;
		}

		if ("LIKE".equals(op))
			op = "LIKE";

		Object value;

		if ("${CURRENTUSER}".equalsIgnoreCase(valueExpr))
			value = user.getId();
		else if (valueExpr.toUpperCase().startsWith("${CURRENTORG"))
			value = "";
		else
			value = unquote(valueExpr);

		return new Filter(field, op, value);
	}

	protected String unquote(String value)
	{
		if (value.length() >= 2 && ((value.startsWith("'") && value.endsWith("'"))
				|| (value.startsWith("\"") && value.endsWith("\""))))
			return value.substring(1, value.length() - 1);

		return value;
	}

	/**
	 * 对查询结果应用动态脱敏（结果侧，管理员原文返回）。
	 *
	 * @param user
	 * @param tableName
	 * @param result
	 * @return 应用到的规则描述（字段 + 算法）
	 */
	public List<String> applyMasks(User user, String tableName, MetricQueryResult result)
	{
		List<String> applied = new ArrayList<String>();

		if (user == null || user.isAdmin() || result == null || this.maskRuleService == null)
			return applied;

		List<MaskRuleEntity> rules = (StringUtil.isEmpty(tableName)
				? this.maskRuleService.listAll()
				: this.maskRuleService.listEnabledByTable(tableName));

		if (rules == null || rules.isEmpty() || result.getRows() == null || result.getRows().isEmpty())
			return applied;

		List<String> columns = result.getColumns();

		for (int c = 0; c < columns.size(); c++)
		{
			String column = columns.get(c);

			for (MaskRuleEntity rule : rules)
			{
				if (!matchesColumn(rule, column))
					continue;

				for (List<Object> row : result.getRows())
				{
					if (c < row.size())
						row.set(c, maskValue(rule.getAlgo(), row.get(c)));
				}

				applied.add(column + "（" + rule.getAlgo() + "）");
				break;
			}
		}

		return applied;
	}

	protected boolean matchesColumn(MaskRuleEntity rule, String column)
	{
		if (column == null)
			return false;

		if (!StringUtil.isEmpty(rule.getFieldName()))
			return rule.getFieldName().equalsIgnoreCase(column);

		return rule.getField() != null && rule.getField().equalsIgnoreCase(column);
	}

	/**
	 * 脱敏算法：
	 * <ul>
	 * <li>掩码：保留首 3 尾 4（长度足够时），其余替换为 {@code *}</li>
	 * <li>哈希：SHA-256 前 8 位 + {@code …}</li>
	 * <li>置空：null</li>
	 * <li>截断：保留前 4 字符 + {@code …}</li>
	 * </ul>
	 */
	protected Object maskValue(String algo, Object value)
	{
		if (value == null)
			return null;

		String str = String.valueOf(value);

		if (str.isEmpty())
			return str;

		if (MaskRuleEntity.ALGO_HASH.equals(algo))
			return sha256Short(str) + "…";

		if (MaskRuleEntity.ALGO_NULL.equals(algo))
			return null;

		if (MaskRuleEntity.ALGO_TRUNCATE.equals(algo))
			return str.substring(0, Math.min(4, str.length())) + "…";

		// 默认掩码：保留首3尾4，中间打星（长度不足8时保留首1尾1）
		if (str.length() >= 8)
			return str.substring(0, 3) + repeat('*', str.length() - 7) + str.substring(str.length() - 4);

		return str.substring(0, 1) + "***" + str.substring(str.length() - 1);
	}

	protected String repeat(char ch, int count)
	{
		StringBuilder sb = new StringBuilder(count);
		for (int i = 0; i < count; i++)
			sb.append(ch);
		return sb.toString();
	}

	protected String sha256Short(String value)
	{
		try
		{
			MessageDigest digest = MessageDigest.getInstance("SHA-256");
			byte[] bytes = digest.digest(value.getBytes("UTF-8"));

			StringBuilder sb = new StringBuilder();
			for (int i = 0; i < 4; i++)
				sb.append(String.format("%02x", bytes[i]));

			return sb.toString();
		}
		catch (Exception e)
		{
			// 哈希失败不抛出，退化为全掩码
			return "********";
		}
	}

	/**
	 * 追加审计日志（FR-AUTH-12：权限变更等关键操作留痕），写日志失败不阻断主流程。
	 */
	public void audit(HttpServletRequest request, String op, User user, String target)
	{
		audit(request, op, user, target, RESULT_SUCCESS);
	}

	public void audit(HttpServletRequest request, String op, User user, String target, String result)
	{
		if (this.auditLogService == null)
			return;

		try
		{
			String ip = request == null ? "" : request.getRemoteAddr();

			// IP 脱敏：IPv6 回环显示「本地」，IPv4 仅保留前两段
			if (ip != null && ("0:0:0:0:0:0:0:1".equals(ip) || "::1".equals(ip) || "127.0.0.1".equals(ip)))
				ip = "本地";
			else if (ip != null && ip.indexOf('.') > 0)
			{
				String[] segs = ip.split("\\.");
				if (segs.length >= 4)
					ip = segs[0] + "." + segs[1] + ".**.**";
			}

			this.auditLogService.append(op, user == null ? "" : displayUserName(user), target,
					ip == null ? "" : ip, result == null ? RESULT_SUCCESS : result);
		}
		catch (Exception e)
		{
			LOGGER.warn("Write audit log failed", e);
		}
	}

	/** 结果常量：成功 */
	public static final String RESULT_SUCCESS = "成功";

	protected String displayUserName(User user)
	{
		if (user == null)
			return "";

		String name = user.getName();

		if (name != null && name.equals(user.getId()) && !StringUtil.isEmpty(user.getRealName()))
			return user.getRealName();

		return name;
	}
}
