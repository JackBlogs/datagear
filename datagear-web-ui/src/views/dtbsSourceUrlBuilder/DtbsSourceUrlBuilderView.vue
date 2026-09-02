<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { getUrlBuilders, type DbTypeUrlTemplate } from '@/api/dtbsSourceUrlBuilder'
import { useOperationMessage } from '@/composables/useOperationMessage'

// JDBC URL 构建器，按原 dtbsSourceUrlBuilder_build.ftl 复刻。
const router = useRouter()
const { t } = useI18n()
const { fail, success } = useOperationMessage()

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
  host.value = c?.defaultValue?.host ?? 'localhost'
  port.value = c?.defaultValue?.port ?? ''
  name.value = c?.defaultValue?.name ?? ''
}

async function load() {
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

async function copyUrl() {
  try {
    await navigator.clipboard.writeText(url.value)
    success(t('copySuccess'))
  } catch {
    fail(t('copyFail'))
  }
}

watch(selected, onSelect)
onMounted(load)
</script>

<template>
  <div class="page page-form h-full p-1">
    <div class="flex align-items-center gap-2 mb-2">
      <h3 class="flex-1">{{ t('module.dtbsSourceUrlBuilder') }}</h3>
      <Button :label="t('back')" text size="small" @click="router.back()" />
    </div>
    <div v-if="loading" class="text-color-secondary">加载中…</div>
    <div v-else class="page-form-content flex-grow-1 px-2 py-1 overflow-y-auto">
      <div class="field grid">
        <label for="ub-dbType" class="field-label col-12 mb-2 md:col-3 md:mb-0">{{ t('databaseType') }}</label>
        <div class="field-input col-12 md:col-9">
          <Dropdown
            id="ub-dbType"
            v-model="selected"
            :options="builders"
            option-label="dbType"
            option-value="dbType"
            class="input w-full"
          />
        </div>
      </div>
      <div class="field grid">
        <label for="ub-host" class="field-label col-12 mb-2 md:col-3 md:mb-0">{{ t('host') }}</label>
        <div class="field-input col-12 md:col-9">
          <InputText id="ub-host" v-model="host" class="input w-full" maxlength="200" />
        </div>
      </div>
      <div class="field grid">
        <label for="ub-port" class="field-label col-12 mb-2 md:col-3 md:mb-0">{{ t('port') }}</label>
        <div class="field-input col-12 md:col-9">
          <InputText id="ub-port" v-model="port" class="input w-full" maxlength="10" />
        </div>
      </div>
      <div class="field grid">
        <label for="ub-name" class="field-label col-12 mb-2 md:col-3 md:mb-0">{{ t('databaseName') }}</label>
        <div class="field-input col-12 md:col-9">
          <InputText id="ub-name" v-model="name" class="input w-full" maxlength="200" />
        </div>
      </div>
      <div class="field grid">
        <label class="field-label col-12 mb-2 md:col-3 md:mb-0">{{ t('generatedUrl') }}</label>
        <div class="field-input col-12 md:col-9">
          <div class="url-preview p-2">
            <code>{{ url || '（请填写主机/端口/库名）' }}</code>
          </div>
        </div>
      </div>
    </div>
    <div class="page-form-foot flex-grow-0 flex justify-content-center gap-2 pt-2">
      <Button :label="t('copyUrl')" @click="copyUrl" />
    </div>
  </div>
</template>

<style scoped>
.field-label {
  font-weight: 600;
}
.input {
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 6px 8px;
}
select.input {
  background: var(--surface-card);
}
.url-preview {
  background: var(--surface-section);
  border: 1px solid var(--surface-border);
  border-radius: 6px;
}
code {
  word-break: break-all;
  font-size: 0.875rem;
}
</style>
