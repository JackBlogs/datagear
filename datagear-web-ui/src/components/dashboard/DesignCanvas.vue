<script setup lang="ts">
import { ref, computed, onBeforeUnmount } from 'vue'
import type { DashboardDesign, DgWidget } from '@/types/dashboardDesign'
import WidgetRenderer from './WidgetRenderer.vue'

/**
 * 设计器中画布：绝对定位部件，支持选中 / 拖拽移动 / 八向手柄缩放 / 8px 网格吸附。
 * 同时承接组件库的 HTML5 拖放：drop 后按光标位置发出 dropAdd（部件类型 + 画布坐标）。
 */
const props = defineProps<{ design: DashboardDesign; widgets: DgWidget[]; selectedId: string | null; snapOn?: boolean }>()
const emit = defineEmits<{
  (e: 'select', id: string | null): void
  (e: 'move', id: string, x: number, y: number): void
  (e: 'resize', id: string, data: { x: number; y: number; w: number; h: number }): void
  (e: 'remove', id: string): void
  (e: 'dropAdd', payload: Record<string, unknown>, x: number, y: number): void
}>()

const canvasEl = ref<HTMLElement>()

interface DragState {
  mode: 'move' | 'resize'
  id: string
  startX: number
  startY: number
  origX: number
  origY: number
  origW: number
  origH: number
  dir?: string
}

const drag = ref<DragState | null>(null)
const snap = 8

function snapV(v: number): number {
  return props.snapOn === false ? v : Math.round(v / snap) * snap
}

function handleDown(e: MouseEvent, widget: DgWidget, mode: 'move' | 'resize', dir?: string) {
  e.preventDefault()
  e.stopPropagation()
  emit('select', widget.id)
  drag.value = {
    mode,
    id: widget.id,
    startX: e.clientX,
    startY: e.clientY,
    origX: widget.x,
    origY: widget.y,
    origW: widget.w,
    origH: widget.h,
    dir,
  }
}

function onMove(e: MouseEvent) {
  const d = drag.value
  if (!d) return
  const dx = e.clientX - d.startX
  const dy = e.clientY - d.startY
  if (d.mode === 'move') {
    emit('move', d.id, snapV(d.origX + dx), snapV(d.origY + dy))
  } else if (d.mode === 'resize' && d.dir) {
    let { origX, origY, origW, origH } = d
    let x = d.origX
    let y = d.origY
    let w = origW
    let h = origH
    if (d.dir.includes('e')) w = snapV(origW + dx)
    if (d.dir.includes('s')) h = snapV(origH + dy)
    if (d.dir.includes('w')) {
      w = snapV(origW - dx)
      x = snapV(origX + dx)
    }
    if (d.dir.includes('n')) {
      h = snapV(origH - dy)
      y = snapV(origY + dy)
    }
    // 最小尺寸
    if (w < 60) { w = 60; if (d.dir.includes('w')) x = snapV(d.origX + d.origW - w) }
    if (h < 32) { h = 32; if (d.dir.includes('n')) y = snapV(d.origY + d.origH - h) }
    emit('resize', d.id, { x, y, w, h })
  }
}

function onUp() {
  drag.value = null
}

function onBlankClick() {
  emit('select', null)
}

/* ---------- 组件库拖放：drop 按光标位置创建部件 ---------- */
function onDragOver(e: DragEvent) {
  // 必须阻止默认行为才能触发 drop
  e.preventDefault()
  if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'
}
function onDrop(e: DragEvent) {
  e.preventDefault()
  const raw = e.dataTransfer?.getData('application/x-dg-widget')
  if (!raw || !canvasEl.value) return
  let payload: Record<string, unknown>
  try {
    payload = JSON.parse(raw)
  } catch {
    return
  }
  // clientX/Y 减画布内容左上角（rect 随滚动移动，差值即画布内容坐标）
  const rect = canvasEl.value.getBoundingClientRect()
  const x = Math.max(0, snapV(e.clientX - rect.left))
  const y = Math.max(0, snapV(e.clientY - rect.top))
  emit('dropAdd', payload, x, y)
}

function remove(id: string) {
  emit('remove', id)
}

const canvasStyle = computed(() => ({
  width: props.design.canvas.width + 'px',
  height: props.design.canvas.height + 'px',
}))

window.addEventListener('mousemove', onMove)
window.addEventListener('mouseup', onUp)
onBeforeUnmount(() => {
  window.removeEventListener('mousemove', onMove)
  window.removeEventListener('mouseup', onUp)
})
</script>

