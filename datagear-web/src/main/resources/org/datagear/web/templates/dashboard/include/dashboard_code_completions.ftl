<#--
 *
 * Copyright 2018 datagear.tech
 *
 * Licensed under the LGPLv3 license:
 * http://www.gnu.org/licenses/lgpl-3.0.html
 *
-->
<#--
看板代码补全列表
-->
<script type="text/javascript">
(function(po)
{
	po.codeEditorCompletionsTagAttr =
	[
		{name: "dg-chart-auto-resize", value: "dg-chart-auto-resize=\"true\"",
			displayComment: "<@spring.message code='dashboard.templateEditor.autoComplete.dg-chart-auto-resize' />", categories: ["body", "div"]},
		{name: "dg-chart-disable-setting",
			displayComment: "<@spring.message code='dashboard.templateEditor.autoComplete.dg-chart-disable-setting' />", categories: ["body", "div"]},
		{name: "dg-chart-link",
			displayComment: "<@spring.message code='dashboard.templateEditor.autoComplete.dg-chart-link' />", categories: ["div"]},
		{name: "dg-chart-listener",
			displayComment: "<@spring.message code='dashboard.templateEditor.autoComplete.dg-chart-listener' />", categories: ["body", "div"]},
		{name: "dg-chart-map",
			displayComment: "<@spring.message code='dashboard.templateEditor.autoComplete.dg-chart-map' />", categories: ["div"]},
		{name: "dg-chart-map-urls",
			displayComment: "<@spring.message code='dashboard.templateEditor.autoComplete.dg-chart-map-urls' />", categories: ["body"]},
		{name: "dg-chart-on-",
			displayComment: "<@spring.message code='dashboard.templateEditor.autoComplete.dg-chart-on-' />", categories: ["div"]},
		{name: "dg-chart-options",
			displayComment: "<@spring.message code='dashboard.templateEditor.autoComplete.dg-chart-options' />", categories: ["body","div"]},
		{name: "dg-chart-renderer",
			displayComment: "<@spring.message code='dashboard.templateEditor.autoComplete.dg-chart-renderer' />", categories: ["div"]},
		{name: "dg-chart-theme",
			displayComment: "<@spring.message code='dashboard.templateEditor.autoComplete.dg-chart-theme' />", categories: ["body", "div"]},
		{name: "dg-chart-update-group",
			displayComment: "<@spring.message code='dashboard.templateEditor.autoComplete.dg-chart-update-group' />", categories: ["body", "div"]},
		{name: "dg-chart-widget",
			displayComment: "<@spring.message code='dashboard.templateEditor.autoComplete.dg-chart-widget' />", categories: ["div"]},
		{name: "dg-dashboard-form",
			displayComment: "<@spring.message code='dashboard.templateEditor.autoComplete.dg-dashboard-form' />", categories: ["form"]},
		{name: "dg-dashboard-listener",
			displayComment: "<@spring.message code='dashboard.templateEditor.autoComplete.dg-dashboard-listener' />", categories: ["body"]},
		{name: "dg-dashboard-var",
			displayComment: "<@spring.message code='dashboard.templateEditor.autoComplete.dg-dashboard-var' />", categories: ["html"]},
		{name: "dg-echarts-theme",
			displayComment: "<@spring.message code='dashboard.templateEditor.autoComplete.dg-echarts-theme' />", categories: ["body", "div"]},
	];
	
	po.codeEditorCompletionsJsFunction =
	[
		//看板JS对象
		{name: "addChart", value: "addChart(", displayName: "addChart()", displayComment: "dashboard", categories: ["dashboard"], categories: ["dashboard"]},
		{name: "chartIndex", value: "chartIndex(", displayName: "chartIndex()", displayComment: "dashboard", categories: ["dashboard"], categories: ["dashboard"]},
		{name: "chartOf", value: "chartOf(", displayName: "chartOf()", displayComment: "dashboard", categories: ["dashboard"], categories: ["dashboard"]},
		{name: "batchSetDataSetParamValues", value: "batchSetDataSetParamValues(", displayName: "batchSetDataSetParamValues()", displayComment: "dashboard", categories: ["dashboard"], categories: ["dashboard"]},
		{name: "charts", value: "charts", displayName: "charts", displayComment: "dashboard", categories: ["dashboard"], categories: ["dashboard"]},
		{name: "doRender", value: "doRender()", displayName: "doRender()", displayComment: "dashboard", categories: ["dashboard"], categories: ["dashboard"]},
		{name: "init", value: "init()", displayName: "init()", displayComment: "dashboard", categories: ["dashboard"], categories: ["dashboard"]},
		{name: "isHandlingCharts", value: "isHandlingCharts()", displayName: "isHandlingCharts()", displayComment: "dashboard", categories: ["dashboard"], categories: ["dashboard"]},
		{name: "listener", value: "listener(", displayName: "listener()", displayComment: "dashboard", categories: ["dashboard"], categories: ["dashboard"]},
		{name: "loadChart", value: "loadChart(", displayName: "loadChart()", displayComment: "dashboard", categories: ["dashboard"], categories: ["dashboard"]},
		{name: "loadCharts", value: "loadCharts(", displayName: "loadCharts()", displayComment: "dashboard", categories: ["dashboard"], categories: ["dashboard"]},
		{name: "loadUnsolvedCharts", value: "loadUnsolvedCharts()", displayName: "loadUnsolvedCharts()", displayComment: "dashboard", categories: ["dashboard"], categories: ["dashboard"]},
		{name: "mapURLs", value: "mapURLs(", displayName: "mapURLs()", displayComment: "dashboard", categories: ["dashboard"]},
		{name: "originalInfo", value: "originalInfo(", displayName: "originalInfo()", displayComment: "dashboard", categories: ["dashboard"]},
		{name: "refreshData", value: "refreshData(", displayName: "refreshData()", displayComment: "dashboard", categories: ["dashboard"]},
		{name: "removeChart", value: "removeChart(", displayName: "removeChart()", displayComment: "dashboard", categories: ["dashboard"]},
		{name: "render", value: "render()", displayName: "render()", displayComment: "dashboard", categories: ["dashboard"]},
		{name: "renderContext", value: "renderContext", displayName: "renderContext", displayComment: "dashboard", categories: ["dashboard"]},
		{name: "renderContextAttr", value: "renderContextAttr(", displayName: "renderContextAttr()", displayComment: "dashboard", categories: ["dashboard"]},
		{name: "renderForm", value: "renderForm(", displayName: "renderForm()", displayComment: "dashboard", categories: ["dashboard"]},
		{name: "renderedChart", value: "renderedChart(", displayName: "renderedChart()", displayComment: "dashboard", categories: ["dashboard"]},
		{name: "resizeAllCharts", value: "resizeAllCharts()", displayName: "resizeAllCharts()", displayComment: "dashboard", categories: ["dashboard"]},
		{name: "resizeChart", value: "resizeChart(", displayName: "resizeChart()", displayComment: "dashboard", categories: ["dashboard"]},
		{name: "resultDataFormat", value: "resultDataFormat(", displayName: "resultDataFormat()", displayComment: "dashboard", categories: ["dashboard"]},
		{name: "serverDate", value: "serverDate()", displayName: "serverDate()", displayComment: "dashboard", categories: ["dashboard"]},
		{name: "startHandleCharts", value: "startHandleCharts()", displayName: "startHandleCharts()", displayComment: "dashboard", categories: ["dashboard"]},
		{name: "stopHandleCharts", value: "stopHandleCharts()", displayName: "stopHandleCharts()", displayComment: "dashboard", categories: ["dashboard"]},
		{name: "user", value: "user()", displayName: "user()", displayComment: "dashboard", categories: ["dashboard"]},
		
		//图表JS对象
		{name: "autoResize", value: "autoResize(", displayName: "autoResize() ", displayComment: "chart", categories: ["chart"], categories: ["chart"]},
		{name: "bindLinksEventHanders", value: "bindLinksEventHanders(", displayName: "bindLinksEventHanders() ", displayComment: "chart", categories: ["chart"]},
		{name: "callEventHandler", value: "callEventHandler(", displayName: "callEventHandler() ", displayComment: "chart", categories: ["chart"]},
		{name: "chartDataSetAt", value: "chartDataSetAt(", displayName: "chartDataSetAt() ", displayComment: "chart", categories: ["chart"]},
		{name: "chartDataSetAttachment", value: "chartDataSetAttachment()", displayName: "chartDataSetAttachment() ", displayComment: "chart", categories: ["chart"]},
		{name: "chartDataSetMain", value: "chartDataSetMain()", displayName: "chartDataSetMain() ", displayComment: "chart", categories: ["chart"]},
		{name: "chartDataSets", value: "chartDataSets", displayName: "chartDataSets ", displayComment: "chart", categories: ["chart"]},
		{name: "chartDataSetsAttachment", value: "chartDataSetsAttachment()", displayName: "chartDataSetsAttachment() ", displayComment: "chart", categories: ["chart"]},
		{name: "chartDataSetsMain", value: "chartDataSetsMain()", displayName: "chartDataSetsMain() ", displayComment: "chart", categories: ["chart"]},
		{name: "dashboard", value: "dashboard", displayName: "dashboard ", displayComment: "chart", categories: ["chart"]},
		{name: "dataSetAlias", value: "dataSetAlias(", displayName: "dataSetAlias() ", displayComment: "chart", categories: ["chart"]},
		{name: "dataSetParam", value: "dataSetParam(", displayName: "dataSetParam() ", displayComment: "chart", categories: ["chart"]},
		{name: "dataSetParamValue", value: "dataSetParamValue(", displayName: "dataSetParamValue() ", displayComment: "chart", categories: ["chart"]},
		{name: "dataSetParamValueFirst", value: "dataSetParamValueFirst(", displayName: "dataSetParamValueFirst() ", displayComment: "chart", categories: ["chart"]},
		{name: "dataSetParamValues", value: "dataSetParamValues(", displayName: "dataSetParamValues() ", displayComment: "chart", categories: ["chart"]},
		{name: "dataSetParamValuesFirst", value: "dataSetParamValuesFirst(", displayName: "dataSetParamValuesFirst() ", displayComment: "chart", categories: ["chart"]},
		{name: "dataSetParams", value: "dataSetParams(", displayName: "dataSetParams() ", displayComment: "chart", categories: ["chart"]},
		{name: "dataSetProperties", value: "dataSetProperties(", displayName: "dataSetProperties() ", displayComment: "chart", categories: ["chart"]},
		{name: "dataSetPropertiesOfSign", value: "dataSetPropertiesOfSign(", displayName: "dataSetPropertiesOfSign() ", displayComment: "chart", categories: ["chart"]},
		{name: "dataSetProperty", value: "dataSetProperty(", displayName: "dataSetProperty() ", displayComment: "chart", categories: ["chart"]},
		{name: "dataSetPropertyAlias", value: "dataSetPropertyAlias(", displayName: "dataSetPropertyAlias() ", displayComment: "chart", categories: ["chart"]},
		{name: "dataSetPropertyOfSign", value: "dataSetPropertyOfSign(", displayName: "dataSetPropertyOfSign() ", displayComment: "chart", categories: ["chart"]},
		{name: "dataSetPropertyOrder", value: "dataSetPropertyOrder(", displayName: "dataSetPropertyOrder() ", displayComment: "chart", categories: ["chart"]},
		{name: "dataSetPropertySign", value: "dataSetPropertySign(", displayName: "dataSetPropertySign() ", displayComment: "chart", categories: ["chart"]},
		{name: "dataSetPropertySigns", value: "dataSetPropertySigns(", displayName: "dataSetPropertySigns() ", displayComment: "chart", categories: ["chart"]},
		{name: "destroy", value: "destroy()", displayName: "destroy() ", displayComment: "chart", categories: ["chart"]},
		{name: "disableSetting", value: "disableSetting(", displayName: "disableSetting() ", displayComment: "chart", categories: ["chart"]},
		{name: "doRender", value: "doRender()", displayName: "doRender() ", displayComment: "chart", categories: ["chart"]},
		{name: "doUpdate", value: "doUpdate(", displayName: "doUpdate() ", displayComment: "chart", categories: ["chart"]},
		{name: "echartsGetThemeName", value: "echartsGetThemeName()", displayName: "echartsGetThemeName() ", displayComment: "chart", categories: ["chart"]},
		{name: "echartsInit", value: "echartsInit(", displayName: "echartsInit() ", displayComment: "chart", categories: ["chart"]},
		{name: "echartsLoadMap", value: "echartsLoadMap(", displayName: "echartsLoadMap() ", displayComment: "chart", categories: ["chart"]},
		{name: "echartsMapRegistered", value: "echartsMapRegistered(", displayName: "echartsMapRegistered() ", displayComment: "chart", categories: ["chart"]},
		{name: "echartsOffEventHandler", value: "echartsOffEventHandler(", displayName: "echartsOffEventHandler() ", displayComment: "chart", categories: ["chart"]},
		{name: "echartsOptions", value: "echartsOptions(", displayName: "echartsOptions() ", displayComment: "chart", categories: ["chart"]},
		{name: "echartsThemeName", value: "echartsThemeName(", displayName: "echartsThemeName() ", displayComment: "chart", categories: ["chart"]},
		{name: "element", value: "element()", displayName: "element() ", displayComment: "chart", categories: ["chart"]},
		{name: "elementId", value: "elementId", displayName: "elementId ", displayComment: "chart", categories: ["chart"]},
		{name: "elementJquery", value: "elementJquery()", displayName: "elementJquery() ", displayComment: "chart", categories: ["chart"]},
		{name: "elementStyle", value: "elementStyle(", displayName: "elementStyle() ", displayComment: "chart", categories: ["chart"]},
		{name: "elementWidgetId", value: "elementWidgetId()", displayName: "elementWidgetId() ", displayComment: "chart", categories: ["chart"]},
		{name: "eventData", value: "eventData(", displayName: "eventData() ", displayComment: "chart", categories: ["chart"]},
		{name: "eventHandlers", value: "eventHandlers(", displayName: "eventHandlers() ", displayComment: "chart", categories: ["chart"]},
		{name: "eventNewEcharts", value: "eventNewEcharts(", displayName: "eventNewEcharts() ", displayComment: "chart", categories: ["chart"]},
		{name: "eventNewHtml", value: "eventNewHtml(", displayName: "eventNewHtml() ", displayComment: "chart", categories: ["chart"]},
		{name: "eventOriginalData", value: "eventOriginalData(", displayName: "eventOriginalData() ", displayComment: "chart", categories: ["chart"]},
		{name: "eventOriginalDataIndex", value: "eventOriginalDataIndex(", displayName: "eventOriginalDataIndex() ", displayComment: "chart", categories: ["chart"]},
		{name: "extValue", value: "extValue(", displayName: "extValue() ", displayComment: "chart", categories: ["chart"]},
		{name: "gradualColor", value: "gradualColor(", displayName: "gradualColor() ", displayComment: "chart", categories: ["chart"]},
		{name: "handleChartEventLink", value: "handleChartEventLink(", displayName: "handleChartEventLink() ", displayComment: "chart", categories: ["chart"]},
		{name: "hasDataSetParam", value: "hasDataSetParam()", displayName: "hasDataSetParam() ", displayComment: "chart", categories: ["chart"]},
		{name: "id", value: "id", displayName: "id ", displayComment: "chart", categories: ["chart"]},
		{name: "inflateRenderOptions", value: "inflateRenderOptions(", displayName: "inflateRenderOptions() ", displayComment: "chart", categories: ["chart"]},
		{name: "inflateUpdateOptions", value: "inflateUpdateOptions(", displayName: "inflateUpdateOptions() ", displayComment: "chart", categories: ["chart"]},
		{name: "init", value: "init()", displayName: "init() ", displayComment: "chart", categories: ["chart"]},
		{name: "internal", value: "internal()", displayName: "internal( ", displayComment: "chart", categories: ["chart"]},
		{name: "isActive", value: "isActive()", displayName: "isActive() ", displayComment: "chart", categories: ["chart"]},
		{name: "isAsyncRender", value: "isAsyncRender()", displayName: "isAsyncRender() ", displayComment: "chart", categories: ["chart"]},
		{name: "isAsyncUpdate", value: "isAsyncUpdate()", displayName: "isAsyncUpdate() ", displayComment: "chart", categories: ["chart"]},
		{name: "isDataSetParamValueReady", value: "isDataSetParamValueReady()", displayName: "isDataSetParamValueReady() ", displayComment: "chart", categories: ["chart"]},
		{name: "isInstance", value: "isInstance(", displayName: "isInstance() ", displayComment: "chart", categories: ["chart"]},
		{name: "isMutableModel", value: "isMutableModel(", displayName: "isMutableModel() ", displayComment: "chart", categories: ["chart"]},
		{name: "links", value: "links(", displayName: "links() ", displayComment: "chart", categories: ["chart"]},
		{name: "listener", value: "listener(", displayName: "listener() ", displayComment: "chart", categories: ["chart"]},
		{name: "loadMap", value: "loadMap(", displayName: "loadMap() ", displayComment: "chart", categories: ["chart"]},
		{name: "map", value: "map(", displayName: "map() ", displayComment: "chart", categories: ["chart"]},
		{name: "mapURL", value: "mapURL(", displayName: "mapURL() ", displayComment: "chart", categories: ["chart"]},
		{name: "name", value: "name", displayName: "name ", displayComment: "chart", categories: ["chart"]},
		{name: "off", value: "off(", displayName: "off() ", displayComment: "chart", categories: ["chart"]},
		{name: "on", value: "on(", displayName: "on() ", displayComment: "chart", categories: ["chart"]},
		{name: "onClick", value: "onClick(", displayName: "onClick() ", displayComment: "chart", categories: ["chart"]},
		{name: "onDblclick", value: "onDblclick(", displayName: "onDblclick() ", displayComment: "chart", categories: ["chart"]},
		{name: "onMousedown", value: "onMousedown(", displayName: "onMousedown() ", displayComment: "chart", categories: ["chart"]},
		{name: "onMouseout", value: "onMouseout(", displayName: "onMouseout() ", displayComment: "chart", categories: ["chart"]},
		{name: "onMouseover", value: "onMouseover(", displayName: "onMouseover() ", displayComment: "chart", categories: ["chart"]},
		{name: "onMouseup", value: "onMouseup(", displayName: "onMouseup() ", displayComment: "chart", categories: ["chart"]},
		{name: "options", value: "options(", displayName: "options() ", displayComment: "chart", categories: ["chart"]},
		{name: "originalDataIndex", value: "originalDataIndex(", displayName: "originalDataIndex() ", displayComment: "chart", categories: ["chart"]},
		{name: "originalDataIndexes", value: "originalDataIndexes(", displayName: "originalDataIndexes() ", displayComment: "chart", categories: ["chart"]},
		{name: "plugin", value: "plugin", displayName: "plugin ", displayComment: "chart", categories: ["chart"]},
		{name: "refreshData", value: "refreshData()", displayName: "refreshData() ", displayComment: "chart", categories: ["chart"]},
		{name: "registerEventHandlerDelegation", value: "registerEventHandlerDelegation(", displayName: "registerEventHandlerDelegation() ", displayComment: "chart", categories: ["chart"]},
		{name: "removeEventHandlerDelegation", value: "removeEventHandlerDelegation(", displayName: "removeEventHandlerDelegation() ", displayComment: "chart", categories: ["chart"]},
		{name: "render", value: "render()", displayName: "render() ", displayComment: "chart", categories: ["chart"]},
		{name: "renderContext", value: "renderContext", displayName: "renderContext ", displayComment: "chart", categories: ["chart"]},
		{name: "renderContextAttr", value: "renderContextAttr(", displayName: "renderContextAttr() ", displayComment: "chart", categories: ["chart"]},
		{name: "renderOptions", value: "renderOptions(", displayName: "renderOptions() ", displayComment: "chart", categories: ["chart"]},
		{name: "renderer", value: "renderer(", displayName: "renderer() ", displayComment: "chart", categories: ["chart"]},
		{name: "resetDataSetParamValues", value: "resetDataSetParamValues(", displayName: "resetDataSetParamValues() ", displayComment: "chart", categories: ["chart"]},
		{name: "resetDataSetParamValuesFirst", value: "resetDataSetParamValuesFirst()", displayName: "resetDataSetParamValuesFirst() ", displayComment: "chart", categories: ["chart"]},
		{name: "resize", value: "resize()", displayName: "resize() ", displayComment: "chart", categories: ["chart"]},
		{name: "resultAt", value: "resultAt(", displayName: "resultAt() ", displayComment: "chart", categories: ["chart"]},
		{name: "resultCell", value: "resultCell(", displayName: "resultCell() ", displayComment: "chart", categories: ["chart"]},
		{name: "resultColumnArrays", value: "resultColumnArrays(", displayName: "resultColumnArrays() ", displayComment: "chart", categories: ["chart"]},
		{name: "resultData", value: "resultData(", displayName: "resultData() ", displayComment: "chart", categories: ["chart"]},
		{name: "resultDataElement", value: "resultDataElement(", displayName: "resultDataElement() ", displayComment: "chart", categories: ["chart"]},
		{name: "resultDataFormat", value: "resultDataFormat(", displayName: "resultDataFormat() ", displayComment: "chart", categories: ["chart"]},
		{name: "resultDataOf", value: "resultDataOf(", displayName: "resultDataOf() ", displayComment: "chart", categories: ["chart"]},
		{name: "resultDatas", value: "resultDatas(", displayName: "resultDatas() ", displayComment: "chart", categories: ["chart"]},
		{name: "resultDatasOf", value: "resultDatasOf(", displayName: "resultDatasOf() ", displayComment: "chart", categories: ["chart"]},
		{name: "resultMapObjects", value: "resultMapObjects(", displayName: "resultMapObjects() ", displayComment: "chart", categories: ["chart"]},
		{name: "resultNameValueObjects", value: "resultNameValueObjects(", displayName: "resultNameValueObjects() ", displayComment: "chart", categories: ["chart"]},
		{name: "resultOf", value: "resultOf(", displayName: "resultOf() ", displayComment: "chart", categories: ["chart"]},
		{name: "resultRowArrays", value: "resultRowArrays(", displayName: "resultRowArrays() ", displayComment: "chart", categories: ["chart"]},
		{name: "resultRowCell", value: "resultRowCell(", displayName: "resultRowCell() ", displayComment: "chart", categories: ["chart"]},
		{name: "resultValueObjects", value: "resultValueObjects(", displayName: "resultValueObjects() ", displayComment: "chart", categories: ["chart"]},
		{name: "status", value: "status(", displayName: "status() ", displayComment: "chart", categories: ["chart"]},
		{name: "statusDestroyed", value: "statusDestroyed(", displayName: "statusDestroyed() ", displayComment: "chart", categories: ["chart"]},
		{name: "statusPreRender", value: "statusPreRender(", displayName: "statusPreRender() ", displayComment: "chart", categories: ["chart"]},
		{name: "statusPreUpdate", value: "statusPreUpdate(", displayName: "statusPreUpdate() ", displayComment: "chart", categories: ["chart"]},
		{name: "statusRendered", value: "statusRendered(", displayName: "statusRendered() ", displayComment: "chart", categories: ["chart"]},
		{name: "statusRendering", value: "statusRendering(", displayName: "statusRendering() ", displayComment: "chart", categories: ["chart"]},
		{name: "statusUpdated", value: "statusUpdated(", displayName: "statusUpdated() ", displayComment: "chart", categories: ["chart"]},
		{name: "statusUpdating", value: "statusUpdating(", displayName: "statusUpdating() ", displayComment: "chart", categories: ["chart"]},
		{name: "styleString", value: "styleString(", displayName: "styleString() ", displayComment: "chart", categories: ["chart"]},
		{name: "theme", value: "theme(", displayName: "theme() ", displayComment: "chart", categories: ["chart"]},
		{name: "themeStyleName", value: "themeStyleName()", displayName: "themeStyleName() ", displayComment: "chart", categories: ["chart"]},
		{name: "themeStyleSheet", value: "themeStyleSheet(", displayName: "themeStyleSheet() ", displayComment: "chart", categories: ["chart"]},
		{name: "update", value: "update(", displayName: "update() ", displayComment: "chart", categories: ["chart"]},
		{name: "updateGroup", value: "updateGroup(", displayName: "updateGroup() ", displayComment: "chart", categories: ["chart"]},
		{name: "updateInterval", value: "updateInterval", displayName: "updateInterval ", displayComment: "chart", categories: ["chart"]},
		{name: "updateResults", value: "updateResults(", displayName: "updateResults() ", displayComment: "chart", categories: ["chart"]},
		{name: "widgetId", value: "widgetId()", displayName: "widgetId() ", displayComment: "chart", categories: ["chart"]}
	];
})
(${pageId});
</script>
