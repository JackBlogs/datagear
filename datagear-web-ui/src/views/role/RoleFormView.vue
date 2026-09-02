<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getRole, saveRole, type Role } from '@/api/role'
import { useOperationMessage } from '@/composables/useOperationMessage'
import { useI18n } from 'vue-i18n'

// 角色表单（新增/编辑/查看共用），按原 role_form.ftl 复刻。
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

const form = ref<Role>({ id: '', name: '', description: '', enabled: true })

// 对应 page_boolean_options.ftl 的 booleanOptions。
const booleanOptions = [
  { name: t('yes'), value: true },
  { name: t('no'), value: false },
]

async function load() {
  if (!isEdit.value) return
  loading.value = true
  try {
    form.value = await getRole(id)
  } catch (e) {
    fail((e as Error).message || t('loadFail'))
  } finally {
    loading.value = false
  }
}

async function save() {
  if (!form.value.name) {
    fail(t('pleaseFillRoleName'))
    return
  }
  saving.value = true
  try {
    await saveRole(form.value)
    success(t('saveSuccess'))
    router.push('/role')
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
    <form class="flex flex-column h-full" :class="{ readonly: isReadonly }" @submit.prevent="save">
      <div class="flex align-items-center gap-2 mb-2">
        <h3 class="flex-1">
          {{ (isReadonly ? t('view') : isEdit ? t('edit') : t('new')) + t('module.role') }}
        </h3>
        <Button :label="t('back')" text size="small" @click="router.push('/role')" />
      </div>
      <div v-if="loading" class="text-color-secondary">{{ t('loading') }}</div>
      <div v-else class="page-form-content flex-grow-1 px-2 py-1 overflow-y-auto">
        <div class="field grid">
          <label for="role-name" class="field-label col-12 mb-2 md:col-3 md:mb-0">{{ t('name') }}</label>
          <div class="field-input col-12 md:col-9">
            <InputText
              id="role-name"
              v-model="form.name"
              type="text"
              class="input w-full"
              required
              maxlength="100"
              autofocus
              :readonly="isReadonly"
            />
          </div>
        </div>
        <div class="field grid">
          <label for="role-description" class="field-label col-12 mb-2 md:col-3 md:mb-0">{{ t('description') }}</label>
          <div class="field-input col-12 md:col-9">
            <Textarea
              id="role-description"
              v-model="form.description"
              rows="10"
              class="input w-full"
              maxlength="200"
              :readonly="isReadonly"
            />
          </div>
        </div>
        <div class="field grid">
          <label class="field-label col-12 mb-2 md:col-3 md:mb-0">{{ t('enable') }}</label>
          <div class="field-input col-12 md:col-9">
            <SelectButton
              v-model="form.enabled"
              :options="booleanOptions"
              option-label="name"
              option-value="value"
              class="input w-full"
              :disabled="isReadonly"
            />
          </div>
        </div>
      </div>
      <div class="page-form-foot flex-grow-0 flex justify-content-center gap-2 pt-2">
        <Button v-if="!isReadonly" type="submit" :label="t('save')" :loading="saving" />
      </div>
    </form>
  </div>
</template>