<template>
  <div class="canvas-outer">
    <div ref="canvasEl" class="canvas" :style="canvasStyle" @mousedown="onBlankClick" @dragover="onDragOver" @drop="onDrop">
      <div
        v-for="w in widgets"
        :key="w.id"
        class="cv-widget"
        :class="{ selected: w.id === selectedId }"
        :style="{
          left: w.x + 'px',
          top: w.y + 'px',
          width: w.w + 'px',
          height: w.h + 'px',
        }"
        @mousedown="handleDown($event, w, 'move')"
      >
        <div class="cv-head">
          <span class="grip">⋮⋮</span>
          <span class="cv-name">{{ w.name }}</span>
          <span class="cv-type">{{ w.type }}</span>
          <span class="cv-x" @click.stop="remove(w.id)">✕</span>
        </div>
        <div class="cv-body">
          <WidgetRenderer :widget="w" />
        </div>

        <!-- 8 个调整手柄 -->
        <template v-if="w.id === selectedId">
          <i class="hdl h-nw" @mousedown.stop="handleDown($event, w, 'resize', 'nw')"></i>
          <i class="hdl h-n" @mousedown.stop="handleDown($event, w, 'resize', 'n')"></i>
          <i class="hdl h-ne" @mousedown.stop="handleDown($event, w, 'resize', 'ne')"></i>
          <i class="hdl h-e" @mousedown.stop="handleDown($event, w, 'resize', 'e')"></i>
          <i class="hdl h-se" @mousedown.stop="handleDown($event, w, 'resize', 'se')"></i>
          <i class="hdl h-s" @mousedown.stop="handleDown($event, w, 'resize', 's')"></i>
          <i class="hdl h-sw" @mousedown.stop="handleDown($event, w, 'resize', 'sw')"></i>
          <i class="hdl h-w" @mousedown.stop="handleDown($event, w, 'resize', 'w')"></i>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.canvas-outer {
  flex: 1; min-height: 0; overflow: auto; position: relative;
  border: 1px solid var(--line-1); border-radius: var(--r-l);
  background:
    radial-gradient(circle, rgba(255,255,255,.07) 1px, transparent 1px) 0 0 / 22px 22px,
    linear-gradient(180deg,#0A0E17,#080B13);
}
.canvas { position: relative; }
.cv-widget {
  position: absolute;
  background: rgba(17,26,42,.85);
  border: 1px solid var(--line-2);
  border-radius: var(--r-m);
  display: flex; flex-direction: column; overflow: hidden;
  backdrop-filter: blur(6px);
  cursor: move;
  transition: border-color .18s, box-shadow .18s;
}
.cv-widget:hover { border-color: var(--line-3); }
.cv-widget.selected { border-color: var(--brand); box-shadow: 0 0 0 1px var(--brand), 0 0 18px rgba(255,138,61,.35); }
.cv-head {
  flex: none; height: 26px; display: flex; align-items: center; gap: 6px; padding: 0 8px;
  font-size: 11px; color: var(--tx-2); border-bottom: 1px solid var(--line-1);
  background: rgba(255,255,255,.02);
}
.grip { color: var(--tx-4); letter-spacing: 1px; font-size: 10px; cursor: grab; }
.cv-name { font-weight: 600; }
.cv-type { font-size: 9.5px; color: var(--tx-4); background: var(--bg-glass); padding: 0 5px; border-radius: 5px; }
.cv-x { margin-left: auto; color: var(--tx-4); cursor: pointer; font-size: 12px; }
.cv-x:hover { color: var(--danger); }
.cv-body { flex: 1; min-height: 0; padding: 6px 10px; }
.hdl { position: absolute; width: 8px; height: 8px; border-radius: 2px; background: #fff; border: 1.5px solid var(--brand); display: none; z-index: 3; }
.cv-widget.selected .hdl { display: block; }
.h-nw { left: -4px; top: -4px; cursor: nwse-resize; }
.h-n { left: calc(50% - 4px); top: -4px; cursor: ns-resize; }
.h-ne { right: -4px; top: -4px; cursor: nesw-resize; }
.h-e { right: -4px; top: calc(50% - 4px); cursor: ew-resize; }
.h-se { right: -4px; bottom: -4px; cursor: nwse-resize; }
.h-s { left: calc(50% - 4px); bottom: -4px; cursor: ns-resize; }
.h-sw { left: -4px; bottom: -4px; cursor: nesw-resize; }
.h-w { left: -4px; top: calc(50% - 4px); cursor: ew-resize; }
</style>
