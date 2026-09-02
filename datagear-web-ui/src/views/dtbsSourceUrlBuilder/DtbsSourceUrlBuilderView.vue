<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { getUrlBuilders, type DbTypeUrlTemplate } from '@/api/dtbsSourceUrlBuilder'
import { useOperationMessage } from '@/composables/useOperationMessage'

// 数据源 JDBC URL 构建器：选数据库类型 → 填主机/端口/库名 → 生成 URL。
const router = useRouter()
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
    fail((e as Error).message || '加载失败')
  } finally {
    loading.value = false
  }
}

async function copyUrl() {
  try {
    await navigator.clipboard.writeText(url.value)
    success('已复制到剪贴板')
  } catch {
    fail('复制失败')
  }
}

watch(selected, onSelect)
onMounted(load)
</script>

<template>
  <div class="p-4">
    <div class="flex align-items-center gap-2 mb-3">
      <h3 class="flex-1">JDBC URL 构建器</h3>
      <Button label="返回" text @click="router.back()" />
    </div>
    <div v-if="loading" class="text-color-secondary">加载中…</div>
    <div v-else class="form flex flex-column gap-3">
      <div class="flex align-items-center gap-2">
        <label class="label">数据库类型</label>
        <select v-model="selected" class="input flex-1">
          <option v-for="b in builders" :key="b.dbType" :value="b.dbType">{{ b.dbType }}</option>
        </select>
      </div>
      <div class="flex align-items-center gap-2">
        <label class="label">主机</label>
        <input v-model="host" class="input flex-1" />
      </div>
      <div class="flex align-items-center gap-2">
        <label class="label">端口</label>
        <input v-model="port" class="input flex-1" />
      </div>
      <div class="flex align-items-center gap-2">
        <label class="label">库名</label>
        <input v-model="name" class="input flex-1" />
      </div>
      <div class="flex gap-2">
        <Button label="复制 URL" @click="copyUrl" />
      </div>
      <div class="url-preview">
        <div class="url-label">生成的 URL</div>
        <code>{{ url }}</code>
      </div>
    </div>
  </div>
</template>

<style scoped>
.label {
  min-width: 72px;
  font-weight: 600;
}
.input {
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 6px 8px;
}
.url-preview {
  background: #f7f7f7;
  padding: 12px;
  border-radius: 8px;
}
.url-label {
  color: #888;
  font-size: 12px;
  margin-bottom: 6px;
}
code {
  word-break: break-all;
  font-size: 13px;
}
</style>
