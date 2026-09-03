<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { DriverEntity } from '@/api/dtbsSource'

// 驱动选择弹窗：替代旧版 window.prompt 手输 ID 的实现（来源 dtbsSource_form.ftl 的驱动选择面板）。
const props = defineProps<{
  visible: boolean
  drivers: DriverEntity[]
  selectedId?: string
}>()

const emit = defineEmits<{
  (e: 'update:visible', v: boolean): void
  (e: 'select', driver: DriverEntity | null): void
}>()

const { t } = useI18n()
const keyword = ref('')
const pickedId = ref('')

const filtered = computed(() => {
  const k = keyword.value.trim().toLowerCase()
  if (!k) return props.drivers
  return props.drivers.filter((d) =>
    [d.displayName, d.driverClassName, d.databaseName, d.displayText, d.id]
      .filter(Boolean)
      .some((v) => String(v).toLowerCase().includes(k)),
  )
})

function label(d: DriverEntity): string {
  return d.displayName ?? d.displayText ?? d.driverClassName ?? d.id
}

function pick(d: DriverEntity) {
  pickedId.value = d.id
}

function confirm() {
  const d = props.drivers.find((x) => x.id === pickedId.value)
  emit('select', d ?? null)
  emit('update:visible', false)
}

function clear() {
  emit('select', null)
  emit('update:visible', false)
}

watch(
  () => props.visible,
  (v) => {
    if (v) {
      pickedId.value = props.selectedId ?? ''
      keyword.value = ''
    }
  },
)
</script>

<template>
  <Dialog
    :visible="visible"
    :header="t('dsForm.chooseDriver')"
    :modal="true"
    :dismissable-mask="true"
    :style="{ width: '42rem' }"
    @update:visible="emit('update:visible', $event)"
  >
    <div class="flex flex-column gap-2">
      <span class="p-input-icon-left w-full">
        <i class="pi pi-search"></i>
        <InputText v-model="keyword" class="w-full" :placeholder="t('driver.searchPlaceholder')" />
      </span>
      <div class="driver-list border-1 surface-border border-round">
        <div
          v-for="d in filtered"
          :key="d.id"
          class="driver-item flex align-items-center gap-2 px-3 py-2 cursor-pointer"
          :class="{ picked: pickedId === d.id }"
          @click="pick(d)"
          @dblclick="pick(d); confirm()"
        >
          <i class="pi" :class="pickedId === d.id ? 'pi-check-circle text-primary' : 'pi-circle text-color-secondary'"></i>
          <div class="flex-1">
            <div class="font-semibold">{{ label(d) }}</div>
            <div class="text-xs text-color-secondary">{{ d.driverClassName }}<span v-if="d.databaseName"> · {{ d.databaseName }}</span></div>
          </div>
        </div>
        <div v-if="!filtered.length" class="text-color-secondary text-sm p-3">{{ t('driverNotFound') }}</div>
      </div>
    </div>
    <template #footer>
      <Button :label="t('clear')" text size="small" @click="clear" />
      <Button :label="t('cancel')" text size="small" @click="emit('update:visible', false)" />
      <Button :label="t('confirm')" size="small" :disabled="!pickedId" @click="confirm" />
    </template>
  </Dialog>
</template>

<style scoped>
.driver-list {
  max-height: 320px;
  overflow: auto;
}
.driver-item {
  border-bottom: 1px solid var(--surface-border);
}
.driver-item:last-child {
  border-bottom: none;
}
.driver-item:hover {
  background: var(--surface-hover);
}
.driver-item.picked {
  background: var(--highlight-bg, var(--surface-hover));
}
</style>
