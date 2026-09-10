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

package org.datagear.web.controller;

import java.util.List;
import java.util.Map;

import javax.servlet.http.HttpServletRequest;

import org.datagear.management.domain.AiSession;
import org.datagear.management.domain.User;
import org.datagear.web.ai.ChatService;
import org.datagear.web.util.OperationMessage;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseBody;

/**
 * ChatBI 智能问数 API 控制器（{@code /api/ai} 前缀，FR-AI-01~08）。
 * <p>
 * 契约对齐 prototypev2 mock-api：{@code /session/list}、{@code /chat/ask}、
 * {@code /chat/clarify}、{@code /insight/attribute}；另有 {@code /session/create}、
 * {@code /chat/history/{sessionId}}。确定性 Text2DSL（语义层 Grounding），
 * 行列权限管道全程继承。
 * </p>
 *
 * @author datagear@163.com
 *
 */
@Controller
@RequestMapping("/api/ai")
public class AiApiController extends AbstractController
{
	@Autowired
	private ChatService chatService;

	public AiApiController()
	{
		super();
	}

	public ChatService getChatService()
	{
		return chatService;
	}

	public void setChatService(ChatService chatService)
	{
		this.chatService = chatService;
	}

	@RequestMapping(value = "/session/list", produces = CONTENT_TYPE_JSON)
	@ResponseBody
	public ResponseEntity<OperationMessage<List<AiSession>>> sessionList(HttpServletRequest request)
	{
		List<AiSession> sessions = this.chatService.listSessions(getCurrentUser());

		OperationMessage<List<AiSession>> om = OperationMessage.valueOfSuccess("operationSuccess",
				getMessage(request, "operationSuccess"), sessions);

		return new ResponseEntity<OperationMessage<List<AiSession>>>(om, HttpStatus.OK);
	}

	@RequestMapping(value = "/session/create", produces = CONTENT_TYPE_JSON)
	@ResponseBody
	public ResponseEntity<OperationMessage<AiSession>> sessionCreate(HttpServletRequest request,
			@RequestBody(required = false) SessionCreateForm form)
	{
		User user = getCurrentUser();
		String title = (form == null ? null : form.getTitle());

		AiSession session = this.chatService.createSession(user, title);

		OperationMessage<AiSession> om = OperationMessage.valueOfSuccess("operationSuccess",
				getMessage(request, "operationSuccess"), session);

		return new ResponseEntity<OperationMessage<AiSession>>(om, HttpStatus.OK);
	}

	@RequestMapping(value = "/session/delete/{id}", produces = CONTENT_TYPE_JSON)
	@ResponseBody
	public ResponseEntity<OperationMessage> sessionDelete(HttpServletRequest request, @PathVariable("id") String id)
	{
		this.chatService.deleteSession(id);

		return optSuccessResponseEntity(request);
	}

	@RequestMapping(value = "/chat/history/{sessionId}", produces = CONTENT_TYPE_JSON)
	@ResponseBody
	public ResponseEntity<OperationMessage<List<Map<String, Object>>>> history(HttpServletRequest request,
			@PathVariable("sessionId") String sessionId) throws Exception
	{
		List<Map<String, Object>> history = this.chatService.history(sessionId);

		OperationMessage<List<Map<String, Object>>> om = OperationMessage.valueOfSuccess("operationSuccess",
				getMessage(request, "operationSuccess"), history);

		return new ResponseEntity<OperationMessage<List<Map<String, Object>>>>(om, HttpStatus.OK);
	}

	@RequestMapping(value = "/chat/ask", produces = CONTENT_TYPE_JSON)
	@ResponseBody
	public ResponseEntity<OperationMessage<Map<String, Object>>> ask(HttpServletRequest request,
			@RequestBody AskForm form) throws Exception
	{
		if (form == null || form.getQuestion() == null || form.getQuestion().trim().isEmpty())
			throw new IllegalInputException("请输入问题");

		User user = getCurrentUser();

		Map<String, Object> answer = this.chatService.ask(user, form.getSessionId(), form.getQuestion(),
				form.getMetricId());

		OperationMessage<Map<String, Object>> om = OperationMessage.valueOfSuccess("operationSuccess",
				getMessage(request, "operationSuccess"), answer);

		return new ResponseEntity<OperationMessage<Map<String, Object>>>(om, HttpStatus.OK);
	}

