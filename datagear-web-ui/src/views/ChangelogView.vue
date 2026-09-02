<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { getChangelog, type VersionContent } from '@/api/public'

const { t } = useI18n()

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
  <div class="changelog-page page page-form h-full p-card no-border h-screen m-0 p-1">
    <form class="flex flex-column h-full">
      <div class="page-form-content no-max-height flex-grow-1 pr-2 py-1 overflow-y-auto">
        <div v-if="loading" class="text-color-secondary">{{ t('loading') }}</div>
        <template v-for="(v, _idx) in items" :key="_idx">
          <div class="field grid mb-0">
            <label class="field-label col-12 mb-2 md:col-2 md:mb-0 justify-content-center">{{ t('version') }}</label>
            <div class="field-input col-12 md:col-10">
              <div class="text-xl font-bold">{{ versionText(v) }}</div>
            </div>
          </div>
          <div class="field grid mb-0">
            <label class="field-label col-12 mb-2 md:col-2 md:mb-0">&nbsp;</label>
            <div class="field-input col-12 md:col-10">
              <ul class="pl-4">
                <li v-for="(c, j) in v.contents ?? []" :key="j" class="py-1">{{ c }}</li>
              </ul>
            </div>
          </div>
        </template>
        <div v-if="!loading && !items.length" class="text-color-secondary">{{ t('noChangelog') }}</div>
      </div>
    </form>
  </div>
</template>

<style scoped>
.changelog-page {
  padding: 1rem;
}
</style>
