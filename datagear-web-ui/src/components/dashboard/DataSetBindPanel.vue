<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  flattenDataSigns,
  isFieldTarget,
  isDatasetTarget,
  dataSignLabel,
  type DataSign,
  type DataSet,
  type DataSetBind,
} from '@/types/dashboard'

/**
 * 数据绑定面板（5c 看板设计器「数据绑定」分组重写）。
 * 对应后端 DataSetBind / DataSign / DataSet 模型，支持：
 * 字段级绑定（fieldSigns）、数据集级绑定（dataSetSigns）、别名（alias）、字段别名（fieldAliases）、字段排序（fieldOrders）。
 */
const props = defineProps<{
  dataSigns: DataSign[]
  dataSets: DataSet[]
  modelValue: DataSetBind[]
}>()
const emit = defineEmits<{ (e: 'update:modelValue', v: DataSetBind[]): void }>()

const flatSigns = computed(() => flattenDataSigns(props.dataSigns))
const fieldSigns = computed(() => flatSigns.value.filter(isFieldTarget))
const datasetSigns = computed(() => flatSigns.value.filter(isDatasetTarget))
const requiredSigns = computed(() => fieldSigns.value.filter((s) => s.required))

const settingsOpen = ref<Set<number>>(new Set())

function toggleSettings(index: number) {
  const next = new Set(settingsOpen.value)
  next.has(index) ? next.delete(index) : next.add(index)
  settingsOpen.value = next
}

/** 从 fieldSigns（字段->签名）反查某签名绑定的字段列表 */
function getSignFields(bind: DataSetBind, signFullname: string): string[] {
  const out: string[] = []
  for (const [field, signs] of Object.entries(bind.fieldSigns ?? {})) {
    if (signs.includes(signFullname)) out.push(field)
  }
  return out
}

/** 设置某签名的字段绑定（不可变） */
function withSignFields(bind: DataSetBind, signFullname: string, fields: string[]): DataSetBind {
  const fieldSigns: Record<string, string[]> = {}
  for (const [field, signs] of Object.entries(bind.fieldSigns ?? {})) {
    const rest = signs.filter((s) => s !== signFullname)
    if (rest.length) fieldSigns[field] = rest
  }
  for (const field of fields) {
    fieldSigns[field] = [...(fieldSigns[field] ?? []), signFullname]
  }
  return { ...bind, fieldSigns }
}

function patchBind(index: number, patch: Partial<DataSetBind>) {
  const next = props.modelValue.map((b) => ({ ...b }))
  next[index] = { ...next[index], ...patch }
  emit('update:modelValue', next)
}

function patchBindFn(index: number, fn: (b: DataSetBind) => DataSetBind) {
  const next = props.modelValue.map((b, i) => (i === index ? fn(b) : b))
  emit('update:modelValue', next)
}

function onDataSetChange(index: number, dataSetId: string) {
  const dataSet = props.dataSets.find((d) => d.id === dataSetId)
  patchBind(index, { dataSet, fieldSigns: {}, dataSetSigns: [] })
}

function onAliasChange(index: number, alias: string) {
  patchBind(index, { alias })
}

function onSingleFieldChange(index: number, signFullname: string, field: string) {
  patchBindFn(index, (b) => withSignFields(b, signFullname, field ? [field] : []))
}

function onToggleField(index: number, signFullname: string, field: string, checked: boolean) {
  patchBindFn(index, (b) => {
    const cur = getSignFields(b, signFullname)
    const next = checked ? (cur.includes(field) ? cur : [...cur, field]) : cur.filter((f) => f !== field)
    return withSignFields(b, signFullname, next)
  })
}

function onToggleDataSetSign(index: number, signFullname: string, checked: boolean) {
  patchBindFn(index, (b) => {
    const cur = b.dataSetSigns ?? []
    const next = checked ? (cur.includes(signFullname) ? cur : [...cur, signFullname]) : cur.filter((s) => s !== signFullname)
    return { ...b, dataSetSigns: next }
  })
}

function onFieldAliasChange(index: number, field: string, alias: string) {
  patchBindFn(index, (b) => {
    const fieldAliases = { ...(b.fieldAliases ?? {}) }
    if (alias) fieldAliases[field] = alias
    else delete fieldAliases[field]
    return { ...b, fieldAliases }
  })
}

function onFieldOrderChange(index: number, field: string, order: string) {
  patchBindFn(index, (b) => {
    const fieldOrders = { ...(b.fieldOrders ?? {}) }
    const n = Number(order)
    if (Number.isFinite(n)) fieldOrders[field] = n
    else delete fieldOrders[field]
    return { ...b, fieldOrders }
  })
}

function addBind() {
  emit('update:modelValue', [...props.modelValue, { fieldSigns: {}, dataSetSigns: [] }])
}

function removeBind(index: number) {
  emit('update:modelValue', props.modelValue.filter((_, i) => i !== index))
}
</script>

