<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import PagingTable from '@/components/PagingTable.vue'
import { moduleListConfigs, moduleLoader } from './modules'

const route = useRoute()
const moduleName = computed(() => (route.meta.module as string) || '')
const cfg = computed(() => moduleListConfigs[moduleName.value])
</script>

<template>
  <div v-if="cfg">
    <div v-if="cfg.createPath" class="p-2">
      <router-link :to="cfg.createPath">
        <Button :label="cfg.createLabel ?? '新建'" size="small" />
      </router-link>
    </div>
    <PagingTable
      :title="cfg.title"
      :loader="moduleLoader(cfg.module)"
      :columns="cfg.columns"
      :row-actions="cfg.rowActions"
    />
  </div>
  <div v-else class="p-4">未知模块：{{ moduleName }}</div>
</template>
