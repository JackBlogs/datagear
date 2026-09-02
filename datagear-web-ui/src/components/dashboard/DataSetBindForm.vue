<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { dataSetPagingQueryData, getProfileDataSetByIds, type DataSetEntity } from '@/api/dataSet'
import DataSetBindPanel from './DataSetBindPanel.vue'
import type { DataSign, DataSet, DataSetBind } from '@/types/dashboard'

/**
 * 数据绑定编排组件：加载数据集列表，并在选中数据集后按需加载其字段（ProfileDataSet）。
 * 实际接入 /api/dataSet/pagingQueryData + /api/dataSet/getProfileDataSetByIds。
 */
const props = defineProps<{
  dataSigns: DataSign[]
  modelValue: DataSetBind[]
}>()
const emit = defineEmits<{ (e: 'update:modelValue', v: DataSetBind[]): void }>()

const dataSets = ref<DataSet[]>([])
const loadingList = ref(false)

async function loadDataSetList() {
  loadingList.value = true
  try {
    const data = await dataSetPagingQueryData({ page: 1, pageSize: 500 })
    dataSets.value = data.items.map((d: DataSetEntity) => ({ id: d.id, name: d.name }))
  } finally {
    loadingList.value = false
  }
}

async function loadFields(ids: string[]) {
  if (!ids.length) return
  const profiles = await getProfileDataSetByIds(ids)
  dataSets.value = dataSets.value.map((ds) => {
    const p = profiles.find((x) => x.id === ds.id)
    return p?.fields?.length ? { ...ds, fields: p.fields } : ds
  })
}

// 选中数据集后按需加载字段
watch(
  () => props.modelValue,
  (binds) => {
    const ids = [...new Set(binds.map((b) => b.dataSet?.id).filter((x): x is string => !!x))]
    const missing = ids.filter((id) => !dataSets.value.find((d) => d.id === id)?.fields?.length)
    if (missing.length) void loadFields(missing)
  },
  { deep: true, immediate: true },
)

onMounted(loadDataSetList)
</script>

<template>
  <div v-if="loadingList" class="text-color-secondary">加载数据集…</div>
  <DataSetBindPanel
    v-else
    :model-value="modelValue"
    :data-signs="dataSigns"
    :data-sets="dataSets"
    @update:model-value="emit('update:modelValue', $event)"
  />
</template>
