<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { getUrlBuilders, type DbTypeUrlTemplate } from '@/api/dtbsSourceUrlBuilder'
import { useOperationMessage } from '@/composables/useOperationMessage'
import '@/styles/datasource-page.css'

// JDBC URL 构建器（能源暗域），按原 dtbsSourceUrlBuilder_build.ftl 复刻。
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
  host.value = c?.defaultValue?.host || 'localhost'
  port.value = c?.defaultValue?.port || ''
  name.value = c?.defaultValue?.name || ''
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
  <div class="ds-page">
    <!-- 页头 -->
    <div class="page-head">
      <div>
        <div class="page-title">{{ t('module.dtbsSourceUrlBuilder') }} <span class="tag brand">JDBC</span></div>
        <div class="page-desc">按数据库类型构建 JDBC 连接 URL，一键复制到数据源配置</div>
      </div>
      <div class="page-actions">
        <button class="btn" type="button" @click="$router.back()">{{ t('back') }}</button>
      </div>
    </div>

    <div v-if="loading" class="empty">{{ t('loading') }}</div>

    <div v-else class="card form-card">
      <div class="card-title"><i class="bar"></i>连接参数</div>
      <div class="qb-grid2">
        <div class="form-item">
          <label class="form-label" for="ub-dbType">{{ t('databaseType') }}</label>
          <select id="ub-dbType" v-model="selected" class="input">
            <option v-for="b in builders" :key="b.dbType" :value="b.dbType">{{ b.dbType }}</option>
          </select>
        </div>
        <div class="form-item">
          <label class="form-label" for="ub-host">{{ t('host') }}</label>
          <input id="ub-host" v-model="host" type="text" class="input" maxlength="200" />
        </div>
        <div class="form-item">
          <label class="form-label" for="ub-port">{{ t('port') }}</label>
          <input id="ub-port" v-model="port" type="text" class="input" maxlength="10" />
        </div>
        <div class="form-item">
          <label class="form-label" for="ub-name">{{ t('databaseName') }}</label>
          <input id="ub-name" v-model="name" type="text" class="input" maxlength="200" />
        </div>
      </div>
      <div class="form-item" style="margin-top: 6px">
        <label class="form-label">{{ t('generatedUrl') }}</label>
        <div class="url-preview">
          <code>{{ url || '（请填写主机/端口/库名）' }}</code>
        </div>
        <button class="btn sm" style="margin-top: 8px" type="button" @click="copyUrl">{{ t('copyUrl') }}</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.form-card { padding: 16px 18px; max-width: 720px; }
.form-item { margin-bottom: 14px; }
.form-label { font-size: 12px; color: var(--tx-2); margin-bottom: 5px; display: block; }
.qb-grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.url-preview {
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid var(--line-1);
  border-radius: 10px;
  padding: 10px 14px;
}
.url-preview code {
  word-break: break-all;
  font-size: 12.5px;
  color: #9ecbff;
}
</style>
