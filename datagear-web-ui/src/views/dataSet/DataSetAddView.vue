<script setup lang="ts">
import { useRouter } from 'vue-router'

// 新建数据集类型选择页。
const router = useRouter()

const types = [
  { type: 'SQL', label: 'SQL 数据集', desc: '基于 SQL 查询' },
  { type: 'JsonValue', label: 'JSON 值', desc: '直接输入 JSON 文本' },
  { type: 'JsonFile', label: 'JSON 文件', desc: '从 JSON 文件读取' },
  { type: 'Excel', label: 'Excel', desc: '从 Excel 文件读取' },
  { type: 'CsvValue', label: 'CSV 值', desc: '直接输入 CSV 文本' },
  { type: 'CsvFile', label: 'CSV 文件', desc: '从 CSV 文件读取' },
  { type: 'Http', label: 'HTTP 接口', desc: '调用 HTTP 接口获取数据' },
]
</script>

<template>
  <div class="p-4">
    <div class="flex align-items-center gap-2 mb-3">
      <h3 class="flex-1">新建数据集</h3>
      <Button label="返回" text @click="router.push('/dataSet')" />
    </div>
    <div class="grid">
      <div v-for="t in types" :key="t.type" class="type-card" @click="router.push(`/dataSet/add/${t.type}`)">
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
