<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getRole, saveRole, type Role } from '@/api/role'
import { useOperationMessage } from '@/composables/useOperationMessage'

// 角色表单（范式 C 独立表单页）：新增/编辑共用，id 存在则为编辑。
const route = useRoute()
const router = useRouter()
const { success, fail } = useOperationMessage()

const id = (route.params.id as string) ?? ''
const isEdit = computed(() => !!id)
const loading = ref(false)
const saving = ref(false)

const form = ref<Role>({ id: '', name: '', description: '', enabled: true })

async function load() {
  if (!isEdit.value) return
  loading.value = true
  try {
    form.value = await getRole(id)
  } catch (e) {
    fail((e as Error).message || '加载角色失败')
  } finally {
    loading.value = false
  }
}

async function save() {
  if (!form.value.name) {
    fail('请填写角色名称')
    return
  }
  saving.value = true
  try {
    await saveRole(form.value)
    success('保存成功')
    router.push('/role')
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
      <h3 class="flex-1">{{ isEdit ? '编辑角色' : '新建角色' }}</h3>
      <Button label="返回" text @click="router.push('/role')" />
    </div>
    <div v-if="loading" class="text-color-secondary">加载中…</div>
    <div v-else class="form flex flex-column gap-3">
      <div class="flex align-items-center gap-2">
        <label class="label">名称</label>
        <input v-model="form.name" class="input flex-1" placeholder="角色名称" />
      </div>
      <div class="flex align-items-center gap-2">
        <label class="label">描述</label>
        <input v-model="form.description" class="input flex-1" placeholder="描述" />
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
  min-width: 56px;
  font-weight: 600;
}
.input {
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 6px 8px;
}
</style>
