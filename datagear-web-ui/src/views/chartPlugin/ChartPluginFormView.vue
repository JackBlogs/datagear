<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  getChartPlugin,
  getChartPluginManualContent,
  type ChartPlugin,
} from '@/api/chartPlugin'
import { useOperationMessage } from '@/composables/useOperationMessage'
import { useI18n } from 'vue-i18n'
import { dataSignLabel, TARGET_FIELD, TARGET_DATASET, type DataSign } from '@/types/dashboard'

// 图表插件详情表单（查看），按旧 chartPlugin_form.ftl 复刻：
// 基本信息 / 数据签名 / 使用手册 三个 Tab。
const route = useRoute()
const router = useRouter()
const { fail } = useOperationMessage()
const { t } = useI18n()

const id = (route.params.id as string) ?? ''
const mode = (route.query.mode as string) || 'view'
const isReadonly = computed(() => mode === 'view')

const loading = ref(false)
const form = ref<ChartPlugin>({ id: '' })

// 使用手册内容（惰性加载，Tab 切换到索引 2 时拉取）。
const manualHtml = ref<string | null>(null)

// 数据签名详情弹层。
const dataSignDetail = ref<{ label: string; detail: string }>({ label: '', detail: '' })
const dataSignDetailPanel = ref()

/** 数据签名树节点（TreeNode 结构：key/data/leaf/children）。 */
interface DataSignNode {
  key: string
  data: DataSign
  leaf: boolean
  children?: DataSignNode[]
}

function toDataSignTreeNodes(signs: DataSign[] | undefined): DataSignNode[] | null {
  if (!signs) return null
  return signs.map((sign) => ({
    key: sign.fullname,
    data: sign,
    leaf: !sign.children || sign.children.length === 0,
    children: toDataSignTreeNodes(sign.children) ?? undefined,
  }))
}

const dataSignTreeNodes = computed<DataSignNode[] | null>(() =>
  toDataSignTreeNodes(form.value.dataSignSpec?.dataSigns),
)

const pluginName = computed(() => form.value.nameLabel?.value || form.value.id || '')

function formatTarget(tgt: string): string {
  if (tgt === TARGET_FIELD) return t('field')
  if (tgt === TARGET_DATASET) return t('dataSet')
  return tgt
}

async function load() {
  if (!id) return
  loading.value = true
  try {
    const plugin = await getChartPlugin(id)
    // 与旧模板一致：确保 nameLabel/descLabel 始终为对象，避免模板访问 .value 抛错。
    plugin.nameLabel = plugin.nameLabel ?? {}
    plugin.descLabel = plugin.descLabel ?? {}
    form.value = plugin
  } catch (e) {
    fail((e as Error).message || t('loadFail'))
  } finally {
    loading.value = false
  }
}

async function loadManual() {
  if (!form.value.id || manualHtml.value != null) return
  try {
    const text = await getChartPluginManualContent(form.value.id)
    // 不允许任何 HTML 标签直接渲染，避免安全风险（原始 markdown 内容按纯文本展示）。
    manualHtml.value = text
  } catch (e) {
    // 手册加载失败不阻断页面，静默处理。
    manualHtml.value = ''
  }
}

function onTabChange(e: { index: number }) {
  if (e.index === 2) loadManual()
}

function onOpenManualInNewWindow() {
  if (!form.value.id) return
  window.open(`/chartPlugin/manual/${encodeURIComponent(form.value.id)}`, '_blank')
}

function onShowDataSignDetail(e: Event, sign: DataSign) {
  // 直接 show 会导致面板停留在上一个元素上，先 hide 再 nextTick show。
  dataSignDetailPanel.value?.hide()
  nextTick(() => {
    dataSignDetail.value = {
      label: dataSignLabel(sign),
      detail: sign.descLabel?.value ?? '',
    }
    dataSignDetailPanel.value?.show(e)
  })
}

onMounted(load)
</script>

