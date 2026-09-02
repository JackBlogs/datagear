<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'

// 新建数据集类型选择页。
const router = useRouter()
const { t } = useI18n()

const types = [
  { type: 'SQL', label: t('module.dataSet.SQL'), desc: '基于 SQL 查询' },
  { type: 'JsonValue', label: t('module.dataSet.JsonValue'), desc: '直接输入 JSON 文本' },
  { type: 'JsonFile', label: t('module.dataSet.JsonFile'), desc: '从 JSON 文件读取' },
  { type: 'Excel', label: t('module.dataSet.Excel'), desc: '从 Excel 文件读取' },
  { type: 'CsvValue', label: t('module.dataSet.CsvValue'), desc: '直接输入 CSV 文本' },
  { type: 'CsvFile', label: t('module.dataSet.CsvFile'), desc: '从 CSV 文件读取' },
  { type: 'Http', label: t('module.dataSet.Http'), desc: '调用 HTTP 接口获取数据' },
]

function go(type: string) {
  // SQL 数据集使用独立表单页（/dataSet/add/sql）
  router.push(type === 'SQL' ? '/dataSet/add/sql' : `/dataSet/add/${type}`)
}
</script>

<template>
  <div class="p-4">
    <div class="flex align-items-center gap-2 mb-3">
      <h3 class="flex-1">{{ t('new') + t('module.dataSet') }}</h3>
      <Button :label="t('back')" text @click="router.push('/dataSet')" />
    </div>
    <div class="grid">
      <div v-for="t in types" :key="t.type" class="type-card" @click="go(t.type)">
        <div class="type-label">{{ t.label }}</div>
        <div class="type-desc">{{ t.desc }}</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 12px;
}
.type-card {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.15s;
}
.type-card:hover {
  border-color: #6366f1;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}
.type-label {
  font-weight: 600;
  margin-bottom: 6px;
}
.type-desc {
  color: #888;
  font-size: 12px;
}
</style>
