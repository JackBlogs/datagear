import { reactive } from 'vue'

// 连接健康度记录：仅本次会话内累计（不落库，后端无历史检测数据能力）。
// 模块级 reactive，保证抽屉开关间数据保留；页面刷新即清空。

export interface HealthRecord {
  /** 检测时间（显示串） */
  time: string
  ok: boolean
}

const records = reactive<Record<string, HealthRecord[]>>({})

export function useDsHealth() {
  function push(dtbsSourceId: string, ok: boolean) {
    const list = records[dtbsSourceId] ?? []
    list.push({ time: new Date().toLocaleTimeString(), ok })
    records[dtbsSourceId] = list
  }

  function clear(dtbsSourceId: string) {
    delete records[dtbsSourceId]
  }

  return { records, push, clear }
}
