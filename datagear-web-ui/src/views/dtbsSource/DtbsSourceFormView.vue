<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getDtbsSource, saveDtbsSource, listDriverEntities, type DtbsSource, type DriverEntity } from '@/api/dtbsSource'
import { useOperationMessage } from '@/composables/useOperationMessage'

// 数据源表单（新增/编辑共用）：标题 + URL + 用户 + 密码 + 驱动选择。
const route = useRoute()
const router = useRouter()
const { success, fail } = useOperationMessage()

const id = (route.params.id as string) ?? ''
const isEdit = computed(() => !!id)
const loading = ref(false)
const saving = ref(false)
const drivers = ref<DriverEntity[]>([])

const form = ref<DtbsSource>({ id: '', title: '', url: '', user: '', password: '', schemaName: '', driverEntity: { id: '' } })

async function load() {
  loading.value = true
  try {
    drivers.value = await listDriverEntities()
    if (isEdit.value) form.value = await getDtbsSource(id)
  } catch (e) {
    fail((e as Error).message || '加载失败')
  } finally {
    loading.value = false
  }
}

function driverLabel(d: DriverEntity): string {
  return d.displayName ?? d.displayText ?? d.driverClassName ?? d.id
}

async function save() {
  if (!form.value.title || !form.value.url) {
    fail('请填写标题与 URL')
    return
  }
  saving.value = true
  try {
    await saveDtbsSource(form.value)
    success('保存成功')
    router.push('/dtbsSource')
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
      <h3 class="flex-1">{{ isEdit ? '编辑数据源' : '新建数据源' }}</h3>
      <Button label="返回" text @click="router.push('/dtbsSource')" />
    </div>
    <div v-if="loading" class="text-color-secondary">加载中…</div>
    <div v-else class="form flex flex-column gap-3">
      <div class="flex align-items-center gap-2">
        <label class="label">标题</label>
        <input v-model="form.title" class="input flex-1" placeholder="数据源标题" />
      </div>
      <div class="flex align-items-center gap-2">
        <label class="label">URL</label>
        <input v-model="form.url" class="input flex-1" placeholder="jdbc:mysql://host:3306/db" />
        <Button label="构建器" size="small" text @click="router.push('/dtbsSourceUrlBuilder')" />
      </div>
      <div class="flex align-items-center gap-2">
        <label class="label">用户</label>
        <input v-model="form.user" class="input flex-1" placeholder="数据库用户" />
      </div>
      <div class="flex align-items-center gap-2">
        <label class="label">密码</label>
        <input v-model="form.password" type="password" class="input flex-1" placeholder="数据库密码" />
      </div>
      <div class="flex align-items-center gap-2">
        <label class="label">驱动</label>
        <select v-model="form.driverEntity!.id" class="input flex-1">
          <option value="">（自动检测）</option>
          <option v-for="d in drivers" :key="d.id" :value="d.id">{{ driverLabel(d) }}</option>
        </select>
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
