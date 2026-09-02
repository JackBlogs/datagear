<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getChangelog, type VersionContent } from '@/api/public'

const items = ref<VersionContent[]>([])
const loading = ref(false)

onMounted(async () => {
  loading.value = true
  try {
    items.value = await getChangelog()
  } finally {
    loading.value = false
  }
})

function versionText(v: VersionContent): string {
  const ver = v.version as { version?: string; major?: string; minor?: string; revision?: string } | undefined
  return ver?.version ?? [ver?.major, ver?.minor, ver?.revision].filter(Boolean).join('.') ?? ''
}
</script>

<template>
  <div class="changelog">
    <h1>更新日志</h1>
    <div v-if="loading" class="muted">加载中…</div>
    <div v-for="(v, i) in items" :key="i" class="ver">
      <h2 class="ver-title">版本 {{ versionText(v) }}</h2>
      <ul>
        <li v-for="(c, j) in v.contents ?? []" :key="j">{{ c }}</li>
      </ul>
    </div>
    <div v-if="!loading && !items.length" class="muted">暂无更新日志</div>
  </div>
</template>

<style scoped>
.changelog {
  padding: 24px;
  max-width: 720px;
  margin: 0 auto;
}
.ver {
  margin-bottom: 20px;
}
.ver-title {
  font-size: 16px;
  border-bottom: 1px solid #eee;
  padding-bottom: 6px;
}
li {
  margin: 4px 0;
  color: #444;
}
.muted {
  color: #999;
}
</style>
