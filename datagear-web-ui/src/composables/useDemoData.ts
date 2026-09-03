/**
 * 演示数据约定（演示页 → 真实化的统一替换点）：
 * 1. 页面使用硬编码演示数据（后端 API 未交付）时，页头必须放置 <DemoBadge /> 徽标；
 * 2. 演示数据收敛为页面内具名常量（如 METRICS / ALERT_RULES），真实化时仅将该数据源替换为 API 调用，
 *    交互与视图结构保持不变；
 * 3. DEMO_BADGE_ENABLED 为全局演示开关：对外演示/汇报场景可一键隐藏所有「演示数据」标注。
 */
export const DEMO_BADGE_ENABLED = true

export function useDemoData(label = '演示数据') {
  return { showBadge: DEMO_BADGE_ENABLED, label }
}
