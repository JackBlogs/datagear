<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import '@/styles/datasource-page.css'

// 新建数据集类型选择页（能源暗域）。
const router = useRouter()
const { t } = useI18n()

const types = [
  { type: 'SQL', label: t('module.dataSet.SQL'), desc: '基于 SQL 查询', icon: '▤', hot: true },
  { type: 'JsonValue', label: t('module.dataSet.JsonValue'), desc: '直接输入 JSON 文本', icon: '{}' },
  { type: 'JsonFile', label: t('module.dataSet.JsonFile'), desc: '从 JSON 文件读取', icon: '{}' },
  { type: 'Excel', label: t('module.dataSet.Excel'), desc: '从 Excel 文件读取', icon: '▤' },
  { type: 'CsvValue', label: t('module.dataSet.CsvValue'), desc: '直接输入 CSV 文本', icon: '⋮' },
  { type: 'CsvFile', label: t('module.dataSet.CsvFile'), desc: '从 CSV 文件读取', icon: '⋮' },
  { type: 'Http', label: t('module.dataSet.Http'), desc: '调用 HTTP 接口获取数据', icon: '⇄' },
]

function go(type: string) {
  // SQL 数据集使用独立表单页（/dataSet/add/sql）
  router.push(type === 'SQL' ? '/dataSet/add/sql' : `/dataSet/add/${type}`)
}
</script>

<template>
  <div class="ds-page">
    <!-- 页头 -->
    <div class="page-head">
      <div>
        <div class="page-title">{{ t('new') + t('module.dataSet') }} <span class="tag brand">7 种类型</span></div>
        <div class="page-desc">选择数据集类型，SQL 数据集将进入独立编辑器</div>
      </div>
      <div class="page-actions">
        <button class="btn" type="button" @click="router.push('/dataSet')">{{ t('back') }}</button>
      </div>
    </div>

    <!-- 类型卡网格 -->
    <div class="type-grid">
      <div v-for="t in types" :key="t.type" class="type-card" @click="go(t.type)">
        <div class="tc-icon">{{ t.icon }}</div>
        <div class="tc-body">
          <div class="tc-label">{{ t.label }}</div>
          <div class="tc-desc">{{ t.desc }}</div>
        </div>
        <i class="pi pi-arrow-right tc-arrow"></i>
      </div>
    </div>
  </div>
</template>

<style scoped>
.type-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 12px; }
.type-card {
  display: flex; align-items: center; gap: 12px; padding: 16px;
  border: 1px solid var(--line-1); border-radius: 12px; background: var(--bg-glass);
  cursor: pointer; transition: border-color 0.15s, transform 0.15s;
}
.type-card:hover { border-color: var(--brand-line); background: var(--bg-glass-2); transform: translateY(-2px); }
.tc-icon {
  width: 42px; height: 42px; border-radius: 11px; flex: none;
  background: rgba(255, 138, 61, 0.14); color: var(--brand);
  display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: 700;
}
.tc-body { min-width: 0; flex: 1; }
.tc-label { font-size: 13.5px; font-weight: 700; color: var(--tx-1); }
.tc-desc { font-size: 11.5px; color: var(--tx-3); margin-top: 3px; }
.tc-arrow { color: var(--tx-4); font-size: 12px; }
</style>