	@RequestMapping(value = "/chat/clarify", produces = CONTENT_TYPE_JSON)
	@ResponseBody
	public ResponseEntity<OperationMessage<Map<String, Object>>> clarify(HttpServletRequest request,
			@RequestBody ClarifyForm form) throws Exception
	{
		if (form == null || form.getOption() == null || form.getOption().trim().isEmpty())
			throw new IllegalInputException("请选择澄清选项");

		User user = getCurrentUser();

		// 澄清选项即指标名：以 pinnedMetricId 重新执行
		Map<String, Object> answer = this.chatService.ask(user, form.getSessionId(),
				form.getOption(), resolveMetricIdByName(form.getOption()));

		OperationMessage<Map<String, Object>> om = OperationMessage.valueOfSuccess("operationSuccess",
				getMessage(request, "operationSuccess"), answer);

		return new ResponseEntity<OperationMessage<Map<String, Object>>>(om, HttpStatus.OK);
	}

	@RequestMapping(value = "/insight/attribute", produces = CONTENT_TYPE_JSON)
	@ResponseBody
	public ResponseEntity<OperationMessage<List<Map<String, Object>>>> attribute(HttpServletRequest request,
			@RequestBody AttributeForm form) throws Exception
	{
		if (form == null || form.getMetric() == null || form.getMetric().isEmpty())
			throw new IllegalInputException("缺少指标");

		List<Map<String, Object>> rows = this.chatService.attribute(getCurrentUser(), form.getMetric());

		OperationMessage<List<Map<String, Object>>> om = OperationMessage.valueOfSuccess("operationSuccess",
				getMessage(request, "operationSuccess"), rows);

		return new ResponseEntity<OperationMessage<List<Map<String, Object>>>>(om, HttpStatus.OK);
	}

	/**
	 * 澄清选项（指标名）→ 指标 ID；未命中返回 null（按原选项文本再走一次识别）。
	 */
	protected String resolveMetricIdByName(String metricName)
	{
		List<org.datagear.management.domain.MetricEntity> metrics = this.chatService.getMetricService()
				.query(new org.datagear.management.util.Query());

		if (metrics != null)
		{
			for (org.datagear.management.domain.MetricEntity metric : metrics)
			{
				if (metricName.equals(metric.getName()))
					return metric.getId();
			}
		}

		return null;
	}

	public static class SessionCreateForm
	{
		private String title;

		public String getTitle()
		{
			return title;
		}

		public void setTitle(String title)
		{
			this.title = title;
		}
	}

	public static class AskForm
	{
		private String sessionId;
		private String question;
		/** 澄清后指定的指标 ID（可空） */
		private String metricId;

		public String getSessionId()
		{
			return sessionId;
		}

		public void setSessionId(String sessionId)
		{
			this.sessionId = sessionId;
		}

		public String getQuestion()
		{
			return question;
		}

		public void setQuestion(String question)
		{
			this.question = question;
		}

		public String getMetricId()
		{
			return metricId;
		}

		public void setMetricId(String metricId)
		{
			this.metricId = metricId;
		}
	}

	public static class ClarifyForm
	{
		private String sessionId;
		private String option;

		public String getSessionId()
		{
			return sessionId;
		}

		public void setSessionId(String sessionId)
		{
			this.sessionId = sessionId;
		}

		public String getOption()
		{
			return option;
		}

		public void setOption(String option)
		{
			this.option = option;
		}
	}

	public static class AttributeForm
	{
		private String metric;

		public String getMetric()
		{
			return metric;
		}

		public void setMetric(String metric)
		{
			this.metric = metric;
		}
	}
}
