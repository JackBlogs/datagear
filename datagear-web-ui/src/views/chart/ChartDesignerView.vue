<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { getChart, saveChart, saveAddChart, type ChartEntity } from '@/api/chart'
import ChartPropertyPanel from '@/components/dashboard/ChartPropertyPanel.vue'
import ChartPreview from '@/components/chart/ChartPreview.vue'
import { newChartModel, type ChartModel } from '@/types/dashboard'
import { useOperationMessage } from '@/composables/useOperationMessage'

// 图表设计器（5c「脱离 iframe」第一步）：加载图表 → 属性面板（插件/数据绑定/样式/交互）→ 保存回写。
const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const { success, fail } = useOperationMessage()

const chartId = route.params.id as string | undefined
// 新建模式：/chart/add 无 id（后端 /api/chart/saveAdd 已实现，设计器内保存新增）
const isNew = !chartId || chartId === 'add'
const model = ref<ChartModel>(newChartModel())
const loading = ref(false)
const saving = ref(false)
const previewKey = ref(0)

function entityToModel(e: ChartEntity): ChartModel {
  return {
    pluginId: e.pluginVo?.id,
    dataSetBinds: e.dataSetBinds ?? [{ fieldSigns: {} }],
    style: { ...(model.value.style), name: e.name },
    interaction: model.value.interaction,
  }
}

function modelToEntity(): ChartEntity {
  return {
    id: chartId ?? '',
    name: model.value.style.name ?? '',
    pluginVo: model.value.pluginId ? { id: model.value.pluginId } : undefined,
    dataSetBinds: model.value.dataSetBinds,
  }
}

async function load() {
  if (isNew) return
  loading.value = true
  try {
    const e = await getChart(chartId)
    model.value = entityToModel(e)
  } catch (e) {
    fail((e as Error).message || t('loadFail'))
  } finally {
    loading.value = false
  }
}

async function save() {
  if (!model.value.style.name) {
    fail(t('pleaseFillChartName'))
    return
  }
  saving.value = true
  try {
    if (isNew) {
      const added = await saveAddChart(modelToEntity())
      success(t('saveSuccess'))
      router.replace(`/chart/${added.id}/design`)
    } else {
      await saveChart(modelToEntity())
      success(t('saveSuccess'))
      previewKey.value++
    }
  } catch (e) {
    fail((e as Error).message || t('saveFail'))
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="p-4">
    <div class="flex align-items-center gap-2 mb-2">
      <h3 class="flex-1">{{ t('chartDesigner') }}</h3>
      <Button :label="t('save')" :loading="saving" @click="save" />
      <Button :label="t('back')" text @click="router.push('/chart')" />
    </div>
    <div v-if="loading" class="text-color-secondary">{{ t('loading') }}</div>
    <template v-else>
      <div class="designer flex">
        <div class="panel flex-1">
          <div class="flex align-items-center gap-2 mb-2">
            <label class="label">{{ t('chartName') }}</label>
            <InputText v-model="model.style.name" class="input flex-1" :placeholder="t('chartName')" maxlength="100" />
          </div>
          <ChartPropertyPanel v-model="model" />
        </div>
        <div class="preview">
          <div class="preview-title">{{ t('previewAfterSave') }}</div>
          <div class="preview-frame">
            <ChartPreview :key="previewKey" :chart-id="chartId ?? ''" />
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.label {
  min-width: 64px;
  font-weight: 600;
}
.input {
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 6px 8px;
  flex: 1;
}
.designer {
  gap: 16px;
  align-items: flex-start;
}
.preview {
  width: 50%;
  min-width: 320px;
}
.preview-title {
  font-weight: 600;
  margin-bottom: 8px;
}
.preview-frame {
  width: 100%;
  height: 480px;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
}
</style>
