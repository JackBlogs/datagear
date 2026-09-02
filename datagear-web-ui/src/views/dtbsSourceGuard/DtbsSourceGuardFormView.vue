<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getDtbsSourceGuard, saveDtbsSourceGuard, type DtbsSourceGuard } from '@/api/dtbsSourceGuard'
import { useOperationMessage } from '@/composables/useOperationMessage'
import { useI18n } from 'vue-i18n'

const PROPERTIES_MATCH_MODE_ANY = 'ANY'
const PROPERTIES_MATCH_MODE_ALL = 'ALL'

// 数据源防护规则表单（新增/编辑/查看共用），按原 dtbsSourceGuard_form.ftl 复刻。
const route = useRoute()
const router = useRouter()
const { success, fail } = useOperationMessage()
const { t } = useI18n()

const id = (route.params.id as string) ?? ''
const mode = (route.query.mode as string) || 'edit'
const isEdit = computed(() => !!id)
const isReadonly = computed(() => mode === 'view')
const loading = ref(false)
const saving = ref(false)

const form = ref<DtbsSourceGuard>({
  id: '',
  name: '',
  pattern: '',
  userPattern: '',
  propertyPatterns: [],
  propertiesMatchMode: PROPERTIES_MATCH_MODE_ANY,
  emptyPropertyPatternsForAll: true,
  permitted: true,
  priority: 0,
  enabled: true,
})

const selectedPropertyPatterns = ref<{ namePattern: string; valuePattern: string }[]>([])
const propertyPatternDialogVisible = ref(false)
const propertyPatternDialogTitle = ref('')
const propertyPatternForm = ref({ namePattern: '', valuePattern: '' })

const propertiesMatchModeOptions = [
  { name: t('matchAny'), value: PROPERTIES_MATCH_MODE_ANY },
  { name: t('matchAll'), value: PROPERTIES_MATCH_MODE_ALL },
]

const booleanOptions = [
  { name: t('yes'), value: true },
  { name: t('no'), value: false },
]

async function load() {
  loading.value = true
  try {
    if (isEdit.value) {
      form.value = await getDtbsSourceGuard(id)
      if (!form.value.propertyPatterns) form.value.propertyPatterns = []
    }
  } catch (e) {
    fail((e as Error).message || t('loadFail'))
  } finally {
    loading.value = false
  }
}

function openPropertyPatternDialog(action: 'add' | 'edit') {
  if (action === 'edit') {
    if (!selectedPropertyPatterns.value.length) return
    const pp = selectedPropertyPatterns.value[0]
    propertyPatternForm.value = { namePattern: pp.namePattern, valuePattern: pp.valuePattern }
    propertyPatternDialogTitle.value = t('edit') + t('propertyRule')
  } else {
    propertyPatternForm.value = { namePattern: '', valuePattern: '' }
    propertyPatternDialogTitle.value = t('add') + t('propertyRule')
  }
  propertyPatternDialogVisible.value = true
}

function submitPropertyPatternForm() {
  const pps = form.value.propertyPatterns ?? []
  if (propertyPatternDialogTitle.value === t('add') + t('propertyRule')) {
    if (pps.some((p) => p.namePattern === propertyPatternForm.value.namePattern)) {
      fail(t('propertyNameRuleExists'))
      return
    }
    pps.push({ ...propertyPatternForm.value })
  } else {
    const idx = pps.findIndex((p) => p.namePattern === selectedPropertyPatterns.value[0]?.namePattern)
    if (idx >= 0) {
      pps[idx] = { ...propertyPatternForm.value }
    }
  }
  form.value.propertyPatterns = pps
  selectedPropertyPatterns.value = []
  propertyPatternDialogVisible.value = false
}

function onDeletePropertyPattern() {
  const sps = selectedPropertyPatterns.value
  if (!sps.length) return
  form.value.propertyPatterns = (form.value.propertyPatterns ?? []).filter(
    (p) => !sps.some((s) => s.namePattern === p.namePattern),
  )
  selectedPropertyPatterns.value = []
}