<template>
  <div class="page page-form h-full p-1">
    <form class="flex flex-column h-full" :class="{ readonly: isReadonly }">
      <div class="flex align-items-center gap-2 mb-2">
        <h3 class="flex-1">{{ t('view') + t('module.chartPlugin') }}</h3>
        <Button :label="t('back')" text size="small" @click="router.push('/chartPlugin')" />
      </div>
      <div v-if="loading" class="text-color-secondary">{{ t('loading') }}</div>
      <div v-else class="page-form-content flex-grow-1 px-2 py-1 overflow-y-auto">
        <TabView class="xs-tabview" @tab-change="onTabChange">
          <TabPanel :header="t('basicInfo')">
            <div class="py-2">
              <div class="field grid">
                <label for="chartPlugin-id" class="field-label col-12 mb-2 md:col-3 md:mb-0">{{ t('id') }}</label>
                <div class="field-input col-12 md:col-9">
                  <InputText
                    id="chartPlugin-id"
                    v-model="form.id"
                    type="text"
                    class="input w-full"
                    maxlength="100"
                    :readonly="isReadonly"
                  />
                </div>
              </div>
              <div class="field grid">
                <label for="chartPlugin-name" class="field-label col-12 mb-2 md:col-3 md:mb-0">{{ t('name') }}</label>
                <div class="field-input col-12 md:col-9">
                  <div
                    id="chartPlugin-name"
                    class="plugin-info inline flex align-items-center p-inputtext"
                  >
                    <span
                      v-if="form.id"
                      class="plugin-icon"
                      :style="{ backgroundImage: `url('/chartPlugin/icon/${encodeURIComponent(form.id)}')` }"
                    ></span>
                    <span>{{ pluginName }}</span>
                  </div>
                </div>
              </div>
              <div class="field grid">
                <label for="chartPlugin-version" class="field-label col-12 mb-2 md:col-3 md:mb-0">{{ t('version') }}</label>
                <div class="field-input col-12 md:col-9">
                  <InputText
                    id="chartPlugin-version"
                    v-model="form.version"
                    type="text"
                    class="input w-full"
                    maxlength="100"
                    :readonly="isReadonly"
                  />
                </div>
              </div>
              <div class="field grid">
                <label for="chartPlugin-desc" class="field-label col-12 mb-2 md:col-3 md:mb-0">{{ t('description') }}</label>
                <div class="field-input col-12 md:col-9">
                  <Textarea
                    id="chartPlugin-desc"
                    v-model="form.descLabel!.value"
                    rows="10"
                    class="input w-full"
                    maxlength="1000"
                    :readonly="isReadonly"
                  />
                </div>
              </div>
              <div class="field grid">
                <label
                  for="chartPlugin-apiVersion"
                  class="field-label col-12 mb-2 md:col-3 md:mb-0"
                  title="图表插件 API 版本"
                >{{ t('apiVersion') }}</label>
                <div class="field-input col-12 md:col-9">
                  <InputText
                    id="chartPlugin-apiVersion"
                    v-model="form.apiVersion"
                    type="text"
                    class="input w-full"
                    maxlength="100"
                    :readonly="isReadonly"
                  />
                </div>
              </div>
              <div class="field grid">
                <label
                  for="chartPlugin-platformVersion"
                  class="field-label col-12 mb-2 md:col-3 md:mb-0"
                  title="图表插件平台版本"
                >{{ t('platformVersion') }}</label>
                <div class="field-input col-12 md:col-9">
                  <InputText
                    id="chartPlugin-platformVersion"
                    v-model="form.platformVersion"
                    type="text"
                    class="input w-full"
                    maxlength="100"
                    :readonly="isReadonly"
                  />
                </div>
              </div>
              <div class="field grid">
                <label for="chartPlugin-author" class="field-label col-12 mb-2 md:col-3 md:mb-0">{{ t('author') }}</label>
                <div class="field-input col-12 md:col-9">
                  <InputText
                    id="chartPlugin-author"
                    v-model="form.author"
                    type="text"
                    class="input w-full"
                    maxlength="100"
                    :readonly="isReadonly"
                  />
                </div>
              </div>
              <div class="field grid">
                <label for="chartPlugin-contact" class="field-label col-12 mb-2 md:col-3 md:mb-0">{{ t('contact') }}</label>
                <div class="field-input col-12 md:col-9">
                  <InputText
                    id="chartPlugin-contact"
                    v-model="form.contact"
                    type="text"
                    class="input w-full"
                    maxlength="100"
                    :readonly="isReadonly"
                  />
                </div>
              </div>
              <div class="field grid">
                <label for="chartPlugin-issueDate" class="field-label col-12 mb-2 md:col-3 md:mb-0">{{ t('issueDate') }}</label>
                <div class="field-input col-12 md:col-9">
                  <InputText
                    id="chartPlugin-issueDate"
                    v-model="form.issueDate"
                    type="text"
                    class="input w-full"
                    maxlength="100"
                    :readonly="isReadonly"
                  />
                </div>
              </div>
            </div>
          </TabPanel>

          <TabPanel :header="t('dataSignSpec')">
            <div v-if="dataSignTreeNodes && dataSignTreeNodes.length > 0" class="py-2">
              <TreeTable
                :value="dataSignTreeNodes"
                :scrollable="true"
                data-key="fullname"
                class="table-sm p-component p-inputtext"
              >
                <Column field="name" :header="t('name')" expander />
                <Column :header="t('displayName')">
                  <template #body="{ node }">
                    {{ dataSignLabel(node.data) }}
                  </template>
                </Column>
                <Column field="fullname" :header="t('fullname')" />
                <Column :header="t('bindingTarget')">
                  <template #body="{ node }">
                    <div v-if="node.data.targets" class="flex align-items-center" style="gap: 1px">
                      <Badge
                        v-for="(tgt, tgtIdx) in node.data.targets"
                        :key="tgtIdx"
                        severity="info"
                        class="font-normal white-space-nowrap"
                      >
                        {{ formatTarget(tgt) }}
                      </Badge>
                    </div>
                  </template>
                </Column>
                <Column :header="t('required')">
                  <template #body="{ node }">
                    <Badge
                      :severity="node.data.required ? 'danger' : 'info'"
                      class="font-normal white-space-nowrap"
                    >
                      {{ node.data.required ? t('required') : t('optional') }}
                    </Badge>
                  </template>
                </Column>
                <Column :header="t('multipleSelect')">
                  <template #body="{ node }">
                    <Badge severity="info" class="font-normal white-space-nowrap">
                      {{ node.data.multiple ? t('multipleSelect') : t('singleSelect') }}
                    </Badge>
                  </template>
                </Column>
                <Column :header="t('description')">
                  <template #body="{ node }">
                    <Button
                      type="button"
                      icon="pi pi-info-circle"
                      severity="info"
                      text
                      rounded
                      aria:haspopup="true"
                      aria-controls="chartPluginDataSignDetailPanel"
                      :disabled="!node.data.descLabel || !node.data.descLabel.value"
                      @click="onShowDataSignDetail($event, node.data)"
                    />
                  </template>
                </Column>
              </TreeTable>
            </div>
            <div v-else class="py-2">{{ t('none') }}</div>
          </TabPanel>

          <TabPanel :header="t('useManual')">
            <div v-if="manualHtml" class="py-2">
              <div class="flex justify-content-end relative">
                <Button
                  type="button"
                  icon="pi pi-external-link"
                  size="small"
                  rounded
                  text
                  severity="secondary"
                  class="p-1 absolute"
                  style="top: -0.3rem"
                  @click="onOpenManualInNewWindow"
                />
              </div>
              <div class="chart-plugin-manual" style="white-space: pre-wrap" v-text="manualHtml"></div>
            </div>
            <div v-else class="py-2">{{ t('none') }}</div>
          </TabPanel>
        </TabView>
      </div>
    </form>

    <OverlayPanel
      ref="dataSignDetailPanel"
      :show-close-icon="true"
      append-to="body"
      id="chartPluginDataSignDetailPanel"
    >
      <div class="pb-2">
        <label class="text-lg font-bold">{{ t('description') }}</label>
      </div>
      <div class="panel-content-size-xxs flex flex-column p-2">
        <div class="flex-grow-0 font-bold">{{ dataSignDetail.label }}</div>
        <div class="flex-grow-1 overflow-auto p-3">{{ dataSignDetail.detail }}</div>
      </div>
    </OverlayPanel>
  </div>
</template>
