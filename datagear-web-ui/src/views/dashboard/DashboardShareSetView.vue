<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getDashboardShareSet, saveDashboardShareSet, type DashboardShareSet } from '@/api/dashboard'
import { useOperationMessage } from '@/composables/useOperationMessage'

// 看板分享设置：启用密码 / 匿名可访问密码 / 密码。
const route = useRoute()
const router = useRouter()
const { success, fail } = useOperationMessage()

const id = route.params.id as string
const loading = ref(false)
const saving = ref(false)
const form = ref<DashboardShareSet>({ id, enablePassword: false, anonymousPassword: false, password: '' })

async function load() {
  loading.value = true
  try {
    form.value = await getDashboardShareSet(id)
  } catch (e) {
    fail((e as Error).message || '加载失败')
  } finally {
    loading.value = false
  }
}

async function save() {
  saving.value = true
  try {
    await saveDashboardShareSet(form.value)
    success('保存成功')
    router.push('/dashboard')
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
      <h3 class="flex-1">看板分享设置</h3>
      <Button label="返回" text @click="router.push('/dashboard')" />
    </div>
    <div v-if="loading" class="text-color-secondary">加载中…</div>
    <div v-else class="form flex flex-column gap-3">
      <div class="flex align-items-center gap-2">
        <label class="label">启用密码</label>
        <input v-model="form.enablePassword" type="checkbox" />
      </div>
      <div class="flex align-items-center gap-2">
        <label class="label">匿名可访问</label>
        <input v-model="form.anonymousPassword" type="checkbox" />
      </div>
      <div class="flex align-items-center gap-2">
        <label class="label">密码</label>
        <input v-model="form.password" type="password" class="input flex-1" placeholder="分享访问密码" />
      </div>
      <div class="flex gap-2">
        <Button label="保存" :loading="saving" @click="save" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.label {
  min-width: 96px;
  font-weight: 600;
}
.input {
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 6px 8px;
}
</style>
