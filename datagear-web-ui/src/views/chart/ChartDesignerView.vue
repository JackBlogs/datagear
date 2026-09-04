<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { getChart, saveChart, saveAddChart, type ChartEntity } from '@/api/chart'
import ChartPropertyPanel from '@/components/dashboard/ChartPropertyPanel.vue'
import ChartPreview from '@/components/chart/ChartPreview.vue'
import { newChartModel, type ChartModel } from '@/types/dashboard'
import { useOperationMessage } from '@/composables/useOperationMessage'
import '@/styles/datasource-page.css'

// 图表设计器（能源暗域）：新建 /chart/add、编辑 /chart/:id/design。
// 属性面板（插件/数据绑定/样式/交互）+ 实时预览；保存新增后原地接管 id。
const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const { success, fail } = useOperationMessage()

const chartId = ref(route.params.id as string | undefined)
const isNew = computed(() => !chartId.value)
const model = ref<ChartModel>(newChartModel())
const loading = ref(false)
const saving = ref(false)
const previewKey = ref(0)

const title = computed(() => (isNew.value ? t('new') : t('edit')) + t('chartDesigner'))

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
    id: chartId.value ?? '',
    name: model.value.style.name ?? '',
    pluginVo: model.value.pluginId ? { id: model.value.pluginId } : undefined,
    dataSetBinds: model.value.dataSetBinds,
  }
}

async function load() {
  if (isNew.value) return
  loading.value = true
  try {
    const e = await getChart(chartId.value!)
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
    if (isNew.value) {
      // 新增：只传必要字段（空 id / 空 dataSetBinds 会导致后端 500）
      const entity = modelToEntity()
      const added = await saveAddChart({ id: '', name: entity.name, pluginVo: entity.pluginVo } as ChartEntity)
      success(t('saveSuccess'))
      chartId.value = added.id
      router.replace(`/chart/${added.id}/design`)
      previewKey.value++
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
  <div class="ds-page">
    <!-- 页头 -->
    <div class="page-head">
      <div>
        <div class="page-title">
          {{ title }}
          <span class="tag brand">图表</span>
        </div>
        <div class="page-desc">选择图表插件、绑定数据集、配置样式与交互 —— 保存后可被看板引用</div>
      </div>
      <div class="page-actions">
        <button class="btn" type="button" @click="router.push('/chart')">{{ t('back') }}</button>
        <button class="btn primary" type="button" :disabled="saving" @click="save">
          {{ saving ? '保存中…' : t('save') }}
        </button>
      </div>
    </div>

    <div v-if="loading" class="empty">{{ t('loading') }}</div>

    <div v-else class="designer">
      <!-- 左：属性面板 -->
      <div class="card prop-col">
        <div class="form-item">
          <label class="form-label">{{ t('chartName') }}</label>
          <input v-model="model.style.name" type="text" class="input" :placeholder="t('chartName')" maxlength="100" />
        </div>
        <ChartPropertyPanel v-model="model" />
      </div>

      <!-- 右：实时预览 -->
      <div class="card preview-col">
        <div class="card-title"><i class="bar"></i>{{ t('preview') }}</div>
        <div v-if="chartId" class="preview-frame">
          <ChartPreview :key="previewKey" :chart-id="chartId" />
        </div>
        <div v-else class="preview-empty">
          <span class="tag brand">保存后可预览</span>
          <div class="sm tx-3" style="margin-top: 8px">完成左侧配置并保存后，此处将渲染图表真实效果</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.designer {
  display: grid;
  grid-template-columns: minmax(340px, 5fr) 6fr;
  gap: 14px;
  align-items: start;
}
.prop-col { padding: 16px 18px; min-width: 0; }
.form-item { margin-bottom: 14px; }
.form-label { font-size: 12px; color: var(--tx-2); margin-bottom: 5px; display: block; }
.preview-col { padding: 16px 18px; min-width: 0; }
.preview-frame { height: 560px; border: 1px solid var(--line-1); border-radius: 10px; overflow: hidden; background: var(--bg-glass); }
.preview-empty {
  height: 560px; display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 4px; border: 1px dashed var(--line-2); border-radius: 10px;
}
</style>
