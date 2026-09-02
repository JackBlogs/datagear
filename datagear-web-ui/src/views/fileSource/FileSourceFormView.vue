<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getFileSource, saveFileSource, type FileSource } from '@/api/fileSource'
import { useOperationMessage } from '@/composables/useOperationMessage'
import { useI18n } from 'vue-i18n'

// 文件源表单（新增/编辑/查看共用），按原 fileSource_form.ftl 复刻。
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

// 对应原模板 model 属性 isShowDirectory，默认 true。
const isShowDirectory = ref(true)

const form = ref<FileSource>({ id: '', name: '', directory: '', description: '' })

async function load() {
  if (!isEdit.value) return
  loading.value = true
  try {
    form.value = await getFileSource(id)
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
    await saveFileSource(form.value)
    success(t('saveSuccess'))
    router.push('/fileSource')
  } catch (e) {
    fail((e as Error).message || t('saveFail'))
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="page page-form h-full page-form-fileSource p-1">
    <form class="flex flex-column h-full" :class="{ readonly: isReadonly }">
      <div class="flex align-items-center gap-2 mb-2">
        <h3 class="flex-1">
          {{ (isReadonly ? t('view') : isEdit ? t('edit') : t('new')) + t('module.fileSource') }}
        </h3>
        <Button :label="t('back')" text size="small" @click="router.push('/fileSource')" />
      </div>
      <div v-if="loading" class="text-color-secondary">{{ t('loading') }}</div>
      <div v-else class="page-form-content flex-grow-1 px-2 py-1 overflow-y-auto">
        <div class="field grid">
          <label for="fs-name" class="field-label col-12 mb-2 md:col-3 md:mb-0">{{ t('name') }}</label>
          <div class="field-input col-12 md:col-9">
            <InputText
              id="fs-name"
              v-model="form.name"
              type="text"
              class="input w-full"
              required
              maxlength="100"
              :readonly="isReadonly"
              autofocus
            />
          </div>
        </div>
        <div v-if="isShowDirectory" class="field grid">
          <label for="fs-directory" class="field-label col-12 mb-2 md:col-3 md:mb-0">{{ t('directory') }}</label>
          <div class="field-input col-12 md:col-9">
            <InputText
              id="fs-directory"
              v-model="form.directory"
              type="text"
              class="input w-full"
              required
              maxlength="300"
              :readonly="isReadonly"
            />
            <div class="desc text-color-secondary">
              <small>{{ t('fileSource.directory.desc') }}</small>
            </div>
          </div>
        </div>
        <div class="field grid">
          <label for="fs-description" class="field-label col-12 mb-2 md:col-3 md:mb-0">{{ t('description') }}</label>
          <div class="field-input col-12 md:col-9">
            <Textarea
              id="fs-description"
              v-model="form.description"
              rows="10"
              class="input w-full"
              maxlength="500"
              :readonly="isReadonly"
            />
          </div>
        </div>
      </div>
      <div class="page-form-foot flex-grow-0 flex justify-content-center gap-2 pt-2">
        <Button v-if="!isReadonly" type="button" :label="t('save')" :loading="saving" @click="save" />
      </div>
    </form>
  </div>
</template>
