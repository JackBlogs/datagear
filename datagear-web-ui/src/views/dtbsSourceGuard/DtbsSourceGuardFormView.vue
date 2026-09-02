<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { moduleGet, moduleSave } from '@/api/crud'
import { useOperationMessage } from '@/composables/useOperationMessage'

// 数据源防护规则表单（新增/编辑共用）。
const route = useRoute()
const router = useRouter()
const { success, fail } = useOperationMessage()

const id = (route.params.id as string) ?? ''
const isEdit = computed(() => !!id)
const loading = ref(false)
const saving = ref(false)

const form = ref<{
  id: string
  name: string
  pattern: string
  userPattern?: string
  permitted: boolean
  enabled: boolean
}>({ id: '', name: '', pattern: '', userPattern: '', permitted: true, enabled: true })

async function load() {
  if (!isEdit.value) return
  loading.value = true
  try {
    form.value = await moduleGet('dtbsSourceGuard', id)
  } catch (e) {
    fail((e as Error).message || '加载失败')
  } finally {
    loading.value = false
  }
}

async function save() {
  if (!form.value.name || !form.value.pattern) {
    fail('请填写名称与匹配模式')
    return
  }
  saving.value = true
  try {
    await moduleSave('dtbsSourceGuard', form.value)
    success('保存成功')
    router.push('/dtbsSourceGuard')
  } catch (e) {
    fail((e as Error).message || '保存失败')
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="p-4">
    <div class="flex align-items-center gap-2 mb-3">
      <h3 class="flex-1">{{ isEdit ? '编辑防护规则' : '新建防护规则' }}</h3>
      <Button label="返回" text @click="router.push('/dtbsSourceGuard')" />
    </div>
    <div v-if="loading" class="text-color-secondary">加载中…</div>
    <div v-else class="form flex flex-column gap-3">
      <div class="flex align-items-center gap-2">
        <label class="label">名称</label>
        <input v-model="form.name" class="input flex-1" placeholder="规则名称" />
      </div>
      <div class="flex align-items-center gap-2">
        <label class="label">匹配模式</label>
        <input v-model="form.pattern" class="input flex-1" placeholder="数据源 URL 匹配模式" />
      </div>
      <div class="flex align-items-center gap-2">
        <label class="label">用户模式</label>
        <input v-model="form.userPattern" class="input flex-1" placeholder="用户匹配模式（可选）" />
      </div>
      <div class="flex align-items-center gap-2">
        <label class="label">允许</label>
        <input v-model="form.permitted" type="checkbox" />
      </div>
      <div class="flex align-items-center gap-2">
        <label class="label">启用</label>
        <input v-model="form.enabled" type="checkbox" />
      </div>
      <div class="flex gap-2">
        <Button label="保存" :loading="saving" @click="save" />
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
</style>
