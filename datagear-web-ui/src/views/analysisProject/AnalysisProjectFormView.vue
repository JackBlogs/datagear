<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getAnalysisProject, saveAnalysisProject, type AnalysisProject } from '@/api/analysisProject'
import { useOperationMessage } from '@/composables/useOperationMessage'
import { useI18n } from 'vue-i18n'

// 分析项目表单（新增/编辑/查看共用），按原 analysisProject_form.ftl 复刻。
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

const form = ref<AnalysisProject>({ id: '', name: '', description: '' })

async function load() {
  if (!isEdit.value) return
  loading.value = true
  try {
    form.value = await getAnalysisProject(id)
  } catch (e) {
    fail((e as Error).message || t('loadFail'))
  } finally {
    loading.value = false
  }
}

async function save() {
  if (!form.value.name) {
    fail(t('pleaseFillName'))
    return
  }
  saving.value = true
  try {
    await saveAnalysisProject(form.value)
    success(t('saveSuccess'))
    router.push('/analysisProject')
  } catch (e) {
    fail((e as Error).message || t('saveFail'))
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="page page-form h-full page-form-analysisProject p-1">
    <form class="flex flex-column h-full" :class="{ readonly: isReadonly }">
      <div class="flex align-items-center gap-2 mb-2">
        <h3 class="flex-1">
          {{ (isReadonly ? t('view') : isEdit ? t('edit') : t('new')) + t('module.analysisProject') }}
        </h3>
        <Button :label="t('back')" text size="small" @click="router.push('/analysisProject')" />
      </div>
      <div v-if="loading" class="text-color-secondary">{{ t('loading') }}</div>
      <div v-else class="page-form-content flex-grow-1 px-2 py-1 overflow-y-auto">
        <div class="field grid">
          <label for="ap-name" class="field-label col-12 mb-2 md:col-3 md:mb-0">{{ t('name') }}</label>
          <div class="field-input col-12 md:col-9">
            <InputText
              id="ap-name"
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
          <label for="ap-description" class="field-label col-12 mb-2 md:col-3 md:mb-0">{{ t('description') }}</label>
          <div class="field-input col-12 md:col-9">
            <Textarea
              id="ap-description"
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
          <label class="field-label col-12 mb-2 md:col-3 md:mb-0">{{ t('createUser') }}</label>
          <div class="field-input col-12 md:col-9">
            <InputText :value="form.createUser?.realName || form.createUser?.name || ''" class="input w-full" readonly />
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
        <Button v-if="!isReadonly" type="button" :label="t('save')" :loading="saving" @click="save" />
      </div>
    </form>
  </div>
</template>