<template>
  <div class="dsb-panel">
    <div v-for="(bind, bi) in modelValue" :key="bi" class="dsb-bind">
      <div class="dsb-header flex align-items-center gap-2">
        <select
          class="flex-1"
          :value="bind.dataSet?.id ?? ''"
          @change="onDataSetChange(bi, ($event.target as HTMLSelectElement).value)"
        >
          <option value="">（选择数据集）</option>
          <option v-for="ds in dataSets" :key="ds.id" :value="ds.id">{{ ds.name }}</option>
        </select>
        <input
          class="alias-input"
          placeholder="别名"
          :value="bind.alias ?? ''"
          @change="onAliasChange(bi, ($event.target as HTMLInputElement).value)"
        />
        <Button label="移除" text size="small" @click="removeBind(bi)" />
      </div>

      <div v-if="bind.dataSet">
        <!-- 数据集级绑定 -->
        <div v-if="datasetSigns.length" class="dsb-section">
          <div class="dsb-section-title">数据集级绑定</div>
          <label v-for="sign in datasetSigns" :key="sign.fullname" class="flex align-items-center gap-1 dsb-field-check">
            <Checkbox
              :model-value="(bind.dataSetSigns ?? []).includes(sign.fullname)"
              :binary="true"
              @update:model-value="onToggleDataSetSign(bi, sign.fullname, $event as boolean)"
            />
            {{ dataSignLabel(sign) }}<span v-if="sign.required" class="dsb-required">*</span>
          </label>
        </div>

        <!-- 字段级绑定 -->
        <div class="dsb-section">
          <div class="dsb-section-title">字段级绑定</div>
          <div
            v-for="sign in fieldSigns"
            :key="sign.fullname"
            class="dsb-sign flex align-items-center gap-2"
            :style="{ paddingLeft: sign.depth * 16 + 'px' }"
          >
            <span class="dsb-sign-name">
              {{ dataSignLabel(sign) }}<span v-if="sign.required" class="dsb-required">*</span>
            </span>

            <template v-if="sign.multiple">
              <label
                v-for="f in bind.dataSet.fields ?? []"
                :key="f.name"
                class="flex align-items-center gap-1 dsb-field-check"
              >
                <Checkbox
                  :model-value="getSignFields(bind, sign.fullname).includes(f.name)"
                  :binary="true"
                  @update:model-value="onToggleField(bi, sign.fullname, f.name, $event as boolean)"
                />
                {{ f.name }}
              </label>
            </template>
            <select
              v-else
              :value="getSignFields(bind, sign.fullname)[0] ?? ''"
              @change="onSingleFieldChange(bi, sign.fullname, ($event.target as HTMLSelectElement).value)"
            >
              <option value="">（未绑定）</option>
              <option v-for="f in bind.dataSet.fields ?? []" :key="f.name" :value="f.name">
                {{ f.name }}
              </option>
            </select>
          </div>
          <div v-if="requiredSigns.some((s) => getSignFields(bind, s.fullname).length === 0)" class="dsb-warn">
            存在未绑定的必填数据签名
          </div>
        </div>

        <!-- 字段设置 -->
        <div class="dsb-section">
          <div class="flex align-items-center gap-2">
            <span class="dsb-section-title">字段设置</span>
            <Button
              label="展开/收起"
              text
              size="small"
              @click="toggleSettings(bi)"
            />
          </div>
          <div v-if="settingsOpen.has(bi)" class="dsb-field-settings">
            <div
              v-for="f in bind.dataSet.fields ?? []"
              :key="f.name"
              class="flex align-items-center gap-2 dsb-field-setting-row"
            >
              <span class="dsb-field-name">{{ f.name }}</span>
              <input
                class="alias-input"
                placeholder="字段别名"
                :value="bind.fieldAliases?.[f.name] ?? ''"
                @change="onFieldAliasChange(bi, f.name, ($event.target as HTMLInputElement).value)"
              />
              <input
                class="order-input"
                type="number"
                placeholder="排序"
                :value="bind.fieldOrders?.[f.name] ?? ''"
                @change="onFieldOrderChange(bi, f.name, ($event.target as HTMLInputElement).value)"
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    <Button label="添加数据集" text size="small" @click="addBind" />
  </div>
</template>

<style scoped>
.dsb-bind {
  border: 1px solid var(--line-1, rgba(255,255,255,.07));
  border-radius: 6px;
  padding: 8px;
  margin-bottom: 8px;
}
.dsb-header {
  margin-bottom: 8px;
}
.dsb-section {
  margin-top: 8px;
}
.dsb-section-title {
  font-weight: 700;
  font-size: 13px;
  color: var(--tx-3, #7C88A0);
}
.dsb-sign {
  padding: 4px 0;
}
.dsb-sign-name {
  min-width: 120px;
  font-weight: 600;
}
.dsb-required {
  color: #d32f2f;
}
.dsb-field-check {
  cursor: pointer;
}
.dsb-warn {
  color: #b26a00;
  font-size: 12px;
  margin-top: 6px;
}
.alias-input,
.order-input {
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 4px 6px;
}
.order-input {
  width: 70px;
}
.dsb-field-settings {
  margin-top: 6px;
  padding-left: 8px;
  border-left: 2px solid #eee;
}
.dsb-field-setting-row {
  padding: 3px 0;
}
.dsb-field-name {
  min-width: 120px;
}
</style>
