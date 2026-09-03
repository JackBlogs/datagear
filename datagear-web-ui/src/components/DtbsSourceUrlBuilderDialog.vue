<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { getUrlBuilders, type DbTypeUrlTemplate } from '@/api/dtbsSourceUrlBuilder'
import { useOperationMessage } from '@/composables/useOperationMessage'

// URL 构建器弹窗（来源 dtbsSourceUrlBuilder_build.ftl）：选择类型/host/port/name 后回填调用方 URL。
// 旧版还能解析已有 URL 回填各字段，此处通过 tryParse 对 jdbc: 标准三段式做尽力解析。
const props = defineProps<{
  visible: boolean
  /** 已有 URL（用于尝试解析回填各字段） */
  initialUrl?: string
}>()

const emit = defineEmits<{
  (e: 'update:visible', v: boolean): void
  (e: 'apply', url: string): void
}>()

const { t } = useI18n()
const { fail } = useOperationMessage()

const builders = ref<DbTypeUrlTemplate[]>([])
const selected = ref('')
const host = ref('localhost')
const port = ref('')
const name = ref('')
const loading = ref(false)

const current = computed(() => builders.value.find((b) => b.dbType === selected.value))

const url = computed(() => {
  if (!current.value) return ''
  const tpl = current.value.template ?? ''
  return tpl.replace('{host}', host.value).replace('{port}', port.value).replace('{name}', name.value)
})

function onSelect() {
  const c = current.value
  host.value = c?.defaultValue?.host || 'localhost'
  port.value = c?.defaultValue?.port || ''
  name.value = c?.defaultValue?.name || ''
}

/** 尽力解析已有 URL：匹配 jdbc:<type>://<host>:<port>/<name> 形态并回填 */
function tryParse(u: string) {
  const m = u.match(/^jdbc:([a-z0-9]+):\/\/([^:/]+)(?::(\d+))?\/([^?;]*)/i)
  if (!m) return
  const b = builders.value.find((x) => x.dbType.toLowerCase() === (m[1] ?? '').toLowerCase())
  if (b) selected.value = b.dbType
  host.value = m[2] ?? host.value
  port.value = m[3] ?? ''
  name.value = m[4] ?? ''
}

async function load() {
  if (builders.value.length) return
  loading.value = true
  try {
    builders.value = await getUrlBuilders()
    if (builders.value.length) {
      selected.value = builders.value[0].dbType
      onSelect()
    }
  } catch (e) {
    fail((e as Error).message || t('loadFail'))
  } finally {
    loading.value = false
  }
}

function apply() {
  if (!url.value) {
    fail(t('pleaseFillTitleAndUrl'))
    return
  }
  emit('apply', url.value)
  emit('update:visible', false)
}

watch(selected, onSelect)
watch(
  () => props.visible,
  (v) => {
    if (v) {
      void load().then(() => {
        if (props.initialUrl) tryParse(props.initialUrl)
      })
    }
  },
)
onMounted(load)
</script>

<template>
  <Dialog
    :visible="visible"
    :header="t('dsForm.urlBuilderTitle')"
    :modal="true"
    :dismissable-mask="true"
    :style="{ width: '36rem' }"
    @update:visible="emit('update:visible', $event)"
  >
    <div v-if="loading" class="text-color-secondary">{{ t('loading') }}</div>
    <div v-else class="flex flex-column gap-3">
      <div class="field grid align-items-center">
        <label class="field-label col-12 mb-1 md:col-3 md:mb-0">{{ t('databaseType') }}</label>
        <div class="col-12 md:col-9">
          <Dropdown v-model="selected" :options="builders" option-label="dbType" option-value="dbType" class="w-full" />
        </div>
      </div>
      <div class="field grid align-items-center">
        <label class="field-label col-12 mb-1 md:col-3 md:mb-0">{{ t('host') }}</label>
        <div class="col-12 md:col-9">
          <InputText v-model="host" class="w-full" maxlength="200" />
        </div>
      </div>
      <div class="field grid align-items-center">
        <label class="field-label col-12 mb-1 md:col-3 md:mb-0">{{ t('port') }}</label>
        <div class="col-12 md:col-9">
          <InputText v-model="port" class="w-full" maxlength="10" />
        </div>
      </div>
      <div class="field grid align-items-center">
        <label class="field-label col-12 mb-1 md:col-3 md:mb-0">{{ t('databaseName') }}</label>
        <div class="col-12 md:col-9">
          <InputText v-model="name" class="w-full" maxlength="200" />
        </div>
      </div>
      <div class="field grid align-items-center">
        <label class="field-label col-12 mb-1 md:col-3 md:mb-0">{{ t('generatedUrl') }}</label>
        <div class="col-12 md:col-9">
          <div class="url-preview p-2 border-1 surface-border border-round">
            <code>{{ url || '—' }}</code>
          </div>
        </div>
      </div>
    </div>
    <template #footer>
      <Button :label="t('cancel')" text size="small" @click="emit('update:visible', false)" />
      <Button :label="t('dsForm.applyUrl')" size="small" :disabled="!url" @click="apply" />
    </template>
  </Dialog>
</template>

<style scoped>
.url-preview {
  background: var(--surface-section);
}
code {
  word-break: break-all;
  font-size: 0.875rem;
}
</style>
