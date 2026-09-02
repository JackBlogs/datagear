<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getDriverEntity, saveDriverEntity, uploadDriverFile, type DriverEntity } from '@/api/driverEntity'
import { useOperationMessage } from '@/composables/useOperationMessage'

// 数据库驱动表单（新增/编辑共用；元数据 + jar 上传）。
const route = useRoute()
const router = useRouter()
const { success, fail } = useOperationMessage()

const id = (route.params.id as string) ?? ''
const isEdit = computed(() => !!id)
const loading = ref(false)
const saving = ref(false)
const uploading = ref(false)
const detectedClasses = ref<string[]>([])

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
    const saved = await saveDriverEntity(form.value)
    success('保存成功')
    if (!isEdit.value) {
      // 新增后留在本页以支持上传 jar
      form.value = { ...saved }
    } else {
      router.push('/driverEntity')
    }
  } catch (e) {
    fail((e as Error).message || '保存失败')
  } finally {
    saving.value = false
  }
}

async function onJarChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  if (!form.value.id) {
    fail('请先保存驱动，再上传 jar')
    return
  }
  uploading.value = true
  try {
    const r = await uploadDriverFile(form.value.id, file)
    detectedClasses.value = r.driverClassNames ?? []
    success('jar 上传成功')
  } catch (err) {
    fail((err as Error).message || '上传失败')
  } finally {
    uploading.value = false
    input.value = ''
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
        <label v-if="form.id" class="upload-btn">
          {{ uploading ? '上传中…' : '上传 jar' }}
          <input type="file" accept=".jar" class="hidden" :disabled="uploading" @change="onJarChange" />
        </label>
      </div>
      <div v-if="detectedClasses.length" class="detected">
        检测到的驱动类：{{ detectedClasses.join(', ') }}
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
.upload-btn {
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 6px 10px;
  cursor: pointer;
  font-size: 13px;
}
.hidden {
  display: none;
}
.detected {
  color: #888;
  font-size: 12px;
}
</style>
