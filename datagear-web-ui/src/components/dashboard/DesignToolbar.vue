<script setup lang="ts">
import type { Breakpoint } from '@/types/dashboardDesign'
import { breakpointLabel } from '@/types/dashboardDesign'

/**
 * 设计器顶部工具栏：撤销/重做 / 断点切换 / 预览 / 保存草稿 / 发布。
 */
defineProps<{
  name: string
  canUndo: boolean
  canRedo: boolean
  breakpoint: Breakpoint
  dirty: boolean
  saving: boolean
}>()

const emit = defineEmits<{
  (e: 'undo'): void
  (e: 'redo'): void
  (e: 'breakpoint', bp: Breakpoint): void
  (e: 'preview'): void
  (e: 'saveDraft'): void
  (e: 'publish'): void
  (e: 'toggleCode'): void
}>()

const bpList: Breakpoint[] = ['desktop', 'tablet', 'mobile']
const bpIcon: Record<Breakpoint, string> = {
  desktop: 'pi-desktop',
  tablet: 'pi-tablet',
  mobile: 'pi-mobile',
}
</script>

<template>
  <div class="d-toolbar">
    <div class="d-name">
      {{ name }} <span class="tag warn">{{ dirty ? '编辑中' : '已保存' }}</span>
    </div>
    <div class="d-divider"></div>

    <button class="t-icon-btn" title="撤销" :disabled="!canUndo" @click="emit('undo')">
      <i class="pi pi-replay"></i>
    </button>
    <button class="t-icon-btn" title="重做" :disabled="!canRedo" @click="emit('redo')">
      <i class="pi pi-forward"></i>
    </button>

    <div class="d-divider"></div>

    <button
      v-for="bp in bpList"
      :key="bp"
      class="t-icon-btn"
      :class="{ active: breakpoint === bp }"
      :title="`${breakpointLabel(bp)}画布`"
      @click="emit('breakpoint', bp)"
    >
      <i class="pi" :class="bpIcon[bp]"></i>
    </button>

    <div class="d-divider"></div>

    <button class="btn sm ghost" @click="emit('toggleCode')">源码</button>
    <button class="btn sm ghost" @click="emit('preview')">预览</button>
    <button class="btn sm" :disabled="saving" @click="emit('saveDraft')">
      <i class="pi pi-save"></i>保存草稿
    </button>
    <button class="btn sm primary" :disabled="saving" @click="emit('publish')">
      <i class="pi pi-send"></i>发布
    </button>
  </div>
</template>

<style scoped>
.d-toolbar {
  flex: none; display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
  background: var(--bg-glass); border: 1px solid var(--line-1); border-radius: var(--r-l);
  padding: 8px 14px;
}
.d-name { font-size: 14px; font-weight: 700; display: flex; align-items: center; gap: 8px; }
.d-name .tag { font-weight: 400; font-size: 10.5px; }
.d-divider { width: 1px; height: 20px; background: var(--line-2); }
.t-icon-btn {
  width: 30px; height: 30px; border-radius: 8px; border: 1px solid transparent;
  background: transparent; color: var(--tx-3); cursor: pointer;
  display: flex; align-items: center; justify-content: center;
}
.t-icon-btn:hover { background: var(--bg-glass-2); color: var(--tx-1); }
.t-icon-btn.active { background: var(--brand-soft); color: var(--brand); border-color: var(--brand-line); }
.t-icon-btn:disabled { opacity: .35; cursor: not-allowed; }
.btn {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 13px; font-family: inherit; font-weight: 500;
  padding: 6px 14px; border-radius: 10px;
  border: 1px solid var(--line-2); background: var(--bg-glass);
  color: var(--tx-1); cursor: pointer; transition: all .18s;
  white-space: nowrap;
}
.btn:hover { background: var(--bg-glass-3); border-color: var(--line-3); }
.btn.primary { background: var(--brand-grad); border: none; color: #241105; font-weight: 600; box-shadow: 0 4px 16px rgba(244,99,58,.3); }
.btn.sm { padding: 5px 12px; font-size: 12px; border-radius: 8px; }
.btn.ghost { background: transparent; }
</style>