async function save() {
  if (!form.value.name || !form.value.pattern) {
    fail(t('pleaseFillNameAndPattern'))
    return
  }
  saving.value = true
  try {
    await saveDtbsSourceGuard(form.value)
    success(t('saveSuccess'))
    router.push('/dtbsSourceGuard')
  } catch (e) {
    fail((e as Error).message || t('saveFail'))
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="page page-form h-full p-1">
    <form class="flex flex-column h-full" :class="{ readonly: isReadonly }">
      <div class="flex align-items-center gap-2 mb-2">
        <h3 class="flex-1">
          {{ (isReadonly ? t('view') : isEdit ? t('edit') : t('new')) + t('module.dtbsSourceGuard') }}
        </h3>
        <Button :label="t('back')" text size="small" @click="router.push('/dtbsSourceGuard')" />
      </div>
      <div v-if="loading" class="text-color-secondary">{{ t('loading') }}</div>
      <div v-else class="page-form-content flex-grow-1 px-2 py-1 overflow-y-auto">
        <div class="field grid">
          <label for="dsg-name" class="field-label col-12 mb-2 md:col-3 md:mb-0">{{ t('name') }}</label>
          <div class="field-input col-12 md:col-9">
            <InputText id="dsg-name" v-model="form.name" class="input w-full" required maxlength="100" :readonly="isReadonly" autofocus />
          </div>
        </div>
        <div class="field grid">
          <label for="dsg-pattern" class="field-label col-12 mb-2 md:col-3 md:mb-0" title="数据源 URL 匹配模式">{{ t('urlPattern') }}</label>
          <div class="field-input col-12 md:col-9">
            <InputText id="dsg-pattern" v-model="form.pattern" class="input w-full" required maxlength="200" :readonly="isReadonly" />
          </div>
        </div>
        <div class="field grid">
          <label for="dsg-userPattern" class="field-label col-12 mb-2 md:col-3 md:mb-0" title="用户匹配模式">{{ t('userPattern') }}</label>
          <div class="field-input col-12 md:col-9">
            <InputText id="dsg-userPattern" v-model="form.userPattern" class="input w-full" required maxlength="100" :readonly="isReadonly" />
          </div>
        </div>
        <div class="field grid">
          <label class="field-label col-12 mb-2" title="连接属性匹配规则">{{ t('propertyRule') }}</label>
          <div class="field-input col-12">
            <div class="p-component p-inputtext p-2">
              <div v-if="!isReadonly" class="flex flex-row pb-2 gap-1">
                <Button type="button" :label="t('add')" size="small" @click="openPropertyPatternDialog('add')" />
                <Button type="button" :label="t('edit')" size="small" class="p-button-secondary" @click="openPropertyPatternDialog('edit')" />
                <Button type="button" :label="t('delete')" size="small" class="p-button-danger" @click="onDeletePropertyPattern" />
              </div>
              <div class="property-patterns-wrapper input w-full overflow-auto">
                <DataTable
                  :value="form.propertyPatterns"
                  :scrollable="true"
                  v-model:selection="selectedPropertyPatterns"
                  selection-mode="multiple"
                  data-key="namePattern"
                  striped-rows
                  class="property-patterns-table table-sm"
                >
                  <Column selection-mode="multiple" class="col-check" />
                  <Column field="namePattern" :header="t('propertyNameRule')" />
                  <Column field="valuePattern" :header="t('propertyValueRule')" />
                </DataTable>
              </div>
            </div>
          </div>
        </div>
        <div class="field grid">
          <label class="field-label col-12 mb-2" title="属性规则匹配模式">{{ t('attributeMatchMode') }}</label>
          <div class="field-input col-12">
            <SelectButton v-model="form.propertiesMatchMode" :options="propertiesMatchModeOptions" option-label="name" option-value="value" class="input w-full" :disabled="isReadonly" />
          </div>
        </div>
        <div class="field grid">
          <label class="field-label col-12 mb-2" title="空属性规则是否匹配所有">{{ t('emptyPropertyRulesMatchAll') }}</label>
          <div class="field-input col-12">
            <SelectButton v-model="form.emptyPropertyPatternsForAll" :options="booleanOptions" option-label="name" option-value="value" class="input w-full" :disabled="isReadonly" />
          </div>
        </div>
        <div class="field grid">
          <label class="field-label col-12 mb-2 md:col-3 md:mb-0" title="是否允许连接">{{ t('permit') }}</label>
          <div class="field-input col-12 md:col-9">
            <SelectButton v-model="form.permitted" :options="booleanOptions" option-label="name" option-value="value" class="input w-full" :disabled="isReadonly" />
          </div>
        </div>
        <div class="field grid">
          <label for="dsg-priority" class="field-label col-12 mb-2 md:col-3 md:mb-0" title="规则优先级，整数">{{ t('priority') }}</label>
          <div class="field-input col-12 md:col-9">
            <InputText
              id="dsg-priority"
              :model-value="String(form.priority ?? 0)"
              class="input w-full"
              required
              maxlength="10"
              :readonly="isReadonly"
              @update:model-value="(v: string | undefined) => (form.priority = Number(v || 0))"
            />
          </div>
        </div>
        <div class="field grid">
          <label class="field-label col-12 mb-2 md:col-3 md:mb-0">{{ t('enable') }}</label>
          <div class="field-input col-12 md:col-9">
            <SelectButton v-model="form.enabled" :options="booleanOptions" option-label="name" option-value="value" class="input w-full" :disabled="isReadonly" />
          </div>
        </div>
      </div>
      <div class="page-form-foot flex-grow-0 flex justify-content-center gap-2 pt-2">
        <Button v-if="!isReadonly" :label="t('save')" :loading="saving" @click="save" />
      </div>
    </form>

    <Dialog v-model:visible="propertyPatternDialogVisible" :header="propertyPatternDialogTitle" :modal="true" :dismissable-mask="true">
      <div class="flex flex-column gap-3 p-2" style="min-width: 320px">
        <div class="field">
          <label for="pp-namePattern" class="field-label">{{ t('propertyNameRule') }}</label>
          <InputText id="pp-namePattern" v-model="propertyPatternForm.namePattern" class="input w-full" required maxlength="100" autofocus />
        </div>
        <div class="field">
          <label for="pp-valuePattern" class="field-label">{{ t('propertyValueRule') }}</label>
          <InputText id="pp-valuePattern" v-model="propertyPatternForm.valuePattern" class="input w-full" required maxlength="100" />
        </div>
      </div>
      <template #footer>
        <Button :label="t('cancel')" text size="small" @click="propertyPatternDialogVisible = false" />
        <Button :label="t('confirm')" size="small" @click="submitPropertyPatternForm" />
      </template>
    </Dialog>
  </div>
</template>

<style scoped>
.property-patterns-wrapper {
  max-height: 240px;
}
.property-patterns-table :deep(.p-datatable-table) {
  font-size: 0.875rem;
}
</style>
