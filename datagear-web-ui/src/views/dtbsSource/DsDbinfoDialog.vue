<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { getDtbsSourceDbInfo, getDtbsSource, type DtbsSourceDbInfo, type DtbsSource } from '@/api/dtbsSource'
import { deriveDsType, maskUrl } from './dsType'

// 数据库信息弹窗（对应旧版 /dtbsSource/dbinfo 只读视图：数据库产品名 + 支持的表类型）。
// 核验结论：旧服务端渲染页已下线（返回 SPA index.html），且无 /api JSON 端点。
// 降级方案：仍尝试解析旧页（后端若恢复则直接可用）；失败时展示 URL 推导的连接信息
// 并明确标注「后端暂无此数据」，不编造产品名/表类型。
const props = defineProps<{
  show: boolean
  dsId: string
  dsTitle?: string
}>()
const emit = defineEmits<{ (e: 'close'): void }>()

const { t } = useI18n()
const loading = ref(false)
const unavailable = ref(false)
const info = ref<DtbsSourceDbInfo | null>(null)
const ds = ref<DtbsSource | null>(null)

const typeInfo = computed(() => deriveDsType(ds.value?.url))

async function load() {
  if (!props.dsId) return
  loading.value = true
  unavailable.value = false
  info.value = null
  try {
    ds.value = await getDtbsSource(props.dsId).catch(() => null)
    info.value = await getDtbsSourceDbInfo(props.dsId)
  } catch {
    unavailable.value = true
  } finally {
    loading.value = false
  }
}

watch(
  () => props.show,
  (v) => {
    if (v) void load()
  },
)
</script>

<template>
  <div v-if="show" class="modal-mask" @click.self="emit('close')">
    <div class="modal">
      <div class="flex-between">
        <div style="font-size:16px;font-weight:700">{{ t('dsPage.dbinfoTitle') }}<span v-if="dsTitle" class="tx-3 sm"> · {{ dsTitle }}</span></div>
        <button class="drawer-close" type="button" @click="emit('close')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
        </button>
      </div>
      <div class="mt-2">
        <div v-if="loading" class="tx-3">{{ t('loading') }}…</div>
        <template v-else>
          <div class="card" style="padding:6px 14px">
            <div class="kv"><span class="k">{{ t('dsPage.connUrl') }}</span><span class="v mono">{{ maskUrl(ds?.url) }}</span></div>
            <div class="kv"><span class="k">{{ t('dsPage.dbType') }}</span><span class="v">{{ typeInfo.label }}<span v-if="typeInfo.xc" class="tag brand" style="margin-left:6px">{{ t('dsPage.xcTag') }}</span></span></div>
            <template v-if="info">
              <div class="kv"><span class="k">{{ t('dsPage.productName') }}</span><span class="v">{{ info.name || '-' }}</span></div>
              <div class="kv"><span class="k">{{ t('dsPage.driverName') }}</span><span class="v mono">{{ info.driverName || '-' }}</span></div>
            </template>
            <div v-else class="kv">
              <span class="k">{{ t('dsPage.productName') }}</span>
              <span class="v tag warn">{{ t('dsPage.dbinfoFail') }}</span>
            </div>
          </div>
          <div class="sec-label">{{ t('dsPage.tableTypes') }}</div>
          <div v-if="info" class="flex" style="flex-wrap:wrap;gap:8px">
            <span v-for="tp in info.tableTypes ?? []" :key="tp" class="tag">{{ tp }}</span>
            <span v-if="!(info.tableTypes ?? []).length" class="tx-3 sm">-</span>
          </div>
          <div v-else class="tx-3 sm">{{ t('dsPage.dbinfoFail') }}</div>
        </template>
      </div>
      <div class="modal-foot">
        <button class="btn" type="button" @click="emit('close')">{{ t('close') }}</button>
      </div>
    </div>
  </div>
</template>
