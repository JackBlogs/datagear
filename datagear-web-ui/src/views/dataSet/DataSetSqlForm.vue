<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { saveSqlDataSet, resolveSql, type SqlDataSetForm } from '@/api/dataSet'
import { createPagingLoader, type EntityRecord } from '@/api/paging'
import CodeEditor from '@/components/CodeEditor.vue'
import { useOperationMessage } from '@/composables/useOperationMessage'

// 数据集 SQL 表单（范式 C 独立表单页）：名称 + SQL + 数据源 + 保存。
const router = useRouter()
const { success, fail } = useOperationMessage()

const dtbsSources = ref<EntityRecord[]>([])
const form = ref<SqlDataSetForm>({
  name: '',
  sql: 'SELECT * FROM ',
  dtbsCnFty: { dtbsSource: { id: '' } },
})
const saving = ref(false)
const resolvedSql = ref('')
const resolving = ref(false)

async function preview() {
  if (!form.value.sql) {
    fail('请先填写 SQL')
    return
  }
  resolving.value = true
  try {
    resolvedSql.value = await resolveSql(form.value.sql)
  } catch (e) {
    fail((e as Error).message || '解析失败')
  } finally {
    resolving.value = false
  }
}

async function loadDtbsSources() {
  try {
    const data = await createPagingLoader('dtbsSource')({ page: 1, pageSize: 500 })
    dtbsSources.value = data.items
  } catch (e) {
    fail((e as Error).message || '加载数据源失败')
  }
}

function dsName(ds: EntityRecord): string {
  const t = ds.title
  return typeof t === 'string' && t ? t : ds.id
}

async function save() {
  if (!form.value.name || !form.value.sql || !form.value.dtbsCnFty.dtbsSource.id) {
    fail('请填写名称、SQL 并选择数据源')
    return
  }
  saving.value = true
  try {
    await saveSqlDataSet(form.value)
    success('保存成功')
    router.push('/dataSet')
  } catch (e) {
    fail((e as Error).message || '保存失败')
  } finally {
    saving.value = false
  }
}

onMounted(loadDtbsSources)
</script>

<template>
  <div class="p-4">
    <h3>新建 SQL 数据集</h3>
    <div class="form flex flex-column gap-3">
      <div class="flex align-items-center gap-2">
        <label class="label">名称</label>
        <input v-model="form.name" class="input flex-1" placeholder="数据集名称" />
      </div>
      <div class="flex align-items-center gap-2">
        <label class="label">数据源</label>
        <select v-model="form.dtbsCnFty.dtbsSource.id" class="input flex-1">
          <option value="">（选择数据源）</option>
          <option v-for="ds in dtbsSources" :key="ds.id" :value="ds.id">{{ dsName(ds) }}</option>
        </select>
      </div>
      <div>
        <label class="label">SQL</label>
        <CodeEditor v-model="form.sql" class="editor" />
      </div>
      <div class="flex gap-2">
        <Button label="保存" :loading="saving" @click="save" />
        <Button label="预览解析" text :loading="resolving" @click="preview" />
        <Button label="返回" text @click="router.push('/dataSet')" />
      </div>
      <pre v-if="resolvedSql" class="resolved">{{ resolvedSql }}</pre>
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
.editor {
  margin-top: 6px;
  border: 1px solid #ccc;
  border-radius: 4px;
}
.resolved {
  background: #f7f7f7;
  padding: 8px;
  border-radius: 6px;
  white-space: pre-wrap;
  word-break: break-all;
}
</style>
