<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getBigScreen, saveBigScreen, type BigScreenEntity } from '@/api/bigScreen'
import { useOperationMessage } from '@/composables/useOperationMessage'
import { useI18n } from 'vue-i18n'

// 数据大屏表单（新增/编辑/查看共用）：名称、主题、描述；保存后可进入设计器。
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

const form = ref<BigScreenEntity>({ id: '', name: '', theme: 'dark-energy', description: '' })

const themeOptions = [
  { name: '能源暗域', value: 'dark-energy' },
  { name: '科技蓝', value: 'tech-blue' },
  { name: '商务灰', value: 'business-gray' },
]

async function load() {
  if (!isEdit.value) return
  loading.value = true
  try {
    form.value = await getBigScreen(id)
  } catch (e) {
    fail((e as Error).message || t('loadFail'))
  } finally {
    loading.value = false
  }
}

async function save(andDesign = false) {
  if (!form.value.name) {
    fail(t('pleaseFillName'))
    return
  }
  saving.value = true
  try {
    const saved = await saveBigScreen(form.value)
    success(t('saveSuccess'))
    if (andDesign) router.push(`/screen/${saved.id}/design`)
    else router.push('/screen')
  } catch (e) {
    fail((e as Error).message || t('saveFail'))
  } finally {
    saving.value = false
  }
}

function onSubmit() {
  save(!isEdit.value)
}

onMounted(load)
</script>

<template>
  <div class="page page-form h-full page-form-dashboard p-1">
    <form class="flex flex-column h-full" :class="{ readonly: isReadonly }" @submit.prevent="onSubmit">
      <div class="flex align-items-center gap-2 mb-2">
        <h3 class="flex-1">
          {{ (isReadonly ? t('view') : isEdit ? t('edit') : t('new')) + '数据大屏' }}
        </h3>
        <Button :label="t('back')" text size="small" @click="router.push('/screen')" />
      </div>
      <div v-if="loading" class="text-color-secondary">{{ t('loading') }}</div>
      <div v-else class="page-form-content flex-grow-1 px-2 py-1 overflow-y-auto">
        <div class="field grid">
          <label for="bs-name" class="field-label col-12 mb-2 md:col-3 md:mb-0">{{ t('name') }}</label>
          <div class="field-input col-12 md:col-9">
            <InputText
              id="bs-name"
              v-model="form.name"
              type="text"
              class="input w-full"
              name="name"
              required
              maxlength="100"
              :readonly="isReadonly"
              autofocus
            />
          </div>
        </div>
        <div class="field grid">
          <label for="bs-theme" class="field-label col-12 mb-2 md:col-3 md:mb-0">{{ t('theme') }}</label>
          <div class="field-input col-12 md:col-9">
            <Dropdown
              id="bs-theme"
              v-model="form.theme"
              :options="themeOptions"
              option-label="name"
              option-value="value"
              class="input w-full"
              :disabled="isReadonly"
            />
          </div>
        </div>
        <div class="field grid">
          <label for="bs-description" class="field-label col-12 mb-2 md:col-3 md:mb-0">{{ t('description') }}</label>
          <div class="field-input col-12 md:col-9">
            <Textarea
              id="bs-description"
              v-model="form.description"
              rows="4"
              class="input w-full"
              name="description"
              maxlength="500"
              :readonly="isReadonly"
            />
          </div>
        </div>
        <div v-if="isReadonly" class="field grid">
          <label class="field-label col-12 mb-2 md:col-3 md:mb-0">{{ t('createTime') }}</label>
          <div class="field-input col-12 md:col-9">
            <InputText :value="form.createTime" class="input w-full" readonly />
          </div>
        </div>
      </div>
      <div class="page-form-foot flex-grow-0 flex justify-content-center gap-2 pt-2">
        <template v-if="!isReadonly">
          <Button type="submit" :label="isEdit ? t('save') : '保存并设计'" :loading="saving" />
          <Button
            v-if="!isEdit"
            type="button"
            label="仅保存"
            :disabled="saving"
            @click="save(false)"
          />
        </template>
      </div>
    </form>
  </div>
</template>
