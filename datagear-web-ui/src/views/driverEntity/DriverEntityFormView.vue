<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getDriverEntity, saveDriverEntity, type DriverEntity } from '@/api/driverEntity'
import { useOperationMessage } from '@/composables/useOperationMessage'

// 数据库驱动表单（新增/编辑共用，仅元数据；jar 上传走旧 /driverEntity 端点）。
const route = useRoute()
const router = useRouter()
const { success, fail } = useOperationMessage()

const id = (route.params.id as string) ?? ''
const isEdit = computed(() => !!id)
const loading = ref(false)
const saving = ref(false)

const form = ref<DriverEntity>({ id: '', driverClassName: '', displayName: '', displayDesc: '', jreVersion: '', databaseName: '' })

async function load() {
  if (!isEdit.value) return
  loading.value = true
  try {
    form.value = await getDriverEntity(id)
  } catch (e) {
    fail((e as Error).message || '加载失败')
  } finally {
    loading.value = false
  }
}

async function save() {
  if (!form.value.driverClassName) {
    fail('请填写驱动类名')
    return
  }
  saving.value = true
  try {
    await saveDriverEntity(form.value)
    success('保存成功')
    router.push('/driverEntity')
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
      <h3 class="flex-1">{{ isEdit ? '编辑驱动' : '新建驱动' }}</h3>
      <Button label="返回" text @click="router.push('/driverEntity')" />
    </div>
    <div v-if="loading" class="text-color-secondary">加载中…</div>
    <div v-else class="form flex flex-column gap-3">
      <div class="flex align-items-center gap-2">
        <label class="label">驱动类名</label>
        <input v-model="form.driverClassName" class="input flex-1" placeholder="com.mysql.cj.jdbc.Driver" />
      </div>
      <div class="flex align-items-center gap-2">
        <label class="label">名称</label>
        <input v-model="form.displayName" class="input flex-1" placeholder="显示名称" />
      </div>
      <div class="flex align-items-center gap-2">
        <label class="label">数据库</label>
        <input v-model="form.databaseName" class="input flex-1" placeholder="数据库名称" />
      </div>
      <div class="flex align-items-center gap-2">
        <label class="label">JRE</label>
        <input v-model="form.jreVersion" class="input flex-1" placeholder="JRE 版本" />
      </div>
      <div class="flex align-items-center gap-2">
        <label class="label">描述</label>
        <input v-model="form.displayDesc" class="input flex-1" placeholder="描述" />
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
