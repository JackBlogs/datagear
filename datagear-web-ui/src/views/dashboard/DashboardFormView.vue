<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { moduleGet, moduleSave } from '@/api/crud'
import { useOperationMessage } from '@/composables/useOperationMessage'

// 看板表单（新增/编辑共用，仅名称+描述，模板由后端默认/保留）。
const route = useRoute()
const router = useRouter()
const { success, fail } = useOperationMessage()

const id = (route.params.id as string) ?? ''
const isEdit = computed(() => !!id)
const loading = ref(false)
const saving = ref(false)

const form = ref<{ id: string; name: string; description?: string }>({ id: '', name: '', description: '' })

async function load() {
  if (!isEdit.value) return
  loading.value = true
  try {
    form.value = await moduleGet('dashboard', id)
  } catch (e) {
    fail((e as Error).message || '加载失败')
  } finally {
    loading.value = false
  }
}

async function save() {
  if (!form.value.name) {
    fail('请填写名称')
    return
  }
  saving.value = true
  try {
    const saved = await moduleSave('dashboard', form.value)
    success('保存成功')
    router.push(`/dashboard/${saved.id}/design`)
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
      <h3 class="flex-1">{{ isEdit ? '编辑看板' : '新建看板' }}</h3>
      <Button v-if="!isEdit" label="导入看板" text @click="router.push('/dashboard/import')" />
      <Button label="返回" text @click="router.push('/dashboard')" />
    </div>
    <div v-if="loading" class="text-color-secondary">加载中…</div>
    <div v-else class="form flex flex-column gap-3">
      <div class="flex align-items-center gap-2">
        <label class="label">名称</label>
        <input v-model="form.name" class="input flex-1" placeholder="看板名称" />
      </div>
      <div class="flex align-items-center gap-2">
        <label class="label">描述</label>
        <input v-model="form.description" class="input flex-1" placeholder="描述" />
      </div>
      <div class="flex gap-2">
        <Button label="保存" :loading="saving" @click="save" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.label {
  min-width: 56px;
  font-weight: 600;
}
.input {
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 6px 8px;
}
</style>
