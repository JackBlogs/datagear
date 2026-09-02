<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getDataSet, saveDataSetAdd, saveDataSetEdit, type DataSetForm } from '@/api/dataSet'
import { useOperationMessage } from '@/composables/useOperationMessage'

// 非 SQL 数据集通用表单（JsonValue/JsonFile/Excel/CsvValue/CsvFile/Http）。
const route = useRoute()
const router = useRouter()
const { success, fail } = useOperationMessage()

const id = (route.params.id as string) ?? ''
const isEdit = computed(() => !!id)
const loading = ref(false)
const saving = ref(false)

const type = ref((route.params.type as string) ?? '')
const form = ref<DataSetForm>({ name: '', value: '', uri: '', requestMethod: 'GET', requestContent: '', fileName: '', nameRow: 1 })

const typeLabel = computed(() => {
  const m: Record<string, string> = {
    JsonValue: 'JSON 值数据集',
    JsonFile: 'JSON 文件数据集',
    Excel: 'Excel 数据集',
    CsvValue: 'CSV 值数据集',
    CsvFile: 'CSV 文件数据集',
    Http: 'HTTP 接口数据集',
  }
  return m[type.value] ?? '数据集'
})

const isValueType = computed(() => type.value === 'JsonValue' || type.value === 'CsvValue')
const isFileType = computed(() => type.value === 'JsonFile' || type.value === 'CsvFile' || type.value === 'Excel')
const isHttp = computed(() => type.value === 'Http')

async function load() {
  loading.value = true
  try {
    if (isEdit.value) {
      const e = await getDataSet(id)
      type.value = e.dataSetType ?? ''
      form.value = { ...form.value, ...e }
    }
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
    if (isEdit.value) {
      await saveDataSetEdit(type.value, { ...form.value, id })
    } else {
      await saveDataSetAdd(type.value, form.value)
    }
    success('保存成功')
    router.push('/dataSet')
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
      <h3 class="flex-1">{{ isEdit ? '编辑' : '新建' }}{{ typeLabel }}</h3>
      <Button label="返回" text @click="router.push('/dataSet')" />
    </div>
    <div v-if="loading" class="text-color-secondary">加载中…</div>
    <div v-else class="form flex flex-column gap-3">
      <div class="flex align-items-center gap-2">
        <label class="label">名称</label>
        <input v-model="form.name" class="input flex-1" placeholder="数据集名称" />
      </div>

      <template v-if="isValueType">
        <div>
          <label class="label">内容</label>
          <textarea v-model="form.value" class="input textarea" :placeholder="type === 'JsonValue' ? 'JSON 文本' : 'CSV 文本'" />
        </div>
        <div v-if="type === 'CsvValue'" class="flex align-items-center gap-2">
          <label class="label">名称行</label>
          <input v-model.number="form.nameRow" type="number" class="input" min="0" />
        </div>
      </template>

      <template v-else-if="isHttp">
        <div class="flex align-items-center gap-2">
          <label class="label">URL</label>
          <input v-model="form.uri" class="input flex-1" placeholder="https://..." />
        </div>
        <div class="flex align-items-center gap-2">
          <label class="label">方法</label>
          <select v-model="form.requestMethod" class="input">
            <option value="GET">GET</option>
            <option value="POST">POST</option>
          </select>
        </div>
        <div>
          <label class="label">请求体</label>
          <textarea v-model="form.requestContent" class="input textarea" placeholder="请求内容（POST）" />
        </div>
      </template>

      <template v-else-if="isFileType">
        <div class="flex align-items-center gap-2">
          <label class="label">文件名</label>
          <input v-model="form.fileName" class="input flex-1" placeholder="文件名（位于数据集目录）" />
        </div>
        <div v-if="type === 'Excel' || type === 'CsvFile'" class="flex align-items-center gap-2">
          <label class="label">名称行</label>
          <input v-model.number="form.nameRow" type="number" class="input" min="0" />
        </div>
      </template>

      <div class="flex gap-2">
        <Button label="保存" :loading="saving" @click="save" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.label {
  min-width: 64px;
  font-weight: 600;
}
.input {
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 6px 8px;
}
.textarea {
  width: 100%;
  min-height: 140px;
  font-family: monospace;
  resize: vertical;
}
</style>
